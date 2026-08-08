# PROGRESS.md

## Current Phase: Data

## Completed
_(none yet)_

## In Progress / Blocked
- [ ] Nothing started yet — awaiting first implementation task

## Decisions Log

| Time | Decision | Reason | Approved by |
|---|---|---|---|
| 2026-08-08T11:37 | REFERENCE_NOW = 2025-03-18T09:00:00 (frozen) | Demo narrative requires fixed clock | SPECS.md |
| 2026-08-08T11:37 | Calendar-day math (.date() subtraction) for days_inactive | Matches scenario: Feb 1 → Mar 18 = 45 days exactly | detection_algorithms.md |
| 2026-08-08T11:37 | Risk score weights: 0.35 age / 0.25 deadline / 0.20 loop / 0.10 priority / 0.10 workload | detection_algorithms.md §6 | detection_algorithms.md |
| 2026-08-08T11:37 | data file is named employee.csv (not employees.csv) on disk | Observed actual data/ directory | filesystem |

## Codebase State Snapshot (as of 2026-08-08)

### Backend (src/backend/)
| File | Status | Notes |
|---|---|---|
| config.py | ✅ Done | REFERENCE_NOW, thresholds, excluded statuses — all correct |
| main.py | 🟡 Skeleton | FastAPI app + CORS only. No ingestion, no routes mounted |
| app/db.py | Done | SQLite init + CSV ingestion implemented |
| app/api/routes.py | ❌ Missing | All 6 endpoints not implemented |
| app/core/stuck_detector.py | ❌ Missing | Rotting detection not implemented |
| app/core/loop_detector.py | ❌ Missing | Loop detection not implemented |
| app/core/risk_scorer.py | ❌ Missing | Risk scoring not implemented |
| app/ai/ollama_service.py | ❌ Missing | Ollama call + fallback not implemented |
| app/ai/prompts.py | ❌ Missing | Prompt templates not implemented |
| tests/test_validation.py | ❌ Missing | Validation tests not implemented |

### Frontend (src/frontend/src/)
| File | Status | Notes |
|---|---|---|
| App.jsx | 🟡 Vite default | Still shows the default Vite starter — needs full replacement |
| pages/ | ❌ Missing | DashboardPage, FileDetailPage, WorkloadPage not created |
| components/ | ❌ Missing | No components yet |
| api/client.js | ❌ Missing | API client not created |

### Data (src/backend/data/)
| File | Status | Notes |
|---|---|---|
| employee.csv | ✅ Present | 9 employees (E090–E302). Note: filename is employee.csv not employees.csv |
| files.csv | ✅ Present | 12 files (11 active, 1 Closed: F9310) |
| events.csv | ✅ Present | 60 events (EV1001–EV1059) |

## Key Data Facts (from manual scan)

### Known Alert Candidates (Active files only)
| File | Priority | Holder | Last Event | Days Inactive | Notes |
|---|---|---|---|---|---|
| F4921 | High | E101 (Amit) | 2025-02-01 | 45 days | CRITICAL rotting. Canonical school roof example. |
| F5518 | Medium | E103 (Kavita) | 2024-09-05 | 194 days | CAMPAIGN rotting. Overdue (deadline 2024-11-30). Extreme case. |
| F6624 | Medium | E302 (Das) | 2025-02-21 | 25 days | HIGH rotting. Also LOOPING: E302 <-> E201 has 3 RT. Compound alert. |
| F8832 | Medium | E102 (Priya) | 2025-03-13 | 5 days | Borderline LOOPING: E102 <-> E201 (3 CL_REQ, 2 CL_PROV = 2 RT). |
| F2210 | Low | E103 (Kavita) | 2025-02-26 | 20 days | WARNING rotting. |
| F8123 | High | E202 (Gupta) | 2025-03-03 | 15 days | WARNING rotting. Holder on leave (note EV1046). Overdue (deadline 2025-03-20). |
| F7741 | Medium | E100 (Iyer) | 2025-03-06 | 12 days | Below WARNING threshold. |
| F9555 | Low | E101 (Amit) | 2025-03-17 | 1 day | No alert (Saturday receipt, assigned Monday). |
| F9034 | Low | E101 (Amit) | 2025-03-16 | 2 days | No alert. 1 RT (E101 <-> E201) — below LOOP_MIN_ROUND_TRIPS=3. |
| F1104 | High | E100 (Iyer) | 2025-03-17 | 1 day | No rot. Check conformance for Service Benefits stage order. |
| F3305 | High | E100 (Iyer) | 2025-03-14 | 4 days | No alert. |

### Conformance Alerts (Preliminary)
| File | Type | Skipped Stages |
|---|---|---|
| F7741 | Records | Initial Review + Verification skipped (jumped Receipt → Approval directly) |

## Next Up
1. Implement app/db.py — SQLite init (5 tables) + CSV ingestion from data/ directory
2. Implement app/core/stuck_detector.py — Rotting detection per detection_algorithms.md §4
3. Implement app/core/loop_detector.py — Loop detection (user-level + dept-level) per §5
4. Implement app/core/risk_scorer.py — Risk scoring formula per §6
5. Wire main.py to run all detectors on startup and cache top-10 AI insights
6. Implement app/api/routes.py — All 6 endpoints per SPECS.md §8
7. Implement app/ai/ollama_service.py + prompts.py — Ollama call + fallback
8. Implement frontend: App.jsx routing, pages (Dashboard, FileDetail, Workload)
9. Write tests/test_validation.py
