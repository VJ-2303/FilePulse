import json
import uuid
import httpx
from datetime import datetime
from app.models import AiInsight, Alert, FileRecord, Event
from config import REFERENCE_NOW
from app.AI.prompt import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, OllamaResponse, get_fallback_insight

OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b-instruct"
OLLAMA_TIMEOUT = 30.0

async def generate_insight(alert: Alert, file_record: FileRecord, events: list[Event], compound: bool = False) -> AiInsight:
    """
    Calls Ollama to generate an AI insight for an alert.
    Uses rule-based fallback on any failure.
    """
    # Build facts payload
    last_events = events[-8:] if len(events) > 8 else events
    events_str = [
        f"[{e.timestamp.strftime('%Y-%m-%d %H:%M')}] {e.action} by {e.from_user_id} to {e.to_user_id}. Note: {e.note_text}"
        for e in last_events
    ]
    
    facts = {
        "file_id": file_record.file_id,
        "title": file_record.title,
        "type": file_record.file_type,
        "priority": file_record.priority,
        "alert_type": "COMPOUND" if compound else alert.alert_type,
        "severity": alert.severity,
        "days_inactive": alert.days_inactive,
        "loop_round_trips": alert.loop_round_trips,
        "skipped_stages": alert.skipped_stages,
        "last_events": events_str
    }
    
    prompt = USER_PROMPT_TEMPLATE.format(facts_json=json.dumps(facts))
    
    payload = {
        "model": OLLAMA_MODEL,
        "system": SYSTEM_PROMPT,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0,
            "top_p": 0.9,
            "num_predict": 250,
            "num_ctx": 2048
        }
    }

    insight_id = str(uuid.uuid4())
    generated_at = datetime.fromisoformat(REFERENCE_NOW)
    
    # Prepare fallback context
    fallback_context = {
        "title": file_record.title,
        "holder": file_record.current_holder_id,
        "days": alert.days_inactive,
        "status": "Overdue" if alert.is_overdue else "Active",
        "a": alert.loop_party_a,
        "b": alert.loop_party_b,
        "trips": alert.loop_round_trips,
        "span": 30, # Default from config LOOP_WINDOW_DAYS
        "stages": alert.skipped_stages
    }
    alert_type_for_fallback = "COMPOUND" if compound else alert.alert_type

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(OLLAMA_API_URL, json=payload)
            response.raise_for_status()
            
            data = response.json()
            result_json = data.get("response", "{}")
            
            # Pydantic validation
            parsed_response = OllamaResponse.model_validate_json(result_json)
            
            return AiInsight(
                insight_id=insight_id,
                alert_id=alert.alert_id,
                plain_language_summary=parsed_response.plain_language_summary,
                likely_blocker=parsed_response.likely_blocker,
                recommended_action=parsed_response.recommended_action,
                confidence=parsed_response.confidence,
                source="ollama",
                generated_at=generated_at
            )
            
    except (httpx.RequestError, httpx.HTTPStatusError, ValueError, Exception) as e:
        # Fallback on any failure
        fallback_resp = get_fallback_insight(alert_type_for_fallback, fallback_context)
        return AiInsight(
            insight_id=insight_id,
            alert_id=alert.alert_id,
            plain_language_summary=fallback_resp.plain_language_summary,
            likely_blocker=fallback_resp.likely_blocker,
            recommended_action=fallback_resp.recommended_action,
            confidence=fallback_resp.confidence,
            source="fallback",
            generated_at=generated_at
        )
