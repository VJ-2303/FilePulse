import sqlite3
import sys
import unittest
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.loop_detector import detect_looping_from_db
from app.core.risk_scorer import score_alerts, score_alerts_from_db
from app.core.stuck_detector import detect_rotting_from_db
from app.db import DATA_DIR, ingest_csv_data, init_db
from app.models import Alert, FileRecord


REFERENCE = datetime.fromisoformat("2025-03-18T09:00:00")


class RiskScorerTest(unittest.TestCase):
    def test_scores_rotting_and_loop_alerts_from_mock_data(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        init_db(conn)
        ingest_csv_data(conn, DATA_DIR)

        alerts = detect_rotting_from_db(conn, REFERENCE) + detect_looping_from_db(conn, REFERENCE)
        scored = score_alerts_from_db(conn, alerts, REFERENCE)
        by_id = {alert.alert_id: alert for alert in scored}

        self.assertEqual(by_id["ROT-F5518"].risk_score, 66)
        self.assertEqual(by_id["ROT-F4921"].risk_score, 47)
        self.assertEqual(by_id["ROT-F2210"].risk_score, 11)
        self.assertEqual(by_id["LOOP-USER-F8832-E102-E201"].risk_score, 24)
        self.assertEqual(by_id["ROT-F6624"].risk_score, 45)
        self.assertEqual(by_id["LOOP-USER-F6624-E201-E302"].risk_score, 45)

    def test_compound_bonus_is_capped_at_100(self):
        files = [
            _file(
                file_id=f"FMAX{i}",
                priority="High",
                deadline_at="2025-03-01T17:00:00",
                current_holder_id="E100",
            )
            for i in range(40)
        ]
        alerts = [
            _alert(
                alert_id="ROT-FMAX",
                file_id="FMAX0",
                alert_type="ROTTING",
                days_inactive=180,
                days_to_deadline=-17,
                is_overdue=True,
            ),
            _alert(
                alert_id="LOOP-FMAX",
                file_id="FMAX0",
                alert_type="LOOPING",
                loop_round_trips=9,
            ),
        ]

        scored = score_alerts(alerts, files, REFERENCE)

        self.assertEqual(scored[0].risk_score, 100)
        self.assertEqual(scored[1].risk_score, 100)

    def test_loop_alert_gets_deadline_and_overdue_from_file_metadata(self):
        files = [
            _file(
                file_id="FOVER",
                priority="Low",
                deadline_at="2025-03-10T17:00:00",
                current_holder_id="E100",
            )
        ]
        alerts = [
            _alert(
                alert_id="LOOP-FOVER",
                file_id="FOVER",
                alert_type="LOOPING",
                loop_round_trips=3,
            )
        ]

        scored = score_alerts(alerts, files, REFERENCE)

        self.assertEqual(scored[0].days_to_deadline, -8)
        self.assertTrue(scored[0].is_overdue)
        self.assertEqual(scored[0].risk_score, 40)


def _file(
    file_id: str,
    priority: str,
    deadline_at: str,
    current_holder_id: str,
) -> FileRecord:
    return FileRecord.model_validate(
        {
            "file_id": file_id,
            "title": file_id,
            "file_type": "Administration",
            "priority": priority,
            "created_at": "2025-01-01T09:00:00",
            "deadline_at": deadline_at,
            "current_holder_id": current_holder_id,
            "current_status": "Active",
        }
    )


def _alert(
    alert_id: str,
    file_id: str,
    alert_type: str,
    days_inactive: int | None = None,
    days_to_deadline: int | None = None,
    is_overdue: bool = False,
    loop_round_trips: int | None = None,
) -> Alert:
    return Alert(
        alert_id=alert_id,
        file_id=file_id,
        alert_type=alert_type,
        severity="HIGH",
        risk_score=0,
        days_inactive=days_inactive,
        days_to_deadline=days_to_deadline,
        is_overdue=is_overdue,
        loop_round_trips=loop_round_trips,
        detected_at=REFERENCE,
    )


if __name__ == "__main__":
    unittest.main()
