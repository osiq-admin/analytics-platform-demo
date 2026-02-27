"""Pydantic models for workflow and demo checkpoint metadata."""
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


class DemoCheckpoint(BaseModel):
    id: str
    label: str
    description: str = ""
    order: int = 0


class DemoConfig(BaseModel):
    demo_id: str
    description: str = ""
    checkpoints: list[DemoCheckpoint] = []
