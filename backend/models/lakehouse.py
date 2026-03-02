"""Pydantic models for lakehouse configuration, Iceberg tables, and pipeline runs."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CatalogConfig(BaseModel):
    type: Literal["sql", "rest", "glue", "hive"] = "sql"
    uri: str = "sqlite:///workspace/iceberg/catalog.db"
    warehouse: str = "workspace/iceberg/warehouse"
    credential: str | None = None
    properties: dict[str, str] = Field(default_factory=dict)


class StorageConfig(BaseModel):
    type: Literal["local", "s3", "adls", "gcs"] = "local"
    endpoint: str | None = None
    region: str | None = None


class ComputeConfig(BaseModel):
    engine: Literal["duckdb", "spark", "flink", "trino"] = "duckdb"
    memory_limit: str = "4GB"


class LakehouseConfig(BaseModel):
    catalog: CatalogConfig = Field(default_factory=CatalogConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    compute: ComputeConfig = Field(default_factory=ComputeConfig)


class IcebergTierConfig(BaseModel):
    iceberg_tiers: list[str]
    non_iceberg_tiers: list[str]
    default_namespace: str = "default"
    shared_namespace: str = "shared"
    platform_namespace: str = "platform"
    default_properties: dict[str, str] = Field(default_factory=dict)
    dual_write_enabled: bool = True
    tier_namespace_mapping: dict[str, str] = Field(default_factory=dict)


class SchemaField(BaseModel):
    field_id: int
    name: str
    type_str: str
    required: bool = True
    doc: str | None = None


class IcebergSnapshot(BaseModel):
    snapshot_id: int
    timestamp: datetime
    operation: str
    summary: dict[str, str] = Field(default_factory=dict)


class IcebergTableInfo(BaseModel):
    namespace: str
    table_name: str
    tier: str
    schema_fields: list[SchemaField] = Field(default_factory=list)
    snapshot_count: int = 0
    current_snapshot_id: int | None = None
    total_records: int = 0
    total_size_bytes: int = 0
    properties: dict[str, str] = Field(default_factory=dict)


class SchemaEvolution(BaseModel):
    table_name: str
    operation: Literal["add_column", "drop_column", "rename_column", "update_type", "set_required", "set_optional"]
    field_name: str
    details: dict[str, str] = Field(default_factory=dict)
    applied_at: datetime = Field(default_factory=datetime.now)


class PipelineRun(BaseModel):
    run_id: str
    run_type: Literal["daily", "backfill", "rerun", "correction"]
    status: Literal["running", "validating", "published", "failed", "rolled_back"]
    branch_name: str | None = None
    tag_name: str | None = None
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: datetime | None = None
    entities_processed: list[str] = Field(default_factory=list)
    tiers_affected: list[str] = Field(default_factory=list)
    snapshot_ids: dict[str, int] = Field(default_factory=dict)
    parameters: dict = Field(default_factory=dict)
    parent_run_id: str | None = None


class MaterializedViewConfig(BaseModel):
    mv_id: str
    source_tier: str
    source_tables: list[str]
    refresh_strategy: Literal["on_pipeline_complete", "on_demand", "scheduled"]
    sql_template: str
    target_table: str
    description: str = ""
