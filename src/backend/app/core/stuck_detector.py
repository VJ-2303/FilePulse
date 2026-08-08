import sqlite3
from datetime import datetime

from app.models import Alert, Event, FileRecord, Severity
from config import EXCLUDED_STATUSES, REFERENCE_NOW, ROT_THRESHOLDS_DAYS


SEVERITY_ORDER: list[Severity] = ["WARNING", "HIGH", "CRITICAL", "CAMPAIGN"]

# Ratio thresholds for the expected work span (deadline_at - created_at).
ROT_RATIO_THRESHOLDS = {
    "WARNING": 0.5,
    "HIGH": 1.0,
    "CRITICAL": 1.5,
    "CAMPAIGN": 2.0,
}


def detect_rotting(
    files: list[FileRecord],
    events: list[Event],
    now: datetime | None = None,
) -> list[Alert]:
    reference_time = now or datetime.fromisoformat(REFERENCE_NOW)
    latest_events = _latest_event_by_file(events)
    alerts: list[Alert] = []

    for file_record in files:
        if file_record.current_status in EXCLUDED_STATUSES:
            continue

        last_activity_at = latest_events.get(file_record.file_id, file_record.created_at)
        days_inactive = (reference_time.date() - last_activity_at.date()).days
        expected_span_days = (file_record.deadline_at.date() - file_record.created_at.date()).days
        severity = rotting_severity(days_inactive, expected_span_days)

        if severity is None:
            continue

        is_overdue = file_record.deadline_at < reference_time
        if is_overdue:
            severity = escalate_severity(severity)

        alerts.append(
            Alert(
                alert_id=f"ROT-{file_record.file_id}",
                file_id=file_record.file_id,
                alert_type="ROTTING",
                severity=severity,
                risk_score=0,
                days_inactive=days_inactive,
                days_to_deadline=(file_record.deadline_at.date() - reference_time.date()).days,
                is_overdue=is_overdue,
                detected_at=reference_time,
            )
        )

    return alerts


def detect_rotting_from_db(
    conn: sqlite3.Connection,
    now: datetime | None = None,
) -> list[Alert]:
    files = [
        FileRecord.model_validate(dict(row))
        for row in conn.execute("SELECT * FROM files").fetchall()
    ]
    events = [
        Event.model_validate(_event_row_without_is_transfer(dict(row)))
        for row in conn.execute("SELECT * FROM events").fetchall()
    ]
    return detect_rotting(files, events, now)


def rotting_severity(days_inactive: int, expected_span_days: int) -> Severity | None:
    # Official guideline: any active file inactive > 90 days must be reviewed.
    if days_inactive >= ROT_THRESHOLDS_DAYS["CAMPAIGN"]:
        return "CAMPAIGN"

    # No valid expected span (zero/negative deadline window) — fall back to absolute days.
    if expected_span_days <= 0:
        for severity in reversed(SEVERITY_ORDER):
            if days_inactive >= ROT_THRESHOLDS_DAYS[severity]:
                return severity
        return None

    # Ratio-based: how far past the expected work span has the file gone?
    rot_ratio = days_inactive / expected_span_days
    for severity in reversed(SEVERITY_ORDER):
        if rot_ratio >= ROT_RATIO_THRESHOLDS[severity]:
            return severity
    return None


def escalate_severity(severity: Severity) -> Severity:
    current_index = SEVERITY_ORDER.index(severity)
    next_index = min(current_index + 1, len(SEVERITY_ORDER) - 1)
    return SEVERITY_ORDER[next_index]


def _latest_event_by_file(events: list[Event]) -> dict[str, datetime]:
    latest: dict[str, datetime] = {}
    for event in sorted(events, key=lambda item: (item.file_id, item.timestamp, item.event_id)):
        latest[event.file_id] = event.timestamp
    return latest


def _event_row_without_is_transfer(row: dict) -> dict:
    row.pop("is_transfer", None)
    return row
