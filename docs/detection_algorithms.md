# FilePulse Detection Engine — Logic & Algorithms Reference

## 1. Input Data Contract

All algorithms consume three CSV sources (see `backend/data/`):

| File | Key Fields |
|---|---|
| `employees.csv` | employee_id, name, role, department, manager_id |
| `files.csv` | file_id, title, file_type, priority, created_at, deadline_at, current_holder_id, current_status |
| `events.csv` | event_id, file_id, timestamp, action, from_user_id, to_user_id, department, stage, note_text |

### Event action vocabulary
```
RECEIPT_DIARISED, FILE_CREATED, ASSIGNED, FILE_OPENED, NOTE_ADDED,
FORWARDED, RETURNED, CLARIFICATION_REQUESTED, CLARIFICATION_PROVIDED,
APPROVED, REJECTED, CLOSED
```

### Transfer actions (change of holder)
Only these actions move a file between people:
```
ASSIGNED, FORWARDED, RETURNED, CLARIFICATION_REQUESTED, CLARIFICATION_PROVIDED
```
An event is a **real transfer** only if `to_user_id != from_user_id`.

---

## 2. Global Configuration

```python
# config.py
REFERENCE_NOW = "2025-03-18T09:00:00"   # Demo "Monday morning" — never use real clock

ROT_THRESHOLDS_DAYS = {
    "WARNING":  15,
    "HIGH":     30,
    "CRITICAL": 45,
    "CAMPAIGN": 90,   # official govt guideline: review files inactive > 90 days
}

LOOP_MIN_ROUND_TRIPS = 3     # >= 3 exchanges in EACH direction between same pair
LOOP_WINDOW_DAYS     = 30    # loop exchanges must occur within this window

EXCLUDED_STATUSES = {"Closed", "Archived"}
```

> **Why a fixed reference date?** The demo story (45 days stuck, deadline in 7 days) only holds if time is frozen. Real-time `datetime.now()` would break the narrative on demo day.

---

## 3. Preprocessing Pipeline

Before any detection runs:

```python
import pandas as pd

def load_and_clean(events_path, files_path):
    events = pd.read_csv(events_path, parse_dates=["timestamp"])
    files  = pd.read_csv(files_path, parse_dates=["created_at", "deadline_at"])

    # Rule 1: exclude closed/archived files entirely
    active_files = files[~files["current_status"].isin(EXCLUDED_STATUSES)]
    events = events[events["file_id"].isin(active_files["file_id"])]

    # Rule 2: chronological order per file (critical for loop detection)
    events = events.sort_values(["file_id", "timestamp", "event_id"])

    # Rule 3: mark real transfers
    events["is_transfer"] = events["to_user_id"] != events["from_user_id"]
    return events, active_files
```

---

## 4. Algorithm 1 — Rotting Detection

### Definition
A file is **rotting** when it is still `Active` but has had **no meaningful activity** for longer than its threshold. e-Office shows "With Amit" — we measure *how long* it has been there.

### Core rule
```
days_inactive = calendar_days(REFERENCE_NOW.date(), last_event.date())
if current_status == "Active" and days_inactive >= threshold:
    flag ROTTING
```

> **Important:** use **calendar-day difference** (`date - date`), NOT `timedelta.days` on datetimes. Calendar math gives Amit's Feb 1 → Mar 18 = **45 days** exactly, matching the scenario. Datetime math would give 44.

### Severity ladder
| Days inactive | Severity | Meaning |
|---|---|---|
| 15–29 | 🟡 WARNING | Early nudge |
| 30–44 | 🟠 HIGH | Needs intervention this week |
| 45–89 | 🔴 CRITICAL | Act today |
| 90+ | ⛔ CAMPAIGN | Special Campaign territory (official guideline) |

**Deadline modifier:** if `deadline_at < REFERENCE_NOW`, escalate one level and tag `OVERDUE`.

### Implementation
```python
def detect_rotting(events, files, now):
    last_activity = (
        events.groupby("file_id")["timestamp"]
        .max()
        .reset_index(name="last_event_at")
    )
    df = files.merge(last_activity, on="file_id", how="left")
    df = df[df["current_status"] == "Active"]

    df["days_inactive"] = (now.date() - df["last_event_at"].dt.date).dt.days
    df["is_overdue"]    = df["deadline_at"] < now

    def severity(d, overdue):
        for level, th in [("CAMPAIGN", 90), ("CRITICAL", 45),
                          ("HIGH", 30), ("WARNING", 15)]:
            if d >= th:
                return level
        return None

    df["rot_severity"] = df.apply(
        lambda r: severity(r["days_inactive"], r["is_overdue"]), axis=1
    )
    return df[df["rot_severity"].notna()]
```

### Edge cases
| Case | Handling |
|---|---|
| File has zero events | `days_inactive = now - created_at` |
| Holder is "on leave" (F8123) | Still flag it; AI layer surfaces the leave note — this is a known e-Office blind spot (no On-Leave status) |
| Weekend receipts | Do not penalize first 2 days after a weekend receipt |
| Legit long waits (external opinion) | Future: per-file-type baselines (§4.5) |

---

## 5. Algorithm 2 — Loop Detection

### Definition
A file is **looping** when it repeatedly bounces between the same two parties without progress. Movement exists, but outcome does not — the "illusion of work."

### Key metrics
For each file, extract the ordered sequence of **real transfers** and compute:

1. **Pair counts** — how many times A→B and B→A each occur
2. **Reversals** — consecutive transfers that undo each other
   ```
   reversal = event[i].from == event[i-1].to AND event[i].to == event[i-1].from
   ```
3. **Round trip** — one A→B plus one B→A

### Core rule (MVP)
```
For every unordered pair {A, B}:
    if count(A→B) >= 3 AND count(B→A) >= 3
       AND all exchanges fall within LOOP_WINDOW_DAYS:
        flag LOOPING (round_trips = min(counts))
```

### Implementation
```python
def detect_looping(events, files, now):
    transfers = events[events["is_transfer"]].copy()
    alerts = []

    for file_id, grp in transfers.groupby("file_id"):
        window = grp[grp["timestamp"] >= now - pd.Timedelta(days=LOOP_WINDOW_DAYS)]
        pairs = {}

        for _, e in window.iterrows():
            key = (e["from_user_id"], e["to_user_id"])
            pairs[key] = pairs.get(key, 0) + 1

        seen = set()
        for (a, b), c_ab in pairs.items():
            if (a, b) in seen or (b, a) in seen:
                continue
            c_ba = pairs.get((b, a), 0)
            round_trips = min(c_ab, c_ba)

            if round_trips >= LOOP_MIN_ROUND_TRIPS:
                seen.update({(a, b), (b, a)})
                alerts.append({
                    "file_id": file_id,
                    "party_a": a, "party_b": b,
                    "round_trips": round_trips,
                    "total_bounces": c_ab + c_ba,
                    "span_days": (window["timestamp"].max()
                                  - window["timestamp"].min()).days,
                })
    return pd.DataFrame(alerts)
```

### Two granularities (important!)
Run the detector **twice**:

| Level | Pair key | Catches |
|---|---|---|
| **User-level** | (from_user, to_user) | Priya ↔ Rao personally ping-ponging |
| **Department-level** | (from_dept, to_dept) | Same loop even if different people handle it each time |

A department-level loop that hides behind rotating staff is exactly the bureaucratic survival tactic described in the evidence docs. User-level alone would miss it.

### Edge cases
| Case | Handling |
|---|---|
| One legitimate clarification round-trip (F9034: 1↔1) | NOT flagged — below threshold of 3 |
| Reopened closed file | Excluded by status filter |
| Loop + rot together (F6624) | Both alerts fire → compound alert (§8) |
| A→B→C→A triangle | MVP ignores; future: cycle detection in DFG |

---

## 6. Risk Scoring

Deterministic 0–100 score used to sort the Red List:

```python
risk_score = (
    0.35 * age_factor            # days_inactive / 90, capped at 1.0
  + 0.25 * deadline_proximity    # 1.0 if overdue; else max(0, 1 - days_left/30)
  + 0.20 * loop_intensity        # round_trips / 5, capped at 1.0 (0 if no loop)
  + 0.10 * file_priority         # High=1.0, Medium=0.6, Low=0.3
  + 0.10 * holder_workload       # holder's active files / 40, capped at 1.0
) * 100
```

AI (Ollama) may **adjust** the score ±10 based on note-text context (e.g., "on leave" lowers urgency, "monsoon deadline" raises it), but never owns the base score.

---

## 7. Alert Consolidation Rule

**Question:** F6624 is both looping AND stuck — one alert or two?

**Answer:**
- **Database:** store two separate alert records (analytics needs both signals).
- **UI (Red List):** merge into **one consolidated row** with badge `LOOP + STUCK` and the higher of the two risk scores.

Rationale: Mr. Iyer's dashboard is **exception-based** — one row per file, not per algorithm. Multiple rows for the same file increases cognitive load without adding a new decision.

---

## 8. Complexity & Performance

| Step | Complexity | Note |
|---|---|---|
| Rotting scan | O(E) | single groupby |
| Loop scan | O(E) | one pass per file; pair dict is O(transfers) |
| Conformance | O(E) | ordered stage scan |

For Mr. Iyer's 150 files this runs in milliseconds. Batch it nightly; render Red List Monday 8:55 AM — matching the "before his first cup of tea" story.

---

## 9. Design Principles (why we built it this way)

1. **Detect with math, explain with AI.** Deterministic rules are auditable; a government officer must be able to ask "why was this flagged?" and get a factual answer.
2. **Thresholds mirror official guidelines.** 90-day inactivity review is a real government mandate — our CAMPAIGN tier encodes it.
3. **No false positives on legitimate work.** One clarification round-trip (F9034) must never flag. Precision beats recall for officer trust.
4. **Calendar days, not datetimes.** Matches how humans count pendency and matches the scenario numbers exactly.
5. **Two granularities for loops.** Individual accountability + departmental buck-passing are different pathologies needing different evidence.
