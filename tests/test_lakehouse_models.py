"""Tests for lakehouse Pydantic models."""

from datetime import datetime

import pytest

from backend.models.lakehouse import (
    CatalogConfig,
    ComputeConfig,
    IcebergSnapshot,
    IcebergTableInfo,
    IcebergTierConfig,
    LakehouseConfig,
    MaterializedViewConfig,
    PipelineRun,
    SchemaEvolution,
    SchemaField,
    StorageConfig,
)


class TestLakehouseConfig:
    def test_default_config(self):
        config = LakehouseConfig()
        assert config.catalog.type == "sql"
        assert "sqlite" in config.catalog.uri
        assert config.storage.type == "local"
        assert config.compute.engine == "duckdb"

    def test_catalog_types(self):
        for cat_type in ("sql", "rest", "glue", "hive"):
            cfg = CatalogConfig(type=cat_type, uri="test://uri", warehouse="test")
            assert cfg.type == cat_type

    def test_storage_types(self):
        for st in ("local", "s3", "adls", "gcs"):
            cfg = StorageConfig(type=st)
            assert cfg.type == st

    def test_compute_engines(self):
        for eng in ("duckdb", "spark", "flink", "trino"):
            cfg = ComputeConfig(engine=eng)
            assert cfg.engine == eng

    def test_full_config_from_dict(self):
        data = {
            "catalog": {
                "type": "rest",
                "uri": "http://polaris:8181",
                "warehouse": "s3://bucket/wh",
                "credential": "id:secret",
            },
            "storage": {"type": "s3", "region": "us-east-1"},
            "compute": {"engine": "duckdb", "memory_limit": "8GB"},
        }
        cfg = LakehouseConfig(**data)
        assert cfg.catalog.credential == "id:secret"
        assert cfg.storage.region == "us-east-1"
        assert cfg.compute.memory_limit == "8GB"


class TestIcebergTierConfig:
    def test_tier_lists(self):
        cfg = IcebergTierConfig(
            iceberg_tiers=["bronze", "silver", "gold"],
            non_iceberg_tiers=["landing", "quarantine"],
        )
        assert "bronze" in cfg.iceberg_tiers
        assert "landing" in cfg.non_iceberg_tiers
        assert cfg.default_namespace == "default"
        assert cfg.shared_namespace == "shared"
        assert cfg.platform_namespace == "platform"
        assert cfg.dual_write_enabled is True

    def test_namespace_mapping(self):
        cfg = IcebergTierConfig(
            iceberg_tiers=["silver"],
            non_iceberg_tiers=[],
            tier_namespace_mapping={"silver": "default", "reference": "shared"},
        )
        assert cfg.tier_namespace_mapping["silver"] == "default"


class TestSchemaField:
    def test_required_field(self):
        f = SchemaField(field_id=1, name="id", type_str="long")
        assert f.required is True
        assert f.doc is None

    def test_optional_field_with_doc(self):
        f = SchemaField(field_id=2, name="note", type_str="string", required=False, doc="A note")
        assert f.required is False
        assert f.doc == "A note"


class TestIcebergSnapshot:
    def test_snapshot_fields(self):
        snap = IcebergSnapshot(
            snapshot_id=123456,
            timestamp=datetime(2026, 3, 1, 12, 0, 0),
            operation="append",
            summary={"added-records": "100"},
        )
        assert snap.snapshot_id == 123456
        assert snap.operation == "append"
        assert snap.summary["added-records"] == "100"


class TestIcebergTableInfo:
    def test_table_info(self):
        info = IcebergTableInfo(
            namespace="default",
            table_name="execution",
            tier="silver",
            schema_fields=[SchemaField(field_id=1, name="id", type_str="long")],
            snapshot_count=3,
            current_snapshot_id=999,
            total_records=1000,
            total_size_bytes=50000,
        )
        assert info.tier == "silver"
        assert len(info.schema_fields) == 1
        assert info.total_records == 1000

    def test_empty_table_info(self):
        info = IcebergTableInfo(namespace="default", table_name="empty", tier="bronze")
        assert info.snapshot_count == 0
        assert info.current_snapshot_id is None
        assert info.total_records == 0


class TestSchemaEvolution:
    def test_add_column(self):
        ev = SchemaEvolution(
            table_name="execution",
            operation="add_column",
            field_name="new_col",
            details={"type": "string", "doc": "New column"},
        )
        assert ev.operation == "add_column"
        assert ev.details["type"] == "string"

    def test_all_operations(self):
        ops = ["add_column", "drop_column", "rename_column", "update_type", "set_required", "set_optional"]
        for op in ops:
            ev = SchemaEvolution(table_name="t", operation=op, field_name="f")
            assert ev.operation == op


class TestPipelineRun:
    def test_daily_run(self):
        run = PipelineRun(
            run_id="daily-20260301-001",
            run_type="daily",
            status="running",
            entities_processed=["execution", "order"],
            tiers_affected=["silver", "gold"],
        )
        assert run.run_type == "daily"
        assert run.branch_name is None
        assert run.tag_name is None
        assert len(run.entities_processed) == 2

    def test_backfill_run_with_branch(self):
        run = PipelineRun(
            run_id="backfill-20260301-001",
            run_type="backfill",
            status="validating",
            branch_name="backfill-20260301",
            parent_run_id="daily-20260228-001",
        )
        assert run.branch_name == "backfill-20260301"
        assert run.parent_run_id is not None

    def test_run_status_values(self):
        for status in ("running", "validating", "published", "failed", "rolled_back"):
            run = PipelineRun(run_id="test", run_type="daily", status=status)
            assert run.status == status

    def test_run_types(self):
        for rt in ("daily", "backfill", "rerun", "correction"):
            run = PipelineRun(run_id="test", run_type=rt, status="running")
            assert run.run_type == rt

    def test_snapshot_ids_tracking(self):
        run = PipelineRun(
            run_id="test",
            run_type="daily",
            status="published",
            snapshot_ids={"silver.execution": 123, "gold.alerts": 456},
        )
        assert run.snapshot_ids["silver.execution"] == 123


class TestMaterializedViewConfig:
    def test_mv_config(self):
        mv = MaterializedViewConfig(
            mv_id="dashboard_stats",
            source_tier="gold",
            source_tables=["alerts", "score_results"],
            refresh_strategy="on_pipeline_complete",
            sql_template="SELECT count(*) as total FROM alerts",
            target_table="mv_dashboard_stats",
            description="Dashboard summary statistics",
        )
        assert mv.refresh_strategy == "on_pipeline_complete"
        assert len(mv.source_tables) == 2

    def test_refresh_strategies(self):
        for strategy in ("on_pipeline_complete", "on_demand", "scheduled"):
            mv = MaterializedViewConfig(
                mv_id="t",
                source_tier="gold",
                source_tables=[],
                refresh_strategy=strategy,
                sql_template="SELECT 1",
                target_table="t",
            )
            assert mv.refresh_strategy == strategy
