"""Data onboarding and connector models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Literal


class ConnectorConfig(BaseModel):
    connector_id: str
    connector_type: Literal["local_file", "fix_protocol", "streaming", "api"]
    format: str = ""
    config: dict = Field(default_factory=dict)
    schema_detection: Literal["auto", "manual"] = "auto"
    quality_profile: bool = True
    landing_tier: str = "landing"
    target_entity: str = ""
    description: str = ""


class DetectedColumn(BaseModel):
    name: str
    inferred_type: str
    nullable: bool = True
    sample_values: list[str] = Field(default_factory=list)
    pattern: str = ""


class DetectedSchema(BaseModel):
    columns: list[DetectedColumn] = Field(default_factory=list)
    row_count: int = 0
    file_format: str = ""
    encoding: str = "utf-8"
    delimiter: str = ""
    has_header: bool = True


class ColumnProfile(BaseModel):
    column: str
    dtype: str
    null_count: int = 0
    null_pct: float = 0.0
    distinct_count: int = 0
    min_value: str = ""
    max_value: str = ""
    mean_value: str = ""
    top_values: list[dict] = Field(default_factory=list)


class DataProfile(BaseModel):
    total_rows: int = 0
    total_columns: int = 0
    columns: list[ColumnProfile] = Field(default_factory=list)
    duplicate_rows: int = 0
    completeness_pct: float = 100.0
    quality_score: float = 0.0


class OnboardingJob(BaseModel):
    job_id: str
    status: Literal["uploaded", "schema_detected", "profiled", "mapped", "confirmed", "staged", "failed"] = "uploaded"
    filename: str = ""
    file_format: str = ""
    connector_id: str = ""
    detected_schema: DetectedSchema | None = None
    profile: DataProfile | None = None
    target_entity: str = ""
    row_count: int = 0
    error: str = ""
