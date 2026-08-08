import sqlite3
import sys
import unittest
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.loop_detector import detect_looping, detect_looping_from_db
from app.db import DATA_DIR, ingest_csv_data, init_db
from app.models import Employee, Event, FileRecord


REFERENCE = datetime.fromisoformat("2025-03-18T09:00:00")


class LoopDetectorTest(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        init_db(self.conn)
        ingest_csv_data(self.conn, DATA_DIR)

    def tearDown(self):
        self.conn.close()

    def test_detects_user_and_department_loops_for_f6624(self):
        alerts = detect_looping_from_db(self.conn, REFERENCE)
        alerts_by_id = {alert.alert_id: alert for alert in alerts}

        user_alert = alerts_by_id["LOOP-USER-F6624-E201-E302"]
        department_alert = alerts_by_id[
            "LOOP-DEPARTMENT-F6624-Finance Department-Public Works Department"
        ]

        for alert in (user_alert, department_alert):
            self.assertEqual(alert.alert_type, "LOOPING")
            self.assertEqual(alert.severity, "HIGH")
            self.assertEqual(alert.loop_round_trips, 3)
            self.assertEqual(alert.loop_total_bounces, 6)

    def test_single_legitimate_round_trip_is_not_flagged(self):
        alerts = detect_looping_from_db(self.conn, REFERENCE)

        self.assertNotIn("F9034", {alert.file_id for alert in alerts})

    def test_closed_file_is_excluded_even_when_its_events_form_a_loop(self):
        files = [
            FileRecord.model_validate(dict(row))
            for row in self.conn.execute("SELECT * FROM files")
        ]
        events = [
            Event.model_validate(_event_data(dict(row)))
            for row in self.conn.execute("SELECT * FROM events WHERE file_id = 'F6624'")
        ]
        employees = [
            Employee.model_validate(dict(row))
            for row in self.conn.execute("SELECT * FROM employees")
        ]
        closed_files = [
            file_record.model_copy(update={"current_status": "Closed"})
            if file_record.file_id == "F6624"
            else file_record
            for file_record in files
        ]

        alerts = detect_looping(closed_files, events, employees, REFERENCE)

        self.assertEqual(alerts, [])


def _event_data(row: dict) -> dict:
    row.pop("is_transfer", None)
    return row


if __name__ == "__main__":
    unittest.main()
