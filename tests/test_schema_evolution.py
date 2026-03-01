"""Tests for SchemaEvolutionService — entity→schema, drift detection, evolution."""

import json
from pathlib import Path

import pyarrow as pa
import pytest

from backend.models.lakehouse import IcebergTierConfig, LakehouseConfig, SchemaEvolution
from backend.services.lakehouse_service import LakehouseService
from backend.services.schema_evolution_service import SchemaEvolutionService


@pytest.fixture
def evolution_workspace(tmp_path):
    """Workspace with entity definitions for schema evolution tests."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    entities_dir = ws / "metadata" / "entities"
    entities_dir.mkdir(parents=True)

    # A simple entity
    (entities_dir / "test_entity.json").write_text(
        json.dumps(
            {
                "entity_id": "test_entity",
                "name": "Test Entity",
                "fields": [
                    {"name": "id", "type": "integer", "nullable": False, "is_key": True},
                    {"name": "name", "type": "string", "nullable": True},
                    {"name": "value", "type": "float", "nullable": True},
                ],
            }
        )
    )

    # Execution entity (more complex)
    (entities_dir / "execution.json").write_text(
        json.dumps(
            {
                "entity_id": "execution",
                "name": "Trade Execution",
                "fields": [
                    {"name": "execution_id", "type": "string", "nullable": False, "is_key": True},
                    {"name": "order_id", "type": "string", "nullable": False},
                    {"name": "product_id", "type": "string", "nullable": False},
                    {"name": "account_id", "type": "string", "nullable": False},
                    {"name": "trader_id", "type": "string", "nullable": False},
                    {"name": "side", "type": "string", "nullable": False},
                    {"name": "quantity", "type": "float", "nullable": False},
                    {"name": "price", "type": "float", "nullable": False},
                    {"name": "execution_time", "type": "string", "nullable": False},
                    {"name": "venue_mic", "type": "string", "nullable": False},
                    {"name": "exec_type", "type": "string", "nullable": True},
                    {"name": "capacity", "type": "string", "nullable": True},
                    {"name": "currency", "type": "string", "nullable": True},
                    {"name": "settlement_date", "type": "string", "nullable": True},
                    {"name": "counterparty_id", "type": "string", "nullable": True},
                ],
            }
        )
    )

    # Governance dir for history
    (ws / "metadata" / "governance").mkdir(parents=True)

    return ws


@pytest.fixture
def evolution_lakehouse(tmp_path):
    config = LakehouseConfig(
        catalog={
            "type": "sql",
            "uri": f"sqlite:///{tmp_path}/iceberg/catalog.db",
            "warehouse": f"file://{tmp_path}/iceberg/warehouse",
        },
    )
    tier_config = IcebergTierConfig(
        iceberg_tiers=["bronze", "silver", "gold"],
        non_iceberg_tiers=["landing"],
        tier_namespace_mapping={"silver": "default"},
    )
    ws = tmp_path / "workspace"
    ws.mkdir(exist_ok=True)
    (tmp_path / "iceberg").mkdir(exist_ok=True)
    (tmp_path / "iceberg" / "warehouse").mkdir(exist_ok=True)
    return LakehouseService(ws, config, tier_config)


@pytest.fixture
def schema_svc(evolution_workspace, evolution_lakehouse):
    return SchemaEvolutionService(evolution_workspace, evolution_lakehouse)


class TestDeriveSchema:
    def test_derive_test_entity(self, schema_svc):
        schema = schema_svc.derive_schema_from_entity("test_entity")
        assert len(schema) == 3
        assert schema.field("id").type == pa.int64()
        assert schema.field("id").nullable is False
        assert schema.field("name").type == pa.string()
        assert schema.field("name").nullable is True

    def test_derive_execution_entity(self, schema_svc):
        schema = schema_svc.derive_schema_from_entity("execution")
        assert len(schema) == 15
        field_names = [f.name for f in schema]
        assert "execution_id" in field_names
        assert "venue_mic" in field_names
        assert "counterparty_id" in field_names

    def test_entity_not_found(self, schema_svc):
        with pytest.raises(FileNotFoundError):
            schema_svc.derive_schema_from_entity("nonexistent")


class TestDetectDrift:
    def test_no_drift_when_matching(self, schema_svc, evolution_lakehouse):
        schema = schema_svc.derive_schema_from_entity("test_entity")
        evolution_lakehouse.create_table("silver", "test_entity", schema)
        drifts = schema_svc.detect_schema_drift("silver", "test_entity", "test_entity")
        assert len(drifts) == 0

    def test_detect_new_column(self, schema_svc, evolution_lakehouse, evolution_workspace):
        # Create table with fewer columns
        old_schema = pa.schema(
            [
                pa.field("id", pa.int64(), nullable=False),
                pa.field("name", pa.string(), nullable=True),
            ]
        )
        evolution_lakehouse.create_table("silver", "test_entity", old_schema)

        # Entity has 3 fields, table has 2 → drift: add "value"
        drifts = schema_svc.detect_schema_drift("silver", "test_entity", "test_entity")
        assert len(drifts) == 1
        assert drifts[0].operation == "add_column"
        assert drifts[0].field_name == "value"

    def test_detect_removed_column(self, schema_svc, evolution_lakehouse):
        # Create table with extra column
        extended_schema = pa.schema(
            [
                pa.field("id", pa.int64(), nullable=False),
                pa.field("name", pa.string(), nullable=True),
                pa.field("value", pa.float64(), nullable=True),
                pa.field("extra_col", pa.string(), nullable=True),
            ]
        )
        evolution_lakehouse.create_table("silver", "test_entity", extended_schema)

        drifts = schema_svc.detect_schema_drift("silver", "test_entity", "test_entity")
        assert len(drifts) == 1
        assert drifts[0].operation == "drop_column"
        assert drifts[0].field_name == "extra_col"

    def test_no_drift_when_table_not_exists(self, schema_svc):
        drifts = schema_svc.detect_schema_drift("silver", "nonexistent", "test_entity")
        assert len(drifts) == 0


class TestApplyEvolutions:
    def test_apply_add_column(self, schema_svc, evolution_lakehouse):
        schema = pa.schema([pa.field("id", pa.int64(), nullable=False)])
        evolution_lakehouse.create_table("silver", "evolve_test", schema)

        evolutions = [
            SchemaEvolution(
                table_name="evolve_test",
                operation="add_column",
                field_name="new_col",
                details={"type": "string"},
            )
        ]
        schema_svc.apply_evolutions("silver", "evolve_test", evolutions)

        fields = evolution_lakehouse.get_schema("silver", "evolve_test")
        names = [f.name for f in fields]
        assert "new_col" in names


class TestSchemaHistory:
    def test_history_persisted(self, schema_svc, evolution_lakehouse):
        schema = pa.schema([pa.field("id", pa.int64(), nullable=False)])
        evolution_lakehouse.create_table("silver", "hist_test", schema)

        evolutions = [
            SchemaEvolution(
                table_name="hist_test",
                operation="add_column",
                field_name="col_a",
                details={"type": "string"},
            )
        ]
        schema_svc.apply_evolutions("silver", "hist_test", evolutions)

        history = schema_svc.get_schema_history(table_name="hist_test")
        assert len(history) == 1
        assert history[0].field_name == "col_a"

    def test_history_filtered_by_table(self, schema_svc, evolution_lakehouse):
        schema = pa.schema([pa.field("id", pa.int64(), nullable=False)])
        evolution_lakehouse.create_table("silver", "tbl_a", schema)
        evolution_lakehouse.create_table("silver", "tbl_b", schema)

        schema_svc.apply_evolutions(
            "silver",
            "tbl_a",
            [SchemaEvolution(table_name="tbl_a", operation="add_column", field_name="x", details={})],
        )
        schema_svc.apply_evolutions(
            "silver",
            "tbl_b",
            [SchemaEvolution(table_name="tbl_b", operation="add_column", field_name="y", details={})],
        )

        history_a = schema_svc.get_schema_history(table_name="tbl_a")
        assert len(history_a) == 1
        assert history_a[0].field_name == "x"


class TestSyncAllSchemas:
    def test_sync_finds_drift(self, schema_svc, evolution_lakehouse):
        # Create test_entity with only 2 columns (entity has 3)
        old_schema = pa.schema(
            [
                pa.field("id", pa.int64(), nullable=False),
                pa.field("name", pa.string(), nullable=True),
            ]
        )
        evolution_lakehouse.create_table("silver", "test_entity", old_schema)

        drifts = schema_svc.sync_all_schemas("silver")
        assert "test_entity" in drifts
        assert len(drifts["test_entity"]) == 1  # missing "value"

    def test_sync_no_drift_when_matching(self, schema_svc, evolution_lakehouse):
        for entity_id in ("test_entity", "execution"):
            schema = schema_svc.derive_schema_from_entity(entity_id)
            evolution_lakehouse.create_table("silver", entity_id, schema)

        drifts = schema_svc.sync_all_schemas("silver")
        assert len(drifts) == 0
