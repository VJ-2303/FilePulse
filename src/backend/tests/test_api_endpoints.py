import asyncio
import sqlite3
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.routes import get_conn
from app.core.orchestrator import run_full_pipeline
from app.db import DATA_DIR
from main import app
from app.models import AiInsight


@pytest.fixture(scope="module")
def test_db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    asyncio.run(
        run_full_pipeline(
            conn,
            data_dir=DATA_DIR,
            now=datetime.fromisoformat("2025-03-18T09:00:00"),
            top_k_ai_insights=0,
        )
    )
    yield conn
    conn.close()


@pytest.fixture(scope="module")
def client(test_db):
    def override_get_conn():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_conn] = override_get_conn
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "project": "FilePulse"}


def test_dashboard_summary(client):
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_active_files" in data
    assert data["total_active_files"] == 11
    assert data["total_alerted_files"] == 7
    assert data["reference_date"] == "2025-03-18"


def test_alerts_list(client):
    response = client.get("/api/alerts")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 7
    assert data[0]["file_id"] == "F5518"


def test_alerts_list_filtered(client):
    response = client.get("/api/alerts?type=looping")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for alert in data:
        assert "LOOPING" in alert["alert_types"]


def test_alerts_list_invalid_filter(client):
    response = client.get("/api/alerts?type=invalid")
    assert response.status_code == 400
    assert response.json()["error"] is True


def test_file_journey(client):
    response = client.get("/api/files/F6624/journey")
    assert response.status_code == 200
    data = response.json()
    assert data["file"]["file_id"] == "F6624"
    assert len(data["alerts"]) == 4
    assert len(data["events"]) == 8
    assert "nodes" in data["graph"]
    assert "edges" in data["graph"]
    assert data["ai_insight"] is None


def test_file_journey_not_found(client):
    response = client.get("/api/files/F9999/journey")
    assert response.status_code == 404
    assert response.json()["error"] is True


def test_employee_workload(client):
    response = client.get("/api/employees/E101/workload")
    assert response.status_code == 200
    data = response.json()
    assert data["employee_id"] == "E101"
    assert data["name"] == "Amit Kumar"
    assert data["active_file_count"] == 3


def test_employee_workload_not_found(client):
    response = client.get("/api/employees/E999/workload")
    assert response.status_code == 404
    assert response.json()["error"] is True


def test_org_tree(client):
    response = client.get("/api/org/tree")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    assert data[0]["employee_id"] == "E090"
    assert data[0]["children"][0]["employee_id"] == "E100"


@patch("app.api.routes.generate_insight", new_callable=AsyncMock)
def test_regenerate_ai_insight(mock_generate, client):
    mock_generate.return_value = AiInsight(
        insight_id="test-uuid",
        alert_id="ROT-F4921",
        plain_language_summary="Test summary",
        likely_blocker="Test blocker",
        recommended_action="Test action",
        confidence="High",
        source="ollama",
        generated_at=datetime.fromisoformat("2025-03-18T09:00:00"),
    )

    response = client.post("/api/alerts/ROT-F4921/ai-insight")
    assert response.status_code == 200
    data = response.json()
    assert data["insight_id"] == "test-uuid"
    assert data["plain_language_summary"] == "Test summary"

    journey = client.get("/api/files/F4921/journey").json()
    assert journey["ai_insight"]["insight_id"] == "test-uuid"
