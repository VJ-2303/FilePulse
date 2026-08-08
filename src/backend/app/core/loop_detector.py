import sqlite3
from collections import Counter
from datetime import datetime, timedelta
from typing import Callable

from app.models import Alert, Employee, Event, FileRecord
from config import EXCLUDED_STATUSES, LOOP_MIN_ROUND_TRIPS, LOOP_WINDOW_DAYS, REFERENCE_NOW


TRANSFER_ACTIONS = {
    "ASSIGNED",
    "FORWARDED",
    "RETURNED",
    "CLARIFICATION_REQUESTED",
    "CLARIFICATION_PROVIDED",
}
PairResolver = Callable[[Event], tuple[str | None, str | None]]
PairEvent = tuple[Event, str, str]


def detect_looping(
    files: list[FileRecord],
    events: list[Event],
    employees: list[Employee],
    now: datetime | None = None,
) -> list[Alert]:
    detected_at = now or datetime.fromisoformat(REFERENCE_NOW)
    active_file_ids = {
        file_record.file_id
        for file_record in files
        if file_record.current_status not in EXCLUDED_STATUSES
    }
    transfers_by_file: dict[str, list[Event]] = {}
    for event in events:
        if event.file_id in active_file_ids and _is_real_transfer(event):
            transfers_by_file.setdefault(event.file_id, []).append(event)

    department_by_employee = {
        employee.employee_id: employee.department for employee in employees
    }
    alerts: list[Alert] = []
    for file_id, transfers in transfers_by_file.items():
        ordered_transfers = sorted(transfers, key=lambda item: (item.timestamp, item.event_id))
        alerts.extend(
            _detect_granularity(
                file_id,
                ordered_transfers,
                "USER",
                lambda event: (event.from_user_id, event.to_user_id),
                detected_at,
            )
        )
        alerts.extend(
            _detect_granularity(
                file_id,
                ordered_transfers,
                "DEPARTMENT",
                lambda event: (
                    department_by_employee.get(event.from_user_id),
                    department_by_employee.get(event.to_user_id),
                ),
                detected_at,
            )
        )
    return alerts


def detect_looping_from_db(
    conn: sqlite3.Connection,
    now: datetime | None = None,
) -> list[Alert]:
    files = [FileRecord.model_validate(dict(row)) for row in conn.execute("SELECT * FROM files")]
    events = [
        Event.model_validate(_event_row_without_is_transfer(dict(row)))
        for row in conn.execute("SELECT * FROM events")
    ]
    employees = [Employee.model_validate(dict(row)) for row in conn.execute("SELECT * FROM employees")]
    return detect_looping(files, events, employees, now)


def _detect_granularity(
    file_id: str,
    transfers: list[Event],
    granularity: str,
    resolve_pair: PairResolver,
    detected_at: datetime,
) -> list[Alert]:
    pair_events: dict[tuple[str, str], list[PairEvent]] = {}
    for event in transfers:
        source, target = resolve_pair(event)
        if not source or not target or source == target:
            continue
        party_a, party_b = sorted((source, target))
        pair_events.setdefault((party_a, party_b), []).append((event, source, target))

    alerts: list[Alert] = []
    for (party_a, party_b), exchanges in sorted(pair_events.items()):
        window = _best_reciprocal_window(exchanges, party_a, party_b)
        if window is None:
            continue
        counts = Counter((source, target) for _, source, target in window)
        round_trips = min(counts[(party_a, party_b)], counts[(party_b, party_a)])
        alerts.append(
            Alert(
                alert_id=f"LOOP-{granularity}-{file_id}-{party_a}-{party_b}",
                file_id=file_id,
                alert_type="LOOPING",
                severity="HIGH",
                risk_score=0,
                loop_round_trips=round_trips,
                loop_total_bounces=len(window),
                loop_party_a=party_a,
                loop_party_b=party_b,
                detected_at=detected_at,
            )
        )
    return alerts


def _best_reciprocal_window(
    exchanges: list[PairEvent], party_a: str, party_b: str
) -> list[PairEvent] | None:
    best_window: list[PairEvent] | None = None
    best_round_trips = 0
    ordered = sorted(exchanges, key=lambda item: (item[0].timestamp, item[0].event_id))

    for start_index, (start_event, _, _) in enumerate(ordered):
        end_time = start_event.timestamp + timedelta(days=LOOP_WINDOW_DAYS)
        candidate = [item for item in ordered[start_index:] if item[0].timestamp <= end_time]
        counts = Counter((source, target) for _, source, target in candidate)
        round_trips = min(counts[(party_a, party_b)], counts[(party_b, party_a)])
        if round_trips >= LOOP_MIN_ROUND_TRIPS and round_trips > best_round_trips:
            best_window = candidate
            best_round_trips = round_trips
    return best_window


def _is_real_transfer(event: Event) -> bool:
    return event.action in TRANSFER_ACTIONS and event.from_user_id != event.to_user_id


def _event_row_without_is_transfer(row: dict) -> dict:
    row.pop("is_transfer", None)
    return row
