"""Match pattern models — reusable override criteria."""
from datetime import datetime

from pydantic import BaseModel, Field


class MatchPattern(BaseModel):
    pattern_id: str
    label: str
    description: str = ""
    match: dict[str, str] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    layer: str = "oob"
