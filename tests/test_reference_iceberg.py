"""Tests for Reference tier Iceberg dual-write via ReferenceService."""

import json
from pathlib import Path
from unittest.mock import MagicMock

import pyarrow as pa
import pytest

from backend.models.lakehouse import IcebergTierConfig, LakehouseConfig
from backend.models.reference import GoldenRecord, GoldenRecordSet, FieldProvenance
from backend.services.lakehouse_service import LakehouseService


@pytest.fixture
def ref_lakehouse(tmp_path):
    config = LakehouseConfig(
        catalog={"type": "sql", "uri": f"sqlite:///{tmp_path}/iceberg/catalog.db", "warehouse": f"file://{tmp_path}/iceberg/warehouse"},
    )
    tier_config = IcebergTierConfig(
        iceberg_tiers=["reference"],
        non_iceberg_tiers=[],
        tier_namespace_mapping={"reference": "default"},
    )
    ws = tmp_path / "workspace"
    ws.mkdir(exist_ok=True)
    (tmp_path / "iceberg").mkdir(exist_ok=True)
    (tmp_path / "iceberg" / "warehouse").mkdir(exist_ok=True)
    return LakehouseService(ws, config, tier_config)


def _make_golden_records(entity: str, count: int) -> list[GoldenRecord]:
    records = []
    for i in range(1, count + 1):
        records.append(GoldenRecord(
            golden_id=f"GR-{entity[:3].upper()}-{i:04d}",
            entity=entity,
            natural_key=f"key_{i}",
            data={"field_a": f"value_{i}", "field_b": i * 10},
            provenance={
                "field_a": FieldProvenance(value=f"value_{i}", source="csv", confidence=1.0, last_updated="2026-03-01T00:00:00"),
            },
            source_records=[f"{entity}.csv:{i}"],
            confidence_score=0.95,
            last_reconciled="2026-03-01T00:00:00",
            status="active",
            version=1,
        ))
    return records


class TestReferenceIcebergWrite:
    def test_write_golden_records_to_iceberg(self, ref_lakehouse):
        """Verify golden records can be written to Reference Iceberg tier."""
        records = _make_golden_records("product", 5)
        schema = pa.schema([
            ("golden_id", pa.string()),
            ("entity", pa.string()),
            ("natural_key", pa.string()),
            ("data_json", pa.string()),
            ("confidence_score", pa.float64()),
            ("status", pa.string()),
            ("version", pa.int32()),
            ("last_reconciled", pa.string()),
        ])
        rows = {
            "golden_id": [r.golden_id for r in records],
            "entity": [r.entity for r in records],
            "natural_key": [r.natural_key for r in records],
            "data_json": [json.dumps(r.data) for r in records],
            "confidence_score": [r.confidence_score for r in records],
            "status": [r.status for r in records],
            "version": [r.version for r in records],
            "last_reconciled": [r.last_reconciled for r in records],
        }
        arrow_table = pa.table(rows, schema=schema)

        ref_lakehouse.create_table("reference", "product_golden", schema)
        ref_lakehouse.overwrite("reference", "product_golden", arrow_table)

        # Query back
        table = ref_lakehouse.get_table("reference", "product_golden")
        df = table.scan().to_arrow()
        assert len(df) == 5
        assert set(df.column("entity").to_pylist()) == {"product"}

    def test_overwrite_replaces_data(self, ref_lakehouse):
        """Verify overwrite replaces all records."""
        schema = pa.schema([
            ("golden_id", pa.string()),
            ("entity", pa.string()),
            ("natural_key", pa.string()),
            ("data_json", pa.string()),
            ("confidence_score", pa.float64()),
            ("status", pa.string()),
            ("version", pa.int32()),
            ("last_reconciled", pa.string()),
        ])

        # Write initial batch
        rows1 = {
            "golden_id": ["GR-PRO-0001"],
            "entity": ["product"],
            "natural_key": ["key_1"],
            "data_json": ['{"a": 1}'],
            "confidence_score": [0.9],
            "status": ["active"],
            "version": [1],
            "last_reconciled": ["2026-03-01T00:00:00"],
        }
        ref_lakehouse.create_table("reference", "product_golden", schema)
        ref_lakehouse.overwrite("reference", "product_golden", pa.table(rows1, schema=schema))

        # Write replacement batch
        rows2 = {
            "golden_id": ["GR-PRO-0001", "GR-PRO-0002"],
            "entity": ["product", "product"],
            "natural_key": ["key_1", "key_2"],
            "data_json": ['{"a": 10}', '{"a": 20}'],
            "confidence_score": [0.95, 0.85],
            "status": ["active", "active"],
            "version": [2, 1],
            "last_reconciled": ["2026-03-01T01:00:00", "2026-03-01T01:00:00"],
        }
        ref_lakehouse.overwrite("reference", "product_golden", pa.table(rows2, schema=schema))

        # Should have 2 records after overwrite
        table = ref_lakehouse.get_table("reference", "product_golden")
        df = table.scan().to_arrow()
        assert len(df) == 2

    def test_snapshots_accumulate(self, ref_lakehouse):
        """Verify Iceberg snapshots are created for each write."""
        schema = pa.schema([
            ("golden_id", pa.string()),
            ("entity", pa.string()),
            ("natural_key", pa.string()),
            ("data_json", pa.string()),
            ("confidence_score", pa.float64()),
            ("status", pa.string()),
            ("version", pa.int32()),
            ("last_reconciled", pa.string()),
        ])

        def _make_batch(n):
            return pa.table({
                "golden_id": [f"GR-{n}"],
                "entity": ["product"],
                "natural_key": [f"key_{n}"],
                "data_json": [f'{{"v": {n}}}'],
                "confidence_score": [0.9],
                "status": ["active"],
                "version": [n],
                "last_reconciled": ["2026-03-01"],
            }, schema=schema)

        ref_lakehouse.create_table("reference", "product_golden", schema)
        ref_lakehouse.overwrite("reference", "product_golden", _make_batch(1))
        ref_lakehouse.overwrite("reference", "product_golden", _make_batch(2))

        # Should have multiple snapshots (create + 2 overwrites)
        snapshots = ref_lakehouse.list_snapshots("reference", "product_golden")
        assert len(snapshots) >= 2

    def test_multiple_entity_tables(self, ref_lakehouse):
        """Verify different entities get separate Iceberg tables."""
        schema = pa.schema([
            ("golden_id", pa.string()),
            ("entity", pa.string()),
            ("natural_key", pa.string()),
            ("data_json", pa.string()),
            ("confidence_score", pa.float64()),
            ("status", pa.string()),
            ("version", pa.int32()),
            ("last_reconciled", pa.string()),
        ])

        for entity in ["product", "venue", "account"]:
            rows = {
                "golden_id": [f"GR-{entity[:3].upper()}-0001"],
                "entity": [entity],
                "natural_key": ["key_1"],
                "data_json": [f'{{"entity": "{entity}"}}'],
                "confidence_score": [0.9],
                "status": ["active"],
                "version": [1],
                "last_reconciled": ["2026-03-01"],
            }
            table_name = f"{entity}_golden"
            ref_lakehouse.create_table("reference", table_name, schema)
            ref_lakehouse.overwrite("reference", table_name, pa.table(rows, schema=schema))

        tables = ref_lakehouse.list_tables("reference")
        assert "product_golden" in tables
        assert "venue_golden" in tables
        assert "account_golden" in tables

    def test_governance_properties_on_reference(self, ref_lakehouse):
        """Verify governance properties can be set on reference tables."""
        schema = pa.schema([("golden_id", pa.string()), ("entity", pa.string())])
        ref_lakehouse.create_table("reference", "trader_golden", schema)

        ref_lakehouse.set_table_properties("reference", "trader_golden", {
            "governance.pii.contains": "true",
            "governance.pii.fields": "trader_name",
            "governance.retention.min_years": "7",
        })

        props = ref_lakehouse.get_table_properties("reference", "trader_golden")
        assert props.get("governance.pii.contains") == "true"
        assert props.get("governance.retention.min_years") == "7"
