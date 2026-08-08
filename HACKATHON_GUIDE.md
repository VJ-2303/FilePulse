# FilePulse — Complete Hackathon Presentation Guide

> **Team:** Future PMs (TEAM-067) | **Track:** Strong Institutions
> **Event:** Tech for Good 2026 · GDG Coimbatore
> **Coding deadline:** Sunday 9 August, 12:00 noon

---

## PART 1: THE 30-SECOND ELEVATOR PITCH

> "Government e-Office systems tell you **where** a file is, but not **whether anything is happening**. Files rot on desks for months, or bounce endlessly between departments — and no alarm ever fires. FilePulse is an early-warning radar that reads e-Office logs, **deterministically detects** stuck and looping files, explains them in plain language using a **local AI model**, and shows a Section Officer a 'Red List' of only the files that need attention — every Monday morning, before his first cup of tea."

**Memorize this. It's your opening line.**

---

## PART 2: THE PROBLEM STORY (2 minutes)

### The Blind Spot
e-Office is a **passive ledger**. It records location, not progress. A file sitting for 2 hours looks identical to one sitting for 2 months.

### The Two Pathologies

**1. ROTTING FILE (Total Stagnation)**
- A file assigned to someone who never acts on it
- e-Office dutifully reports "Active / With Amit" while the file decays
- **Canonical example:** School roof repair grant assigned to Junior Assistant Amit on Feb 1. Amit opens it, gets distracted. Three months later the roof collapses during a rainstorm. The MLA calls. Mr. Iyer panics. The damage is done.

**2. LOOPING FILE (Illusion of Work)**
- A file bounces endlessly between officers — a bureaucratic survival tactic rooted in **fear of accountability**
- Rejecting requires documented justification (risky). Instead, officers write "Please clarify point 4" and send it back.
- **Canonical example:** Priya sends a computer procurement file to Finance on March 1. Over 10 days it bounces 6 times — brochures, price breakdowns, clarifications. No progress. But e-Office sees continuous movement and reports the file as healthy.

### The Evidence (use these numbers — they're powerful)
- **Special Campaign 4.0** (Oct 2024): cleared **25.18 lakh (2.51M) files** across 5.9 lakh sites (DARPG)
- **DoPT** reviewed 5,217 e-Office files and **force-closed 1,786** during SC 4.0
- **CAG audits** repeatedly cite "cost overruns due to administrative delays"
- **RTI disclosures** reveal files stuck **8 months** on a single desk
- Official guidelines mandate review of files inactive **> 90 days**

### The Human Motivation (why looping happens)
Looping is not a bug. It's a **rational strategy**:
- Fear of accountability → rejecting requires justification, requesting clarification doesn't
- Passing the buck → each bounce shifts responsibility without resolving anything
- Illusion of work → frequent timestamps make the file appear actively processed

---

## PART 3: THE SOLUTION (2 minutes)

### What FilePulse Does
Transforms e-Office from a **passive ledger** into an **active diagnostic tool**.

### The Core Loop
```
Mock CSV Logs → Ingestion → Detection Engine → AI Explanation → React Dashboard
```

### Three Detection Algorithms (all deterministic, no ML)

**1. Rotting Detection**
- `days_inactive = (REFERENCE_NOW.date() - last_event.date()).days`
- Severity ladder: 15 days = WARNING 🟡, 30 = HIGH 🟠, 45 = CRITICAL 🔴, 90 = CAMPAIGN ⛔
- Deadline modifier: if overdue, escalate one level

**2. Loop Detection**
- Runs at TWO granularities: user-level AND department-level
- Flags when a pair has ≥3 round trips (A→B and B→A each ≥3) within a 30-day window
- Department-level catches loops hidden behind rotating staff

**3. Conformance Checking**
- Each file type has an expected stage sequence
- If a mandatory stage was skipped before the furthest stage reached → flag it

### Risk Scoring (deterministic 0–100)
```
risk_score = (
    0.35 * age_factor          # days_inactive / 90, capped at 1.0
  + 0.25 * deadline_proximity  # 1.0 if overdue; else max(0, 1 - days_left/30)
  + 0.20 * loop_intensity      # round_trips / 5, capped at 1.0
  + 0.10 * file_priority       # High=1.0, Medium=0.6, Low=0.3
  + 0.10 * holder_workload     # holder's active files / 40, capped at 1.0
) * 100
```
Compound bonus: +15 if both ROTTING and LOOPING (capped at 100).

### AI Layer (Ollama, local only)
- **Detection is deterministic. AI only explains.**
- Ollama `qwen2.5:7b-instruct`, temperature 0, JSON format
- Sends ONLY structured facts (metadata, counts, last 8 events) — never raw DB dumps
- Pydantic validates output: `{plain_language_summary, likely_blocker, recommended_action, confidence}`
- 30-second timeout, single attempt, then rule-based fallback
- Top 10 insights pre-generated at startup, cached in SQLite
- **The dashboard never calls Ollama during a UI render**

### Design Principles (say these — judges love them)
1. **Detect with math, explain with AI** — auditable, a government officer can ask "why was this flagged?" and get a factual answer
2. **Thresholds mirror official guidelines** — 90-day inactivity review is a real government mandate
3. **No false positives on legitimate work** — one clarification round-trip must never flag. Precision beats recall for officer trust
4. **Calendar days, not datetimes** — matches how humans count pendency
5. **Two granularities for loops** — individual accountability + departmental buck-passing are different pathologies
6. **Frozen time** — `REFERENCE_NOW = 2025-03-18T09:00:00`, never `datetime.now()`
7. **Graceful degradation** — if Ollama fails, fallback text shows. Dashboard never breaks.

---

## PART 4: THE DEMO SCRIPT (5 minutes)

### Setup (before judges arrive)
1. Backend running: `cd src/backend && uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000`
2. Frontend running: `cd src/frontend && npm run dev`
3. Ollama running with `qwen2.5:7b-instruct` pulled
4. Verify: `curl http://localhost:8000/api/health` → `{"status":"ok","project":"FilePulse"}`
5. Verify: `curl http://localhost:8000/api/dashboard/summary` → shows 11 active, 7 alerted

### Demo Flow (minute by minute)

**Minute 0–1: The Problem**
> "This is Mr. Iyer, a Section Officer managing 150 files with 3 Junior Assistants. Every Monday morning, he needs to know which files are silently dying. Today, e-Office can't tell him. Let me show you what we built."

**Minute 1–2: The Red List (Dashboard)**
- Show the dashboard with 7 alerted files sorted by risk score
- Point out F5518: CAMPAIGN severity, 194 days inactive, 108 days overdue, risk score 66
- Point out F6624: the compound file — LOOP + STUCK + CONFORMANCE badge
- Show the AI summary for F4921 (School Roof Repair Grant — the canonical story)
- Filter by type (rotting / looping / conformance) to show the filter works

**Minute 2–3: The File Journey (Graph)**
- Click into F6624 (City Road Resurfacing Estimate)
- Show the ReactFlow graph: Finance (A. Rao) ↔ PWD (M. Das) bouncing
- Point out the **animated edges** — these are the loop edges
- Show the event timeline: 3 clarification requests, 3 clarifications provided
- Show the AI insight explaining the blocker

**Minute 3–4: The Workload View**
- Show Amit Kumar's workload: 3 active files, 1 alerted (F4921 — the roof grant)
- Show the org tree: S. Mehta → R. Iyer → Amit/Priya/Kavita
- Explain: "This tells Mr. Iyer whether a stall is caused by an overloaded officer"

**Minute 4–5: The AI + Resilience Story**
- Click "Regenerate AI Insight" on an alert — shows the live Ollama call
- **Kill Ollama** (or unplug the network) and regenerate — show the fallback text
- Say: "The dashboard never breaks. If the AI is unavailable, we show rule-based text."
- Close with: "This is Track 1 of a two-track strategy. Track 2 — documented in our proposal — is the full blueprint for e-Office integration."

---

## PART 5: IMPORTANT CONCEPTS TO MASTER

### 1. Why Deterministic Detection + AI Explanation?
- **Auditability:** A government officer must be able to ask "why was this flagged?" and get a factual, reproducible answer
- **Trust:** ML-based detection is a black box. Rule-based detection can be explained to a non-technical officer
- **AI's role:** Translate facts into plain language. Never decide. Never blame.

### 2. Why Local AI (Ollama)?
- **Air-gapped government offices:** No internet dependency, no API keys, no data leaving the building
- **Data privacy:** Government files are sensitive. Sending them to a cloud LLM is unacceptable
- **Cost:** Free, runs on a laptop
- **Determinism:** Temperature 0 = consistent, reproducible output

### 3. Why Frozen Time (REFERENCE_NOW)?
- The demo story (45 days stuck, deadline in 7 days) only holds if time is frozen
- Real-time `datetime.now()` would break the narrative on demo day
- Reproducible tests: the same input always produces the same output

### 4. Why Calendar-Day Math?
- `(REFERENCE_NOW.date() - last_event.date()).days` — NOT `timedelta.days`
- Feb 1 → Mar 18 = **45 days** exactly with calendar math
- Datetime math would give 44 — wrong for the scenario
- Matches how humans count pendency

### 5. Why Two Granularities for Loops?
- **User-level:** catches Priya ↔ Rao personally ping-ponging
- **Department-level:** catches the same loop even if different people handle it each time
- Department-level loops hiding behind rotating staff is exactly the bureaucratic survival tactic described in the evidence

### 6. Why Alert Consolidation?
- F6624 is both looping AND stuck — one alert or two?
- **Database:** store two separate alert records (analytics needs both signals)
- **UI:** merge into ONE consolidated row with badge `LOOP + STUCK`
- Mr. Iyer's dashboard is exception-based — one row per file, not per algorithm

### 7. Why Pre-generated AI Insights?
- Never call Ollama per UI render — slow and expensive
- Top 10 risk-scored alerts get insights at startup, cached in SQLite
- Restart caching: subsequent boots serve from SQLite, zero Ollama calls

### 8. Why SQLite + stdlib (no ORM)?
- Zero setup, zero migration framework, file-based
- Perfect for a single-user dashboard on a government officer's machine
- SQLAlchemy would add complexity without adding capability

### 9. Why Exception-Based UI?
- Never render "all 150 files" — show only anomalies
- Mr. Iyer needs a short list of what needs attention TODAY
- Cognitive load matters: one row per file, not per algorithm

### 10. The Two-Track Strategy
- **Track 1 (MVP):** Red List dashboard from existing logs — BUILD THIS
- **Track 2 (Blueprint):** Advanced systemic integration (API monitoring, auto-reversion, workflow engine enhancements) — DOCUMENT THIS
- The hackathon demo focuses on Track 1. Track 2 is a roadmap slide.

---

## PART 6: POSSIBLE JUDGE QUESTIONS & ANSWERS

### Q1: "Why not just use a simple SQL query to find old files?"
**A:** "A SQL query can find files with no recent activity — that's the rotting detection. But it cannot detect **looping**, which requires analyzing the *sequence* of transfers to find reciprocal bounce patterns. It also cannot detect **conformance violations** — skipped mandatory stages. And it certainly can't explain *why* a file is stuck in plain language. Our detection engine runs three algorithms that SQL alone cannot express, and the AI layer translates the findings into actionable language for a non-technical officer."

### Q2: "Why use AI at all? The detection is deterministic."
**A:** "Detection tells you *what* is wrong. AI tells you *why* it might be wrong and *what to do about it*. A Section Officer doesn't need to know 'days_inactive = 45' — he needs to know 'this school roof repair grant has been with Amit for 45 days, the likely blocker is that Amit is waiting for the budget estimate, and the recommended action is to follow up with the Finance section.' That translation from data to action is what the AI provides. And critically, the AI never decides — it only explains. The decision is always deterministic and auditable."

### Q3: "Why Ollama instead of GPT-4 or Claude?"
**A:** "Three reasons. First, **privacy** — government files are sensitive; sending them to a cloud LLM is unacceptable. Second, **infrastructure** — many government offices are air-gapped or have unreliable internet. Ollama runs entirely on a local machine. Third, **cost and determinism** — it's free, and with temperature 0 and JSON format mode, we get consistent, reproducible output. The system is designed to work in an air-gapped government office environment."

### Q4: "How do you handle false positives?"
**A:** "Our thresholds are deliberately conservative. For loops, a file must bounce at least 3 times in EACH direction within a 30-day window before it's flagged. One legitimate clarification round-trip — like F9034 in our data — is never flagged. For rotting, the 15-day warning threshold is an early nudge, not an accusation. We prioritize precision over recall because officer trust is essential — if the tool cries wolf, officers will ignore it."

### Q5: "What happens if Ollama is down?"
**A:** "The dashboard never breaks. Every Ollama call is wrapped in a try/except with a 30-second timeout. On any failure, we fall back to rule-based template text — for example, '🔴 School Roof Repair Grant has been with E101 for 45 days. Deadline: Active.' The insight is marked with `source: 'fallback'` and `confidence: 'Low'`. The detection and the dashboard are completely independent of the AI layer."

### Q6: "How is this different from just adding a 'last modified' column to e-Office?"
**A:** "A 'last modified' column shows you *when* a file was touched — but a looping file is touched constantly. It bounces between Finance and PWD six times in ten days, and a 'last modified' column would show it as perfectly healthy. Our loop detector analyzes the *pattern* of movement — reciprocal transfers between the same parties — which is the computational signature of accountability-avoidance. That's fundamentally different from a timestamp."

### Q7: "Why did you choose these specific risk score weights?"
**A:** "The weights reflect what matters most for a Section Officer. Age (35%) is the strongest signal — how long has this file been inactive. Deadline proximity (25%) captures urgency — an overdue file is critical. Loop intensity (20%) captures the illusion-of-work pathology. Priority (10%) and holder workload (10%) add context. The weights are configurable in one place — `config.py` — and the formula is fully documented in `docs/detection_algorithms.md`. It's deterministic and auditable."

### Q8: "How would this scale to a real e-Office deployment with thousands of files?"
**A:** "The detection algorithms are O(E) — linear in the number of events. For Mr. Iyer's 150 files, this runs in milliseconds. For a department with thousands of files, it would still run in seconds. The architecture is designed for batch processing — run detection nightly, cache results in SQLite, and render the Red List on Monday morning. The current implementation ingests CSV exports, which any e-Office installation can generate. Track 2 of our proposal documents the path to direct API integration."

### Q9: "Why did you choose SQLite instead of PostgreSQL?"
**A:** "For this use case, SQLite is the right tool. It's a single-user dashboard on a government officer's machine — no server, no configuration, no migration framework. The entire database is one file that can be backed up by copying it. PostgreSQL would add operational complexity without adding capability for this scope. The AGENTS.md spec explicitly locks SQLite for the MVP."

### Q10: "What's the actual impact on the citizen?"
**A:** "A school roof repair grant that stalls for 45 days while the monsoon approaches is not an abstract bureaucratic failure — it's a roof that doesn't get fixed in time. When files stall, infrastructure projects get cost overruns, pension clearances get delayed, scholarships don't reach students. FilePulse doesn't just help bureaucrats — it helps the citizens who depend on these files being processed. The Special Campaign 4.0 cleared 25 lakh files — imagine if those files had been flagged automatically, months earlier."

### Q11: "How do you know the AI isn't hallucinating?"
**A:** "Three safeguards. First, the AI is given ONLY structured facts — file metadata, alert type, counts, and the last 8 events as strings. It's explicitly instructed to 'use only the facts provided' and 'do not invent information.' Second, the output is validated with Pydantic — if it doesn't match the schema, it's rejected. Third, the AI never decides anything — detection is 100% deterministic. The AI's explanation is advisory, and the confidence field tells the officer how much to trust it. If the AI fails or produces invalid output, we show rule-based fallback text."

### Q12: "Why is the reference date frozen? Isn't that unrealistic?"
**A:** "It's a deliberate design decision for the demo. The story — a file stuck for 45 days with a deadline in 7 days — only holds if time is frozen. If we used `datetime.now()`, the numbers would drift every day and the demo narrative would break. In production, you'd run detection nightly against the current date. The frozen clock makes the system **reproducible and testable** — the same input always produces the same output, which is essential for validation."

### Q13: "What about the 'on leave' case? You flag files even when the holder is on leave?"
**A:** "Yes, and that's intentional. The e-Office Blueprint document identifies the absence of an 'On Leave' status option as a platform deficiency. In our mock data, F8123 has a note saying 'Handling officer is on leave. Will process on return.' We still flag it as rotting — but the AI layer surfaces the leave note in the explanation, so Mr. Iyer knows *why* it's stalled. This is exactly the kind of context that the AI explanation adds value on top of deterministic detection."

### Q14: "How did you validate your detection logic?"
**A:** "We have 25 passing tests covering every detector. The stuck detector has 4 tests, loop detector 3, conformance 3, risk scorer 3, alert consolidator 6, plus dashboard summary and API route tests. The mock dataset is designed to cover all scenarios: F4921 is a pure rotting case, F8832 is a pure looping case, F6624 is a compound case (rotting + looping + conformance), F9034 is a legitimate single clarification round-trip that must NOT be flagged, and F9310 is a closed file that must be excluded. Every test asserts against known expected values."

### Q15: "What's the tech stack and why?"
**A:** "Backend: Python 3.11, FastAPI, Uvicorn, Pandas, Pydantic v2, SQLite (stdlib), httpx. Frontend: React, Vite, Tailwind CSS, ReactFlow, React Router. AI: Ollama with qwen2.5:7b-instruct. We deliberately excluded SQLAlchemy, LangChain, Redux, Zustand, Axios, TypeScript, Docker, and all cloud services — each would add complexity without adding capability for this specific problem scope. The stack is locked in AGENTS.md to keep the MVP lean."

### Q16: "Who is the target user? Why only one person?"
**A:** "The Section Officer — Mr. Iyer. He's the **sole surgical intervention point** because: (1) he has contextual proximity — he understands all 150 files in his section; (2) he has hierarchical authority — he can walk to Amit's desk and demand action by lunch; (3) his data scope is manageable — 150 files keeps the dashboard actionable, not overwhelming. Building for everyone guarantees building for no one. Citizens, politicians, and anti-corruption wings are explicitly out of scope."

### Q17: "What's the difference between a rotting file and a looping file?"
**A:** "A rotting file is **totally stagnant** — no activity at all. It sits with one person for weeks or months. A looping file is **actively moving but not progressing** — it bounces between the same two parties repeatedly, generating timestamps and activity notes, but never moving forward. e-Office sees the looping file as healthy because it has continuous movement. That's the 'illusion of work.' Both are failures, but they require different detection algorithms and different interventions."

### Q18: "How does the conformance checker work?"
**A:** "Each file type has an expected stage sequence. For example, Infrastructure files must go through: Receipt → Initial Review → Budget Check → Approval → Dispatch. We find the furthest stage the file reached, then check if any mandatory stage before it was skipped. F7741 (Land Record Correction) went from Receipt directly to Approval, skipping Initial Review and Verification — that's a conformance violation. This catches files that are being rushed through or improperly processed."

### Q19: "What would you add next if you had more time?"
**A:** "Three things. First, **cycle detection** in the loop detector — currently we only catch A↔B ping-pong, not A→B→C→A triangles. Second, **per-file-type baselines** for rotting thresholds — a file awaiting an external opinion might legitimately wait longer than a routine file. Third, **trend analysis** — showing which officers and stages consistently cause delays over time, turning the Red List into a management information system. These are documented in our proposal as Track 2."

### Q20: "Why ReactFlow for the graph?"
**A:** "ReactFlow gives us a production-grade flow visualization with minimal code. The file journey graph shows the complete routing history — each node is an employee, each edge is a transfer, and loop edges are **animated** so Mr. Iyer can literally see the file bouncing. The API returns a ReactFlow-compatible graph object (`nodes` + `edges` with positions), so the frontend just renders it. It's the perfect visual for exposing the 'illusion of work.'"

### Q21: "How is this different from existing e-Office MIS reports?"
**A:** "Existing MIS reports are **aggregate statistics** — how many files are pending, how many are overdue. They don't diagnose *why* files stall. FilePulse is a **diagnostic layer** — it identifies specific pathologies (rotting, looping, conformance violations), scores them by risk, and explains them in plain language. It's the difference between a thermometer and a doctor. The Blueprint document explicitly identifies the absence of a centralized MIS report as a deficiency — FilePulse fills that gap."

### Q22: "What if an officer is legitimately waiting for an external response?"
**A:** "That's a real edge case, and we handle it in two ways. First, the AI layer surfaces the note context — if the note says 'awaiting external opinion,' the explanation will reflect that. Second, our roadmap includes per-file-type baselines — a file awaiting an external opinion might legitimately wait longer. But the key insight is: even a legitimate wait should be *visible* to the Section Officer. The current system hides it. FilePulse surfaces it so Mr. Iyer can decide whether the wait is acceptable."

### Q23: "How long did it take to build?"
**A:** "The backend — all detection engines, the AI integration, the API, and 25 passing tests — is complete. The frontend is the current focus. The architecture was designed upfront in SPECS.md and PROPOSAL.md, which locked the detection algorithms, data schemas, and API contracts before coding began. That upfront design is why the backend came together cleanly."

### Q24: "Why not use PM4Py for process mining?"
**A:** "PM4Py is a powerful process mining library, but it's banned in our MVP for a reason: it's heavyweight, has a steep learning curve, and would be overkill for our three specific detection algorithms. Our loop detection is a simple reciprocal-pair counter — O(E) complexity. Our rotting detection is a groupby. Our conformance checker is an ordered stage scan. None of these need a full process mining framework. We keep the MVP lean and the dependencies minimal."

### Q25: "How do you ensure the AI doesn't assign blame?"
**A:** "The system prompt explicitly instructs: 'Use neutral language — say "appears" or "likely." Never use "negligent", "lazy", or "incompetent."' The AI output is validated against this. The tone is a neutral administrative analyst. This is critical for adoption — if the tool blamed officers, they would resist it. Instead, it says 'this file appears to be stuck' and 'the likely blocker is X' — which is non-accusatory and actionable."

### Q26: "What's the actual data flow at startup?"
**A:** "On startup, the pipeline runs: (1) CSVs are ingested into SQLite (5 tables: employees, files, events, alerts, ai_insights); (2) three detectors run — rotting, looping, conformance; (3) risk scorer assigns 0–100 scores; (4) alerts are stored; (5) top 10 alerts get AI insights from Ollama, validated by Pydantic, cached in SQLite; (6) alerts are consolidated into one row per file for the UI. The FastAPI server then serves read-only queries from the cached database. The frontend makes no direct database calls."

### Q27: "Why is the dashboard exception-based?"
**A:** "Mr. Iyer manages 150 files. If we showed him all 150, he'd have to scan for anomalies himself — which is exactly the problem we're solving. Instead, we show only the 7 files with alerts, sorted by risk score. The Red List is a short, actionable list: 'these are the files that need your attention today.' Exception-based UI is a core design principle — show only anomalies, never everything."

### Q28: "What happens when a file has both rotting AND looping?"
**A:** "That's a compound alert — like F6624 in our data. In the database, we store two separate alert records because analytics needs both signals. In the UI, we merge them into one consolidated row with a compound badge — 'LOOP + STUCK' — and the risk score gets a +15 bonus (capped at 100). The rationale: Mr. Iyer's dashboard is exception-based, one row per file. Multiple rows for the same file increases cognitive load without adding a new decision."

### Q29: "How do you test the AI integration?"
**A:** "The AI integration is tested through the fallback path — if Ollama is unavailable, the service returns a rule-based insight with `source: 'fallback'`. The Pydantic schema validation is tested by feeding valid and invalid JSON. The caching logic is tested by verifying that insights are served from SQLite on restart without re-calling Ollama. The detection engines — which are the core logic — have 25 passing unit tests with known expected values."

### Q30: "What's the business model / who pays for this?"
**A:** "This is a civic tech project for a hackathon — the 'business model' is public value. The cost is minimal: a laptop, Python, and a free local AI model. The value is enormous: preventing the cost overruns, delays, and citizen harm documented by CAG and DARPG. In a real deployment, it would be a government IT project under the e-Office Mission Mode Project or the 'Viksit Bharat 2047' governance agenda."

---

## PART 7: THE ARCHITECTURE DIAGRAM (explain this visually)

```
e-Office CSV Exports (employees.csv · files.csv · events.csv)
        │
        ▼
Ingestion Layer (Pandas — parse, validate, normalise)
        │
        ▼
SQLite Database (employees · files · events · alerts · ai_insights)
        │
        ▼
Detection Engine
  ├── Rotting Detector (calendar-day inactivity threshold)
  ├── Loop Detector (reciprocal pair counting — user + dept level)
  ├── Conformance Checker (stage-skip detection by file type)
  ├── Risk Scorer (deterministic 0-100 formula)
  └── Alert Consolidator (one row per file — compound badges)
        │
        ▼
AI Insight Layer (Ollama qwen2.5:7b-instruct — local only)
  ├── Prompt Builder (structured facts payload — last 8 events)
  ├── Pydantic Validator (strict JSON schema enforcement)
  └── SQLite Cache (top-10 insights pre-generated at startup)
        │
        ▼
FastAPI REST API (6 endpoints — localhost:8000)
        │
        ▼
React Dashboard (Vite — localhost:5173)
  ├── Dashboard Page (Red List — sorted by risk score)
  ├── File Journey Page (ReactFlow routing graph)
  └── Workload Page (per-employee file counts)
```

**Key point to emphasize:** Data flows in ONE direction at startup. CSVs → SQLite → detectors → alerts → AI insights → cached. The API is read-only. The frontend is a pure consumer.

---

## PART 8: THE DEMO DATA (know it cold)

### 12 Files, 9 Employees, 59 Events

**The 7 Alerted Files (your demo stars):**

| File | Title | Alert Types | Severity | Score | Story |
|---|---|---|---|---|---|
| F5518 | Medical Reimbursement Case 118 | ROTTING | CAMPAIGN | 66 | 194 days inactive, 108 days overdue |
| F4921 | School Roof Repair Grant | ROTTING | CRITICAL | 47 | The canonical story — 45 days with Amit |
| F6624 | City Road Resurfacing Estimate | ROTTING+LOOPING+CONFORMANCE | HIGH | 45 | The compound file — 3 round trips Finance↔PWD |
| F8123 | Post-Matric Scholarship Disbursement | ROTTING | WARNING | 39 | Holder on leave — AI surfaces the note |
| F8832 | Purchase of 50 Computers | LOOPING | HIGH | 24 | Priya ↔ Rao bouncing — 3 clarification rounds |
| F7741 | Land Record Correction Survey 214 | CONFORMANCE | WARNING | 17 | Skipped Initial Review + Verification |
| F2210 | Office Supplies Purchase Q4 | ROTTING | WARNING | 11 | 20 days inactive |

**The 4 Clean Files (your "no false positive" proof):**
- F1104 (1 day) — actively being processed
- F3305 (4 days) — recently approved
- F9034 (2 days, 1 round trip) — legitimate single clarification, NOT flagged
- F9555 (1 day) — recently received

**The 1 Closed File (excluded correctly):**
- F9310 — closed, excluded from detection

---

## PART 9: KEY METRICS TO QUOTE

- **25/25 tests passing** — validation is real
- **7 consolidated alerts** from 11 active files — exception-based UI
- **3 detection algorithms** — rotting, looping, conformance
- **2 loop granularities** — user-level + department-level
- **5 SQLite tables** — employees, files, events, alerts, ai_insights
- **6 API endpoints** — health, summary, alerts, journey, workload, org tree, AI insight
- **3 React pages** — Dashboard, File Journey, Workload
- **30-second AI timeout** — graceful degradation
- **Temperature 0** — deterministic AI output
- **90-day CAMPAIGN threshold** — mirrors official government guideline

---

## PART 10: PRESENTATION TIPS

### Do's
1. **Open with the story, not the tech.** "Mr. Iyer has a problem..." — hook them emotionally first
2. **Show the Red List first.** It's the most impressive visual — 7 files, sorted by risk, with AI summaries
3. **Click into F6624** — the compound file shows ALL three detectors in one graph
4. **Kill Ollama during the demo** — shows resilience. Judges love seeing failure handled gracefully
5. **Quote the evidence numbers** — 25 lakh files, 1,786 force-closed, 8 months stuck
6. **Emphasize "detect with math, explain with AI"** — this is your differentiator
7. **Mention the air-gapped design** — privacy + offline capability is a huge selling point for government
8. **End with the citizen impact** — the roof that doesn't get fixed, the pension that doesn't get cleared

### Don'ts
1. **Don't dive into code** unless asked. Judges care about the problem, solution, and impact
2. **Don't say "machine learning"** for detection — it's deterministic rules, and that's a feature
3. **Don't over-explain the risk score formula** — mention it, don't lecture on it
4. **Don't apologize for the frontend** — if it's not built yet, focus on the backend and API
5. **Don't say "we'll add auth later"** — auth is explicitly out of scope, and that's fine
6. **Don't use jargon** — "reciprocal pair counting" is fine, but explain it as "the file bounces back and forth between the same two people"

### The One-Sentence Demo Statement (from MILESTONES.md)
> "FilePulse turns passive e-Office logs into an early-warning radar that tells a Section Officer exactly which files are rotting or looping — and why — every Monday morning."

---

## PART 11: CURRENT PROJECT STATUS (know this)

### ✅ Complete (Backend)
- All detection engines: stuck, loop, conformance, risk scorer, alert consolidator
- Full pipeline orchestrator with insight caching
- All 6 API endpoints + health check
- 25/25 tests passing
- AI integration with Ollama + fallback
- SQLite schema + CSV ingestion

### 🚧 In Progress (Frontend)
- `api/client.js` — API client
- `DashboardPage` — Red List
- `FileDetailPage` — ReactFlow journey graph
- `WorkloadPage` — per-employee view
- `test_validation.py` — end-to-end pipeline test

### ⚠️ Note: Stack Deviation
The frontend `package.json` currently has React 19, Vite 8, and react-router-dom 7 — but AGENTS.md locks React 18, Vite 5, and react-router-dom@6. **Be aware of this if judges ask.** The locked stack is the spec; the installed versions are newer. This could be a point of discussion.

---

## PART 12: THE 5-MINUTE PITCH SCRIPT (word-for-word)

> "Good morning. I'm from Team Future PMs, and we built FilePulse — an early-warning radar for e-Office file bottlenecks.
>
> Here's the problem. Government e-Office systems are passive ledgers. They tell you where a file is, but not whether anything is happening. A file can sit on a desk for eight months — RTI disclosures have documented this — and the system reports it as 'Active.' A file can bounce between two departments six times in ten days — generating a long trail of timestamps — and the system reports it as healthy. That's the illusion of work.
>
> The scale of this failure is documented. Special Campaign 4.0 manually cleared 25 lakh files. DoPT force-closed 1,786 files. CAG audits cite administrative delays as a direct cause of cost overruns. The official guideline already says files inactive for 90 days must be reviewed — but there's no automated mechanism to flag them.
>
> FilePulse solves this. It reads e-Office logs and runs three deterministic detection algorithms. Rotting detection finds files with no meaningful activity beyond a threshold. Loop detection finds files bouncing between the same two parties — at both the user level and the department level. Conformance checking finds files that skipped mandatory stages. Each alert gets a risk score from 0 to 100, and the Red List shows only the files that need attention — sorted by risk.
>
> Then we add a local AI layer. Ollama runs on the same machine — no cloud, no API keys, works in an air-gapped office. The AI translates each detection into plain language: what appears to be happening, what the likely blocker is, and what action to take. It never decides — detection is deterministic and auditable. And if the AI is unavailable, we show rule-based fallback text. The dashboard never breaks.
>
> [DEMO: Show the Red List, click into F6624, show the graph, show the workload view]
>
> The impact is real. A school roof repair grant that stalls for 45 days isn't an abstract failure — it's a roof that doesn't get fixed before the monsoon. FilePulse gives Mr. Iyer — the Section Officer — the tool to catch these files before they become crises. Every Monday morning, before his first cup of tea, he sees exactly what needs his attention.
>
> Thank you."

---

## PART 13: QUICK REFERENCE — KEY TERMS

| Term | Meaning |
|---|---|
| **Rotting** | File with no meaningful activity beyond threshold |
| **Looping** | File bouncing between same parties without progress |
| **Conformance** | File skipping mandatory workflow stages |
| **Compound alert** | File with both ROTTING and LOOPING |
| **Red List** | The exception-based dashboard showing only alerted files |
| **REFERENCE_NOW** | Frozen clock: 2025-03-18T09:00:00 |
| **Round trip** | One A→B plus one B→A exchange |
| **Risk score** | Deterministic 0–100 formula |
| **Fallback** | Rule-based text when Ollama fails |
| **Ollama** | Local LLM runner (qwen2.5:7b-instruct) |
| **Track 1** | MVP — the Red List dashboard (what we built) |
| **Track 2** | Blueprint — full e-Office integration (documented) |

---

*End of guide. Practice the pitch. Know your data. Own the demo.*