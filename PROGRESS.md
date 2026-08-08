# PROGRESS.md
## Current Phase: Data
## Completed
- [x] 2026-08-08T12:00:00+05:30 Added backend Pydantic data models and SQLite ingestion tables — verified by focused validation tests
## In Progress / Blocked
- [ ] Detection engine | Not started
## Decisions Log
| Time | Decision | Reason | Approved by |
| --- | --- | --- | --- |
| 2026-08-08T12:00:00+05:30 | Support `employee.csv` as the current mock employee source while keeping `employees` as the table/model concept | Repository data file is singular, while SPECS.md names `employees.csv` | Codex, based on repository state |
## Next Up
1. Implement deterministic rotting detector.
