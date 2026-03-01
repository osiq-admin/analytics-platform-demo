"""Tests for Silver tier Iceberg migration and DataLoader dual-write."""

import json
from pathlib import Path

import pyarrow as pa
import pyarrow.csv as pcsv
import pytest

from backend.db import DuckDBManager
from backend.engine.data_loader import DataLoader
from backend.models.lakehouse import IcebergTierConfig, LakehouseConfig
from backend.services.lakehouse_service import LakehouseService


@pytest.fixture
def silver_workspace(tmp_path):
    """Workspace with CSV data + lakehouse config for Silver dual-write tests."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    # CSV data
    csv_dir = ws / "data" / "csv"
    csv_dir.mkdir(parents=True)
    (csv_dir / "test_entity.csv").write_text("id,name,value\n1,alpha,10.5\n2,beta,20.3\n3,gamma,30.1\n")

    # Parquet dir
    (ws / "data" / "parquet").mkdir(parents=True)

    return ws


@pytest.fixture
def silver_lakehouse(tmp_path):
    config = LakehouseConfig(
        catalog={
            "type": "sql",
            "uri": f"sqlite:///{tmp_path}/iceberg/catalog.db",
            "warehouse": f"file://{tmp_path}/iceberg/warehouse",
        },
    )
    tier_config = IcebergTierConfig(
        iceberg_tiers=["bronze", "silver", "gold", "platinum", "reference", "logging", "archive"],
        non_iceberg_tiers=["landing", "quarantine", "sandbox", "metrics"],
        tier_namespace_mapping={"silver": "default"},
    )
    ws = tmp_path / "workspace"
    ws.mkdir(exist_ok=True)
    (tmp_path / "iceberg").mkdir(exist_ok=True)
    (tmp_path / "iceberg" / "warehouse").mkdir(exist_ok=True)
    return LakehouseService(ws, config, tier_config)


class TestDataLoaderDualWrite:
    def test_dual_write_creates_iceberg_table(self, silver_workspace, silver_lakehouse, tmp_path):
        db = DuckDBManager()
        db.connect(":memory:")
        loader = DataLoader(silver_workspace, db, lakehouse=silver_lakehouse)

        loaded = loader.load_all()
        assert "test_entity" in loaded
        assert silver_lakehouse.table_exists("silver", "test_entity")

        table = silver_lakehouse.get_table("silver", "test_entity")
        result = table.scan().to_arrow()
        assert len(result) == 3
        db.close()

    def test_dual_write_data_matches_parquet(self, silver_workspace, silver_lakehouse, tmp_path):
        db = DuckDBManager()
        db.connect(":memory:")
        loader = DataLoader(silver_workspace, db, lakehouse=silver_lakehouse)
        loader.load_all()

        # Read from Iceberg
        table = silver_lakehouse.get_table("silver", "test_entity")
        iceberg_data = table.scan().to_arrow()

        # Read from Parquet
        parquet_path = silver_workspace / "data" / "parquet" / "test_entity.parquet"
        import pyarrow.parquet as pq

        parquet_data = pq.read_table(parquet_path)

        assert iceberg_data.num_rows == parquet_data.num_rows
        assert set(iceberg_data.column_names) == set(parquet_data.column_names)
        db.close()

    def test_loader_without_lakehouse_works(self, silver_workspace, tmp_path):
        db = DuckDBManager()
        db.connect(":memory:")
        loader = DataLoader(silver_workspace, db)  # No lakehouse

        loaded = loader.load_all()
        assert "test_entity" in loaded
        db.close()

    def test_dual_write_overwrite_on_reload(self, silver_workspace, silver_lakehouse, tmp_path):
        db = DuckDBManager()
        db.connect(":memory:")
        loader = DataLoader(silver_workspace, db, lakehouse=silver_lakehouse)

        loader.load_all()

        # Modify CSV
        csv_path = silver_workspace / "data" / "csv" / "test_entity.csv"
        csv_path.write_text("id,name,value\n10,x,100.0\n20,y,200.0\n")

        # Force reload
        loader._csv_mtimes.clear()
        loader.load_all()

        table = silver_lakehouse.get_table("silver", "test_entity")
        result = table.scan().to_arrow()
        assert len(result) == 2  # Overwrite replaces data
        db.close()

    def test_multiple_entities_loaded(self, silver_workspace, silver_lakehouse, tmp_path):
        csv_dir = silver_workspace / "data" / "csv"
        (csv_dir / "product.csv").write_text("product_id,name\nP1,Widget\nP2,Gadget\n")
        (csv_dir / "venue.csv").write_text("venue_id,name\nV1,NYSE\nV2,LSE\n")

        db = DuckDBManager()
        db.connect(":memory:")
        loader = DataLoader(silver_workspace, db, lakehouse=silver_lakehouse)
        loaded = loader.load_all()

        assert silver_lakehouse.table_exists("silver", "product")
        assert silver_lakehouse.table_exists("silver", "venue")
        assert silver_lakehouse.table_exists("silver", "test_entity")
        db.close()
