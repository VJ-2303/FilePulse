from datetime import datetime
import unittest

from app.core.conformance_detector import detect_conformance
from app.models import Event, FileRecord


class TestConformanceDetector(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2025, 3, 18, 9, 0, 0)
        self.file_records = [
            FileRecord(
                file_id="F7741",
                title="Service Book Verification",
                file_type="Records",
                priority="Medium",
                created_at=datetime(2025, 2, 20, 9, 0, 0),
                deadline_at=datetime(2025, 4, 1, 17, 0, 0),
                current_holder_id="E100",
                current_status="Active",
            ),
            FileRecord(
                file_id="F9310",
                title="Closed File Case",
                file_type="HR",
                priority="Low",
                created_at=datetime(2025, 1, 1, 9, 0, 0),
                deadline_at=datetime(2025, 2, 1, 17, 0, 0),
                current_holder_id="E100",
                current_status="Closed",
            ),
        ]

    def test_detect_skipped_stages(self):
        events = [
            Event(
                event_id="EV1",
                file_id="F7741",
                timestamp=datetime(2025, 2, 20, 9, 30, 0),
                action="RECEIPT_DIARISED",
                from_user_id="E100",
                to_user_id="E100",
                department="General Administration Section",
                stage="Receipt",
                note_text="Receipt diarised.",
            ),
            Event(
                event_id="EV2",
                file_id="F7741",
                timestamp=datetime(2025, 2, 22, 10, 0, 0),
                action="APPROVED",
                from_user_id="E100",
                to_user_id="E100",
                department="General Administration Section",
                stage="Approval",
                note_text="Approved directly.",
            ),
        ]

        alerts = detect_conformance(self.file_records, events, self.now)
        self.assertEqual(len(alerts), 1)
        alert = alerts[0]
        self.assertEqual(alert.file_id, "F7741")
        self.assertEqual(alert.alert_type, "CONFORMANCE")
        self.assertEqual(alert.severity, "WARNING")
        self.assertIn("Initial Review", alert.skipped_stages)
        self.assertIn("Verification", alert.skipped_stages)

    def test_no_alert_for_sequential_progression(self):
        events = [
            Event(
                event_id="EV1",
                file_id="F7741",
                timestamp=datetime(2025, 2, 20, 9, 30, 0),
                action="RECEIPT_DIARISED",
                from_user_id="E100",
                to_user_id="E100",
                department="General Administration Section",
                stage="Receipt",
                note_text="Receipt diarised.",
            ),
            Event(
                event_id="EV2",
                file_id="F7741",
                timestamp=datetime(2025, 2, 21, 10, 0, 0),
                action="NOTE_ADDED",
                from_user_id="E100",
                to_user_id="E100",
                department="General Administration Section",
                stage="Initial Review",
                note_text="Reviewed.",
            ),
            Event(
                event_id="EV3",
                file_id="F7741",
                timestamp=datetime(2025, 2, 22, 11, 0, 0),
                action="NOTE_ADDED",
                from_user_id="E100",
                to_user_id="E100",
                department="General Administration Section",
                stage="Verification",
                note_text="Verified.",
            ),
        ]

        alerts = detect_conformance(self.file_records, events, self.now)
        self.assertEqual(alerts, [])

    def test_closed_file_ignored(self):
        events = [
            Event(
                event_id="EV9",
                file_id="F9310",
                timestamp=datetime(2025, 1, 1, 10, 0, 0),
                action="APPROVED",
                from_user_id="E100",
                to_user_id="E100",
                department="General Administration Section",
                stage="Approval",
                note_text="Approved.",
            )
        ]
        alerts = detect_conformance(self.file_records, events, self.now)
        self.assertEqual(alerts, [])


if __name__ == "__main__":
    unittest.main()
