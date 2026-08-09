# FilePulse AI Assistant — Complete Implementation Plan
## Option 2: Smart Query Router

> **Approach:** Deterministic intent detection → Targeted SQLite fetch → Tight Ollama prompt → Grounded plain-language answer.  
> No hallucination. No vector DB. No new dependencies.

---

## 1. Architecture Overview

```
FRONTEND
  Any Page (Dashboard / FileDetail / OrgTree / etc.)
      |
  [Assistant Button]  -- floating, bottom-right corner
      |
  AssistantPanel.jsx  -- slide-in drawer (not a full page)
      |  - Conversation history (in memory, cleared on refresh)
      |  - Input box + Send
      |  - Source chips (e.g. "Based on: F5001, E302")

        POST /api/assistant/chat  { "message": "..." }

BACKEND
  AssistantRouter (app/ai/assistant.py)
      |
  Step 1: Intent Classifier
      |   - Regex + keyword rules (deterministic, no ML)
      |   - Returns: intent_type + extracted entities
      |
  Step 2: Context Builder
      |   - Queries SQLite based on intent
      |   - Returns: structured JSON context (max ~800 tokens)
      |
  Step 3: Prompt Builder
      |   - Injects context into system prompt template
      |
  Step 4: Ollama Call
      |   - qwen2.5:7b-instruct, temp=0, free-text format
      |   - 30s timeout, text fallback on failure
      |
  Step 5: Response
      --> { "reply": "...", "sources": [...], "intent": "..." }
```

---

## 2. Intent Classification (7 Intent Types)

| Intent | Triggers | SQLite Fetch |
|---|---|---|
| `FILE_DETAIL` | "file F5001", "F5001", "tell me about F..." | file meta + all events + all alerts |
| `EMPLOYEE_DETAIL` | "employee E302", "E302", "Amit", "A. Rao" | employee + active files + alert count |
| `ALERT_SUMMARY` | "most stuck", "worst files", "top alerts", "critical" | Top 10 alerts by risk_score DESC |
| `OVERDUE_FILES` | "overdue", "past deadline", "missed deadline" | All files where is_overdue = True |
| `DEPARTMENT_LOOPS` | "Finance loop", "PWD loop", "looping", "bouncing" | All LOOPING alerts, grouped by dept pair |
| `DASHBOARD_SUMMARY` | "summary", "overview", "how many", "status", "today" | Dashboard KPIs |
| `UNKNOWN` | anything else | Minimal context (counts only) |

### Classification Logic

```python
# app/ai/assistant.py

import re

PATTERNS = {
    "FILE_DETAIL": re.compile(r"\bF\d{4}\b|\bfile\s+[A-Z]\d+\b", re.IGNORECASE),
    "EMPLOYEE_DETAIL": re.compile(r"\bE\d{3}\b|employee|officer|who is|workload", re.IGNORECASE),
    "ALERT_SUMMARY": re.compile(r"most stuck|top alert|worst|critical|high risk|red list", re.IGNORECASE),
    "OVERDUE_FILES": re.compile(r"overdue|past deadline|missed deadline|late", re.IGNORECASE),
    "DEPARTMENT_LOOPS": re.compile(r"loop|bouncing|going back|finance|pwd|department", re.IGNORECASE),
    "DASHBOARD_SUMMARY": re.compile(r"summary|overview|how many|status|total|count|today", re.IGNORECASE),
}

def classify_intent(message: str) -> tuple[str, list[str]]:
    entities = []
    file_ids = re.findall(r'\bF\d{4}\b', message, re.IGNORECASE)
    entities.extend(file_ids)
    emp_ids = re.findall(r'\bE\d{3}\b', message, re.IGNORECASE)
    entities.extend(emp_ids)
    for intent, pattern in PATTERNS.items():
        if pattern.search(message):
            return intent, entities
    return "UNKNOWN", entities
```

---

## 3. Context Builders (One Per Intent)

Each builder queries SQLite and returns a compact JSON dict (< 800 tokens).

### FILE_DETAIL
```python
def build_file_context(conn, file_id: str) -> dict:
    file_row = conn.execute("SELECT * FROM files WHERE file_id = ?", (file_id,)).fetchone()
    alerts = conn.execute(
        "SELECT alert_type, severity, risk_score, days_inactive, is_overdue "
        "FROM alerts WHERE file_id = ? ORDER BY risk_score DESC", (file_id,)
    ).fetchall()
    events = conn.execute(
        "SELECT timestamp, action, from_user_id, to_user_id, note_text "
        "FROM events WHERE file_id = ? ORDER BY timestamp DESC LIMIT 8", (file_id,)
    ).fetchall()
    return {
        "type": "file_detail",
        "file": dict(file_row),
        "alerts": [dict(a) for a in alerts],
        "last_8_events": [dict(e) for e in events],
    }
```

### EMPLOYEE_DETAIL
```python
def build_employee_context(conn, employee_id: str) -> dict:
    emp = conn.execute("SELECT * FROM employees WHERE employee_id = ?", (employee_id,)).fetchone()
    files = conn.execute(
        """SELECT f.file_id, f.title, f.priority, f.deadline_at,
                  COUNT(a.alert_id) as alert_count,
                  MAX(a.risk_score) as max_risk_score
           FROM files f
           LEFT JOIN alerts a ON f.file_id = a.file_id
           WHERE f.current_holder_id = ? AND f.current_status = 'Active'
           GROUP BY f.file_id ORDER BY max_risk_score DESC NULLS LAST""",
        (employee_id,)
    ).fetchall()
    return {
        "type": "employee_detail",
        "employee": dict(emp),
        "active_files": [dict(f) for f in files],
        "total_active": len(files),
        "total_alerted": sum(1 for f in files if f["alert_count"] > 0),
    }
```

### ALERT_SUMMARY
```python
def build_alert_summary_context(conn) -> dict:
    top_alerts = conn.execute(
        """SELECT a.file_id, f.title, a.alert_type, a.severity,
                  a.risk_score, a.days_inactive, a.is_overdue, e.name as holder_name
           FROM alerts a
           JOIN files f ON a.file_id = f.file_id
           JOIN employees e ON f.current_holder_id = e.employee_id
           ORDER BY a.risk_score DESC LIMIT 10"""
    ).fetchall()
    return {"type": "alert_summary", "top_10_alerts": [dict(a) for a in top_alerts]}
```

### DASHBOARD_SUMMARY
```python
def build_dashboard_context(conn) -> dict:
    from app.api.routes import build_dashboard_summary
    return {"type": "dashboard_summary", "kpis": build_dashboard_summary(conn)}
```

---

## 4. Prompt Templates

```python
# app/ai/assistant_prompts.py

SYSTEM_PROMPT = """You are FilePulse Assistant — an administrative analyst for a
government e-Office file tracking system. You help Section Officers understand
which files need attention and why.

Rules:
- Use ONLY the structured data provided. Never invent file IDs, names, or dates.
- Use neutral language: "appears", "likely", "based on the data".
- Never assign definitive blame. Say "the file has been inactive" not "X is lazy".
- Be concise — 2-4 sentences for simple questions, bullet points for lists.
- If you cannot answer from the data, say: "I don't have enough data for that."
"""

def build_prompt(context: dict, user_message: str) -> str:
    return f"""Here is the relevant data from the FilePulse database:

{json.dumps(context, indent=2, default=str)}

---

User question: {user_message}

Answer based strictly on the data above:"""
```

---

## 5. New API Endpoint

```python
# Added to app/api/routes.py

class AssistantRequest(BaseModel):
    message: str

@router.post("/api/assistant/chat")
async def assistant_chat(
    body: AssistantRequest,
    conn: sqlite3.Connection = Depends(get_conn),
) -> dict:
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
                    "temperature": 0,
                    "stream": False,
                },
            )
            reply = response.json()["response"].strip()
    except Exception:
        reply = "I'm having trouble connecting to the AI engine. Please try again shortly."

    return {"reply": reply, "intent": intent, "sources": entities}
```

---

## 6. Frontend — AssistantPanel Component

### Files
```
src/frontend/src/
  components/
    AssistantPanel.jsx   -- Chat drawer (slide-in from right)
  api/
    client.js            -- Add fetchAssistantResponse()
  components/layout/
    Layout.jsx           -- Mount <AssistantPanel /> globally
```

### Panel Features
- **Floating button** — fixed bottom-right on every page
- **Slide-in drawer** — 400px wide, overlays content
- **Conversation memory** — React state (not stored, cleared on refresh)
- **Source chips** — "Based on: F5001" shown below each reply
- **Quick prompts** — pre-built buttons:
  - "Show overdue files"
  - "Top 5 risk alerts"
  - "Office summary"
  - "Which departments are looping?"

---

## 7. Files To Create / Modify

| Action | File | Purpose |
|---|---|---|
| CREATE | `app/ai/assistant.py` | Intent classifier + context builders |
| CREATE | `app/ai/assistant_prompts.py` | System prompt + prompt builder |
| MODIFY | `app/api/routes.py` | Add POST /api/assistant/chat |
| CREATE | `src/frontend/src/components/AssistantPanel.jsx` | Chat drawer UI |
| MODIFY | `src/frontend/src/api/client.js` | Add fetchAssistantResponse() |
| MODIFY | `src/frontend/src/components/layout/Layout.jsx` | Mount panel globally |

**Total: 3 new files, 3 modified files.**

---

## 8. Data Flow — End to End

```
User types: "What's going on with F5001?"
  -> POST /api/assistant/chat
  -> classify_intent()  -> intent="FILE_DETAIL", entities=["F5001"]
  -> build_context()    -> file meta + last 8 events + alerts (~300 tokens)
  -> build_prompt()     -> system prompt + context + question
  -> Ollama             -> "F5001 (NH-48 Culvert Repair Estimate) has been
                            inactive for 56 days, marked ROTTING at CAMPAIGN
                            severity. Appears stuck at Budget Check stage after
                            clarification round-trips between E302 and E201.
                            Recommend escalation to Section Officer."
  -> Response           -> { reply, intent:"FILE_DETAIL", sources:["F5001"] }
  -> Frontend           -> Renders reply + "Based on: F5001" chip
```

---

## 9. Guardrails

| Risk | Mitigation |
|---|---|
| Hallucinated file IDs | Context is real DB data; prompt enforces "use ONLY provided data" |
| Slow Ollama | 30s timeout + loading spinner + fallback message |
| Unknown question | UNKNOWN intent still sends office KPIs as minimal context |
| Prompt injection | Message is embedded in a structured template |
| Token overflow | Context capped — max 8 events, max 10 alerts per query |

---

## 10. Build Order

```
Phase 1 — Backend
  1. Create app/ai/assistant.py         (intent classifier + context builders)
  2. Create app/ai/assistant_prompts.py (system prompt)
  3. Add POST /api/assistant/chat       (routes.py)
  4. Test with curl

Phase 2 — Frontend
  5. Add fetchAssistantResponse()       (client.js)
  6. Build AssistantPanel.jsx           (chat drawer)
  7. Mount in Layout.jsx                (global)
  8. Test end-to-end
```

---

## 11. Example Q&A (What It Can Answer)

| Question | Intent | Quality |
|---|---|---|
| "Which file has been stuck the longest?" | ALERT_SUMMARY | Exact — days_inactive from DB |
| "Tell me about E302" | EMPLOYEE_DETAIL | Exact — name, files, alerts |
| "What's the status of F5001?" | FILE_DETAIL | Exact — events, alerts, holder |
| "Which departments keep looping?" | DEPARTMENT_LOOPS | Exact — alert pairs from DB |
| "How many files are overdue?" | DASHBOARD_SUMMARY | Exact — KPI from DB |
| "Summarize today's red list" | ALERT_SUMMARY | Top 10 by risk_score |
| "Which is the most critical file?" | ALERT_SUMMARY | Highest risk_score |
| "Tell me about the roof repair" | UNKNOWN (no F-ID) | Falls back to KPIs only |
