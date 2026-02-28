"""Pydantic models for Extended Analytical Tiers (Platinum, Sandbox, Archive)."""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Literal


# ── Platinum KPI Models ──

class KPIDimension(BaseModel):
    """A dimension for KPI aggregation (e.g., by model, by product)."""
    field: str
    label: str = ""


class KPIDefinition(BaseModel):
    """Metadata definition for a pre-built KPI."""
    kpi_id: str
    name: str
    description: str = ""
    category: Literal["alert_summary", "model_effectiveness", "score_distribution", "regulatory_report"] = "alert_summary"
    sql_template: str = ""
    dimensions: list[KPIDimension] = Field(default_factory=list)
    schedule: str = "daily"
    source_tier: str = "gold"
    output_format: str = "json"


class KPIDataPoint(BaseModel):
    """A single data point in a KPI dataset."""
    dimension_values: dict[str, str] = Field(default_factory=dict)
    metric_name: str = ""
    metric_value: float | int | str = 0
    period: str = ""


class KPIDataset(BaseModel):
    """Pre-computed KPI result dataset."""
    kpi_id: str
    name: str
    category: str = ""
    generated_at: str = ""
    period: str = ""
    data_points: list[KPIDataPoint] = Field(default_factory=list)
    record_count: int = 0


class PlatinumConfig(BaseModel):
    """Configuration for all Platinum KPI definitions."""
    tier_id: str = "platinum"
    kpi_definitions: list[KPIDefinition] = Field(default_factory=list)
    last_generated: str = ""


# ── Sandbox Models ──

class SandboxOverride(BaseModel):
    """A single setting override in a sandbox."""
    setting_id: str
    original_value: str | float | int | bool = ""
    sandbox_value: str | float | int | bool = ""


class SandboxConfig(BaseModel):
    """A sandbox instance configuration."""
    sandbox_id: str
    name: str
    description: str = ""
    source_tier: str = "gold"
    status: Literal["created", "configured", "running", "completed", "discarded"] = "created"
    created_at: str = ""
    updated_at: str = ""
    overrides: list[SandboxOverride] = Field(default_factory=list)
    results_summary: dict = Field(default_factory=dict)


class SandboxComparison(BaseModel):
    """Side-by-side comparison of sandbox vs production."""
    sandbox_id: str
    production_alerts: int = 0
    sandbox_alerts: int = 0
    alerts_added: int = 0
    alerts_removed: int = 0
    score_shift_avg: float = 0.0
    model_diffs: list[dict] = Field(default_factory=list)


class SandboxRegistry(BaseModel):
    """Registry of all sandbox instances."""
    tier_id: str = "sandbox"
    sandboxes: list[SandboxConfig] = Field(default_factory=list)


# ── Archive Models ──

class RetentionPolicy(BaseModel):
    """Retention policy for a regulation."""
    policy_id: str
    regulation: str
    retention_years: int = 5
    data_types: list[str] = Field(default_factory=list)
    description: str = ""
    gdpr_relevant: bool = False
    crypto_shred: bool = False


class ArchiveEntry(BaseModel):
    """A single archived dataset entry."""
    entry_id: str
    entity: str
    source_tier: str = "gold"
    record_count: int = 0
    archived_at: str = ""
    expires_at: str = ""
    policy_id: str = ""
    format: str = "compressed_parquet"
    size_bytes: int = 0
    checksum: str = ""


class ArchiveManifest(BaseModel):
    """Manifest tracking all archived datasets."""
    tier_id: str = "archive"
    entries: list[ArchiveEntry] = Field(default_factory=list)
    total_entries: int = 0
    last_export: str = ""


class ArchiveConfig(BaseModel):
    """Archive tier configuration with retention policies."""
    tier_id: str = "archive"
    policies: list[RetentionPolicy] = Field(default_factory=list)
    archive_dir: str = "workspace/archive"
    default_format: str = "compressed_parquet"
