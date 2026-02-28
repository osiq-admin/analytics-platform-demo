"""Pydantic models for the 11-tier medallion data architecture."""
from __future__ import annotations

from pydantic import BaseModel, Field


class TierDefinition(BaseModel):
    """A single tier in the medallion architecture."""
    tier_id: str
    tier_number: int
    name: str
    purpose: str = ""
    data_state: str = ""
    storage_format: str = ""
    retention_policy: str = ""
    quality_gate: str = ""
    access_level: str = ""
    mutable: bool = False
    append_only: bool = True


class FieldMapping(BaseModel):
    """Maps a source field to a target field with optional transformation."""
    source: str
    target: str
    transform: str = "passthrough"


class QualityRule(BaseModel):
    """A single data quality rule within a contract."""
    rule: str
    fields: list[str] = Field(default_factory=list)
    field: str | None = None
    reference: str | None = None
    min: float | None = None
    max: float | None = None
    values: list[str] = Field(default_factory=list)


class SLA(BaseModel):
    """Service-level agreement for a data contract."""
    freshness_minutes: int = 60
    completeness_pct: float = 99.0


class DataContract(BaseModel):
    """Defines the agreement between two tiers for a specific entity."""
    contract_id: str
    source_tier: str
    target_tier: str
    entity: str
    description: str = ""
    field_mappings: list[FieldMapping] = Field(default_factory=list)
    quality_rules: list[QualityRule] = Field(default_factory=list)
    sla: SLA = Field(default_factory=SLA)
    owner: str = ""
    classification: str = "internal"


class TransformationStep(BaseModel):
    """A metadata-driven tier-to-tier transformation."""
    transformation_id: str
    source_tier: str
    target_tier: str
    entity: str
    description: str = ""
    sql_template: str = ""
    parameters: dict[str, object] = Field(default_factory=dict)
    quality_checks: list[str] = Field(default_factory=list)
    error_handling: str = "quarantine"


class PipelineStage(BaseModel):
    """A stage in the medallion pipeline execution plan."""
    stage_id: str
    name: str
    tier_from: str | None = None
    tier_to: str
    order: int = 0
    depends_on: list[str] = Field(default_factory=list)
    entities: list[str] = Field(default_factory=list)
    parallel: bool = False
    transformation_id: str = ""
    contract_id: str = ""


class MedallionConfig(BaseModel):
    """Top-level wrapper for tier definitions."""
    tiers: list[TierDefinition] = Field(default_factory=list)


class PipelineConfig(BaseModel):
    """Top-level wrapper for pipeline stages."""
    stages: list[PipelineStage] = Field(default_factory=list)
