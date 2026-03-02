"""Case management models for investigation lifecycle."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CaseAnnotation(BaseModel):
    """An investigation annotation on a case."""
    annotation_id: str
    author: str = "analyst_1"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    type: Literal["note", "disposition", "escalation", "evidence"] = "note"
    content: str = ""
    metadata: dict = Field(default_factory=dict)


class CaseSLAInfo(BaseModel):
    """SLA tracking for a case."""
    due_date: str | None = None
    sla_hours: int = 72
    sla_status: Literal["on_track", "at_risk", "breached"] = "on_track"


class Case(BaseModel):
    """An investigation case linking one or more alerts."""
    case_id: str
    title: str
    description: str = ""
    status: Literal["open", "investigating", "escalated", "resolved", "closed"] = "open"
    priority: Literal["critical", "high", "medium", "low"] = "medium"
    category: str = "market_abuse"
    assignee: str = "analyst_1"
    alert_ids: list[str] = Field(default_factory=list)
    annotations: list[CaseAnnotation] = Field(default_factory=list)
    sla: CaseSLAInfo = Field(default_factory=CaseSLAInfo)
    disposition: str | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    resolved_at: str | None = None
    closed_at: str | None = None
