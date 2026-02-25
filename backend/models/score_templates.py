"""Score template models — reusable scoring tiers."""
from datetime import datetime

from pydantic import BaseModel, Field


class ScoreStep(BaseModel):
    min_value: float
    max_value: float | None = None
    score: int


class ScoreTemplate(BaseModel):
    template_id: str
    label: str
    description: str = ""
    value_category: str = ""  # volume, ratio, count, percentage, etc.
    steps: list[ScoreStep] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    layer: str = "oob"
