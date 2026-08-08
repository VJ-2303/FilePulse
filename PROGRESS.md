# PROGRESS.md

## Current Phase: API

---

## Completed

- [x] 2026-08-08 18:06 +05:30 Restored frontend API client to use the Vite proxy and verified the file detail page loads through the local backend - checked by browser render and backend `200` responses

- [x] 2026-08-08 18:43 +05:30 Completed documented API endpoints in `app/api/routes.py` and documented 4xx error envelope in `main.py` - verified by `python -m pytest tests` from `src/backend` (25 passed)

---

## Codebase State

### Backend (src/backend/)

| File | Status |
|---|---|
| config.py | Done — thresholds, REFERENCE_NOW, Ollama constants from `.env` via `load_dotenv` |
| main.py | Done — CORS, startup pipeline, `/api/health` |
| app/models.py | Done — Employee, FileRecord, Event, Alert, AiInsight, ConsolidatedAlert |
| app/db.py | Done — 5 tables, CSV ingestion, insert_alerts, insert_ai_insights |
| app/AI/prompt.py | Done |
| app/AI/ollama_service.py | Done — async httpx, Pydantic validation, single `except Exception` fallback |
| app/core/stuck_detector.py | Done — 4/4 tests passing |
| app/core/loop_detector.py | Done — 3/3 tests passing |
| app/core/conformance_detector.py | Done — 3/3 tests passing |
| app/core/risk_scorer.py | Done — 3/3 tests passing |
| app/core/alert_consolidator.py | Done — 6/6 tests passing |
| app/core/orchestrator.py | Done — full pipeline with insight cache (no repeat Ollama calls on restart) |
| app/api/routes.py | Done — all 7 endpoints fully implemented against specs |
| tests/test_stuck_detector.py | Done — 4 tests |
| tests/test_loop_detector.py | Done — 3 tests |
| tests/test_conformance_detector.py | Done — 3 tests |
| tests/test_risk_scorer.py | Done — 3 tests |
| tests/test_alert_consolidator.py | Done — 6 tests |
| tests/test_dashboard_summary.py | Done — 1 test |
| tests/test_api_endpoints.py | Done — 11 endpoint validation tests |
| tests/test_api_routes.py | Done — 5 internal builder tests |
| tests/test_validation.py | Done — end-to-end pipeline test |

**Tests: 36/36 passing**

### Data (src/backend/data/)

| File | Status |
|---|---|
| employee.csv | Present — 9 employees |
| files.csv | Present — 12 files (11 Active, 1 Closed) |
| events.csv | Present — 59 events |
| filepulse.sqlite3 | Live — populated by startup pipeline |

### Frontend (src/frontend/src/)

| File | Status |
|---|---|
| App.jsx / main.jsx / index.css | Vite default — untouched |
| pages/, components/, api/ | All missing |

---

## Verified Pipeline Output (live from DB, 2025-03-18 reference)

### Alerts — 11 stored, 7 consolidated

| File | Alert Types | Severity | Score | Overdue |
|---|---|---|---|---|
| F5518 | ROTTING | CAMPAIGN | 66 | Yes — 108 days past deadline |
| F4921 | ROTTING | CRITICAL | 47 | No |
| F6624 | ROTTING + LOOPING + CONFORMANCE | HIGH | 45 | No — compound |
| F8123 | ROTTING | WARNING | 39 | No |
| F8832 | LOOPING | HIGH | 24 | No |
| F7741 | CONFORMANCE | WARNING | 17 | No |
| F2210 | ROTTING | WARNING | 11 | No |

Clean files (no alerts, correctly): F1104 (1d), F3305 (4d), F9034 (2d, 1 RT), F9555 (1d)

### AI Insights — 7 cached, source=ollama, all from `qwen2.5:7b-instruct`

All 7 insights are `source="ollama"`. Restart caching is live — subsequent boots serve from SQLite, zero Ollama calls.

---

## Decisions Log

| Time | Decision | Reason |
|---|---|---|
| 2026-08-08 | REFERENCE_NOW = 2025-03-18T09:00:00, never datetime.now() | Frozen clock for reproducible demo |
| 2026-08-08 | Calendar-day math (.date() subtraction) | Feb 1 → Mar 18 = 45 days exact |
| 2026-08-08 | Risk weights: 0.35/0.25/0.20/0.10/0.10 | detection_algorithms.md §6 |
| 2026-08-08 | Compound bonus (+15) in risk_scorer, capped at 100 | SPECS.md §6.7 |
| 2026-08-08 | Loop detector sliding window (not now-anchored) | Catches F6624 whose loop completed in Feb |
| 2026-08-08 | Ollama insight cache keyed by deterministic alert_id | Skips Ollama on restart; cold boot on DB delete |
| 2026-08-08 | load_dotenv in config.py | .env vars reach os.getenv; fixed Ollama URL to 100.98.110.102:11434 |

---

## Next Up

1. **`tests/test_validation.py`** — end-to-end: run pipeline, assert all 11 alerts present with correct scores

2. **Frontend** — `api/client.js`, `DashboardPage` (Red List), `FileDetailPage` (ReactFlow journey), `WorkloadPage`
