from app.models import AiInsight, Alert, ConsolidatedAlert, Employee, FileRecord

SEVERITY_RANK = {
    "WARNING": 1,
    "HIGH": 2,
    "CRITICAL": 3,
    "CAMPAIGN": 4,
}

def consolidate_alerts(
    alerts: list[Alert],
    files: list[FileRecord],
    employees: list[Employee],
    insights: list[AiInsight] | None = None,
) -> list[ConsolidatedAlert]:
    """
    Consolidates separate alert records into a single consolidated row per file for the UI.
    Groups by file_id, aggregates alert types (e.g., LOOP + ROTTING), and selects the highest
    risk score and severity.
    """
    alerts_by_file: dict[str, list[Alert]] = {}
    for alert in alerts:
        alerts_by_file.setdefault(alert.file_id, []).append(alert)
        
    files_by_id = {f.file_id: f for f in files}
    employees_by_id = {e.employee_id: e for e in employees}
    
    insights_by_alert_id = {i.alert_id: i for i in (insights or [])}
    
    consolidated = []
    
    for file_id, file_alerts in alerts_by_file.items():
        file_record = files_by_id.get(file_id)
        if not file_record:
            continue
            
        holder = employees_by_id.get(file_record.current_holder_id)
        holder_name = holder.name if holder else file_record.current_holder_id
        
        # Calculate consolidated properties - sort alert_types deterministically
        alert_types = sorted(list({a.alert_type for a in file_alerts}))

        # Sort alerts by risk score to find the primary alert (for AI insight and max score)
        primary_alert = max(file_alerts, key=lambda a: a.risk_score)

        max_severity = max(file_alerts, key=lambda a: SEVERITY_RANK.get(a.severity, 0)).severity

        # Get max values for optional fields
        days_inactive = max((a.days_inactive for a in file_alerts if a.days_inactive is not None), default=None)
        loop_round_trips = max((a.loop_round_trips for a in file_alerts if a.loop_round_trips is not None), default=None)

        skipped_stages_list = list(dict.fromkeys(a.skipped_stages for a in file_alerts if a.skipped_stages))
        skipped_stages = ", ".join(skipped_stages_list) if skipped_stages_list else None

        # For days to deadline, find a valid int. They should be identical if present.
        valid_days = [a.days_to_deadline for a in file_alerts if a.days_to_deadline is not None]
        days_to_deadline = min(valid_days) if valid_days else None

        is_overdue = any(a.is_overdue for a in file_alerts)

        # Check for AI insight: check primary_alert first, then fallback to any alert of this file
        ai_insight = insights_by_alert_id.get(primary_alert.alert_id)
        if not ai_insight:
            for a in file_alerts:
                if a.alert_id in insights_by_alert_id:
                    ai_insight = insights_by_alert_id[a.alert_id]
                    break
        
        consolidated.append(
            ConsolidatedAlert(
                file_id=file_id,
                file_title=file_record.title,
                file_type=file_record.file_type,
                priority=file_record.priority,
                alert_types=alert_types,
                severity=max_severity,
                risk_score=primary_alert.risk_score,
                current_holder_name=holder_name,
                days_inactive=days_inactive,
                deadline_at=file_record.deadline_at,
                days_to_deadline=days_to_deadline,
                is_overdue=is_overdue,
                loop_round_trips=loop_round_trips,
                skipped_stages=skipped_stages,
                ai_summary=ai_insight.plain_language_summary if ai_insight else None,
                ai_confidence=ai_insight.confidence if ai_insight else None,
            )
        )
        
    # Sort consolidated alerts by risk_score descending
    consolidated.sort(key=lambda x: x.risk_score, reverse=True)
    return consolidated
