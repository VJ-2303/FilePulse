# Future PMs — FilePulse (Team 067)

**FilePulse** is an AI-powered Early Warning Radar for e-Office File Bottlenecks. Built for the Tech for Good 2026 Hackathon (Strong Institutions track).

It transforms passive e-Office logs into an active diagnostic tool by deterministically detecting stuck ("rotting") and bouncing ("looping") files, explaining them using a local AI model, and surfacing them in a React dashboard.

## Quick Start

### Backend
Requires Python 3.11+ and `uv`.
```bash
cd src/backend
cp .env.example .env
uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend
Requires Node.js 18+.
```bash
cd src/frontend
npm install
npm run dev
```

### AI Requirements
Ensure [Ollama](https://ollama.com) is installed and running locally with the required model:
```bash
ollama run qwen2.5:7b-instruct
```

## Documentation Guide

The project is heavily documented to ensure consistency. Read these files to understand the system:

| File | Purpose |
|------|---------|
| `README.md` | This file; project overview and setup instructions. |
| `SPECS.md` | Complete product specification, target user persona, and API design. |
| `PROPOSAL.md` | The high-level problem statement, architecture diagram, and tech stack. |
| `AGENTS.md` | Strict project rules, tech stack constraints, and development guidelines. |
| `PROGRESS.md` | Living task tracker, codebase state snapshot, and decision log. |
| `MILESTONES.md` | Hackathon timeline and checklist. |
| `docs/detection_algorithms.md` | The exact logic and math behind the Rotting and Looping detection engines. |

## Repository Layout
- `/src/backend`: FastAPI application, SQLite ingestion, and Detection Engine.
- `/src/frontend`: React (Vite) dashboard application.
- `/docs`: Detailed architectural and algorithmic documentation.

— Team 067
