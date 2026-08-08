# PROGRESS.md

## Current Phase: Detection

## In Progress / Blocked

- [ ] app/core/stuck_detector.py — rotting detection not implemented
- [ ] app/core/loop_detector.py — loop detection not implemented
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
| 2026-08-08 | AI folder named AI (uppercase) on disk | Matches current imports in ollama_service.py — do not rename |
| 2026-08-08 | Ollama constants (URL, model, timeout) sourced from config.py via os.getenv | Single source of truth; .env overrides without code changes |

## Codebase State

### Backend (src/backend/)

| File | Status |
|---|---|
| config.py | Done — REFERENCE_NOW, thresholds, OLLAMA_BASE_URL/MODEL/TIMEOUT from env |
| main.py | Partial — init_db + ingest_csv_data on startup; detectors and routes not mounted yet |
| app/models.py | Done — Employee, FileRecord, Event, Alert, AiInsight (Pydantic v2) |
| app/db.py | Done — 5 tables, CSV ingestion, insert_alerts, insert_ai_insights |
| app/AI/prompt.py | Done — SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, OllamaResponse, get_fallback_insight |
| app/AI/ollama_service.py | Done — generate_insight(), async httpx, Pydantic validation, single except Exception fallback |
| app/core/stuck_detector.py | Missing |
| app/core/loop_detector.py | Missing |
| app/core/risk_scorer.py | Missing |
| app/api/routes.py | Missing |
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

## Expected Alerts from Mock Data (reference for tests)

| File | Days Inactive | Expected Detection |
|---|---|---|
| F5518 | 194 | CAMPAIGN rotting + OVERDUE |
| F4921 | 45 | CRITICAL rotting |
| F6624 | 25 | HIGH rotting + LOOPING (E302 <-> E201, 3 RT) = COMPOUND |
| F2210 | 20 | WARNING rotting |
| F8123 | 15 | WARNING rotting + OVERDUE (holder on leave) |
| F7741 | — | CONFORMANCE — Initial Review + Verification skipped |
| F8832 | — | No alert — 2 RT only, below LOOP_MIN_ROUND_TRIPS=3 |

## Next Up

1. app/core/stuck_detector.py — severity ladder, overdue modifier, calendar-day math
2. app/core/loop_detector.py — user-level then dept-level, 30-day window, min 3 RT
3. app/core/risk_scorer.py — deterministic 0-100 formula + compound +15 bonus
4. Wire detectors into main.py startup — store alerts, pre-generate top-10 AI insights
5. app/api/routes.py — 6 endpoints (summary, alerts, journey, workload, org/tree, regenerate)
6. Mount routes in main.py
7. tests/test_validation.py — assert expected alerts table above
8. Frontend — api/client.js, DashboardPage, FileDetailPage (ReactFlow), WorkloadPage
