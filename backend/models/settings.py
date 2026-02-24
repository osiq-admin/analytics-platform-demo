"""Setting definition models with override resolution support."""
from typing import Any

from pydantic import BaseModel, Field, model_validator


class ScoreStep(BaseModel):
    min_value: float | None = None
    max_value: float | None = None
    score: float


class SettingOverride(BaseModel):
    match: dict[str, str]
    value: Any
    priority: int = Field(ge=0)


class SettingDefinition(BaseModel):
    setting_id: str
    name: str
    description: str = ""
    value_type: str = Field(description="decimal, integer, string, boolean, score_steps, list")
    default: Any
    match_type: str = Field(default="hierarchy", description="hierarchy or multi_dimensional")
    overrides: list[SettingOverride] = Field(default_factory=list)
    metadata_layer: str = Field(default="oob", exclude=True)

    @model_validator(mode="after")
    def sort_overrides_by_priority(self):
        self.overrides = sorted(self.overrides, key=lambda o: o.priority, reverse=True)
        return self
