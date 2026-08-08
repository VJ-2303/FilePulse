import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

REFERENCE_NOW = "2025-03-18T09:00:00"

ROT_THRESHOLDS_DAYS = {
    "WARNING": 15,
    "HIGH": 30,
    "CRITICAL": 45,
    "CAMPAIGN": 90,
}

LOOP_MIN_ROUND_TRIPS = 3
LOOP_WINDOW_DAYS = 30

EXCLUDED_STATUSES = {"Closed", "Archived"}

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "30"))
