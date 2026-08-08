# FilePulse API Documentation
**Version:** 1.0 | **Base URL:** `http://localhost:8000` | **CORS:** `http://localhost:5173`

All responses are `Content-Type: application/json`. Dates are ISO 8601 strings. `null` is used for optional fields not applicable to a given alert type (e.g. `loop_round_trips` on a ROTTING alert is always `null`).

---

## Endpoints at a Glance

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/dashboard/summary` | KPI counts for the header strip |
| GET | `/api/alerts` | Red List — consolidated alerts sorted by risk |
| GET | `/api/files/{file_id}/journey` | Full file detail: metadata + events + graph + AI insight |
| GET | `/api/employees/{employee_id}/workload` | Per-employee active file stats |
| GET | `/api/org/tree` | Full org hierarchy with file counts |
| POST | `/api/alerts/{alert_id}/ai-insight` | Regenerate one AI insight on demand |

---

## 1. `GET /api/health`

Liveness check. Always returns 200 if the server is running.

**Response `200`**
```json
{
  "status": "ok",
  "project": "FilePulse"
}
```

---

## 2. `GET /api/dashboard/summary`

Returns KPI counts for the dashboard header strip. Counts are derived from the consolidated alert view (one row per file, not per raw alert record).

**No parameters.**

**Response `200`**

| Field | Type | Description |
|---|---|---|
| `total_active_files` | `int` | Files with `current_status = "Active"` |
| `total_alerted_files` | `int` | Active files with at least one alert |
| `rotting_files` | `int` | Distinct files with a ROTTING alert |
| `looping_files` | `int` | Distinct files with a LOOPING alert |
| `conformance_files` | `int` | Distinct files with a CONFORMANCE alert |
| `compound_files` | `int` | Files with both ROTTING and LOOPING alerts |
| `high_risk_files` | `int` | Consolidated alerts with `risk_score >= 50` |
| `overdue_files` | `int` | Active files where `deadline_at < REFERENCE_NOW` |
| `reference_date` | `string` | ISO date of the frozen reference clock |

**Real Example**
```json
{
  "total_active_files": 11,
  "total_alerted_files": 7,
  "rotting_files": 5,
  "looping_files": 2,
  "conformance_files": 2,
  "compound_files": 1,
  "high_risk_files": 1,
  "overdue_files": 1,
  "reference_date": "2025-03-18"
}
```

> `high_risk_files` counts consolidated rows with `risk_score >= 50`. With mock data, only F5518 (score=66) qualifies.

---

## 3. `GET /api/alerts`

Returns the Red List — one consolidated row per file, sorted by `risk_score` descending.

**Query Parameters**

| Parameter | Type | Required | Allowed Values | Default |
|---|---|---|---|---|
| `type` | `string` | No | `all`, `rotting`, `looping`, `conformance` | `all` |

- `type=rotting` — files with at least one ROTTING alert
- `type=looping` — files with at least one LOOPING alert
- `type=conformance` — files with a CONFORMANCE alert
- `type=all` — no filter

**Response `200`** — Array of Alert Item objects, sorted by `risk_score` descending.

### Alert Item Object

| Field | Type | Nullable | Description |
|---|---|---|---|
| `file_id` | `string` | No | e.g. `"F4921"` |
| `file_title` | `string` | No | Human-readable title |
| `file_type` | `string` | No | e.g. `"Infrastructure"` |
| `priority` | `string` | No | `"High"`, `"Medium"`, or `"Low"` |
| `alert_types` | `string[]` | No | Sorted. e.g. `["LOOPING","ROTTING"]`. Compound files have multiple entries. |
| `severity` | `string` | No | Highest severity across all alerts for this file: `"WARNING"`, `"HIGH"`, `"CRITICAL"`, `"CAMPAIGN"` |
| `risk_score` | `int` | No | 0–100. Includes compound +15 bonus. |
| `current_holder_name` | `string` | No | Resolved from employees. e.g. `"Amit Kumar"` |
| `days_inactive` | `int` | Yes | Days since last activity. `null` if no ROTTING alert. |
| `deadline_at` | `string` | No | ISO datetime. e.g. `"2025-03-25T17:00:00"` |
| `days_to_deadline` | `int` | Yes | Positive = remaining, negative = overdue days past deadline. |
| `is_overdue` | `bool` | No | `true` if `deadline_at < REFERENCE_NOW` |
| `loop_round_trips` | `int` | Yes | Round trips detected. `null` if no LOOPING alert. |
| `skipped_stages` | `string` | Yes | Comma-separated skipped stages. `null` if no CONFORMANCE alert. |
| `ai_summary` | `string` | Yes | Plain-language AI insight. `null` if none generated. |
| `ai_confidence` | `string` | Yes | `"Low"`, `"Medium"`, `"High"`. `null` if no insight. |

**Real Examples (first 2 of 7)**
```json
[
  {
    "file_id": "F5518",
    "file_title": "Medical Reimbursement Case 118",
    "file_type": "Service Benefits",
    "priority": "High",
    "alert_types": ["ROTTING"],
    "severity": "CAMPAIGN",
    "risk_score": 66,
    "current_holder_name": "Kavita Nair",
    "days_inactive": 194,
    "deadline_at": "2024-11-30T17:00:00",
    "days_to_deadline": -108,
    "is_overdue": true,
    "loop_round_trips": null,
    "skipped_stages": null,
    "ai_summary": "The 'Medical Reimbursement Case 118' has been inactive for 194 days and is overdue. The file was last opened on September 5th, 2024, when E103 started examining the hospital bills.",
    "ai_confidence": "Medium"
  },
  {
    "file_id": "F6624",
    "file_title": "City Road Resurfacing Estimate",
    "file_type": "Infrastructure",
    "priority": "High",
    "alert_types": ["CONFORMANCE", "LOOPING", "ROTTING"],
    "severity": "HIGH",
    "risk_score": 45,
    "current_holder_name": "M. Das",
    "days_inactive": 25,
    "deadline_at": "2025-04-15T17:00:00",
    "days_to_deadline": 28,
    "is_overdue": false,
    "loop_round_trips": 3,
    "skipped_stages": "Initial Review",
    "ai_summary": "The 'City Road Resurfacing Estimate' has encountered several clarification requests. The last request was for HoD approval due to the estimate exceeding delegated limits.",
    "ai_confidence": "Medium"
  }
]
```

**Error Responses**

| Status | Condition |
|---|---|
| `400` | `type` value is not one of the allowed values |

---

## 4. `GET /api/files/{file_id}/journey`

Returns full detail for a single file.

**Path Parameters**

| Parameter | Type | Example |
|---|---|---|
| `file_id` | `string` | `F4921` |

**Response `200`**

```json
{
  "file":       { ... },
  "alerts":     [ ... ],
  "events":     [ ... ],
  "graph":      { "nodes": [...], "edges": [...] },
  "ai_insight": { ... } | null
}
```

### `file` — FileDetail Object

| Field | Type | Description |
|---|---|---|
| `file_id` | `string` | |
| `title` | `string` | |
| `file_type` | `string` | |
| `priority` | `string` | |
| `created_at` | `string` | ISO datetime |
| `deadline_at` | `string` | ISO datetime |
| `current_holder_id` | `string` | Employee ID |
| `current_holder_name` | `string` | Resolved full name |
| `current_status` | `string` | `"Active"` or `"Closed"` |
| `days_inactive` | `int` | Calendar days since last event (or `created_at` if no events) |
| `days_to_deadline` | `int` | Positive = remaining, negative = overdue |
| `is_overdue` | `bool` | |

### `alerts` — Raw Alert Array

Individual alert records for this file (not consolidated). One entry per detector that fired.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `alert_id` | `string` | No | e.g. `"ROT-F6624"`, `"LOOP-USER-F6624-E201-E302"` |
| `alert_type` | `string` | No | `"ROTTING"`, `"LOOPING"`, or `"CONFORMANCE"` |
| `severity` | `string` | No | |
| `risk_score` | `int` | No | |
| `days_inactive` | `int` | Yes | ROTTING only |
| `days_to_deadline` | `int` | Yes | All types |
| `is_overdue` | `bool` | No | |
| `loop_round_trips` | `int` | Yes | LOOPING only |
| `loop_total_bounces` | `int` | Yes | LOOPING only. Total individual transfers (round_trips × 2) |
| `loop_party_a` | `string` | Yes | Employee ID or dept name |
| `loop_party_b` | `string` | Yes | Employee ID or dept name |
| `skipped_stages` | `string` | Yes | CONFORMANCE only. Comma-separated. |
| `detected_at` | `string` | No | Always `"2025-03-18T09:00:00"` |

### `events` — EnrichedEvent Array

All events for the file ordered by `timestamp` ascending, enriched with resolved names.

| Field | Type | Description |
|---|---|---|
| `event_id` | `string` | e.g. `"EV1003"` |
| `timestamp` | `string` | ISO datetime |
| `action` | `string` | One of 11 action types (see Section 11) |
| `from_user_id` | `string` | |
| `from_user_name` | `string` | Resolved full name |
| `to_user_id` | `string` | |
| `to_user_name` | `string` | Resolved full name |
| `department` | `string` | |
| `stage` | `string` | Workflow stage label |
| `note_text` | `string` | |
| `is_transfer` | `bool` | `true` if `from_user_id != to_user_id` |

**Real Example — F4921 events**
```json
[
  {
    "event_id": "EV1001",
    "timestamp": "2025-01-28T09:30:00",
    "action": "RECEIPT_DIARISED",
    "from_user_id": "E100", "from_user_name": "R. Iyer",
    "to_user_id": "E100", "to_user_name": "R. Iyer",
    "department": "General Administration Section",
    "stage": "Receipt",
    "note_text": "Grant application received from District Education Office. Diarised.",
    "is_transfer": false
  },
  {
    "event_id": "EV1003",
    "timestamp": "2025-02-01T10:05:00",
    "action": "ASSIGNED",
    "from_user_id": "E100", "from_user_name": "R. Iyer",
    "to_user_id": "E101", "to_user_name": "Amit Kumar",
    "department": "General Administration Section",
    "stage": "Initial Review",
    "note_text": "Assigned to Amit for initial examination and draft note.",
    "is_transfer": true
  },
  {
    "event_id": "EV1004",
    "timestamp": "2025-02-01T10:20:00",
    "action": "FILE_OPENED",
    "from_user_id": "E101", "from_user_name": "Amit Kumar",
    "to_user_id": "E101", "to_user_name": "Amit Kumar",
    "department": "General Administration Section",
    "stage": "Initial Review",
    "note_text": "File opened.",
    "is_transfer": false
  }
]
```

### `graph` — FlowGraph Object (ReactFlow-compatible)

Nodes are employees who touched the file. Edges are directed transfers between them.

```json
{
  "nodes": [ <Node>, ... ],
  "edges": [ <Edge>, ... ]
}
```

#### Node Object

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Employee ID. e.g. `"E100"` |
| `data.label` | `string` | Full name |
| `data.role` | `string` | Role title |
| `data.department` | `string` | Department name |
| `data.is_current_holder` | `bool` | `true` if currently holding this file |
| `data.is_loop_party` | `bool` | `true` if part of a detected loop on this file |
| `data.file_count` | `int` | Events generated by this employee on this file |
| `position` | `object` | `{ "x": <int>, "y": <int> }` — lane layout |
| `type` | `string` | Always `"default"` |

**Layout rule:** Assign `y = department_index * 150` (departments ordered by first appearance in events). Assign `x = node_index_within_department * 200`. This places each department in a horizontal lane.

#### Edge Object

| Field | Type | Description |
|---|---|---|
| `id` | `string` | e.g. `"E100-E201"` — unique per direction pair |
| `source` | `string` | From employee ID |
| `target` | `string` | To employee ID |
| `data.label` | `string` | e.g. `"3 transfers"` |
| `data.count` | `int` | Number of transfers in this direction |
| `data.is_loop_edge` | `bool` | `true` if this direction is part of a detected reciprocal loop |
| `animated` | `bool` | Same as `data.is_loop_edge` — drives ReactFlow arrow animation |

**Edge construction rules:**
- One node per unique employee in `from_user_id` or `to_user_id` across all events.
- Edges are **directed**. One edge per `(from, to)` pair. If A→B happens 3 times, one edge with `count=3`.
- `is_loop_edge = true` for both A→B and B→A when a LOOPING alert exists for that pair on this file.
- Self-loops (from = to) are **not** added as edges.

**Real Example — F6624 graph (compound file)**
```json
{
  "nodes": [
    {
      "id": "E100",
      "data": {
        "label": "R. Iyer", "role": "Section Officer",
        "department": "General Administration Section",
        "is_current_holder": false, "is_loop_party": false, "file_count": 3
      },
      "position": { "x": 100, "y": 0 }, "type": "default"
    },
    {
      "id": "E201",
      "data": {
        "label": "A. Rao", "role": "Section Officer (Finance)",
        "department": "Finance Department",
        "is_current_holder": false, "is_loop_party": true, "file_count": 4
      },
      "position": { "x": 100, "y": 150 }, "type": "default"
    },
    {
      "id": "E302",
      "data": {
        "label": "M. Das", "role": "Assistant Engineer",
        "department": "Public Works Department",
        "is_current_holder": true, "is_loop_party": true, "file_count": 4
      },
      "position": { "x": 100, "y": 300 }, "type": "default"
    }
  ],
  "edges": [
    {
      "id": "E100-E201", "source": "E100", "target": "E201",
      "data": { "label": "1 transfer", "count": 1, "is_loop_edge": false },
      "animated": false
    },
    {
      "id": "E201-E302", "source": "E201", "target": "E302",
      "data": { "label": "3 transfers", "count": 3, "is_loop_edge": true },
      "animated": true
    },
    {
      "id": "E302-E201", "source": "E302", "target": "E201",
      "data": { "label": "3 transfers", "count": 3, "is_loop_edge": true },
      "animated": true
    }
  ]
}
```

### `ai_insight` — AiInsight Object or `null`

`null` if no insight was generated for any alert on this file.

| Field | Type | Description |
|---|---|---|
| `insight_id` | `string` | UUID |
| `alert_id` | `string` | The alert this insight was generated for |
| `plain_language_summary` | `string` | 2–4 sentence plain-language explanation |
| `likely_blocker` | `string` | Identified blocker |
| `recommended_action` | `string` | Actionable recommendation |
| `confidence` | `string` | `"Low"`, `"Medium"`, or `"High"` |
| `source` | `string` | `"ollama"` or `"fallback"` |
| `generated_at` | `string` | Always `"2025-03-18T09:00:00"` |

> The insight shown is for the **highest-scored alert** of the file. Find it by joining `ai_insights` against `alerts` filtered by `file_id`, ordered by `risk_score DESC`, taking the first match.

**Error Responses**

| Status | Condition |
|---|---|
| `404` | `file_id` not found |

---

## 5. `GET /api/employees/{employee_id}/workload`

Returns workload details for one employee.

**Path Parameters**

| Parameter | Type | Example |
|---|---|---|
| `employee_id` | `string` | `E101` |

**Response `200`**

| Field | Type | Description |
|---|---|---|
| `employee_id` | `string` | |
| `name` | `string` | |
| `role` | `string` | |
| `department` | `string` | |
| `active_file_count` | `int` | Files currently held |
| `alerted_file_count` | `int` | Of those, how many have at least one alert |
| `files` | `WorkloadFile[]` | All currently held active files |

#### WorkloadFile Object

| Field | Type | Nullable | Description |
|---|---|---|---|
| `file_id` | `string` | No | |
| `title` | `string` | No | |
| `file_type` | `string` | No | |
| `priority` | `string` | No | |
| `days_inactive` | `int` | Yes | `null` if file has no ROTTING alert (healthy) |
| `is_overdue` | `bool` | No | |
| `alert_types` | `string[]` | No | Empty `[]` if no alerts |
| `risk_score` | `int` | No | `0` if no alerts |

**Real Example — `GET /api/employees/E101/workload`**
```json
{
  "employee_id": "E101",
  "name": "Amit Kumar",
  "role": "Junior Assistant",
  "department": "General Administration Section",
  "active_file_count": 3,
  "alerted_file_count": 1,
  "files": [
    {
      "file_id": "F4921",
      "title": "School Roof Repair Grant",
      "file_type": "Infrastructure",
      "priority": "High",
      "days_inactive": 45,
      "is_overdue": false,
      "alert_types": ["ROTTING"],
      "risk_score": 47
    },
    {
      "file_id": "F9034",
      "title": "AMC Renewal Section Servers",
      "file_type": "Procurement",
      "priority": "Low",
      "days_inactive": null,
      "is_overdue": false,
      "alert_types": [],
      "risk_score": 0
    },
    {
      "file_id": "F9555",
      "title": "Vehicle Allotment Pool Car",
      "file_type": "Administration",
      "priority": "Low",
      "days_inactive": null,
      "is_overdue": false,
      "alert_types": [],
      "risk_score": 0
    }
  ]
}
```

**Error Responses**

| Status | Condition |
|---|---|
| `404` | `employee_id` not found |

---

## 6. `GET /api/org/tree`

Returns the full employee hierarchy as a tree with file counts at each node.

**No parameters.**

**Response `200`** — Array of `OrgNode` (root employees, each with nested `children`)

### OrgNode Object (recursive)

| Field | Type | Description |
|---|---|---|
| `employee_id` | `string` | |
| `name` | `string` | |
| `role` | `string` | |
| `department` | `string` | |
| `active_files` | `int` | Files currently held by this employee |
| `alerted_files` | `int` | Of those, how many have at least one alert |
| `children` | `OrgNode[]` | Direct reports. `[]` if leaf. |

> **Tree construction:** Employees with `manager_id = null` are roots. All others are children of their manager. The mock data has 3 roots: E090, E201, E301.

**Real Example**
```json
[
  {
    "employee_id": "E090", "name": "S. Mehta",
    "role": "Under Secretary", "department": "Administration Directorate",
    "active_files": 0, "alerted_files": 0,
    "children": [
      {
        "employee_id": "E100", "name": "R. Iyer",
        "role": "Section Officer", "department": "General Administration Section",
        "active_files": 3, "alerted_files": 1,
        "children": [
          {
            "employee_id": "E101", "name": "Amit Kumar",
            "role": "Junior Assistant", "department": "General Administration Section",
            "active_files": 3, "alerted_files": 1, "children": []
          },
          {
            "employee_id": "E102", "name": "Priya Sharma",
            "role": "Junior Assistant", "department": "General Administration Section",
            "active_files": 1, "alerted_files": 1, "children": []
          },
          {
            "employee_id": "E103", "name": "Kavita Nair",
            "role": "Junior Assistant", "department": "General Administration Section",
            "active_files": 2, "alerted_files": 2, "children": []
          }
        ]
      }
    ]
  },
  {
    "employee_id": "E201", "name": "A. Rao",
    "role": "Section Officer (Finance)", "department": "Finance Department",
    "active_files": 0, "alerted_files": 0,
    "children": [
      {
        "employee_id": "E202", "name": "S. Gupta",
        "role": "Assistant (Finance)", "department": "Finance Department",
        "active_files": 1, "alerted_files": 1, "children": []
      }
    ]
  },
  {
    "employee_id": "E301", "name": "P. Singh",
    "role": "Section Officer (PWD)", "department": "Public Works Department",
    "active_files": 0, "alerted_files": 0,
    "children": [
      {
        "employee_id": "E302", "name": "M. Das",
        "role": "Assistant Engineer", "department": "Public Works Department",
        "active_files": 1, "alerted_files": 1, "children": []
      }
    ]
  }
]
```

---

## 7. `POST /api/alerts/{alert_id}/ai-insight`

Regenerates the AI insight for a single alert. Calls Ollama, updates the SQLite cache, returns the new insight.

**Path Parameters**

| Parameter | Type | Example |
|---|---|---|
| `alert_id` | `string` | `ROT-F4921` |

**No request body.**

**Response `200`** — AiInsight object (same schema as in journey response)

```json
{
  "insight_id": "a1b2c3d4-...",
  "alert_id": "ROT-F4921",
  "plain_language_summary": "...",
  "likely_blocker": "...",
  "recommended_action": "...",
  "confidence": "Medium",
  "source": "ollama",
  "generated_at": "2025-03-18T09:00:00"
}
```

> If Ollama is unavailable, returns a fallback insight with `"source": "fallback"`. Always returns `200` — never errors due to Ollama being down.

**Error Responses**

| Status | Condition |
|---|---|
| `404` | `alert_id` not found in the alerts table |

---

## 8. Error Response Format

All 4xx errors use this shape:

```json
{
  "error": true,
  "status_code": 404,
  "detail": "File F9999 not found"
}
```

Implement with a FastAPI custom exception handler on `HTTPException`.

---

## 9. Implementation Notes for `routes.py`

### DB Dependency

```python
from app.db import get_connection

def get_conn():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
```

Inject as `conn: sqlite3.Connection = Depends(get_conn)` in each route.

### Alert Type Filter (`/api/alerts`)

```python
if type_filter == "rotting":
    return [a for a in consolidated if "ROTTING" in a.alert_types]
elif type_filter == "looping":
    return [a for a in consolidated if "LOOPING" in a.alert_types]
elif type_filter == "conformance":
    return [a for a in consolidated if "CONFORMANCE" in a.alert_types]
else:
    return consolidated  # "all"
```

### Graph Layout

```
y = department_index * 150   (departments ordered by first event timestamp)
x = node_index_within_dept * 200
```

Each department is a horizontal lane. Nodes within the same department share the same `y`.

### AI Insight for Journey

The insight shown for a file is attached to the **primary alert** (highest `risk_score` among all alerts for that file). Resolve it as:

```sql
SELECT i.* FROM ai_insights i
JOIN alerts a ON i.alert_id = a.alert_id
WHERE a.file_id = ?
ORDER BY a.risk_score DESC
LIMIT 1
```

### Loop Party Identification

For `is_loop_party` on graph nodes: check if the employee's ID appears in `loop_party_a` or `loop_party_b` of any LOOPING alert for this file where `loop_party_a` starts with `"E"` (user-level loop, not dept-level).

---

## 10. Valid alert_id Formats

| Alert Type | Format | Example |
|---|---|---|
| ROTTING | `ROT-{file_id}` | `ROT-F4921` |
| LOOPING (user-level) | `LOOP-USER-{file_id}-{emp_a}-{emp_b}` | `LOOP-USER-F6624-E201-E302` |
| LOOPING (dept-level) | `LOOP-DEPARTMENT-{file_id}-{dept_a}-{dept_b}` | `LOOP-DEPARTMENT-F8832-Finance Department-General Administration Section` |
| CONFORMANCE | `CONF-{file_id}` | `CONF-F7741` |

---

## 11. Enum Reference

| Field | Allowed Values |
|---|---|
| `alert_type` | `ROTTING`, `LOOPING`, `CONFORMANCE` |
| `severity` | `WARNING`, `HIGH`, `CRITICAL`, `CAMPAIGN` |
| `priority` | `High`, `Medium`, `Low` |
| `confidence` | `Low`, `Medium`, `High` |
| `source` | `ollama`, `fallback` |
| `current_status` | `Active`, `Closed`, `Archived` |
| `file_type` | `Infrastructure`, `Procurement`, `Service Benefits`, `Training`, `Records`, `Welfare`, `HR`, `Administration` |
| `action` (events) | `RECEIPT_DIARISED`, `FILE_CREATED`, `FILE_OPENED`, `NOTE_ADDED`, `APPROVED`, `REJECTED`, `CLOSED`, `ASSIGNED`, `FORWARDED`, `RETURNED`, `CLARIFICATION_REQUESTED`, `CLARIFICATION_PROVIDED` |
| `type` (query param) | `all`, `rotting`, `looping`, `conformance` |

---

## 12. Data Flow

```
Frontend Request
       │
       ▼
FastAPI routes.py
       │
       ├── Depends(get_conn) → sqlite3.Connection
       │
       ├── READ employees, files, events  (raw ingested data)
       ├── READ alerts                    (pre-computed at startup)
       ├── READ ai_insights               (pre-cached at startup)
       │
       └── TRANSFORM: join + enrich → response JSON
```

Routes are **read-only** against all pre-computed tables.
The only write in routes.py is `POST /api/alerts/{alert_id}/ai-insight`,
which calls `generate_insight()` then `insert_ai_insights()`.
