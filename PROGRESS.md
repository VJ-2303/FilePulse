# PROGRESS.md

## Current Phase: API

## Codebase State

### Backend (src/backend/)

| File | Status |
|---|---|
| config.py | Done |
| main.py | Done structurally — startup invokes `orchestrator.run_full_pipeline`; `api.routes.router` remains pending |
| app/models.py | Done — Employee, FileRecord, Event, Alert, AiInsight, ConsolidatedAlert |
| app/db.py | Done — 5 tables, CSV ingestion, insert_alerts, insert_ai_insights |
| app/AI/prompt.py | Done |
| app/AI/ollama_service.py | Done |
| app/core/stuck_detector.py | Done — 4/4 tests passing |
| app/core/loop_detector.py | Done — 3/3 tests passing |
| app/core/conformance_detector.py | Done — 3/3 tests passing |
| app/core/risk_scorer.py | Done — 3/3 tests passing |
| app/core/alert_consolidator.py | Done — 6/6 tests passing |
| app/core/orchestrator.py | Done — ingests CSVs, detects rotting/looping/conformance, scores and persists alerts, consolidates UI rows, and caches top-10 AI insights |
| app/api/routes.py | **Missing** — all 6 endpoints absent |
| tests/test_stuck_detector.py | Done |
| tests/test_loop_detector.py | Done |
| tests/test_conformance_detector.py | Done |
| tests/test_risk_scorer.py | Done |
| tests/test_alert_consolidator.py | Done |
| tests/test_orchestrator.py | Done — in-memory ingestion, detection, scoring, persistence, and consolidation integration coverage |
| tests/test_validation.py | Missing — end-to-end integration test |

**Test count:** 20/20 passing (detector, scorer, consolidator, and orchestrator tests)

### Data (src/backend/data/)

| File | Status |
|---|---|
| employee.csv | Present — 9 employees |
| files.csv | Present — 12 files (11 active, 1 closed F9310) |
| events.csv | Present — 59 events |
| filepulse.sqlite3 | Generated at startup |

### Frontend (src/frontend/src/)

| File | Status |
|---|---|
| App.jsx | Vite default — not yet replaced |
| pages/, components/, api/ | All missing |

---

## Decisions Log

| Time | Decision | Reason |
|---|---|---|
| 2026-08-08 | REFERENCE_NOW = 2025-03-18T09:00:00, never datetime.now() | Frozen clock keeps demo narrative consistent |
| 2026-08-08 | Calendar-day math (.date() subtraction) for days_inactive | Feb 1 → Mar 18 = 45 days exactly, matching the canonical scenario |
| 2026-08-08 | Risk score weights from detection_algorithms.md §6: 0.35/0.25/0.20/0.10/0.10 | AGENTS.md names detection_algorithms.md as the math reference |
| 2026-08-08 | Compound bonus (+15) applied in risk_scorer, capped at 100 | SPECS.md §6.7: highest individual score + compound bonus |
| 2026-08-08 | DB at data/filepulse.sqlite3 | Keeps data/ self-contained; matches .env.example |
| 2026-08-08 | AI folder named AI (uppercase) on disk | Matches current imports — do not rename |
| 2026-08-08 | Ollama constants sourced from config.py via os.getenv | Single source of truth; .env overrides without code changes |
| 2026-08-08 | Loop detector uses sliding window, not now-anchored window | Finds best historical 30-day window; correctly catches F6624 (all 6 bounces in Feb) |

---

## Verified Alert Output from Mock Data

### Rotting (stuck_detector)

| File | Days Inactive | Severity | Overdue |
|---|---|---|---|
| F5518 | 194 | CAMPAIGN | Yes |
| F4921 | 45 | CRITICAL | No |
| F6624 | 25 | WARNING | No |
| F8123 | 15 | WARNING | Yes (deadline Mar 20) |
| F2210 | 20 | WARNING | No |

### Looping (loop_detector)

| File | Party A | Party B | RT | Bounces | Levels |
|---|---|---|---|---|---|
| F6624 | E201 | E302 | 3 | 6 | USER + DEPARTMENT |
| F8832 | E102 | E201 | 3 | 6 | USER + DEPARTMENT |

F9034: 1 round trip — correctly NOT flagged.
F6624 is compound (ROTTING + LOOPING) — +15 risk score bonus applies.

---

## Next Up

1. **`app/api/routes.py`** ← 6 endpoints per SPECS.md §8
   - `GET /api/dashboard/summary` — KPI counts
   - `GET /api/alerts?type=all|rotting|looping|conformance` — consolidated red list sorted by risk_score desc
   - `GET /api/files/{file_id}/journey` — file metadata + events + AI insight
   - `GET /api/employees/{employee_id}/workload` — per-person stats
   - `GET /api/org/tree` — employee hierarchy with file counts
   - `POST /api/alerts/{alert_id}/ai-insight` — regenerate single insight

2. **`tests/test_validation.py`** — end-to-end: spin up DB, run pipeline, assert all expected alerts present

3. **Frontend** — api/client.js, DashboardPage (Red List), FileDetailPage (ReactFlow journey), WorkloadPage
