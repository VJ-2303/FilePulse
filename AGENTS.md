# AGENTS.md — FilePulse AI Agent Constitution

> **Read this ENTIRE file before writing any code.** 
> Read `SPECS.md` for feature details. Read `docs/detection_algorithms.md` for math/logic.
> Update `PROGRESS.md` after every completed task.

---

## 1. Project Identity
- **Name:** FilePulse — AI Early Warning Radar for e-Office File Bottlenecks
- **Target User:** Mr. Iyer (Section Officer, manages 150 files, 3 Junior Assistants).
- **Core Loop:** Ingest mock CSV logs → Deterministic Python detection (Rotting/Looping) → Local Ollama AI explanation → React Dashboard.

## 2. CRITICAL RULES (DO NOT VIOLATE)
1. **NO CLOUD AI:** Must run locally via Ollama (`http://localhost:11434`). No OpenAI/Anthropic/AWS SDKs.
2. **NO BLOATED AI:** No chatbots. AI ONLY generates JSON insights for detected alerts.
3. **DO NOT MODIFY MOCK DATA:** `/backend/data/*.csv` are strictly typed. Write ingestion to match them.
4. **DETERMINISTIC DETECTION:** Implement exact logic from `docs/detection_algorithms.md`. No ML models for detection.
5. **CALENDAR DAYS:** Use `.date()` subtraction for "days inactive", NOT datetime timedelta.
6. **REFERENCE CLOCK:** Never use `datetime.now()`. Always use `REFERENCE_NOW` from `backend/config.py`.
7. **Clean Code:** Write clean, write comments only when necessary. dont write comments that are redundant or unnecessary.

## 3. LOCKED TECH STACK
| Layer | Locked Choice | Banned in MVP |
|---|---|---|
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic v2, Pandas, `sqlite3` (stdlib), `httpx` | SQLAlchemy, PM4Py, Celery, Docker, LangChain |
| **Frontend** | React 18, Vite 5, JS (no TS), Tailwind 3.4, `reactflow@11`, `react-router-dom@6` | Redux, Zustand, Axios, TanStack Query, TypeScript |
| **AI** | Ollama REST (`qwen2.5:7b-instruct`), `temp: 0`, `format: "json"` | Cloud LLMs, Vector DBs, RAG pipelines |

## 4. REPOSITORY LAYOUT (Strict)
src
├── backend/
│   ├── main.py              # FastAPI app + CORS + CSV ingestion on startup
│   ├── config.py            # REFERENCE_NOW + thresholds
│   ├── app/
│   │   ├── api/routes.py    # Endpoints
│   │   ├── core/            # stuck_detector.py, loop_detector.py, risk_scorer.py
│   │   ├── ai/              # ollama_service.py, prompts.py, 
│   │   └── db.py            # sqlite3 init
│   ├── data/            # employees.csv, files.csv, events.csv (READ ONLY)
│   └── tests/test_validation.py
└── frontend/
    └── src/
        ├── App.jsx          
        ├── pages/           
        ├── components/      
        └── api/client.js    

## 6. AI / OLLAMA RULES
1. **Payload:** Send ONLY structured facts (metadata, counts, last 8 events, note snippets). Never raw DB dumps.
2. **Schema:** Enforce Pydantic validation on Ollama's JSON output: `{"plain_language_summary": "", "likely_blocker": "", "recommended_action": "", "confidence": ""}`.
3. **Resilience:** Wrap every Ollama call in `try/except` with a 30s timeout.
4. **Caching:** Pre-generate insights for top 10 risk-scored alerts at startup. Cache in SQLite. Do not call Ollama per UI render.
5. **Tone:** Neutral administrative analyst. Use "appears" or "likely". Never assign definitive blame.

## 7. AGENT WORKFLOW PROTOCOL
1. **READ** `SPECS.md` and `docs/detection_algorithms.md` before coding.
2. **PLAN** in ≤5 bullets. If ambiguous → **ASK human**. Never invent features.
3. **IMPLEMENT** in smallest increments.
4. **VERIFY** .
5. **LOG** in `PROGRESS.md` immediately. No log = not done.
6. **COMMIT** small, descriptive messages (`feat: loop detector`).

## 8. PROGRESS.md FORMAT
```markdown
# PROGRESS.md
## Current Phase: <Data | Detection | API | UI | AI | Polish>
## Completed
- [x] <timestamp> <what> — verified by <test/render>
## In Progress / Blocked
- [ ] <what> | <blocker>
## Decisions Log
| Time | Decision | Reason | Approved by |
## Next Up
1. ...
```

## 9. SCOPE GUARD (Instant Reject List)
Auth/login • real e-Office API integration • Docker/CI/CD • PM4Py • citizen portal • chatbot page • auto-reassignment execution • mobile app • PDF export • email/SMS alerts • any DB other than SQLite
