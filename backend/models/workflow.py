"""Pydantic models for workflow, demo checkpoint, and tour registry metadata."""
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


# -- Tour Registry (M169) --

class TourSummary(BaseModel):
    tour_id: str
    view_path: str
    title: str
    step_count: int


class ScenarioCategory(BaseModel):
    category: str
    count: int


class ScenarioSummary(BaseModel):
    total_count: int
    categories: list[ScenarioCategory] = []


class TourRegistry(BaseModel):
    registry_id: str
    description: str = ""
    tours: list[TourSummary] = []
    scenarios: ScenarioSummary | None = None
