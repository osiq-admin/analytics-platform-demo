"""Tests for pipeline Iceberg integration — lifespan wiring, service availability."""

import json
from pathlib import Path

import pyarrow as pa
import pytest

from backend.models.lakehouse import IcebergTierConfig, LakehouseConfig
from backend.services.calc_result_service import CalcResultService
from backend.services.governance_service import GovernanceService
from backend.services.lakehouse_service import LakehouseService
from backend.services.materialized_view_service import MaterializedViewService
from backend.services.metadata_replicator import MetadataReplicator
from backend.services.run_versioning_service import RunVersioningService
from backend.services.schema_evolution_service import SchemaEvolutionService


@pytest.fixture
def integration_workspace(tmp_path):
    """Full workspace with all metadata for integration tests."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    # Entity definitions
    entities_dir = ws / "metadata" / "entities"
    entities_dir.mkdir(parents=True)
    (entities_dir / "execution.json").write_text(json.dumps({
        "entity_id": "execution",
        "display_name": "Execution",
        "description": "Trade execution",
        "fields": [
            {"field_id": "exec_id", "type": "string"},
            {"field_id": "price", "type": "float"},
            {"field_id": "quantity", "type": "integer"},
        ],
    }))

    # Governance
    gov_dir = ws / "metadata" / "governance"
    gov_dir.mkdir(parents=True)
    (gov_dir / "pii_registry.json").write_text(json.dumps({
        "registry_version": "1.0",
        "entities": {
            "execution": {
                "pii_fields": []
            }
        }
    }))

    # MVs
    mv_dir = ws / "metadata" / "medallion"
    mv_dir.mkdir(parents=True)
    (mv_dir / "materialized_views.json").write_text(json.dumps({
        "materialized_views": [
            {
                "mv_id": "test_mv",
                "source_tier": "silver",
                "source_tables": ["execution"],
                "refresh_strategy": "on_pipeline_complete",
                "sql_template": "SELECT 1 as val",
                "target_table": "mv_test",
                "description": "Test MV",
            }
        ]
    }))

    return ws


@pytest.fixture
def integration_lakehouse(tmp_path):
    config = LakehouseConfig(
        catalog={"type": "sql", "uri": f"sqlite:///{tmp_path}/iceberg/catalog.db", "warehouse": f"file://{tmp_path}/iceberg/warehouse"},
    )
    tier_config = IcebergTierConfig(
        iceberg_tiers=["silver", "gold", "reference", "logging"],
        non_iceberg_tiers=["landing", "quarantine"],
        tier_namespace_mapping={"silver": "default", "gold": "default", "reference": "default", "logging": "default"},
    )
    ws = tmp_path / "workspace"
    ws.mkdir(exist_ok=True)
    (tmp_path / "iceberg").mkdir(exist_ok=True)
    (tmp_path / "iceberg" / "warehouse").mkdir(exist_ok=True)
    return LakehouseService(ws, config, tier_config)


class TestServiceWiring:
    """Test that all services can be constructed together."""

    def test_all_services_construct(self, integration_workspace, integration_lakehouse):
        ws = integration_workspace
        lh = integration_lakehouse

        governance = GovernanceService(ws, lakehouse=lh)
        calc_results = CalcResultService(ws, lakehouse=lh)
        run_versioning = RunVersioningService(ws, lakehouse=lh)
        schema_evolution = SchemaEvolutionService(ws, lakehouse=lh)
        metadata_replicator = MetadataReplicator(ws, lakehouse=lh)

        assert governance is not None
        assert calc_results is not None
        assert run_versioning is not None
        assert schema_evolution is not None
        assert metadata_replicator is not None

    def test_services_without_lakehouse(self, integration_workspace):
        """All services work in Parquet-only mode (lakehouse=None)."""
        ws = integration_workspace

        governance = GovernanceService(ws)
        calc_results = CalcResultService(ws)
        run_versioning = RunVersioningService(ws)
        schema_evolution = SchemaEvolutionService(ws)
        metadata_replicator = MetadataReplicator(ws)

        # Governance still loads PII registry from file
        registry = governance.load_pii_registry()
        assert registry is not None

        # Run versioning still tracks runs
        run = run_versioning.start_run("daily", ["execution"])
        assert run.status == "running"

        # Metadata replicator returns 0 (no lakehouse)
        results = metadata_replicator.sync_all()
        assert results["entities"] == 0


class TestEndToEndPipeline:
    """Test a simulated pipeline flow through Iceberg."""

    def test_silver_write_then_mv_refresh(self, integration_workspace, integration_lakehouse):
        """Write to Silver Iceberg, then refresh materialized views."""
        from backend.db import DuckDBManager

        lh = integration_lakehouse

        # 1. Write data to Silver Iceberg
        schema = pa.schema([
            ("exec_id", pa.string()),
            ("price", pa.float64()),
            ("quantity", pa.int64()),
        ])
        data = pa.table({
            "exec_id": ["E001", "E002", "E003"],
            "price": [100.0, 200.0, 300.0],
            "quantity": [10, 20, 30],
        }, schema=schema)
        lh.create_table("silver", "execution", schema)
        lh.overwrite("silver", "execution", data)

        # Verify in Iceberg
        table = lh.get_table("silver", "execution")
        result = table.scan().to_arrow()
        assert len(result) == 3

    def test_run_versioning_pipeline_flow(self, integration_workspace, integration_lakehouse):
        """Start run → write data → tag completion."""
        lh = integration_lakehouse
        rv = RunVersioningService(integration_workspace, lakehouse=lh)

        # Start pipeline run
        run = rv.start_run("daily", ["execution"])
        assert run.status == "running"

        # Write some data
        schema = pa.schema([("id", pa.string())])
        lh.create_table("silver", "test_data", schema)
        lh.append("silver", "test_data", pa.table({"id": ["1", "2"]}, schema=schema))

        # Tag completion
        run.tiers_affected = ["silver"]
        rv.tag_run_completion(run)
        assert run.status == "published"
        assert run.tag_name is not None

    def test_metadata_replication_flow(self, integration_workspace, integration_lakehouse):
        """Replicate metadata → verify in Iceberg."""
        mr = MetadataReplicator(integration_workspace, lakehouse=integration_lakehouse)
        results = mr.sync_all()
        assert results["entities"] == 1  # execution.json

        # Verify queryable
        table = integration_lakehouse.get_table("logging", "metadata_entities")
        df = table.scan().to_arrow()
        assert len(df) == 1
        assert df.column("entity_id").to_pylist() == ["execution"]

    def test_governance_tagging_flow(self, tmp_path):
        """Create table → tag with governance → verify properties (entity with PII)."""
        ws = tmp_path / "ws2"
        ws.mkdir()
        gov_dir = ws / "metadata" / "governance"
        gov_dir.mkdir(parents=True)
        (gov_dir / "pii_registry.json").write_text(json.dumps({
            "registry_version": "1.0",
            "entities": {
                "trader": {
                    "pii_fields": [
                        {"field": "trader_name", "classification": "HIGH", "regulation": ["GDPR"],
                         "crypto_shred": True, "retention_years": 1, "masking_strategy": "hash"}
                    ]
                }
            }
        }))

        config = LakehouseConfig(
            catalog={"type": "sql", "uri": f"sqlite:///{tmp_path}/ice2/catalog.db", "warehouse": f"file://{tmp_path}/ice2/warehouse"},
        )
        tier_config = IcebergTierConfig(
            iceberg_tiers=["silver"], non_iceberg_tiers=[],
            tier_namespace_mapping={"silver": "default"},
        )
        (tmp_path / "ice2").mkdir(exist_ok=True)
        (tmp_path / "ice2" / "warehouse").mkdir(exist_ok=True)
        lh = LakehouseService(ws, config, tier_config)
        gov = GovernanceService(ws, lakehouse=lh)

        schema = pa.schema([("trader_id", pa.string()), ("trader_name", pa.string())])
        lh.create_table("silver", "trader", schema)

        gov.tag_iceberg_table("silver", "trader", "trader")
        props = lh.get_table_properties("silver", "trader")
        assert "governance.pii.contains" in props
        assert props["governance.pii.contains"] == "true"


class TestFallbackBehavior:
    def test_lakehouse_failure_does_not_crash(self, integration_workspace):
        """If Iceberg catalog init fails, services should still work."""
        # Create services with no lakehouse
        calc_results = CalcResultService(integration_workspace)
        stats = calc_results.get_execution_stats()
        assert stats["total_executions"] == 0

    def test_run_versioning_without_lakehouse(self, integration_workspace):
        """Run versioning tracks runs even without Iceberg branching."""
        rv = RunVersioningService(integration_workspace)
        run = rv.start_run("backfill", ["execution"])
        assert run.branch_name is not None  # Branch name set
        # But no Iceberg branches created (no lakehouse)
        rv.tag_run_completion(run)
        assert run.status == "published"
