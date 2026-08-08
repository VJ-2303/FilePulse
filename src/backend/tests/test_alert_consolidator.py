from datetime import datetime
import unittest

from app.core.alert_consolidator import consolidate_alerts
from app.models import AiInsight, Alert, Employee, FileRecord


class TestAlertConsolidator(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2025, 3, 18, 9, 0, 0)

        self.emp1 = Employee(
            employee_id="E201",
            name="Amit Kumar",
            role="Junior Assistant",
            department="General Administration",
            manager_id="E101",
        )
        self.emp2 = Employee(
            employee_id="E302",
            name="Priya Sharma",
            role="Junior Assistant",
            department="Finance",
            manager_id="E101",
        )
        self.employees = [self.emp1, self.emp2]

        self.file1 = FileRecord(
            file_id="F4921",
            title="School Roof Repair Grant",
            file_type="Infrastructure",
            priority="High",
            created_at=datetime(2025, 2, 1, 10, 0, 0),
            deadline_at=datetime(2025, 3, 25, 17, 0, 0),
            current_holder_id="E201",
            current_status="Active",
        )
        self.file2 = FileRecord(
            file_id="F6624",
            title="Computer Procurement Request",
            file_type="Procurement",
            priority="Medium",
            created_at=datetime(2025, 2, 15, 10, 0, 0),
            deadline_at=datetime(2025, 4, 1, 17, 0, 0),
            current_holder_id="E302",
            current_status="Active",
        )
        self.files = [self.file1, self.file2]

    def test_empty_alerts(self):
        result = consolidate_alerts([], self.files, self.employees)
        self.assertEqual(result, [])

    def test_single_alert_consolidation(self):
        alert = Alert(
            alert_id="ALT-1001",
            file_id="F4921",
            alert_type="ROTTING",
            severity="CRITICAL",
            risk_score=47,
            days_inactive=45,
            days_to_deadline=7,
            is_overdue=False,
            detected_at=self.now,
        )

        result = consolidate_alerts([alert], self.files, self.employees)
        self.assertEqual(len(result), 1)

        consolidated = result[0]
        self.assertEqual(consolidated.file_id, "F4921")
        self.assertEqual(consolidated.file_title, "School Roof Repair Grant")
        self.assertEqual(consolidated.file_type, "Infrastructure")
        self.assertEqual(consolidated.priority, "High")
        self.assertEqual(consolidated.alert_types, ["ROTTING"])
        self.assertEqual(consolidated.severity, "CRITICAL")
        self.assertEqual(consolidated.risk_score, 47)
        self.assertEqual(consolidated.current_holder_name, "Amit Kumar")
        self.assertEqual(consolidated.days_inactive, 45)
        self.assertEqual(consolidated.days_to_deadline, 7)
        self.assertFalse(consolidated.is_overdue)
        self.assertIsNone(consolidated.ai_summary)

    def test_compound_alert_consolidation(self):
        alert_rot = Alert(
            alert_id="ALT-2001",
            file_id="F6624",
            alert_type="ROTTING",
            severity="WARNING",
            risk_score=30,
            days_inactive=25,
            days_to_deadline=14,
            is_overdue=False,
            detected_at=self.now,
        )
        alert_loop = Alert(
            alert_id="ALT-2002",
            file_id="F6624",
            alert_type="LOOPING",
            severity="HIGH",
            risk_score=45,
            loop_round_trips=3,
            loop_total_bounces=6,
            loop_party_a="E201",
            loop_party_b="E302",
            days_to_deadline=14,
            is_overdue=False,
            detected_at=self.now,
        )

        result = consolidate_alerts([alert_rot, alert_loop], self.files, self.employees)
        self.assertEqual(len(result), 1)

        consolidated = result[0]
        self.assertEqual(consolidated.file_id, "F6624")
        self.assertEqual(consolidated.alert_types, ["LOOPING", "ROTTING"])
        self.assertEqual(consolidated.severity, "HIGH")  # HIGH > WARNING
        self.assertEqual(consolidated.risk_score, 45)    # max(30, 45)
        self.assertEqual(consolidated.days_inactive, 25)
        self.assertEqual(consolidated.loop_round_trips, 3)

    def test_ai_insight_attachment(self):
        alert = Alert(
            alert_id="ALT-1001",
            file_id="F4921",
            alert_type="ROTTING",
            severity="CRITICAL",
            risk_score=47,
            days_inactive=45,
            detected_at=self.now,
        )
        insight = AiInsight(
            insight_id="INS-1001",
            alert_id="ALT-1001",
            plain_language_summary="File stuck with Amit for 45 days.",
            likely_blocker="Awaiting clarification",
            recommended_action="Nudge Amit",
            confidence="High",
            source="ollama",
            generated_at=self.now,
        )

        result = consolidate_alerts([alert], self.files, self.employees, [insight])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].ai_summary, "File stuck with Amit for 45 days.")
        self.assertEqual(result[0].ai_confidence, "High")

    def test_sorting_by_risk_score_descending(self):
        alert_low = Alert(
            alert_id="ALT-1",
            file_id="F4921",
            alert_type="ROTTING",
            severity="WARNING",
            risk_score=15,
            detected_at=self.now,
        )
        alert_high = Alert(
            alert_id="ALT-2",
            file_id="F6624",
            alert_type="LOOPING",
            severity="CRITICAL",
            risk_score=85,
            detected_at=self.now,
        )

        result = consolidate_alerts([alert_low, alert_high], self.files, self.employees)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].file_id, "F6624")
        self.assertEqual(result[0].risk_score, 85)
        self.assertEqual(result[1].file_id, "F4921")
        self.assertEqual(result[1].risk_score, 15)

    def test_missing_employee_fallback(self):
        file_unknown_holder = FileRecord(
            file_id="F9999",
            title="Unknown Holder File",
            file_type="Records",
            priority="Low",
            created_at=self.now,
            deadline_at=self.now,
            current_holder_id="E999",
            current_status="Active",
        )
        alert = Alert(
            alert_id="ALT-999",
            file_id="F9999",
            alert_type="ROTTING",
            severity="WARNING",
            risk_score=20,
            detected_at=self.now,
        )

        result = consolidate_alerts([alert], [file_unknown_holder], self.employees)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].current_holder_name, "E999")


if __name__ == "__main__":
    unittest.main()
