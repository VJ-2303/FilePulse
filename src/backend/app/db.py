import csv
import sqlite3
from collections.abc import Iterable
from pathlib import Path

from app.models import AiInsight, Alert, Employee, Event, FileRecord


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DB_PATH = BASE_DIR / "filepulse.sqlite3"


def get_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS employees (
            employee_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            department TEXT NOT NULL,
            manager_id TEXT,
            FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
        );

        CREATE TABLE IF NOT EXISTS files (
            file_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            file_type TEXT NOT NULL,
            priority TEXT NOT NULL,
            created_at TEXT NOT NULL,
            deadline_at TEXT NOT NULL,
            current_holder_id TEXT NOT NULL,
            current_status TEXT NOT NULL,
            FOREIGN KEY (current_holder_id) REFERENCES employees(employee_id)
        );

        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            file_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            from_user_id TEXT NOT NULL,
            to_user_id TEXT NOT NULL,
            department TEXT NOT NULL,
            stage TEXT NOT NULL,
            note_text TEXT NOT NULL,
            is_transfer INTEGER NOT NULL,
            FOREIGN KEY (file_id) REFERENCES files(file_id),
            FOREIGN KEY (from_user_id) REFERENCES employees(employee_id),
            FOREIGN KEY (to_user_id) REFERENCES employees(employee_id)
        );

        CREATE TABLE IF NOT EXISTS alerts (
            alert_id TEXT PRIMARY KEY,
            file_id TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            days_inactive INTEGER,
            days_to_deadline INTEGER,
            is_overdue INTEGER NOT NULL,
            loop_round_trips INTEGER,
            loop_total_bounces INTEGER,
            loop_party_a TEXT,
            loop_party_b TEXT,
            skipped_stages TEXT,
            detected_at TEXT NOT NULL,
            FOREIGN KEY (file_id) REFERENCES files(file_id)
        );

        CREATE TABLE IF NOT EXISTS ai_insights (
            insight_id TEXT PRIMARY KEY,
            alert_id TEXT NOT NULL,
            plain_language_summary TEXT NOT NULL,
            likely_blocker TEXT NOT NULL,
            recommended_action TEXT NOT NULL,
            confidence TEXT NOT NULL,
            source TEXT NOT NULL,
            generated_at TEXT NOT NULL,
            FOREIGN KEY (alert_id) REFERENCES alerts(alert_id)
        );
        """
    )
    conn.commit()


def ingest_csv_data(conn: sqlite3.Connection, data_dir: Path = DATA_DIR) -> None:
    employees = _read_models(_employee_csv_path(data_dir), Employee)
    files = _read_models(data_dir / "files.csv", FileRecord)
    events = _read_models(data_dir / "events.csv", Event)

    with conn:
        conn.execute("DELETE FROM ai_insights")
        conn.execute("DELETE FROM alerts")
        conn.execute("DELETE FROM events")
        conn.execute("DELETE FROM files")
        conn.execute("DELETE FROM employees")

        conn.executemany(
            """
            INSERT INTO employees (employee_id, name, role, department, manager_id)
            VALUES (:employee_id, :name, :role, :department, :manager_id)
            """,
            [employee.model_dump(mode="json") for employee in employees],
        )
        conn.executemany(
            """
            INSERT INTO files (
                file_id, title, file_type, priority, created_at, deadline_at,
                current_holder_id, current_status
            )
            VALUES (
                :file_id, :title, :file_type, :priority, :created_at, :deadline_at,
                :current_holder_id, :current_status
            )
            """,
            [file.model_dump(mode="json") for file in files],
        )
        conn.executemany(
            """
            INSERT INTO events (
                event_id, file_id, timestamp, action, from_user_id, to_user_id,
                department, stage, note_text, is_transfer
            )
            VALUES (
                :event_id, :file_id, :timestamp, :action, :from_user_id, :to_user_id,
                :department, :stage, :note_text, :is_transfer
            )
            """,
            [
                event.model_dump(mode="json") | {"is_transfer": int(event.is_transfer)}
                for event in events
            ],
        )


def insert_alerts(conn: sqlite3.Connection, alerts: Iterable[Alert]) -> None:
    with conn:
        conn.executemany(
            """
            INSERT OR REPLACE INTO alerts (
                alert_id, file_id, alert_type, severity, risk_score,
                days_inactive, days_to_deadline, is_overdue,
                loop_round_trips, loop_total_bounces, loop_party_a, loop_party_b,
                skipped_stages, detected_at
            )
            VALUES (
                :alert_id, :file_id, :alert_type, :severity, :risk_score,
                :days_inactive, :days_to_deadline, :is_overdue,
                :loop_round_trips, :loop_total_bounces, :loop_party_a, :loop_party_b,
                :skipped_stages, :detected_at
            )
            """,
            [
                alert.model_dump(mode="json")
                | {"is_overdue": int(alert.is_overdue)}
                for alert in alerts
            ],
        )


def insert_ai_insights(conn: sqlite3.Connection, insights: Iterable[AiInsight]) -> None:
    with conn:
        conn.executemany(
            """
            INSERT OR REPLACE INTO ai_insights (
                insight_id, alert_id, plain_language_summary, likely_blocker,
                recommended_action, confidence, source, generated_at
            )
            VALUES (
                :insight_id, :alert_id, :plain_language_summary, :likely_blocker,
                :recommended_action, :confidence, :source, :generated_at
            )
            """,
            [insight.model_dump(mode="json") for insight in insights],
        )


def _read_models(path: Path, model):
    with path.open(newline="", encoding="utf-8") as csv_file:
        return [model.model_validate(row) for row in csv.DictReader(csv_file)]


def _employee_csv_path(data_dir: Path) -> Path:
    employees_path = data_dir / "employees.csv"
    if employees_path.exists():
        return employees_path
    return data_dir / "employee.csv"
