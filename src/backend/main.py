from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import get_connection, ingest_csv_data, init_db

app = FastAPI(title="FilePulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    with get_connection() as conn:
        init_db(conn)
        ingest_csv_data(conn)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "project": "FilePulse",
    }
