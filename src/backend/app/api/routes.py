import sqlite3
from datetime import datetime

from fastapi import APIRouter

from app.db import get_connection
from config import REFERENCE_NOW

router = APIRouter()


@router.get("/api/dashboard/summary")
def dashboard_summary() -> dict[str, int | str]:
    with get_connection() as conn:
        return build_dashboard_summary(conn)


def build_dashboard_summary(conn: sqlite3.Connection) -> dict[str, int | str]:
    """Return dashboard KPIs using one consolidated value per alerted file."""
    reference_time = datetime.fromisoformat(REFERENCE_NOW)
    active_files = conn.execute(
        "SELECT file_id, deadline_at FROM files WHERE current_status = 'Active'"
    ).fetchall()
    alerts_by_file = conn.execute(
        """
        SELECT
            file_id,
            MAX(risk_score) AS risk_score,
            MAX(alert_type = 'ROTTING') AS has_rotting,
            MAX(alert_type = 'LOOPING') AS has_looping,
            MAX(alert_type = 'CONFORMANCE') AS has_conformance
        FROM alerts
        GROUP BY file_id
        """
    ).fetchall()

    return {
        "total_active_files": len(active_files),
        "total_alerted_files": len(alerts_by_file),
        "rotting_files": sum(row["has_rotting"] for row in alerts_by_file),
        "looping_files": sum(row["has_looping"] for row in alerts_by_file),
        "conformance_files": sum(row["has_conformance"] for row in alerts_by_file),
        "compound_files": sum(
            row["has_rotting"] and row["has_looping"] for row in alerts_by_file
        ),
        "high_risk_files": sum(row["risk_score"] >= 50 for row in alerts_by_file),
        "overdue_files": sum(
            datetime.fromisoformat(row["deadline_at"]) < reference_time
            for row in active_files
        ),
        "reference_date": reference_time.date().isoformat(),
    }
