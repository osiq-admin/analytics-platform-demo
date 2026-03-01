"""Tests for LakehouseService — SQLite catalog, Iceberg table operations."""

import shutil
import tempfile
from pathlib import Path

import pyarrow as pa
import pytest

from backend.models.lakehouse import (
    IcebergTierConfig,
    LakehouseConfig,
    SchemaEvolution,
)
from backend.services.lakehouse_service import LakehouseService, load_lakehouse_config


@pytest.fixture
def iceberg_workspace(tmp_path):
    """Create a temporary workspace with lakehouse config files."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    # Create config dir with lakehouse.yaml
    cfg_dir = ws / "config"
    cfg_dir.mkdir()
    (cfg_dir / "lakehouse.yaml").write_text(
        f"""local:
  catalog:
    type: sql
    uri: "sqlite:///{tmp_path}/iceberg/catalog.db"
    warehouse: "{tmp_path}/iceberg/warehouse"
  storage:
    type: local
  compute:
    engine: duckdb
    memory_limit: "2GB"
"""
    )

    # Create iceberg_config.json
    meta_dir = ws / "metadata" / "medallion"
    meta_dir.mkdir(parents=True)
    import json

    (meta_dir / "iceberg_config.json").write_text(
        json.dumps(
            {
                "iceberg_tiers": ["bronze", "silver", "gold", "platinum", "reference", "logging", "archive"],
                "non_iceberg_tiers": ["landing", "quarantine", "sandbox", "metrics"],
                "default_namespace": "default",
                "shared_namespace": "shared",
                "platform_namespace": "platform",
                "default_properties": {
                    "write.format.default": "parquet",
                    "write.parquet.compression-codec": "zstd",
                },
                "dual_write_enabled": True,
                "tier_namespace_mapping": {
                    "bronze": "default",
                    "silver": "default",
                    "gold": "default",
                    "platinum": "default",
                    "reference": "shared",
                    "logging": "platform",
                    "archive": "default",
                },
            }
        )
    )

    # Ensure iceberg dirs exist
    (tmp_path / "iceberg").mkdir(exist_ok=True)
    (tmp_path / "iceberg" / "warehouse").mkdir(exist_ok=True)

    return ws


@pytest.fixture
def lakehouse(iceberg_workspace, tmp_path):
    """Create a LakehouseService with SQLite catalog."""
    config = LakehouseConfig(
        catalog={"type": "sql", "uri": f"sqlite:///{tmp_path}/iceberg/catalog.db", "warehouse": f"file://{tmp_path}/iceberg/warehouse"},
        storage={"type": "local"},
        compute={"engine": "duckdb"},
    )
    tier_config = IcebergTierConfig(
        iceberg_tiers=["bronze", "silver", "gold", "platinum", "reference", "logging", "archive"],
        non_iceberg_tiers=["landing", "quarantine", "sandbox", "metrics"],
        tier_namespace_mapping={
            "bronze": "default",
            "silver": "default",
            "gold": "default",
            "platinum": "default",
            "reference": "shared",
            "logging": "platform",
            "archive": "default",
        },
    )
    return LakehouseService(iceberg_workspace, config, tier_config)


@pytest.fixture
def sample_schema():
    return pa.schema(
        [
            pa.field("id", pa.int64(), nullable=False),
            pa.field("name", pa.string(), nullable=True),
            pa.field("value", pa.float64(), nullable=True),
        ]
    )


@pytest.fixture
def sample_data(sample_schema):
    return pa.table(
        {"id": [1, 2, 3], "name": ["a", "b", "c"], "value": [1.0, 2.0, 3.0]},
        schema=sample_schema,
    )


class TestCatalogCreation:
    def test_sqlite_catalog_created(self, lakehouse):
        namespaces = lakehouse.list_namespaces()
        assert "default" in namespaces
        assert "shared" in namespaces
        assert "platform" in namespaces


class TestTableLifecycle:
    def test_create_table_and_exists(self, lakehouse, sample_schema):
        lakehouse.create_table("silver", "test_entity", sample_schema)
        assert lakehouse.table_exists("silver", "test_entity")

    def test_table_not_exists(self, lakehouse):
        assert not lakehouse.table_exists("silver", "nonexistent")

    def test_create_table_idempotent(self, lakehouse, sample_schema):
        t1 = lakehouse.create_table("silver", "idempotent_test", sample_schema)
        t2 = lakehouse.create_table("silver", "idempotent_test", sample_schema)
        assert t1.name() == t2.name()

    def test_drop_table(self, lakehouse, sample_schema):
        lakehouse.create_table("silver", "to_drop", sample_schema)
        assert lakehouse.table_exists("silver", "to_drop")
        result = lakehouse.drop_table("silver", "to_drop")
        assert result is True
        assert not lakehouse.table_exists("silver", "to_drop")

    def test_drop_nonexistent_table(self, lakehouse):
        result = lakehouse.drop_table("silver", "no_such_table")
        assert result is False


class TestDataOperations:
    def test_append_and_read(self, lakehouse, sample_schema, sample_data):
        lakehouse.create_table("silver", "append_test", sample_schema)
        lakehouse.append("silver", "append_test", sample_data)

        table = lakehouse.get_table("silver", "append_test")
        result = table.scan().to_arrow()
        assert len(result) == 3

    def test_overwrite_replaces_data(self, lakehouse, sample_schema, sample_data):
        lakehouse.create_table("silver", "overwrite_test", sample_schema)
        lakehouse.append("silver", "overwrite_test", sample_data)

        new_data = pa.table(
            {"id": [10, 20], "name": ["x", "y"], "value": [10.0, 20.0]},
            schema=sample_schema,
        )
        lakehouse.overwrite("silver", "overwrite_test", new_data)

        table = lakehouse.get_table("silver", "overwrite_test")
        result = table.scan().to_arrow()
        assert len(result) == 2


class TestSchemaEvolution:
    def test_add_column(self, lakehouse, sample_schema, sample_data):
        lakehouse.create_table("silver", "schema_test", sample_schema)
        lakehouse.append("silver", "schema_test", sample_data)

        evolutions = [
            SchemaEvolution(
                table_name="schema_test",
                operation="add_column",
                field_name="new_field",
                details={"type": "string", "doc": "Added column"},
            )
        ]
        lakehouse.evolve_schema("silver", "schema_test", evolutions)

        fields = lakehouse.get_schema("silver", "schema_test")
        field_names = [f.name for f in fields]
        assert "new_field" in field_names

    def test_get_schema(self, lakehouse, sample_schema):
        lakehouse.create_table("silver", "schema_read", sample_schema)
        fields = lakehouse.get_schema("silver", "schema_read")
        assert len(fields) == 3
        assert fields[0].name == "id"
        assert fields[0].required is True


class TestSnapshots:
    def test_list_snapshots_after_append(self, lakehouse, sample_schema, sample_data):
        lakehouse.create_table("silver", "snap_test", sample_schema)
        lakehouse.append("silver", "snap_test", sample_data)
        snaps = lakehouse.list_snapshots("silver", "snap_test")
        assert len(snaps) >= 1
        assert snaps[0].operation == "append"

    def test_tag_snapshot(self, lakehouse, sample_schema, sample_data):
        lakehouse.create_table("silver", "tag_test", sample_schema)
        lakehouse.append("silver", "tag_test", sample_data)
        lakehouse.tag_snapshot("silver", "tag_test", "v1.0")
        # Verify tag exists by loading snapshot by name
        table = lakehouse.get_table("silver", "tag_test")
        snap = table.snapshot_by_name("v1.0")
        assert snap is not None


class TestBranches:
    def test_create_branch(self, lakehouse, sample_schema, sample_data):
        lakehouse.create_table("silver", "branch_test", sample_schema)
        lakehouse.append("silver", "branch_test", sample_data)
        lakehouse.create_branch("silver", "branch_test", "backfill-20260301")
        # Verify branch exists
        table = lakehouse.get_table("silver", "branch_test")
        snap = table.snapshot_by_name("backfill-20260301")
        assert snap is not None


class TestProperties:
    def test_set_and_get_properties(self, lakehouse, sample_schema):
        lakehouse.create_table("silver", "props_test", sample_schema)
        lakehouse.set_table_properties("silver", "props_test", {"pii.contains": "true", "governance.classification": "confidential"})
        props = lakehouse.get_table_properties("silver", "props_test")
        assert props["pii.contains"] == "true"
        assert props["governance.classification"] == "confidential"


class TestCatalogQueries:
    def test_list_tables_per_namespace(self, lakehouse, sample_schema):
        lakehouse.create_table("silver", "table_a", sample_schema)
        lakehouse.create_table("silver", "table_b", sample_schema)
        tables = lakehouse.list_tables("silver")
        assert "table_a" in tables
        assert "table_b" in tables

    def test_list_tables_empty_namespace(self, lakehouse):
        tables = lakehouse.list_tables("bronze")
        assert tables == []

    def test_get_table_info(self, lakehouse, sample_schema, sample_data):
        lakehouse.create_table("silver", "info_test", sample_schema)
        lakehouse.append("silver", "info_test", sample_data)
        info = lakehouse.get_table_info("silver", "info_test")
        assert info.tier == "silver"
        assert info.table_name == "info_test"
        assert info.namespace == "default"
        assert info.snapshot_count >= 1
        assert len(info.schema_fields) == 3

    def test_list_all_tables(self, lakehouse, sample_schema):
        lakehouse.create_table("silver", "all_a", sample_schema)
        lakehouse.create_table("gold", "all_b", sample_schema)
        all_tables = lakehouse.list_all_tables()
        names = [t.table_name for t in all_tables]
        assert "all_a" in names
        assert "all_b" in names


class TestNamespaceResolution:
    def test_default_namespace(self, lakehouse, sample_schema):
        lakehouse.create_table("silver", "ns_test", sample_schema)
        info = lakehouse.get_table_info("silver", "ns_test")
        assert info.namespace == "default"

    def test_shared_namespace_for_reference(self, lakehouse, sample_schema):
        lakehouse.create_table("reference", "ns_ref", sample_schema)
        info = lakehouse.get_table_info("reference", "ns_ref")
        assert info.namespace == "shared"

    def test_platform_namespace_for_logging(self, lakehouse, sample_schema):
        lakehouse.create_table("logging", "ns_log", sample_schema)
        info = lakehouse.get_table_info("logging", "ns_log")
        assert info.namespace == "platform"

    def test_tenant_namespace(self, lakehouse, sample_schema):
        lakehouse.create_table("silver", "tenant_test", sample_schema, tenant_id="acme")
        assert lakehouse.table_exists("silver", "tenant_test", tenant_id="acme")


class TestIcebergTierCheck:
    def test_iceberg_tier(self, lakehouse):
        assert lakehouse.is_iceberg_tier("silver") is True
        assert lakehouse.is_iceberg_tier("gold") is True
        assert lakehouse.is_iceberg_tier("reference") is True

    def test_non_iceberg_tier(self, lakehouse):
        assert lakehouse.is_iceberg_tier("landing") is False
        assert lakehouse.is_iceberg_tier("quarantine") is False
        assert lakehouse.is_iceberg_tier("sandbox") is False


class TestLoadConfig:
    def test_load_from_workspace(self, iceberg_workspace):
        config, tier_config = load_lakehouse_config(iceberg_workspace, env="local")
        assert config.catalog.type == "sql"
        assert "silver" in tier_config.iceberg_tiers
        assert tier_config.dual_write_enabled is True

    def test_load_default_when_no_files(self, tmp_path):
        ws = tmp_path / "empty_ws"
        ws.mkdir()
        config, tier_config = load_lakehouse_config(ws, env="local")
        assert config.catalog.type == "sql"
        assert len(tier_config.iceberg_tiers) == 7
