"""
FilePulse AI Assistant — Smart Query Router.

Flow:
  1. classify_intent(message)   → (intent_type, [entities])
  2. build_context(conn, ...)   → compact dict for Ollama prompt
"""

import re
import sqlite3


# ---------------------------------------------------------------------------
# Intent classification
# ---------------------------------------------------------------------------

_PATTERNS: list[tuple[str, re.Pattern]] = [
    # Highest-priority: explicit file/employee IDs
    ("FILE_DETAIL", re.compile(r"\bF\d{4}\b", re.IGNORECASE)),
    ("EMPLOYEE_DETAIL", re.compile(r"\bE\d{3}\b", re.IGNORECASE)),
    # Keyword-based intents
    ("ALERT_SUMMARY", re.compile(
        r"most stuck|top alert|worst|critical|high risk|red list|risk score|highest risk",
        re.IGNORECASE,
    )),
    ("OVERDUE_FILES", re.compile(
        r"overdue|past deadline|missed deadline|behind schedule|late file",
        re.IGNORECASE,
    )),
    ("DEPARTMENT_LOOPS", re.compile(
        r"\bloop(ing)?\b|bouncing|going back|back and forth|finance.*pwd|pwd.*finance|department",
        re.IGNORECASE,
    )),
    ("EMPLOYEE_DETAIL", re.compile(
        r"\bemployee\b|\bofficer\b|who is|workload|who has|who holds",
        re.IGNORECASE,
    )),
    ("DASHBOARD_SUMMARY", re.compile(
        r"\bsummar(y|ize)\b|\boverview\b|how many|total|count|status|today|office health",
        re.IGNORECASE,
    )),
]


def classify_intent_scored(conn: sqlite3.Connection, message: str, active_context: dict | None = None) -> tuple[str, list[str]]:
    """Return (intent_type, list_of_extracted_entity_ids) using weighted scoring and DB name resolution."""
    file_ids = [f.upper() for f in re.findall(r"\bF\d{4}\b", message, re.IGNORECASE)]
    emp_ids = [e.upper() for e in re.findall(r"\bE\d{3}\b", message, re.IGNORECASE)]

    # Resolve by name/title if no explicit IDs found
    if not file_ids and not emp_ids:
        emps = conn.execute("SELECT employee_id, name FROM employees").fetchall()
        for emp_id, name in emps:
            # Simple substring match (e.g., "Mr. Iyer" or "Iyer")
            # In a real system, you might use fuzzing.
            # Assuming names might be multiple words, checking if parts match could be better, but substring is a good start.
            if name.lower() in message.lower() or message.lower() in name.lower():
                 emp_ids.append(emp_id)
                 
        files = conn.execute("SELECT file_id, title FROM files").fetchall()
        for f_id, title in files:
            if title.lower() in message.lower():
                file_ids.append(f_id)

    # Use active context fallback
    if not file_ids and not emp_ids and active_context:
        if active_context.get("active_file_id"):
            file_ids.append(active_context["active_file_id"])
        if active_context.get("active_employee_id"):
            emp_ids.append(active_context["active_employee_id"])

    entities = list(set(file_ids + emp_ids))
    
    scores = {intent: 0 for intent, _ in _PATTERNS}
    for intent, pattern in _PATTERNS:
        if pattern.search(message):
            scores[intent] += 1
            
    if file_ids: scores["FILE_DETAIL"] += 5
    if emp_ids:  scores["EMPLOYEE_DETAIL"] += 5
    
    best_intent = max(scores, key=scores.get)
    return (best_intent if scores[best_intent] > 0 else "DASHBOARD_SUMMARY"), entities


# ---------------------------------------------------------------------------
# Context builders
# ---------------------------------------------------------------------------

def build_context(conn: sqlite3.Connection, intent: str, entities: list[str]) -> dict:
    """Dispatch to the correct context builder based on intent."""
    if intent == "FILE_DETAIL" and entities:
        return _build_file_context(conn, entities)

    if intent == "EMPLOYEE_DETAIL" and entities:
        return _build_employee_context(conn, entities)

    if intent == "ALERT_SUMMARY":
        return _build_alert_summary_context(conn)

    if intent == "OVERDUE_FILES":
        return _build_overdue_context(conn)

    if intent == "DEPARTMENT_LOOPS":
        return _build_loop_context(conn)

    # DASHBOARD_SUMMARY or UNKNOWN
    return _build_dashboard_context(conn)


def _build_file_context(conn: sqlite3.Connection, file_ids: list[str]) -> dict:
    results = []
    for file_id in file_ids:
        file_row = conn.execute(
            "SELECT file_id, title, file_type, priority, created_at, deadline_at, "
            "current_holder_id, current_status FROM files WHERE file_id = ?",
            (file_id,),
        ).fetchone()

        if file_row is None:
            continue

        holder_row = conn.execute(
            "SELECT name, role FROM employees WHERE employee_id = ?",
            (dict(file_row)["current_holder_id"],),
        ).fetchone()

        alerts = conn.execute(
            "SELECT alert_type, severity, risk_score, days_inactive, is_overdue, "
            "days_to_deadline, loop_round_trips FROM alerts "
            "WHERE file_id = ? ORDER BY risk_score DESC",
            (file_id,),
        ).fetchall()

        events = conn.execute(
            "SELECT timestamp, action, from_user_id, to_user_id, stage, note_text "
            "FROM events WHERE file_id = ? ORDER BY timestamp DESC LIMIT 8",
            (file_id,),
        ).fetchall()

        results.append({
            "file": dict(file_row),
            "current_holder": dict(holder_row) if holder_row else None,
            "alerts": [dict(a) for a in alerts],
            "last_8_events": [dict(e) for e in events],
        })

    if not results:
        return {"type": "file_detail", "error": f"Files not found: {', '.join(file_ids)}"}

    return {
        "type": "file_detail",
        "files_data": results
    }


def _build_employee_context(conn: sqlite3.Connection, employee_ids: list[str]) -> dict:
    results = []
    for employee_id in employee_ids:
        emp_row = conn.execute(
            "SELECT employee_id, name, role, department FROM employees WHERE employee_id = ?",
            (employee_id,),
        ).fetchone()

        if emp_row is None:
            continue

        files = conn.execute(
            """
            SELECT f.file_id, f.title, f.priority, f.deadline_at, f.current_status,
                   COUNT(a.alert_id) AS alert_count,
                   MAX(a.risk_score) AS max_risk_score,
                   MAX(a.days_inactive) AS max_days_inactive,
                   MAX(a.is_overdue) AS is_overdue
            FROM files f
            LEFT JOIN alerts a ON f.file_id = a.file_id
            WHERE f.current_holder_id = ? AND f.current_status = 'Active'
            GROUP BY f.file_id
            ORDER BY max_risk_score DESC NULLS LAST
            """,
            (employee_id,),
        ).fetchall()

        files_list = [dict(f) for f in files]
        results.append({
            "employee": dict(emp_row),
            "active_files": files_list,
            "total_active": len(files_list),
            "total_alerted": sum(1 for f in files_list if f["alert_count"] > 0),
        })
        
    if not results:
        return {"type": "employee_detail", "error": f"Employees not found: {', '.join(employee_ids)}"}

    return {
        "type": "employee_detail",
        "employees_data": results
    }


def _build_alert_summary_context(conn: sqlite3.Connection) -> dict:
    top_alerts = conn.execute(
        """
        SELECT a.file_id, f.title, f.priority, a.alert_type, a.severity,
               a.risk_score, a.days_inactive, a.is_overdue, a.days_to_deadline,
               e.name AS holder_name, e.role AS holder_role
        FROM alerts a
        JOIN files f ON a.file_id = f.file_id
        JOIN employees e ON f.current_holder_id = e.employee_id
        ORDER BY a.risk_score DESC
        LIMIT 10
        """
    ).fetchall()

    return {
        "type": "alert_summary",
        "description": "Top 10 highest-risk alerts across all active files.",
        "top_10_alerts": [dict(a) for a in top_alerts],
    }


def _build_overdue_context(conn: sqlite3.Connection) -> dict:
    overdue = conn.execute(
        """
        SELECT f.file_id, f.title, f.priority, f.deadline_at,
               e.name AS holder_name, e.role AS holder_role,
               MAX(a.risk_score) AS risk_score,
               MAX(a.days_to_deadline) AS days_past_deadline
        FROM files f
        JOIN employees e ON f.current_holder_id = e.employee_id
        LEFT JOIN alerts a ON f.file_id = a.file_id AND a.is_overdue = 1
        WHERE f.current_status = 'Active' AND f.file_id IN (
            SELECT file_id FROM alerts WHERE is_overdue = 1
        )
        GROUP BY f.file_id
        ORDER BY risk_score DESC
        """
    ).fetchall()

    return {
        "type": "overdue_files",
        "description": "All active files that have passed their deadline.",
        "overdue_files": [dict(f) for f in overdue],
        "count": len(overdue),
    }


def _build_loop_context(conn: sqlite3.Connection) -> dict:
    loops = conn.execute(
        """
        SELECT a.file_id, f.title, a.severity, a.risk_score,
               a.loop_round_trips, a.loop_total_bounces,
               a.loop_party_a, a.loop_party_b, a.alert_id
        FROM alerts a
        JOIN files f ON a.file_id = f.file_id
        WHERE a.alert_type = 'LOOPING'
        ORDER BY a.risk_score DESC
        LIMIT 15
        """
    ).fetchall()

    return {
        "type": "department_loops",
        "description": "Files detected as looping between departments or officers.",
        "looping_alerts": [dict(l) for l in loops],
        "total_looping_files": len({dict(l)["file_id"] for l in loops}),
    }


def _build_dashboard_context(conn: sqlite3.Connection) -> dict:
    active_count = conn.execute(
        "SELECT COUNT(*) FROM files WHERE current_status = 'Active'"
    ).fetchone()[0]

    alerted_count = conn.execute(
        "SELECT COUNT(DISTINCT file_id) FROM alerts"
    ).fetchone()[0]

    rotting_count = conn.execute(
        "SELECT COUNT(DISTINCT file_id) FROM alerts WHERE alert_type = 'ROTTING'"
    ).fetchone()[0]

    looping_count = conn.execute(
        "SELECT COUNT(DISTINCT file_id) FROM alerts WHERE alert_type = 'LOOPING'"
    ).fetchone()[0]

    overdue_count = conn.execute(
        "SELECT COUNT(DISTINCT file_id) FROM alerts WHERE is_overdue = 1"
    ).fetchone()[0]

    high_risk_count = conn.execute(
        "SELECT COUNT(DISTINCT file_id) FROM alerts WHERE risk_score >= 50"
    ).fetchone()[0]

    top_5 = conn.execute(
        """
        SELECT a.file_id, f.title, MAX(a.risk_score) AS risk_score,
               e.name AS holder_name
        FROM alerts a
        JOIN files f ON a.file_id = f.file_id
        JOIN employees e ON f.current_holder_id = e.employee_id
        GROUP BY a.file_id
        ORDER BY risk_score DESC
        LIMIT 5
        """
    ).fetchall()

    return {
        "type": "dashboard_summary",
        "total_active_files": active_count,
        "total_alerted_files": alerted_count,
        "rotting_files": rotting_count,
        "looping_files": looping_count,
        "overdue_files": overdue_count,
        "high_risk_files": high_risk_count,
        "top_5_risk_files": [dict(f) for f in top_5],
    }
