"""Tests for MetadataReplicator — syncs file-based metadata into Iceberg tables."""

import json
from pathlib import Path

import pyarrow as pa
import pytest

from backend.models.lakehouse import IcebergTierConfig, LakehouseConfig
from backend.services.lakehouse_service import LakehouseService
from backend.services.metadata_replicator import MetadataReplicator


@pytest.fixture
def mr_workspace(tmp_path):
    ws = tmp_path / "workspace"
    ws.mkdir()

    # Entity definitions
    entities_dir = ws / "metadata" / "entities"
    entities_dir.mkdir(parents=True)
    (entities_dir / "product.json").write_text(json.dumps({
        "entity_id": "product",
        "display_name": "Product",
        "description": "Financial product",
        "fields": [
            {"field_id": "product_id", "type": "string"},
            {"field_id": "isin", "type": "string"},
            {"field_id": "asset_class", "type": "string"},
        ],
    }))
    (entities_dir / "execution.json").write_text(json.dumps({
        "entity_id": "execution",
        "display_name": "Execution",
        "description": "Trade execution",
        "fields": [
            {"field_id": "exec_id", "type": "string"},
            {"field_id": "price", "type": "float"},
        ],
    }))

    # Calculation definitions
    calc_dir = ws / "metadata" / "calculations" / "transaction"
    calc_dir.mkdir(parents=True)
    (calc_dir / "value_calc.json").write_text(json.dumps({
        "calc_id": "value_calc",
        "layer": "transaction",
        "description": "Calculate trade value",
    }))
    derived_dir = ws / "metadata" / "calculations" / "derived"
    derived_dir.mkdir(parents=True)
    (derived_dir / "trend_window.json").write_text(json.dumps({
        "calc_id": "trend_window",
        "layer": "derived",
        "description": "Trend window calculation",
    }))

    # Detection models
    models_dir = ws / "metadata" / "detection_models"
    models_dir.mkdir(parents=True)
    (models_dir / "wash_intraday.json").write_text(json.dumps({
        "model_id": "wash_intraday",
        "model_name": "Wash Trading — Intraday",
        "description": "Detects wash trading",
    }))

    # Settings
    settings_dir = ws / "metadata" / "settings" / "thresholds"
    settings_dir.mkdir(parents=True)
    (settings_dir / "default.json").write_text(json.dumps({
        "setting_id": "default",
        "values": {"min_score": 0.5},
    }))

    return ws


@pytest.fixture
def mr_lakehouse(tmp_path):
    config = LakehouseConfig(
        catalog={"type": "sql", "uri": f"sqlite:///{tmp_path}/iceberg/catalog.db", "warehouse": f"file://{tmp_path}/iceberg/warehouse"},
    )
    tier_config = IcebergTierConfig(
        iceberg_tiers=["logging", "reference"],
        non_iceberg_tiers=[],
        tier_namespace_mapping={"logging": "default", "reference": "default"},
    )
    ws = tmp_path / "workspace"
    ws.mkdir(exist_ok=True)
    (tmp_path / "iceberg").mkdir(exist_ok=True)
    (tmp_path / "iceberg" / "warehouse").mkdir(exist_ok=True)
    return LakehouseService(ws, config, tier_config)


@pytest.fixture
def replicator(mr_workspace, mr_lakehouse):
    return MetadataReplicator(mr_workspace, lakehouse=mr_lakehouse)


class TestSyncEntityDefinitions:
    def test_sync_entities(self, replicator):
        count = replicator.sync_entity_definitions()
        assert count == 2

    def test_sync_entities_queryable(self, replicator, mr_lakehouse):
        replicator.sync_entity_definitions()
        table = mr_lakehouse.get_table("logging", "metadata_entities")
        scan = table.scan()
        df = scan.to_arrow()
        assert len(df) == 2
        ids = df.column("entity_id").to_pylist()
        assert "product" in ids
        assert "execution" in ids

    def test_entity_field_count(self, replicator, mr_lakehouse):
        replicator.sync_entity_definitions()
        table = mr_lakehouse.get_table("logging", "metadata_entities")
        df = table.scan().to_arrow()
        product_row = [r for r in df.to_pylist() if r["entity_id"] == "product"][0]
        assert product_row["field_count"] == 3

    def test_sync_empty_dir(self, tmp_path):
        ws = tmp_path / "empty_ws"
        ws.mkdir()
        svc = MetadataReplicator(ws)
        assert svc.sync_entity_definitions() == 0


class TestSyncCalculations:
    def test_sync_calculations(self, replicator):
        count = replicator.sync_calculations()
        assert count == 2

    def test_calculations_have_categories(self, replicator, mr_lakehouse):
        replicator.sync_calculations()
        table = mr_lakehouse.get_table("logging", "metadata_calculations")
        df = table.scan().to_arrow()
        categories = set(df.column("category").to_pylist())
        assert "transaction" in categories
        assert "derived" in categories


class TestSyncDetectionModels:
    def test_sync_models(self, replicator):
        count = replicator.sync_detection_models()
        assert count == 1

    def test_model_content(self, replicator, mr_lakehouse):
        replicator.sync_detection_models()
        table = mr_lakehouse.get_table("logging", "metadata_detection_models")
        df = table.scan().to_arrow()
        assert df.column("model_id").to_pylist() == ["wash_intraday"]
        assert df.column("model_name").to_pylist() == ["Wash Trading — Intraday"]


class TestSyncSettings:
    def test_sync_settings(self, replicator):
        count = replicator.sync_settings()
        assert count == 1

    def test_settings_have_category(self, replicator, mr_lakehouse):
        replicator.sync_settings()
        table = mr_lakehouse.get_table("logging", "metadata_settings")
        df = table.scan().to_arrow()
        assert df.column("category").to_pylist() == ["thresholds"]


class TestSyncAll:
    def test_sync_all(self, replicator):
        results = replicator.sync_all()
        assert results["entities"] == 2
        assert results["calculations"] == 2
        assert results["detection_models"] == 1
        assert results["settings"] == 1

    def test_sync_all_creates_tables(self, replicator, mr_lakehouse):
        replicator.sync_all()
        assert mr_lakehouse.table_exists("logging", "metadata_entities")
        assert mr_lakehouse.table_exists("logging", "metadata_calculations")
        assert mr_lakehouse.table_exists("logging", "metadata_detection_models")
        assert mr_lakehouse.table_exists("logging", "metadata_settings")


class TestSyncStatus:
    def test_status_before_sync(self, replicator):
        status = replicator.get_sync_status()
        assert status["metadata_entities"]["exists"] is False

    def test_status_after_sync(self, replicator):
        replicator.sync_all()
        status = replicator.get_sync_status()
        assert status["metadata_entities"]["exists"] is True
        assert status["metadata_entities"]["total_records"] == 2


class TestNoLakehouse:
    def test_sync_without_lakehouse(self, mr_workspace):
        svc = MetadataReplicator(mr_workspace)
        results = svc.sync_all()
        assert results["entities"] == 0
        assert results["calculations"] == 0
