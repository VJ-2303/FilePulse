import sqlite3
from datetime import datetime

from app.models import Alert, Event, FileRecord
from config import EXCLUDED_STATUSES, REFERENCE_NOW

STAGE_SEQUENCES: dict[str, list[str]] = {
    "Infrastructure": ["Receipt", "Initial Review", "Budget Check", "Approval", "Dispatch"],
    "Procurement": ["Creation", "Initial Review", "Budget Check", "Approval", "Dispatch"],
    "Service Benefits": ["Receipt", "Verification", "Pension Verification", "Approval", "Dispatch"],
    "Training": ["Creation", "Initial Review", "Approval", "Dispatch"],
    "Records": ["Receipt", "Initial Review", "Verification", "Approval", "Dispatch"],
    "Welfare": ["Creation", "Initial Review", "Funds Verification", "Approval", "Dispatch"],
    "HR": ["Creation", "Initial Review", "Approval", "Dispatch"],
    "Administration": ["Receipt", "Initial Review", "Approval", "Dispatch"],
}


def detect_conformance(
    files: list[FileRecord],
    events: list[Event],
    now: datetime | None = None,
) -> list[Alert]:
    detected_at = now or datetime.fromisoformat(REFERENCE_NOW)

    events_by_file: dict[str, list[Event]] = {}
    for event in events:
        events_by_file.setdefault(event.file_id, []).append(event)

    alerts: list[Alert] = []

    for file_record in files:
        if file_record.current_status in EXCLUDED_STATUSES:
            continue

        expected_sequence = STAGE_SEQUENCES.get(file_record.file_type)
        if not expected_sequence:
            continue

        file_events = events_by_file.get(file_record.file_id, [])
        visited_stages = {e.stage for e in file_events}

        # Find the furthest stage reached in the expected sequence
        furthest_index = -1
        for idx, stage in enumerate(expected_sequence):
            if stage in visited_stages:
                furthest_index = idx

        if furthest_index <= 0:
            continue

        # Find any mandatory stage before furthest_index that was never visited
        skipped = [
            stage
            for idx, stage in enumerate(expected_sequence[:furthest_index])
            if stage not in visited_stages
        ]

        if skipped:
            alerts.append(
                Alert(
                    alert_id=f"CONF-{file_record.file_id}",
                    file_id=file_record.file_id,
                    alert_type="CONFORMANCE",
                    severity="WARNING",
                    risk_score=0,
                    skipped_stages=", ".join(skipped),
                    detected_at=detected_at,
                )
            )

    return alerts


def detect_conformance_from_db(
    conn: sqlite3.Connection,
    now: datetime | None = None,
) -> list[Alert]:
    files = [FileRecord.model_validate(dict(row)) for row in conn.execute("SELECT * FROM files")]
    events = [
        Event.model_validate(_event_row_without_is_transfer(dict(row)))
        for row in conn.execute("SELECT * FROM events")
    ]
    return detect_conformance(files, events, now)


def _event_row_without_is_transfer(row: dict) -> dict:
    row.pop("is_transfer", None)
    return row
