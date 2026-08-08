import sqlite3
import sys
import unittest
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.stuck_detector import detect_rotting, detect_rotting_from_db
from app.db import DATA_DIR, ingest_csv_data, init_db
from app.models import FileRecord


REFERENCE = datetime.fromisoformat("2025-03-18T09:00:00")


class RottingDetectorTest(unittest.TestCase):
    def test_detects_calendar_day_rotting_alerts_from_mock_data(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        init_db(conn)
        ingest_csv_data(conn, DATA_DIR)

        alerts = detect_rotting_from_db(conn, REFERENCE)
        by_file = {alert.file_id: alert for alert in alerts}

        self.assertEqual(set(by_file), {"F4921", "F2210", "F5518", "F6624", "F8123"})
        self.assertEqual(by_file["F4921"].days_inactive, 45)
        self.assertEqual(by_file["F4921"].severity, "CRITICAL")
        self.assertEqual(by_file["F5518"].days_inactive, 194)
        self.assertEqual(by_file["F5518"].severity, "CAMPAIGN")
        self.assertTrue(by_file["F5518"].is_overdue)
        self.assertEqual(by_file["F6624"].days_inactive, 25)
        self.assertEqual(by_file["F6624"].severity, "WARNING")
        self.assertEqual(by_file["F8123"].days_inactive, 15)
        self.assertEqual(by_file["F8123"].days_to_deadline, 2)

    def test_closed_files_are_skipped(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        init_db(conn)
        ingest_csv_data(conn, DATA_DIR)

        alerts = detect_rotting_from_db(conn, REFERENCE)

        self.assertNotIn("F9310", {alert.file_id for alert in alerts})

    def test_file_with_zero_events_uses_created_at(self):
        file_record = FileRecord.model_validate(
            {
                "file_id": "FZERO",
                "title": "Zero Event File",
                "file_type": "Administration",
                "priority": "Low",
                "created_at": "2025-03-01T23:59:00",
                "deadline_at": "2025-03-30T17:00:00",
                "current_holder_id": "E101",
                "current_status": "Active",
            }
        )

        alerts = detect_rotting([file_record], [], REFERENCE)

        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0].days_inactive, 17)
        self.assertEqual(alerts[0].severity, "WARNING")

    def test_overdue_escalates_one_level(self):
        file_record = FileRecord.model_validate(
            {
                "file_id": "FOVERDUE",
                "title": "Overdue File",
                "file_type": "Administration",
                "priority": "Low",
                "created_at": "2025-03-03T23:59:00",
                "deadline_at": "2025-03-10T17:00:00",
                "current_holder_id": "E101",
                "current_status": "Active",
            }
        )

        alerts = detect_rotting([file_record], [], REFERENCE)

        self.assertEqual(alerts[0].days_inactive, 15)
        self.assertEqual(alerts[0].severity, "HIGH")
        self.assertTrue(alerts[0].is_overdue)


if __name__ == "__main__":
    unittest.main()
