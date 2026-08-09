import sqlite3
from collections import Counter
from collections.abc import Generator
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.AI.ollama_service import generate_insight
from app.ai.assistant import build_context, classify_intent
from app.ai.assistant_prompts import SYSTEM_PROMPT, build_prompt
from app.core.alert_consolidator import consolidate_alerts
from app.db import get_connection, insert_ai_insights
from app.models import AiInsight, Alert, Employee, Event, FileRecord
from config import OLLAMA_BASE_URL, OLLAMA_MODEL, REFERENCE_NOW


router = APIRouter()
ALLOWED_ALERT_FILTERS = {"all", "rotting", "looping", "conformance"}


def get_conn() -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


@router.get("/api/dashboard/summary")
def dashboard_summary(conn: sqlite3.Connection = Depends(get_conn)) -> dict[str, int | str]:
    return build_dashboard_summary(conn)


@router.get("/api/alerts")
def alerts(
    type: str = Query("all"),
    conn: sqlite3.Connection = Depends(get_conn),
) -> list[dict]:
    return build_alerts_response(conn, type)


@router.get("/api/files/{file_id}/journey")
def file_journey(
    file_id: str,
    conn: sqlite3.Connection = Depends(get_conn),
) -> dict:
    return build_file_journey(conn, file_id)


@router.get("/api/employees/{employee_id}/workload")
def employee_workload(
    employee_id: str,
    conn: sqlite3.Connection = Depends(get_conn),
) -> dict:
    return build_employee_workload(conn, employee_id)


@router.get("/api/org/tree")
def org_tree(conn: sqlite3.Connection = Depends(get_conn)) -> list[dict]:
    return build_org_tree(conn)


@router.post("/api/alerts/{alert_id}/ai-insight")
async def regenerate_ai_insight(
    alert_id: str,
    conn: sqlite3.Connection = Depends(get_conn),
) -> dict:
    return await regenerate_alert_insight(conn, alert_id)


class AssistantRequest(BaseModel):
    message: str


@router.post("/api/assistant/chat")
async def assistant_chat(
    body: AssistantRequest,
    conn: sqlite3.Connection = Depends(get_conn),
) -> dict:
    """AI assistant endpoint: classify intent, build context, call Ollama."""
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    intent, entities = classify_intent(message)
    context = build_context(conn, intent, entities)
    prompt = build_prompt(context, message)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "system": SYSTEM_PROMPT,
                    "prompt": prompt,
                    "options": {"temperature": 0},
                    "stream": False,
                },
            )
            response.raise_for_status()
            reply = response.json().get("response", "").strip()
    except Exception:
        reply = (
            "I'm having trouble connecting to the AI engine right now. "
            "Please try again in a moment."
        )

    return {"reply": reply, "intent": intent, "sources": entities}


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


def build_alerts_response(conn: sqlite3.Connection, type_filter: str = "all") -> list[dict]:
    normalized_filter = type_filter.lower()
    if normalized_filter not in ALLOWED_ALERT_FILTERS:
        raise HTTPException(
            status_code=400,
            detail="type must be one of: all, rotting, looping, conformance",
        )

    consolidated = [
        alert.model_dump(mode="json")
        for alert in _load_consolidated_alerts(conn)
    ]
    if normalized_filter == "all":
        return consolidated

    alert_type = normalized_filter.upper()
    return [
        alert
        for alert in consolidated
        if alert_type in alert["alert_types"]
    ]


def build_file_journey(conn: sqlite3.Connection, file_id: str) -> dict:
    file_row = conn.execute("SELECT * FROM files WHERE file_id = ?", (file_id,)).fetchone()
    if file_row is None:
        raise HTTPException(status_code=404, detail=f"File {file_id} not found")

    file_record = FileRecord.model_validate(dict(file_row))
    employees = _load_employees(conn)
    employees_by_id = {employee.employee_id: employee for employee in employees}
    event_rows = conn.execute(
        "SELECT * FROM events WHERE file_id = ? ORDER BY timestamp, event_id",
        (file_id,),
    ).fetchall()
    alert_rows = conn.execute(
        "SELECT * FROM alerts WHERE file_id = ? ORDER BY risk_score DESC, alert_id",
        (file_id,),
    ).fetchall()
    alerts = [_alert_dict(row) for row in alert_rows]
    enriched_events = [_enriched_event(row, employees_by_id) for row in event_rows]

    return {
        "file": _file_detail(file_record, employees_by_id, event_rows),
        "alerts": alerts,
        "events": enriched_events,
        "graph": _build_graph(file_record, event_rows, alert_rows, employees_by_id),
        "ai_insight": _primary_ai_insight(conn, file_id),
    }


def build_employee_workload(conn: sqlite3.Connection, employee_id: str) -> dict:
    employee_row = conn.execute(
        "SELECT * FROM employees WHERE employee_id = ?",
        (employee_id,),
    ).fetchone()
    if employee_row is None:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")

    employee = Employee.model_validate(dict(employee_row))
    file_rows = conn.execute(
        """
        SELECT * FROM files
        WHERE current_holder_id = ? AND current_status = 'Active'
        ORDER BY priority, deadline_at, file_id
        """,
        (employee_id,),
    ).fetchall()
    alert_map = _alerts_by_file(conn)
    reference_time = datetime.fromisoformat(REFERENCE_NOW)

    files = []
    for row in file_rows:
        file_alerts = alert_map.get(row["file_id"], [])
        alert_types = sorted({alert["alert_type"] for alert in file_alerts})
        rotting_days = [
            alert["days_inactive"]
            for alert in file_alerts
            if alert["alert_type"] == "ROTTING" and alert["days_inactive"] is not None
        ]
        files.append(
            {
                "file_id": row["file_id"],
                "title": row["title"],
                "file_type": row["file_type"],
                "priority": row["priority"],
                "days_inactive": max(rotting_days) if rotting_days else None,
                "is_overdue": datetime.fromisoformat(row["deadline_at"]) < reference_time,
                "alert_types": alert_types,
                "risk_score": max(
                    (alert["risk_score"] for alert in file_alerts),
                    default=0,
                ),
            }
        )

    return {
        "employee_id": employee.employee_id,
        "name": employee.name,
        "role": employee.role,
        "department": employee.department,
        "active_file_count": len(files),
        "alerted_file_count": sum(1 for file_item in files if file_item["alert_types"]),
        "files": files,
    }


def build_org_tree(conn: sqlite3.Connection) -> list[dict]:
    employees = _load_employees(conn)
    active_counts = Counter(
        row["current_holder_id"]
        for row in conn.execute(
            "SELECT current_holder_id FROM files WHERE current_status = 'Active'"
        ).fetchall()
    )
    alerted_file_ids = {
        row["file_id"]
        for row in conn.execute("SELECT DISTINCT file_id FROM alerts").fetchall()
    }
    alerted_counts = Counter(
        row["current_holder_id"]
        for row in conn.execute(
            """
            SELECT file_id, current_holder_id FROM files
            WHERE current_status = 'Active'
            """
        ).fetchall()
        if row["file_id"] in alerted_file_ids
    )

    children_by_manager: dict[str | None, list[Employee]] = {}
    for employee in employees:
        children_by_manager.setdefault(employee.manager_id, []).append(employee)
    for siblings in children_by_manager.values():
        siblings.sort(key=lambda item: item.employee_id)

    def make_node(employee: Employee) -> dict:
        return {
            "employee_id": employee.employee_id,
            "name": employee.name,
            "role": employee.role,
            "department": employee.department,
            "active_files": active_counts[employee.employee_id],
            "alerted_files": alerted_counts[employee.employee_id],
            "children": [
                make_node(child)
                for child in children_by_manager.get(employee.employee_id, [])
            ],
        }

    return [make_node(root) for root in children_by_manager.get(None, [])]


async def regenerate_alert_insight(conn: sqlite3.Connection, alert_id: str) -> dict:
    alert_row = conn.execute(
        "SELECT * FROM alerts WHERE alert_id = ?",
        (alert_id,),
    ).fetchone()
    if alert_row is None:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")

    alert = Alert.model_validate(_alert_dict(alert_row))
    file_row = conn.execute(
        "SELECT * FROM files WHERE file_id = ?",
        (alert.file_id,),
    ).fetchone()
    file_record = FileRecord.model_validate(dict(file_row))
    events = [
        Event.model_validate(_event_without_is_transfer(dict(row)))
        for row in conn.execute(
            "SELECT * FROM events WHERE file_id = ? ORDER BY timestamp, event_id",
            (alert.file_id,),
        ).fetchall()
    ]
    file_alert_types = {
        row["alert_type"]
        for row in conn.execute(
            "SELECT alert_type FROM alerts WHERE file_id = ?",
            (alert.file_id,),
        ).fetchall()
    }
    insight = await generate_insight(
        alert,
        file_record,
        events,
        compound={"ROTTING", "LOOPING"}.issubset(file_alert_types),
    )

    with conn:
        conn.execute("DELETE FROM ai_insights WHERE alert_id = ?", (alert_id,))
    insert_ai_insights(conn, [insight])
    return insight.model_dump(mode="json")


def _load_consolidated_alerts(conn: sqlite3.Connection):
    return consolidate_alerts(
        _load_alerts(conn),
        _load_files(conn),
        _load_employees(conn),
        _load_insights(conn),
    )


def _load_alerts(conn: sqlite3.Connection) -> list[Alert]:
    return [
        Alert.model_validate(_alert_dict(row))
        for row in conn.execute("SELECT * FROM alerts").fetchall()
    ]


def _load_files(conn: sqlite3.Connection) -> list[FileRecord]:
    return [
        FileRecord.model_validate(dict(row))
        for row in conn.execute("SELECT * FROM files").fetchall()
    ]


def _load_employees(conn: sqlite3.Connection) -> list[Employee]:
    return [
        Employee.model_validate(dict(row))
        for row in conn.execute("SELECT * FROM employees").fetchall()
    ]


def _load_insights(conn: sqlite3.Connection) -> list[AiInsight]:
    return [
        AiInsight.model_validate(dict(row))
        for row in conn.execute("SELECT * FROM ai_insights").fetchall()
    ]


def _alerts_by_file(conn: sqlite3.Connection) -> dict[str, list[dict]]:
    alerts: dict[str, list[dict]] = {}
    for row in conn.execute("SELECT * FROM alerts").fetchall():
        alert = _alert_dict(row)
        alerts.setdefault(alert["file_id"], []).append(alert)
    return alerts


def _file_detail(
    file_record: FileRecord,
    employees_by_id: dict[str, Employee],
    event_rows: list[sqlite3.Row],
) -> dict:
    reference_time = datetime.fromisoformat(REFERENCE_NOW)
    last_event_at = (
        datetime.fromisoformat(event_rows[-1]["timestamp"])
        if event_rows
        else file_record.created_at
    )
    holder = employees_by_id.get(file_record.current_holder_id)

    return {
        "file_id": file_record.file_id,
        "title": file_record.title,
        "file_type": file_record.file_type,
        "priority": file_record.priority,
        "created_at": file_record.created_at.isoformat(),
        "deadline_at": file_record.deadline_at.isoformat(),
        "current_holder_id": file_record.current_holder_id,
        "current_holder_name": holder.name if holder else file_record.current_holder_id,
        "current_status": file_record.current_status,
        "days_inactive": (reference_time.date() - last_event_at.date()).days,
        "days_to_deadline": (file_record.deadline_at.date() - reference_time.date()).days,
        "is_overdue": file_record.deadline_at < reference_time,
    }


def _enriched_event(row: sqlite3.Row, employees_by_id: dict[str, Employee]) -> dict:
    from_employee = employees_by_id.get(row["from_user_id"])
    to_employee = employees_by_id.get(row["to_user_id"])
    return {
        "event_id": row["event_id"],
        "timestamp": row["timestamp"],
        "action": row["action"],
        "from_user_id": row["from_user_id"],
        "from_user_name": from_employee.name if from_employee else row["from_user_id"],
        "to_user_id": row["to_user_id"],
        "to_user_name": to_employee.name if to_employee else row["to_user_id"],
        "department": row["department"],
        "stage": row["stage"],
        "note_text": row["note_text"],
        "is_transfer": bool(row["is_transfer"]),
    }


def _build_graph(
    file_record: FileRecord,
    event_rows: list[sqlite3.Row],
    alert_rows: list[sqlite3.Row],
    employees_by_id: dict[str, Employee],
) -> dict:
    employee_order: list[str] = []
    event_counts = Counter()
    edge_counts = Counter()

    for row in event_rows:
        for column in ("from_user_id", "to_user_id"):
            employee_id = row[column]
            if employee_id not in employee_order:
                employee_order.append(employee_id)
        event_counts[row["from_user_id"]] += 1
        if row["is_transfer"] and row["from_user_id"] != row["to_user_id"]:
            edge_counts[(row["from_user_id"], row["to_user_id"])] += 1

    departments: list[str] = []
    nodes_by_department: dict[str, list[str]] = {}
    for employee_id in employee_order:
        employee = employees_by_id.get(employee_id)
        department = employee.department if employee else "Unknown"
        if department not in departments:
            departments.append(department)
        nodes_by_department.setdefault(department, []).append(employee_id)

    loop_pairs = _user_loop_pairs(alert_rows)
    nodes = []
    for department_index, department in enumerate(departments):
        for node_index, employee_id in enumerate(nodes_by_department[department]):
            employee = employees_by_id.get(employee_id)
            nodes.append(
                {
                    "id": employee_id,
                    "data": {
                        "label": employee.name if employee else employee_id,
                        "role": employee.role if employee else "Unknown",
                        "department": department,
                        "is_current_holder": employee_id == file_record.current_holder_id,
                        "is_loop_party": any(employee_id in pair for pair in loop_pairs),
                        "file_count": event_counts[employee_id],
                    },
                    "position": {"x": node_index * 200, "y": department_index * 150},
                    "type": "default",
                }
            )

    edges = []
    for (source, target), count in sorted(edge_counts.items()):
        is_loop_edge = frozenset((source, target)) in loop_pairs
        edges.append(
            {
                "id": f"{source}-{target}",
                "source": source,
                "target": target,
                "data": {
                    "label": f"{count} transfer" if count == 1 else f"{count} transfers",
                    "count": count,
                    "is_loop_edge": is_loop_edge,
                },
                "animated": is_loop_edge,
            }
        )

    return {"nodes": nodes, "edges": edges}


def _user_loop_pairs(alert_rows: list[sqlite3.Row]) -> set[frozenset[str]]:
    pairs = set()
    for row in alert_rows:
        party_a = row["loop_party_a"]
        party_b = row["loop_party_b"]
        if row["alert_type"] == "LOOPING" and party_a and party_b:
            if party_a.startswith("E") and party_b.startswith("E"):
                pairs.add(frozenset((party_a, party_b)))
    return pairs


def _primary_ai_insight(conn: sqlite3.Connection, file_id: str) -> dict | None:
    row = conn.execute(
        """
        SELECT i.* FROM ai_insights i
        JOIN alerts a ON i.alert_id = a.alert_id
        WHERE a.file_id = ?
        ORDER BY a.risk_score DESC, a.alert_id
        LIMIT 1
        """,
        (file_id,),
    ).fetchone()
    return dict(row) if row else None


def _alert_dict(row: sqlite3.Row) -> dict:
    data = dict(row)
    data["is_overdue"] = bool(data["is_overdue"])
    return data


def _event_without_is_transfer(row: dict) -> dict:
    row.pop("is_transfer", None)
    return row
