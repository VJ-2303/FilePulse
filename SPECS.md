# SPECS.md — FilePulse Complete Specification (Revised v2.0)

> **Version:** 2.0.0 (Final — Revised)
> **Status:** LOCKED
> **Companion files:** `AGENTS.md` (agent constraints), `docs/detection_algorithms.md` (math reference)

---

## 1. Strategic Context

### 1.1 The Systemic Crisis
Government e-Office systems operate as **passive ledgers**. They record *where* a file is but cannot evaluate *whether the workflow is healthy*. This creates a systemic blind spot: files can sit untouched for months or bounce endlessly between departments without ever triggering an alert.

The scale of this failure is documented:
- **Special Campaign 4.0** (Oct 2024) cleared **25.18 lakh (2.51M) files** across 5.9 lakh sites — proof the blind spot is systemic (DARPG).
- **DoPT** reviewed 5,217 e-Office files and **force-closed 1,786** during SC 4.0.
- **CAG audits** repeatedly cite "cost overruns due to administrative delays" in multi-crore infrastructure projects.
- **RTI disclosures** reveal files stuck **8 months** on a single desk.
- Official guidelines mandate review of files inactive **> 90 days**.

If e-Office had internal diagnostic capabilities, these manual clean-up drives would be unnecessary.

### 1.2 Why e-Office Cannot Fix Itself
The Blueprint document identifies specific platform deficiencies that create the blind spot:

| Deficiency | Consequence |
|---|---|
| No automatic reversion for parked files | Files stall indefinitely |
| No user notifications for due reversion | Missed deadlines, prolonged inactivity |
| Inability to flag files post-dispatch | Users cannot track files once sent |
| No "On Leave" status option | Inaccurate tracking when officials are away |
| Fragmented data logging (e.g., file pulls) | Incomplete records, misleading note-sheets |
| Absence of centralized MIS report | Cannot analyze pendency trends or identify bottlenecks |

**FilePulse solves the last deficiency** — it is the missing MIS analytics layer that transforms raw logs into actionable intelligence.

### 1.3 Strategic Alignment
FilePulse aligns with:
- **Special Campaign 5.0** (Oct 2–31, 2025): Provides a direct tool for pendency reduction
- **e-Office Mission Mode Project**: Enhances efficiency and transparency
- **DARPG governance objectives**: Addresses known pain points in e-Office implementation
- **'Viksit Bharat 2047'**: Contributes to good governance through technology

---

## 2. Problem Definition

### 2.1 The Blind Spot
e-Office tracks **location** but not **progress**. It treats a file sitting for 2 hours identically to one sitting for 2 months. It registers continuous movement in a looping file and reports it as "healthy."

### 2.2 The Two Pathologies

#### Rotting File (Total Stagnation)
A file assigned to an individual who never acts on it. The system dutifully records "Active / With Amit" while the file decays.

**Canonical example:** School roof repair grant assigned to Junior Assistant Amit on Feb 1. Amit opens it, gets distracted, never returns. Three months later the roof collapses during a rainstorm. The MLA calls. Mr. Iyer panics. The damage is done.

#### Looping File (Illusion of Work)
A file that bounces endlessly between officers — a bureaucratic survival tactic rooted in **fear of accountability**. Rejecting a file requires documented justification (risky). Instead, officers write "Please clarify point 4" and send it back. The junior clarifies. The senior writes "Please attach previous year's budget" and sends it down again.

**Canonical example:** Priya sends a computer procurement file to Finance on March 1. Over 10 days it bounces 6 times — brochures, price breakdowns, clarifications. No progress. But e-Office sees continuous movement and reports the file as healthy.

### 2.3 The Human Motivation
Looping is not a bug. It is a **rational strategy** for officers who want to avoid accountability:
- **Fear of accountability:** Rejecting requires justification. Requesting clarification does not.
- **Passing the buck:** Each bounce shifts responsibility without resolving the issue.
- **Illusion of work:** Frequent timestamps and a long audit trail make the file appear actively processed.

---

## 3. Target User

### 3.1 Persona: Mr. Iyer (Section Officer)

| Attribute | Value |
|---|---|
| Role | Section Officer, General Administration Section |
| Team | 3 Junior Assistants (Amit, Priya, Kavita) |
| Active Files | 120–150 at any time |
| Authority | Can order juniors to process files; can convene cross-department meetings |
| Context Knowledge | Knows which files are urgent (roof before monsoon) vs routine |
| Tech Comfort | Moderate — needs simple, readable dashboard |

### 3.2 Why ONLY Mr. Iyer
The Section Officer is the **sole surgical intervention point** because:
1. **Contextual proximity:** Understands all 150 files in his section
2. **Hierarchical authority:** Can walk to Amit's desk and demand action by lunch
3. **Manageable data scope:** 150 files keeps the dashboard actionable, not overwhelming

### 3.3 Who This Is NOT For
Citizens, politicians, anti-corruption wings, junior assistants, cabinet ministers. Building for everyone guarantees building for no one.

---

## 4. Solution Architecture

### 4.1 Core Concept
Transform e-Office from a **passive ledger** into an **active diagnostic tool**. Every Monday morning, before his first cup of tea, Mr. Iyer sees a "Red List" of only the files that need attention.

### 4.2 Two-Track Strategy (from Blueprint)

| Track | What | Hackathon Scope |
|---|---|---|
| **Track 1: MVP** | "Red List" dashboard from existing logs | BUILD THIS — functional prototype |
| **Track 2: Blueprint** | Advanced systemic integration (API monitoring, auto-reversion, workflow engine enhancements) | DOCUMENT THIS — architecture diagram + API spec for future |

The hackathon demo focuses on Track 1. Track 2 is presented as a roadmap slide.

### 4.3 System Flow

```
Mock CSV Logs (backend/data/)
        │
        ▼
Ingestion (backend/app/db.py)
  → Parse CSVs → Validate → Load into SQLite
        │
        ▼
Detection Engine (backend/app/core/)
  → Rotting detector (calendar-day thresholds)
  → Looping detector (reciprocal pair counting)
  → Conformance checker (stage-skip detection)
  → Risk scorer (deterministic 0–100)
  → Alert consolidator (merge compound alerts for UI)
        │
        ▼
AI Insight Layer (backend/app/ai/)
  → Build structured facts payload
  → Call Ollama (local, JSON mode)
  → Validate response with Pydantic
  → Fallback to rule-based text on failure
  → Cache top 10 insights in SQLite
        │
        ▼
FastAPI REST API (backend/main.py)
        │
        ▼
React Dashboard (frontend/src/)
  → DashboardPage (Red List)
  → FileDetailPage (Journey + AI Insight)
  → WorkloadPage (Per-employee view)
```

### 4.4 Design Principles
1. **Detection is deterministic.** Python rules detect. AI never decides if a file is stuck.
2. **AI only explains.** Ollama translates detections into plain language and recommends actions.
3. **Exception-based UI.** Show only anomalies. Never render "all 150 files."
4. **Graceful degradation.** If Ollama fails, rule-based fallback text is shown. Dashboard never breaks.
5. **Frozen time.** All calculations use `REFERENCE_NOW = 2025-03-18T09:00:00`. Never `datetime.now()`.
6. **Calendar-day math.** Use `.date()` subtraction for "days inactive."

---

## 5. Data Specification

### 5.1 Source Files (READ-ONLY)

| File | Records | Location |
|---|---|---|
| `employees.csv` | 9 rows | `backend/data/` |
| `files.csv` | 12 rows | `backend/data/` |
| `events.csv` | 59 rows | `backend/data/` |

### 5.2 Schema Summary

**employees.csv:** `employee_id`, `name`, `role`, `department`, `manager_id`

**files.csv:** `file_id`, `title`, `file_type`, `priority` (High/Medium/Low), `created_at`, `deadline_at`, `current_holder_id`, `current_status` (Active/Closed/Archived)

**events.csv:** `event_id`, `file_id`, `timestamp`, `action`, `from_user_id`, `to_user_id`, `department`, `stage`, `note_text`

### 5.3 Action Vocabulary

| Action | Is Transfer? |
|---|---|
| `RECEIPT_DIARISED`, `FILE_CREATED`, `FILE_OPENED`, `NOTE_ADDED`, `APPROVED`, `REJECTED`, `CLOSED` | NO |
| `ASSIGNED`, `FORWARDED`, `RETURNED`, `CLARIFICATION_REQUESTED`, `CLARIFICATION_PROVIDED` | YES (only if `to_user_id != from_user_id`) |

### 5.4 SQLite Tables

Create 5 tables: `employees`, `files`, `events`, `alerts`, `ai_insights`.

The `alerts` table stores detection results with fields: `alert_id`, `file_id`, `alert_type` (ROTTING/LOOPING/CONFORMANCE), `severity`, `risk_score`, `days_inactive`, `days_to_deadline`, `is_overdue`, `loop_round_trips`, `loop_total_bounces`, `loop_party_a`, `loop_party_b`, `skipped_stages`, `detected_at`.

The `ai_insights` table caches AI outputs: `insight_id`, `alert_id`, `plain_language_summary`, `likely_blocker`, `recommended_action`, `confidence` (Low/Medium/High), `source` (ollama/fallback), `generated_at`.

---

## 6. Detection Engine

### 6.1 Configuration (Single Source of Truth: `backend/config.py`)

```python
REFERENCE_NOW = "2025-03-18T09:00:00"

ROT_THRESHOLDS_DAYS = {"WARNING": 15, "HIGH": 30, "CRITICAL": 45, "CAMPAIGN": 90}
LOOP_MIN_ROUND_TRIPS = 3
LOOP_WINDOW_DAYS = 30
EXCLUDED_STATUSES = {"Closed", "Archived"}
```

### 6.2 Preprocessing
1. Load CSVs with Pandas
2. Exclude files with `current_status` in `EXCLUDED_STATUSES`
3. Filter events to remaining file_ids
4. Sort by `[file_id, timestamp, event_id]`
5. Mark `is_transfer = (to_user_id != from_user_id)`

### 6.3 Rotting Detection

**Formula:** `days_inactive = (REFERENCE_NOW.date() - last_event.date()).days`

**CRITICAL:** Use `.date()` subtraction (calendar days), NOT `timedelta.days`.

**Severity:**

| Days | Severity |
|---|---|
| ≥ 90 | CAMPAIGN ⛔ |
| ≥ 45 | CRITICAL 🔴 |
| ≥ 30 | HIGH 🟠 |
| ≥ 15 | WARNING 🟡 |
| < 15 | NONE ✅ |

**Deadline modifier:** If `deadline_at < REFERENCE_NOW`, set `is_overdue = True` and escalate one level.

**Edge cases:** Zero events → use `created_at`. Closed files → skip. Holder on leave → still flag (AI surfaces the note).

### 6.4 Loop Detection

**Run at TWO granularities:**
- **User-level:** `(from_user_id, to_user_id)` — catches personal ping-pong
- **Department-level:** `(from_department, to_department)` — catches loop hidden behind rotating staff

### 6.5 Conformance Checking

**Expected stage sequences by file_type:**

```python
STAGE_SEQUENCES = {
    "Infrastructure":   ["Receipt", "Initial Review", "Budget Check", "Approval", "Dispatch"],
    "Procurement":      ["Creation", "Initial Review", "Budget Check", "Approval", "Dispatch"],
    "Service Benefits": ["Receipt", "Verification", "Pension Verification", "Approval", "Dispatch"],
    "Training":         ["Creation", "Initial Review", "Approval", "Dispatch"],
    "Records":          ["Receipt", "Initial Review", "Verification", "Approval", "Dispatch"],
    "Welfare":          ["Creation", "Initial Review", "Funds Verification", "Approval", "Dispatch"],
    "HR":               ["Creation", "Initial Review", "Approval", "Dispatch"],
    "Administration":   ["Receipt", "Initial Review", "Approval", "Dispatch"],
}
```

**Logic:** Determine furthest stage reached. Any mandatory stage BEFORE it that was never visited → flag as skipped.

### 6.6 Risk Scoring

```python
risk_score = (
    0.30 * min(days_inactive / 90, 1.0)
  + 0.25 * (1.0 if overdue else max(0, 1 - days_to_deadline / 30))
  + 0.25 * (min(round_trips / 5, 1.0) if looping else 0)
  + 0.10 * {"High": 1.0, "Medium": 0.6, "Low": 0.3}[priority]
  + 0.10 * min(holder_active_files / 40, 1.0)
) * 100
```

**Compound bonus:** If both ROTTING and LOOPING, add +15 (capped at 100).

### 6.7 Alert Consolidation
- **Database:** Separate alert records per detection type
- **UI:** ONE consolidated row per file with compound badge (e.g., `LOOP + STUCK`)
- **Risk score:** Highest individual score + compound bonus

### 6.8 Complete Informations about detection algorithms and logics are in `docs/detection_algorithms.md` file.

---

## 7. AI Integration

### 7.1 Architecture
Detection engine produces alerts → rank by risk_score → take top 10 → call Ollama → parse JSON → validate with Pydantic → cache in SQLite. On ANY failure → use rule-based fallback text.

### 7.2 Ollama Call Spec

```json
{
  "model": "qwen2.5:7b-instruct",
  "prompt": "<constructed prompt>",
  "stream": false,
  "format": "json",
  "options": {
    "temperature": 0,
    "top_p": 0.9,
    "num_predict": 250,
    "num_ctx": 2048
  }
}
```

**Timeout:** 30 seconds. **Retry:** None. One attempt, then fallback.

### 7.3 Prompt Template

**System instruction (embedded in prompt):**
> You are an administrative workflow analyst. Use only the facts provided. Do not invent information. Use neutral language — say "appears" or "likely." Never use "negligent", "lazy", or "incompetent". Respond with valid JSON only.

**User prompt:**
> Analyze this e-Office file alert. File Facts: {facts_json}. Respond with ONLY a JSON object with keys: plain_language_summary, likely_blocker, recommended_action, confidence (Low/Medium/High).

**Facts payload:** File metadata + alert type + counts + last ≤8 events as strings. Never raw DB dumps.

### 7.4 Output Schema (Pydantic)

```python
class AiInsight(BaseModel):
    plain_language_summary: str
    likely_blocker: str
    recommended_action: str
    confidence: Literal["Low", "Medium", "High"]
```

### 7.5 Fallback Templates

| Alert Type | Template |
|---|---|
| ROTTING | `"🔴 {title} has been with {holder} for {days} days. Deadline: {status}."` |
| LOOPING | `"🟠 {title} has bounced between {a} and {b} {trips} times in {span} days."` |
| CONFORMANCE | `"🟡 {title} skipped mandatory stage(s): {stages}."` |
| COMPOUND | `"🔴 {title} is looping ({trips} trips) AND stuck ({days} days)." |

### 7.6 Pre-generation
At startup: run detectors → score → sort → take top 10 → call Ollama → cache. Do NOT call Ollama per UI render.

---

## 8. API Specification

**Base URL:** `http://localhost:8000/api`
**CORS:** Allow `http://localhost:5173`

### 8.1 Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard/summary` | KPI counts |
| GET | `/api/alerts?type=all\|rotting\|looping\|conformance` | Red List (consolidated, sorted by risk_score desc) |
| GET | `/api/files/{file_id}/journey` | File metadata + events + graph + AI insight |
| GET | `/api/employees/{employee_id}/workload` | Per-person file stats |
| GET | `/api/org/tree` | Employee hierarchy with file counts |
| POST | `/api/alerts/{alert_id}/ai-insight` | Regenerate one AI insight |

### 8.2 Response Shapes

**Dashboard Summary:**
```json
{
  "total_active_files": 11,
  "rotting_files": 4,
  "looping_files": 2,
  "conformance_files": 1,
  "high_risk_files": 3,
  "reference_date": "2025-03-18"
}
```

**Alert Item (in Red List):**
```json
{
  "file_id": "F4921",
  "file_title": "School Roof Repair Grant",
  "file_type": "Infrastructure",
  "priority": "High",
  "alert_types": ["ROTTING"],
  "severity": "CRITICAL",
  "risk_score": 47,
  "current_holder_name": "Amit Kumar",
  "days_inactive": 45,
  "deadline_at": "2025-03-25T17:00:00",
  "days_to_deadline": 7,
  "is_overdue": false,
  "loop_round_trips": null,
  "skipped_stages": null,
  "ai_summary": "...",
  "ai_confidence": "High"
}
```

**File Journey:** Includes `file` metadata, `alerts` array, `events` array (with `from_user_name`, `to_user_name`, `is_transfer`), `graph` object (`nodes` + `edges` for ReactFlow), and `ai_insight`.

**Graph nodes:** `id`, `label`, `type`, `department`, `is_current_holder`, `is_stuck`
**Graph edges:** `id`, `source`, `target`, `label`, `count`, `is_loop`

### 8.3 Error Format
```json
{"error": true, "status_code": 404, "detail": "File F9999 not found"}
```

---

## 9. Scope Boundaries

### IN Scope
Mock CSV ingestion • Rotting/Looping/Conformance detection • Risk scoring • Alert consolidation • Ollama AI insights with fallback • 6 API endpoints • 3 React pages • Red List dashboard • File journey graph • Employee workload • Org tree sidebar • Validation tests

### OUT of Scope (Instant Reject)
Auth/login • Real e-Office API • Docker/CI/CD • PM4Py • Citizen portal • Chatbot • Auto-reassignment • Mobile app • PDF export • Email/SMS • Any DB other than SQLite • TypeScript • Redux/Zustand • Axios • >3 routes

---

*End of SPECS.md. This document is LOCKED. Changes require human approval logged in PROGRESS.md.*
