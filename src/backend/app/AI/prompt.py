from pydantic import BaseModel, ConfigDict
from typing import Literal

SYSTEM_PROMPT = """You are an administrative workflow analyst. Use only the facts provided. Do not invent information. Use neutral language — say "appears" or "likely." Never use "negligent", "lazy", or "incompetent". Respond with valid JSON only."""

USER_PROMPT_TEMPLATE = """Analyze this e-Office file alert. File Facts: {facts_json}. Respond with ONLY a JSON object with keys: plain_language_summary, likely_blocker, recommended_action, confidence (Low/Medium/High)."""

class OllamaResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    plain_language_summary: str
    likely_blocker: str
    recommended_action: str
    confidence: Literal["Low", "Medium", "High"]

def get_fallback_insight(alert_type: str, context: dict) -> OllamaResponse:
    title = context.get("title", "Unknown File")
    
    if alert_type == "ROTTING":
        holder = context.get("holder", "Unknown")
        days = context.get("days", 0)
        status = context.get("status", "Unknown")
        summary = f"🔴 {title} has been with {holder} for {days} days. Deadline: {status}."
    elif alert_type == "LOOPING":
        a = context.get("a", "Unknown")
        b = context.get("b", "Unknown")
        trips = context.get("trips", 0)
        span = context.get("span", 30)
        summary = f"🟠 {title} has bounced between {a} and {b} {trips} times in {span} days."
    elif alert_type == "CONFORMANCE":
        stages = context.get("stages", "Unknown")
        summary = f"🟡 {title} skipped mandatory stage(s): {stages}."
    elif alert_type == "COMPOUND":
        trips = context.get("trips", 0)
        days = context.get("days", 0)
        summary = f"🔴 {title} is looping ({trips} trips) AND stuck ({days} days)."
    else:
        summary = f"Alert for {title}."

    return OllamaResponse(
        plain_language_summary=summary,
        likely_blocker="Unable to determine due to AI service unavailability.",
        recommended_action="Please review the file manually.",
        confidence="Low"
    )
