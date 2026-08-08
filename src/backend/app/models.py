from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


Priority = Literal["High", "Medium", "Low"]
FileStatus = Literal["Active", "Closed", "Archived"]
AlertType = Literal["ROTTING", "LOOPING", "CONFORMANCE"]
Severity = Literal["WARNING", "HIGH", "CRITICAL", "CAMPAIGN"]
Confidence = Literal["Low", "Medium", "High"]
InsightSource = Literal["ollama", "fallback"]

EventAction = Literal[
    "RECEIPT_DIARISED",
    "FILE_CREATED",
    "FILE_OPENED",
    "NOTE_ADDED",
    "APPROVED",
    "REJECTED",
    "CLOSED",
    "ASSIGNED",
    "FORWARDED",
    "RETURNED",
    "CLARIFICATION_REQUESTED",
    "CLARIFICATION_PROVIDED",
]

FileType = Literal[
    "Infrastructure",
    "Procurement",
    "Service Benefits",
    "Training",
    "Records",
    "Welfare",
    "HR",
    "Administration",
]


class CsvModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @field_validator("*", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        if value == "":
            return None
        return value


class Employee(CsvModel):
    employee_id: str
    name: str
    role: str
    department: str
    manager_id: str | None = None


class FileRecord(CsvModel):
    file_id: str
    title: str
    file_type: FileType
    priority: Priority
    created_at: datetime
    deadline_at: datetime
    current_holder_id: str
    current_status: FileStatus


class Event(CsvModel):
    event_id: str
    file_id: str
    timestamp: datetime
    action: EventAction
    from_user_id: str
    to_user_id: str
    department: str
    stage: str
    note_text: str

    @property
    def is_transfer(self) -> bool:
        return self.to_user_id != self.from_user_id


class Alert(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    alert_id: str
    file_id: str
    alert_type: AlertType
    severity: Severity
    risk_score: int = Field(ge=0, le=100)
    days_inactive: int | None = Field(default=None, ge=0)
    days_to_deadline: int | None = None
    is_overdue: bool = False
    loop_round_trips: int | None = Field(default=None, ge=0)
    loop_total_bounces: int | None = Field(default=None, ge=0)
    loop_party_a: str | None = None
    loop_party_b: str | None = None
    skipped_stages: str | None = None
    detected_at: datetime


class AiInsight(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    insight_id: str
    alert_id: str
    plain_language_summary: str
    likely_blocker: str
    recommended_action: str
    confidence: Confidence
    source: InsightSource
    generated_at: datetime
