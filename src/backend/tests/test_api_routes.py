import asyncio
import sqlite3
from collections import Counter
from datetime import datetime

import pytest
from fastapi import HTTPException

from app.api.routes import (
    build_alerts_response,
    build_employee_workload,
    build_file_journey,
    build_org_tree,
)
from app.core.orchestrator import run_full_pipeline
from app.db import DATA_DIR


@pytest.fixture()
def conn():
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    asyncio.run(
        run_full_pipeline(
            connection,
            data_dir=DATA_DIR,
            now=datetime.fromisoformat("2025-03-18T09:00:00"),
            top_k_ai_insights=0,
        )
    )
    try:
        yield connection
    finally:
        connection.close()


def test_alerts_are_consolidated_sorted_and_filterable(conn):
    alerts = build_alerts_response(conn)

    assert len(alerts) == 7
    assert alerts[0]["file_id"] == "F5518"
    assert alerts[0]["risk_score"] == 66

    looping_alerts = build_alerts_response(conn, "looping")
    assert {alert["file_id"] for alert in looping_alerts} == {"F6624", "F8832"}


def test_alerts_reject_invalid_filter(conn):
    with pytest.raises(HTTPException) as exc:
        build_alerts_response(conn, "stale")

    assert exc.value.status_code == 400


def test_file_journey_includes_metadata_events_graph_and_primary_insight(conn):
    journey = build_file_journey(conn, "F6624")

    assert journey["file"]["current_holder_name"] == "M. Das"
    assert Counter(alert["alert_type"] for alert in journey["alerts"]) == {
        "ROTTING": 1,
        "LOOPING": 2,
        "CONFORMANCE": 1,
    }
    assert len(journey["events"]) == 8
    assert {"nodes", "edges"} == set(journey["graph"])
    assert any(edge["animated"] for edge in journey["graph"]["edges"])
    assert journey["ai_insight"] is None


def test_employee_workload_counts_current_active_files(conn):
    workload = build_employee_workload(conn, "E101")

    assert workload["name"] == "Amit Kumar"
    assert workload["active_file_count"] == 3
    assert workload["alerted_file_count"] == 1
    assert workload["files"][0]["file_id"] == "F4921"


def test_org_tree_builds_roots_and_nested_file_counts(conn):
    tree = build_org_tree(conn)

    assert [node["employee_id"] for node in tree] == ["E090", "E201", "E301"]
    iyer = tree[0]["children"][0]
    assert iyer["employee_id"] == "E100"
    assert iyer["active_files"] == 3
    assert iyer["children"][0]["employee_id"] == "E101"
