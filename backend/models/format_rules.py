"""Pydantic models for metadata-driven format rules."""
from pydantic import BaseModel, Field


class FormatRule(BaseModel):
    type: str  # "number" or "label"
    precision: int | None = None
    prefix: str = ""
    suffix: str = ""
    transform: str | None = None  # e.g., "snake_to_title"


class FormatRulesConfig(BaseModel):
    format_group_id: str = "default"
    rules: dict[str, FormatRule] = Field(default_factory=dict)
    field_mappings: dict[str, str] = Field(default_factory=dict)
