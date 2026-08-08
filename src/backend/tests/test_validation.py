import sqlite3
import sys
import unittest
from pathlib import Path

from pydantic import ValidationError

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db import DATA_DIR, ingest_csv_data, init_db
from app.models import Employee, Event, FileRecord


class ValidationTest(unittest.TestCase):
    def test_csv_rows_validate_against_models(self):
        employee = Employee.model_validate(
            {
                "employee_id": "E100",
                "name": "R. Iyer",
                "role": "Section Officer",
                "department": "General Administration Section",
                "manager_id": "",
            }
        )
        file_record = FileRecord.model_validate(
            {
                "file_id": "F4921",
                "title": "School Roof Repair Grant",
                "file_type": "Infrastructure",
                "priority": "High",
                "created_at": "2025-01-28T09:30:00",
                "deadline_at": "2025-03-25T17:00:00",
                "current_holder_id": "E101",
                "current_status": "Active",
            }
        )
        event = Event.model_validate(
            {
                "event_id": "EV1003",
                "file_id": "F4921",
                "timestamp": "2025-02-01T10:05:00",
                "action": "ASSIGNED",
                "from_user_id": "E100",
                "to_user_id": "E101",
                "department": "General Administration Section",
                "stage": "Initial Review",
                "note_text": "Assigned to Amit.",
            }
        )

        self.assertIsNone(employee.manager_id)
        self.assertEqual(file_record.priority, "High")
        self.assertTrue(event.is_transfer)

    def test_invalid_action_is_rejected(self):
        with self.assertRaises(ValidationError):
            Event.model_validate(
                {
                    "event_id": "EVX",
                    "file_id": "F4921",
                    "timestamp": "2025-02-01T10:05:00",
                    "action": "MOVED",
                    "from_user_id": "E100",
                    "to_user_id": "E101",
                    "department": "General Administration Section",
                    "stage": "Initial Review",
                    "note_text": "Invalid action.",
                }
            )

    def test_ingest_csv_data_loads_mock_tables(self):
        conn = sqlite3.connect(":memory:")
        init_db(conn)
        ingest_csv_data(conn, DATA_DIR)

        counts = {
            table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in ("employees", "files", "events", "alerts", "ai_insights")
        }

        self.assertEqual(
            counts,
            {
                "employees": 9,
                "files": 12,
                "events": 59,
                "alerts": 0,
                "ai_insights": 0,
            },
        )


if __name__ == "__main__":
    unittest.main()
