import asyncio
import sqlite3
import sys
import unittest
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.api.routes import build_dashboard_summary
from app.core.orchestrator import run_full_pipeline
from app.db import DATA_DIR


class DashboardSummaryTest(unittest.TestCase):
    def test_counts_consolidated_alerts_and_active_files(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        try:
            asyncio.run(
                run_full_pipeline(
                    conn,
                    data_dir=DATA_DIR,
                    now=datetime.fromisoformat("2025-03-18T09:00:00"),
                    top_k_ai_insights=0,
                )
            )
            self.assertEqual(
                build_dashboard_summary(conn),
                {
                    "total_active_files": 11,
                    "total_alerted_files": 7,
                    "rotting_files": 5,
                    "looping_files": 2,
                    "conformance_files": 2,
                    "compound_files": 1,
                    "high_risk_files": 1,
                    "overdue_files": 1,
                    "reference_date": "2025-03-18",
                },
            )
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
