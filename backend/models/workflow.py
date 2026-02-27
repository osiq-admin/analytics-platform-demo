"""Pydantic models for workflow metadata."""
from pydantic import BaseModel


class WorkflowState(BaseModel):
    id: str
    label: str
    badge_variant: str = "info"
    transitions: list[str] = []


class WorkflowConfig(BaseModel):
    workflow_id: str
    description: str = ""
    states: list[WorkflowState] = []
