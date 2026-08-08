from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.orchestrator import run_full_pipeline
from app.db import get_connection

app = FastAPI(title="FilePulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    with get_connection() as conn:
        await run_full_pipeline(conn, top_k_ai_insights=10)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "project": "FilePulse",
    }
