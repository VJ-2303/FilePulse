import asyncio
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from app.AI.ollama_service import generate_insight
from app.core.alert_consolidator import consolidate_alerts
from app.core.conformance_detector import detect_conformance_from_db
from app.core.loop_detector import detect_looping_from_db
from app.core.risk_scorer import score_alerts_from_db
from app.core.stuck_detector import detect_rotting_from_db
from app.db import DATA_DIR, ingest_csv_data, init_db, insert_ai_insights, insert_alerts
from app.models import AiInsight, Alert, ConsolidatedAlert, Employee, Event, FileRecord
from config import AI_CALL_DELAY_SECONDS, REFERENCE_NOW



@dataclass(frozen=True)
class PipelineResult:
    alerts: list[Alert]
    consolidated_alerts: list[ConsolidatedAlert]
    insights: list[AiInsight]


async def run_full_pipeline(
    conn: sqlite3.Connection,
    *,
    data_dir: Path = DATA_DIR,
    now: datetime | None = None,
    top_k_ai_insights: int = 10,
) -> PipelineResult:
    """Load mock data, run every deterministic check, and cache ranked insights."""
    if top_k_ai_insights < 0:
        raise ValueError("top_k_ai_insights must be non-negative")

    reference_time = now or datetime.fromisoformat(REFERENCE_NOW)

    # Snapshot any previously generated ollama insights before ingest wipes the DB.
    # Alert IDs are deterministic so we can restore the cache and skip re-calling Ollama.
    cached_insights: dict[str, AiInsight] = _load_ollama_insights(conn)

    init_db(conn)
    ingest_csv_data(conn, data_dir)

    detected_alerts = (
        detect_rotting_from_db(conn, reference_time)
        + detect_looping_from_db(conn, reference_time)
        + detect_conformance_from_db(conn, reference_time)
    )
    scored_alerts = score_alerts_from_db(conn, detected_alerts, reference_time)
    insert_alerts(conn, scored_alerts)

    files, employees, events = _load_data(conn)
    insights = await _generate_top_insights(
        scored_alerts, files, events, top_k_ai_insights, cached_insights
    )
    insert_ai_insights(conn, insights)
    consolidated_alerts = consolidate_alerts(scored_alerts, files, employees, insights)
    return PipelineResult(scored_alerts, consolidated_alerts, insights)


def _load_data(
    conn: sqlite3.Connection,
) -> tuple[list[FileRecord], list[Employee], list[Event]]:
    files = [FileRecord.model_validate(dict(row)) for row in conn.execute("SELECT * FROM files")]
    employees = [
        Employee.model_validate(dict(row)) for row in conn.execute("SELECT * FROM employees")
    ]
    events = [
        Event.model_validate(_event_data(dict(row)))
        for row in conn.execute("SELECT * FROM events ORDER BY file_id, timestamp, event_id")
    ]
    return files, employees, events


async def _generate_top_insights(
    alerts: list[Alert],
    files: list[FileRecord],
    events: list[Event],
    top_k: int,
    cached_insights: dict[str, AiInsight] | None = None,
) -> list[AiInsight]:
    files_by_id = {file_record.file_id: file_record for file_record in files}
    events_by_file: dict[str, list[Event]] = {}
    for event in events:
        events_by_file.setdefault(event.file_id, []).append(event)

    alerts_by_file: dict[str, list[Alert]] = {}
    for alert in alerts:
        alerts_by_file.setdefault(alert.file_id, []).append(alert)

    primary_alerts = [
        max(file_alerts, key=lambda alert: alert.risk_score)
        for file_alerts in alerts_by_file.values()
    ]
    primary_alerts.sort(key=lambda alert: (-alert.risk_score, alert.file_id, alert.alert_id))

    cache = cached_insights or {}
    insights: list[AiInsight] = []
    generated_count = 0

    for alert in primary_alerts[:top_k]:
        # Serve from cache if a prior ollama insight exists for this alert_id.
        if alert.alert_id in cache:
            insights.append(cache[alert.alert_id])
            continue

        if generated_count > 0 and AI_CALL_DELAY_SECONDS > 0:
            await asyncio.sleep(AI_CALL_DELAY_SECONDS)

        alert_types = {item.alert_type for item in alerts_by_file[alert.file_id]}
        insights.append(
            await generate_insight(
                alert,
                files_by_id[alert.file_id],
                events_by_file.get(alert.file_id, []),
                compound={"ROTTING", "LOOPING"}.issubset(alert_types),
            )
        )
        generated_count += 1
    return insights



def _load_ollama_insights(conn: sqlite3.Connection) -> dict[str, AiInsight]:
    """Return a mapping of alert_id → AiInsight for all cached insights in DB."""
    try:
        rows = conn.execute(
            "SELECT * FROM ai_insights"
        ).fetchall()
        return {row["alert_id"]: AiInsight.model_validate(dict(row)) for row in rows}
    except Exception:
        # Table may not exist yet on first boot.
        return {}



def _event_data(row: dict) -> dict:
    row.pop("is_transfer", None)
    return row
