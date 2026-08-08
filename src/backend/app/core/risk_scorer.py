import sqlite3
from datetime import datetime

from app.models import Alert, FileRecord
from config import EXCLUDED_STATUSES, REFERENCE_NOW


PRIORITY_FACTOR = {"High": 1.0, "Medium": 0.6, "Low": 0.3}
COMPOUND_BONUS = 15


def score_alerts(
    alerts: list[Alert],
    files: list[FileRecord],
    now: datetime | None = None,
) -> list[Alert]:
    reference_time = now or datetime.fromisoformat(REFERENCE_NOW)
    files_by_id = {file_record.file_id: file_record for file_record in files}
    holder_workloads = _holder_active_file_counts(files)
    compound_file_ids = _compound_file_ids(alerts)
    days_inactive_by_file = _days_inactive_by_file(alerts)
    round_trips_by_file = _round_trips_by_file(alerts)
    scored_alerts: list[Alert] = []

    for alert in alerts:
        file_record = files_by_id[alert.file_id]
        days_to_deadline = _days_to_deadline(alert, file_record, reference_time)
        is_overdue = alert.is_overdue or file_record.deadline_at < reference_time
        risk_score = _risk_score(
            days_inactive=days_inactive_by_file.get(alert.file_id, alert.days_inactive),
            days_to_deadline=days_to_deadline,
            is_overdue=is_overdue,
            round_trips=round_trips_by_file.get(alert.file_id),
            priority=file_record.priority,
            holder_active_files=holder_workloads[file_record.current_holder_id],
        )

        if alert.file_id in compound_file_ids:
            risk_score = min(100, risk_score + COMPOUND_BONUS)

        scored_alerts.append(
            alert.model_copy(
                update={
                    "risk_score": risk_score,
                    "days_to_deadline": days_to_deadline,
                    "is_overdue": is_overdue,
                }
            )
        )

    return scored_alerts


def score_alerts_from_db(
    conn: sqlite3.Connection,
    alerts: list[Alert],
    now: datetime | None = None,
) -> list[Alert]:
    files = [
        FileRecord.model_validate(dict(row))
        for row in conn.execute("SELECT * FROM files").fetchall()
    ]
    return score_alerts(alerts, files, now)


def _risk_score(
    days_inactive: int | None,
    days_to_deadline: int,
    is_overdue: bool,
    round_trips: int | None,
    priority: str,
    holder_active_files: int,
) -> int:
    age_factor = min((days_inactive or 0) / 90, 1.0)
    deadline_proximity = 1.0 if is_overdue else max(0.0, 1 - days_to_deadline / 30)
    loop_intensity = min((round_trips or 0) / 5, 1.0) if round_trips else 0.0
    file_priority = PRIORITY_FACTOR[priority]
    holder_workload = min(holder_active_files / 40, 1.0)

    score = (
        0.35 * age_factor
        + 0.25 * deadline_proximity
        + 0.20 * loop_intensity
        + 0.10 * file_priority
        + 0.10 * holder_workload
    ) * 100
    return max(0, min(100, int(score + 0.5)))


def _days_to_deadline(
    alert: Alert,
    file_record: FileRecord,
    reference_time: datetime,
) -> int:
    if alert.days_to_deadline is not None:
        return alert.days_to_deadline
    return (file_record.deadline_at.date() - reference_time.date()).days


def _holder_active_file_counts(files: list[FileRecord]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for file_record in files:
        if file_record.current_status in EXCLUDED_STATUSES:
            continue
        counts[file_record.current_holder_id] = counts.get(file_record.current_holder_id, 0) + 1
    return counts


def _compound_file_ids(alerts: list[Alert]) -> set[str]:
    alert_types_by_file: dict[str, set[str]] = {}
    for alert in alerts:
        alert_types_by_file.setdefault(alert.file_id, set()).add(alert.alert_type)
    return {
        file_id
        for file_id, alert_types in alert_types_by_file.items()
        if {"ROTTING", "LOOPING"}.issubset(alert_types)
    }


def _days_inactive_by_file(alerts: list[Alert]) -> dict[str, int]:
    days_by_file: dict[str, int] = {}
    for alert in alerts:
        if alert.days_inactive is None:
            continue
        days_by_file[alert.file_id] = max(
            alert.days_inactive,
            days_by_file.get(alert.file_id, 0),
        )
    return days_by_file


def _round_trips_by_file(alerts: list[Alert]) -> dict[str, int]:
    round_trips_by_file: dict[str, int] = {}
    for alert in alerts:
        if alert.loop_round_trips is None:
            continue
        round_trips_by_file[alert.file_id] = max(
            alert.loop_round_trips,
            round_trips_by_file.get(alert.file_id, 0),
        )
    return round_trips_by_file
