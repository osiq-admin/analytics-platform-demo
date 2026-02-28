"""Pydantic models for data quality dimensions, scores, and quarantine records."""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal


class QualityDimension(BaseModel):
    """A single quality dimension (ISO 8000/25012-aligned)."""
    id: str
    name: str
    iso_ref: str = ""
    description: str = ""
    weight: float = 0.0
    rule_types: list[str] = Field(default_factory=list)
    score_method: Literal["ratio", "binary"] = "ratio"
    thresholds: dict[str, float] = Field(default_factory=dict)


class QualityDimensionsConfig(BaseModel):
    """Top-level wrapper for quality dimensions metadata."""
    dimensions: list[QualityDimension] = Field(default_factory=list)


class DimensionScore(BaseModel):
    """Score for a single quality dimension."""
    dimension_id: str
    score: float = 100.0
    rules_evaluated: int = 0
    rules_passed: int = 0
    violation_count: int = 0
    total_count: int = 0
    status: Literal["good", "warning", "critical"] = "good"


class EntityQualityScore(BaseModel):
    """Aggregate quality score for an entity at a specific tier."""
    entity: str
    tier: str
    overall_score: float = 100.0
    dimension_scores: list[DimensionScore] = Field(default_factory=list)
    timestamp: str = ""
    contract_id: str = ""


class QuarantineRecord(BaseModel):
    """A record that failed quality validation and was quarantined."""
    record_id: str
    source_tier: str
    target_tier: str
    entity: str
    failed_rules: list[dict] = Field(default_factory=list)
    original_data: dict = Field(default_factory=dict)
    timestamp: str = ""
    retry_count: int = 0
    status: Literal["pending", "retried", "overridden", "discarded"] = "pending"
    notes: str = ""


class QuarantineSummary(BaseModel):
    """Summary statistics for quarantine queue."""
    total_records: int = 0
    by_entity: dict[str, int] = Field(default_factory=dict)
    by_tier_transition: dict[str, int] = Field(default_factory=dict)
    by_rule_type: dict[str, int] = Field(default_factory=dict)
    by_status: dict[str, int] = Field(default_factory=dict)


class QualityProfile(BaseModel):
    """Data profiling result for a single field."""
    field_name: str
    total_count: int = 0
    null_count: int = 0
    null_pct: float = 0.0
    distinct_count: int = 0
    min_value: str = ""
    max_value: str = ""
    top_values: list[dict] = Field(default_factory=list)


class EntityProfile(BaseModel):
    """Data profiling result for an entity."""
    entity: str
    tier: str
    table_name: str = ""
    row_count: int = 0
    field_profiles: list[QualityProfile] = Field(default_factory=list)
