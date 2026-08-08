import json
import uuid
from datetime import datetime

import httpx

from app.AI.prompt import OllamaResponse, get_fallback_insight
from app.models import AiInsight, Alert, Event, FileRecord
from config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, REFERENCE_NOW

_OLLAMA_URL = f"{OLLAMA_BASE_URL}/api/generate"


async def generate_insight(
    alert: Alert,
    file_record: FileRecord,
    events: list[Event],
    compound: bool = False,
) -> AiInsight:
    """
    Calls Ollama to generate a plain-language insight for a detected alert.
    Falls back to rule-based text on any failure — the dashboard never breaks.
    """
    events_str = [
        f"[{e.timestamp.strftime('%Y-%m-%d %H:%M')}] {e.action} from {e.from_user_id} to {e.to_user_id}. Note: {e.note_text}"
        for e in events
    ]

    facts = {
        "file_id": file_record.file_id,
        "title": file_record.title,
        "type": file_record.file_type,
        "priority": file_record.priority,
        "deadline_at": file_record.deadline_at.strftime("%Y-%m-%d"),
        "is_overdue": alert.is_overdue,
        "alert_type": "COMPOUND" if compound else alert.alert_type,
        "severity": alert.severity,
        "days_inactive": alert.days_inactive,
        "loop_round_trips": alert.loop_round_trips,
        "skipped_stages": alert.skipped_stages,
        "last_events": events_str,
    }

    payload = {
        "model": OLLAMA_MODEL,
        "system": "You are an administrative workflow analyst. Use only the facts provided. Do not invent information. Use neutral language — say 'appears' or 'likely.' Never use 'negligent', 'lazy', or 'incompetent'. Respond with valid JSON only.",
        "prompt": f"Analyze this e-Office file alert. File Facts: {json.dumps(facts)}. Respond with ONLY a JSON object with keys: plain_language_summary, likely_blocker, recommended_action, confidence (Low/Medium/High).",
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0,
            "top_p": 0.9,
            "num_predict": 250,
            "num_ctx": 2048,
        },
    }

    insight_id = str(uuid.uuid4())
    generated_at = datetime.fromisoformat(REFERENCE_NOW)
    alert_type_for_fallback = "COMPOUND" if compound else alert.alert_type

    fallback_context = {
        "title": file_record.title,
        "holder": file_record.current_holder_id,
        "days": alert.days_inactive,
        "status": "Overdue" if alert.is_overdue else "Active",
        "a": alert.loop_party_a,
        "b": alert.loop_party_b,
        "trips": alert.loop_round_trips,
        "span": 30,
        "stages": alert.skipped_stages,
    }

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(_OLLAMA_URL, json=payload)
            response.raise_for_status()
            parsed = OllamaResponse.model_validate_json(response.json().get("response", "{}"))

        return AiInsight(
            insight_id=insight_id,
            alert_id=alert.alert_id,
            plain_language_summary=parsed.plain_language_summary,
            likely_blocker=parsed.likely_blocker,
            recommended_action=parsed.recommended_action,
            confidence=parsed.confidence,
            source="ollama",
            generated_at=generated_at,
        )

    except Exception:
        fallback = get_fallback_insight(alert_type_for_fallback, fallback_context)
        return AiInsight(
            insight_id=insight_id,
            alert_id=alert.alert_id,
            plain_language_summary=fallback.plain_language_summary,
            likely_blocker=fallback.likely_blocker,
            recommended_action=fallback.recommended_action,
            confidence=fallback.confidence,
            source="fallback",
            generated_at=generated_at,
        )
