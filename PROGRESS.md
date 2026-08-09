# PROGRESS.md

## Current Phase: AI Assistant Refinement & Cloud Deployment

---

## Completed

- [x] 2026-08-08 18:06 +05:30 Restored frontend API client to use the Vite proxy and verified the file detail page loads through the local backend.
- [x] 2026-08-08 18:43 +05:30 Completed documented API endpoints in `app/api/routes.py` and documented 4xx error envelope in `main.py`.
- [x] 2026-08-09 00:00 +05:30 Added dashboard weekly clearance histogram and looping identification scatter plot, backed by a new dashboard charts API.
- [x] 2026-08-09 10:58 +05:30 Reworked Organisation Hierarchy into a vertical sibling layout with larger profile nodes and clearer styling.
- [x] 2026-08-09 11:08 +05:30 Tuned Organisation Hierarchy initial viewport and enabled panning/zooming.
- [x] 2026-08-09 11:15 +05:30 Deployed Backend to Railway and Frontend to Vercel. Configured Vercel `vercel.json` rewrites and fixed CORS issues by targeting the production Railway API.
- [x] 2026-08-09 11:20 +05:30 Refactored AI Pipeline: Migrated from local Ollama to OpenRouter API (qwen2.5:7b-instruct) for cloud readiness. Implemented on-demand insight generation with SQLite caching to prevent Railway timeout (502 errors) on startup.
- [x] 2026-08-09 11:40 +05:30 Upgraded AI Assistant (Smart Query Router):
  - Replaced rigid first-match regex with **Multi-Factor Intent Scoring**.
  - Added **Name & Title Resolution** via SQLite fallback when explicit IDs are not mentioned.
  - Implemented **Multi-Entity Context Handling** for comparative queries.
  - Injected **Intent-Specific Prompt Guidance** into system prompts.
  - Added **Context-Aware Drawer Initialization** (Frontend sends active URL route context to backend).

---

## Codebase State

### Backend (src/backend/)

| File | Status |
|---|---|
| config.py | Done — thresholds, REFERENCE_NOW, OpenRouter constants |
| main.py | Done — CORS, non-blocking on-demand startup pipeline |
| app/models.py | Done — Employee, FileRecord, Event, Alert, AiInsight, ConsolidatedAlert |
| app/db.py | Done — SQLite operations |
| app/ai/assistant.py | Done — Smart Query Router, Intent classification, Name resolution |
| app/ai/assistant_prompts.py | Done — Intent-specific dynamic prompts |
| app/AI/openrouter_service.py | Done — async httpx, single `except Exception` fallback to OpenRouter |
| app/core/orchestrator.py | Done — on-demand insight generation with caching |
| app/api/routes.py | Done — integrated assistant chat and all 7 core endpoints |
| tests/ | Done — 36/36 passing |

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
| components/AssistantPanel.jsx | Done — UI Drawer with URL-aware context payload |
| api/client.js | Done — fetch commands wired to Railway prod |
| vercel.json | Done — Proxy rewrites for `/api` |

---

## Decisions Log

| Time | Decision | Reason |
|---|---|---|
| 2026-08-08 | REFERENCE_NOW = 2025-03-18T09:00:00 | Frozen clock for reproducible demo |
| 2026-08-08 | Calendar-day math (.date() subtraction) | Feb 1 → Mar 18 = 45 days exact |
| 2026-08-09 | Migrate to OpenRouter API | Cloud deployment (Railway) required an accessible LLM endpoint since local Ollama doesn't scale to PaaS directly. |
| 2026-08-09 | On-Demand AI Generation | Pre-generating insights on boot caused Railway to timeout (502). Async on-demand solves this. |
| 2026-08-09 | Context-Aware AI Routing | Enhance UX so the LLM intuitively knows which file the user is viewing when the drawer opens. |

---

## Next Up

1. **Monitor Deployments** — Verify long-term stability of the Railway & Vercel deployment.
2. **Review Feedback** — Check if Mr. Iyer requires any UX/UI polishing on the dashboard components.
