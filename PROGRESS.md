# PROGRESS.md

## Current Phase: Detection

## In Progress / Blocked

- [x] 2026-08-08 tests/test_loop_detector.py — user and department loop alerts, legitimate single round-trip, and closed-file exclusion coverage added
- [ ] app/core/risk_scorer.py — risk scoring not implemented
- [ ] main.py — startup detection + AI pre-generation not wired
- [ ] app/api/routes.py — all 6 endpoints missing
- [ ] tests/test_validation.py — not created
- [ ] Frontend — DashboardPage, FileDetailPage, WorkloadPage, api/client.js missing

## Decisions Log

| Time | Decision | Reason |
|---|---|---|
| 2026-08-08 | REFERENCE_NOW = 2025-03-18T09:00:00, never datetime.now() | Frozen clock keeps demo narrative consistent |
| 2026-08-08 | Calendar-day math (.date() subtraction) for days_inactive | Feb 1 to Mar 18 = 45 days exactly, matches scenario |
| 2026-08-08 | Risk score weights: 0.35 age / 0.25 deadline / 0.20 loop / 0.10 priority / 0.10 workload | detection_algorithms.md §6 |
| 2026-08-08 | DB at data/filepulse.sqlite3 | Keeps data/ self-contained; matches .env.example |
| 2026-08-08 | AI folder named AI (uppercase) on disk | Matches current imports — do not rename |
| 2026-08-08 | Ollama constants sourced from config.py via os.getenv | Single source of truth; .env overrides without code changes |
| 2026-08-08 | Loop detector uses sliding window, not now-anchored window | Finds best historical 30-day window; catches F6624 correctly; aligns with core rule intent |

## Codebase State

### Backend (src/backend/)

| File | Status |
|---|---|
| config.py | Done |
| main.py | Partial — init_db + ingest_csv_data on startup; detectors and routes not mounted |
| app/models.py | Done — Employee, FileRecord, Event, Alert, AiInsight |
| app/db.py | Done — 5 tables, CSV ingestion, insert_alerts, insert_ai_insights |
| app/AI/prompt.py | Done |
| app/AI/ollama_service.py | Done |
| app/core/stuck_detector.py | Done — verified, 4/4 tests passing |
| app/core/loop_detector.py | Done — verified, 3/3 tests passing |
| app/core/risk_scorer.py | Missing |
| app/api/routes.py | Missing |
| tests/test_stuck_detector.py | Done — rotting threshold, closed-file, zero-event, overdue escalation coverage |
| tests/test_validation.py | Missing |

### Data (src/backend/data/)

| File | Status |
|---|---|
| employee.csv | Present — 9 employees |
| files.csv | Present — 12 files (11 active, 1 closed F9310) |
| events.csv | Present — 60 events |
| filepulse.sqlite3 | Present — populated at startup |

### Frontend (src/frontend/src/)

| File | Status |
|---|---|
| App.jsx | Vite default — not yet replaced |
| pages/, components/, api/ | All missing |

## Verified Alert Output from Mock Data

### Rotting (stuck_detector)

| File | Days Inactive | Severity | Overdue | Notes |
|---|---|---|---|---|
| F5518 | 194 | CAMPAIGN | Yes | Deadline was Nov 2024 — no escalation, already at top |
| F4921 | 45 | CRITICAL | No | Canonical school roof case |
| F6624 | 25 | WARNING | No | Also LOOPING — compound alert |
| F2210 | 20 | WARNING | No | |
| F8123 | 15 | WARNING | Yes | Deadline Mar 20 — escalates to HIGH; holder on leave |

### Looping (loop_detector)

| File | Party A | Party B | Round Trips | Bounces | Granularities |
|---|---|---|---|---|---|
| F6624 | E201 | E302 | 3 | 6 | USER + DEPARTMENT |
| F8832 | E102 | E201 | 3 | 6 | USER + DEPARTMENT |

F9034: 1 round trip only — correctly NOT flagged.
F8832 note: previously logged as "below threshold" — this was wrong. Actual count is E102→E201: 3 times, E201→E102: 3 times = 3 RT.

## Next Up

1. app/core/risk_scorer.py — deterministic 0-100 formula + compound +15 bonus
2. Wire detectors into main.py startup — run detectors, store alerts via insert_alerts
3. Wire AI pre-generation — top 10 by risk score, call generate_insight, store via insert_ai_insights
4. app/api/routes.py — 6 endpoints (summary, alerts, journey, workload, org/tree, regenerate)
5. Mount routes in main.py
6. tests/test_validation.py — end-to-end validation against verified alert table above
7. Frontend — api/client.js, DashboardPage, FileDetailPage (ReactFlow), WorkloadPage
