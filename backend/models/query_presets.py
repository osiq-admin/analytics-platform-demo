"""Query preset models — SQL presets loaded from metadata JSON."""
from pydantic import BaseModel, Field


class QueryPreset(BaseModel):
    preset_id: str
    name: str
    sql: str
    category: str = "general"
    description: str = ""
    order: int = 0


class QueryPresetGroup(BaseModel):
    preset_group_id: str
    presets: list[QueryPreset] = Field(default_factory=list)
