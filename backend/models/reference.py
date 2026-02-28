"""Pydantic models for Reference Data / Master Data Management."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Literal


class FieldProvenance(BaseModel):
    """Tracks the source of a single field value in a golden record."""
    value: str | float | int | bool | None = None
    source: str = ""
    confidence: float = 1.0
    last_updated: str = ""


class GoldenRecord(BaseModel):
    """A deduplicated, reconciled master data record."""
    golden_id: str
    entity: str
    natural_key: str
    data: dict = Field(default_factory=dict)
    provenance: dict[str, FieldProvenance] = Field(default_factory=dict)
    source_records: list[str] = Field(default_factory=list)
    confidence_score: float = 1.0
    last_reconciled: str = ""
    status: Literal["active", "pending_review", "superseded", "manual_override"] = "active"
    version: int = 1
    notes: str = ""


class GoldenRecordSet(BaseModel):
    """Collection of golden records for one entity."""
    entity: str
    golden_key: str
    record_count: int = 0
    records: list[GoldenRecord] = Field(default_factory=list)
    last_reconciled: str = ""


class MatchRule(BaseModel):
    """A rule for matching source records to golden records."""
    strategy: Literal["exact", "fuzzy", "composite"] = "exact"
    fields: list[str] = Field(default_factory=list)
    threshold: float = 1.0
    weight: float = 1.0


class MergeRule(BaseModel):
    """A rule for resolving conflicting values during golden record creation."""
    field: str
    strategy: Literal["longest", "shortest", "most_frequent", "most_recent",
                       "source_priority", "manual"] = "most_recent"
    source_priority: list[str] = Field(default_factory=list)


class ExternalSource(BaseModel):
    """An external reference data source for validation/enrichment."""
    source_id: str
    field: str
    validation_type: Literal["lookup", "format", "cross_reference"] = "lookup"
    description: str = ""


class ReferenceConfig(BaseModel):
    """Per-entity reference data configuration."""
    entity: str
    golden_key: str
    display_name: str = ""
    description: str = ""
    match_rules: list[MatchRule] = Field(default_factory=list)
    merge_rules: list[MergeRule] = Field(default_factory=list)
    external_sources: list[ExternalSource] = Field(default_factory=list)
    auto_reconcile: bool = True
    reconciliation_schedule: str = "on_demand"


class ReconciliationResult(BaseModel):
    """Result of a reconciliation run."""
    entity: str
    total_source_records: int = 0
    total_golden_records: int = 0
    new_records: int = 0
    updated_records: int = 0
    conflicts: int = 0
    unmatched: int = 0
    confidence_distribution: dict[str, int] = Field(default_factory=dict)
    timestamp: str = ""
    duration_ms: int = 0


class CrossReference(BaseModel):
    """Tracks which downstream records reference a golden record."""
    golden_id: str
    entity: str
    referencing_entity: str
    referencing_field: str
    reference_count: int = 0
