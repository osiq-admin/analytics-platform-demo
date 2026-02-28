"""Field mapping models for Bronze→Silver transformation."""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal


class FieldMapping(BaseModel):
    source_field: str
    target_field: str
    transform: str = "direct"
    expression: str = ""
    default_value: str = ""
    description: str = ""


class MappingDefinition(BaseModel):
    mapping_id: str
    source_entity: str
    target_entity: str
    source_tier: str = "bronze"
    target_tier: str = "silver"
    field_mappings: list[FieldMapping] = Field(default_factory=list)
    status: Literal["draft", "active", "deprecated"] = "draft"
    description: str = ""
    created_by: str = "system"


class MappingValidationResult(BaseModel):
    valid: bool = True
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    unmapped_source: list[str] = Field(default_factory=list)
    unmapped_target: list[str] = Field(default_factory=list)
