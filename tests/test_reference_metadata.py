"""Tests for MetadataService reference data methods."""
import json
from pathlib import Path
import pytest
from backend.services.metadata_service import MetadataService


@pytest.fixture
def workspace(tmp_path):
    """Minimal workspace with reference metadata."""
    ws = tmp_path / "workspace"
    # Create metadata dirs
    ref_meta = ws / "metadata" / "reference"
    ref_meta.mkdir(parents=True)

    # Write a test reference config
    (ref_meta / "product.json").write_text(json.dumps({
        "entity": "product",
        "golden_key": "isin",
        "display_name": "Product Master",
        "description": "Test product reference config",
        "match_rules": [{"strategy": "exact", "fields": ["isin"], "threshold": 1.0, "weight": 1.0}],
        "merge_rules": [{"field": "name", "strategy": "longest", "source_priority": []}],
        "external_sources": [],
        "auto_reconcile": True,
        "reconciliation_schedule": "on_demand"
    }))

    (ref_meta / "venue.json").write_text(json.dumps({
        "entity": "venue",
        "golden_key": "mic",
        "display_name": "Venue Master",
        "description": "Test venue reference config",
        "match_rules": [{"strategy": "exact", "fields": ["mic"], "threshold": 1.0, "weight": 1.0}],
        "merge_rules": [],
        "external_sources": [],
        "auto_reconcile": True,
        "reconciliation_schedule": "on_demand"
    }))

    return ws


@pytest.fixture
def meta(workspace):
    return MetadataService(workspace)


class TestReferenceConfigMethods:
    def test_load_reference_config_product(self, meta):
        config = meta.load_reference_config("product")
        assert config is not None
        assert config.entity == "product"
        assert config.golden_key == "isin"

    def test_load_reference_config_not_found(self, meta):
        result = meta.load_reference_config("nonexistent")
        assert result is None

    def test_list_reference_configs(self, meta):
        configs = meta.list_reference_configs()
        assert len(configs) == 2
        entities = [c.entity for c in configs]
        assert "product" in entities
        assert "venue" in entities


class TestGoldenRecordMethods:
    def test_save_and_load_golden_records(self, meta, workspace):
        from backend.models.reference import GoldenRecord, GoldenRecordSet, FieldProvenance
        record = GoldenRecord(
            golden_id="GR-PRD-0001",
            entity="product",
            natural_key="US0378331005",
            data={"name": "Apple Inc", "asset_class": "equity"},
            provenance={"name": FieldProvenance(value="Apple Inc", source="csv:product.csv", confidence=1.0)},
            source_records=["product.csv:1"],
            confidence_score=1.0,
            status="active"
        )
        record_set = GoldenRecordSet(
            entity="product",
            golden_key="isin",
            record_count=1,
            records=[record]
        )
        meta.save_golden_records("product", record_set)
        loaded = meta.load_golden_records("product")
        assert loaded is not None
        assert loaded.record_count == 1
        assert loaded.records[0].golden_id == "GR-PRD-0001"

    def test_load_golden_record_by_id(self, meta, workspace):
        from backend.models.reference import GoldenRecord, GoldenRecordSet
        record_set = GoldenRecordSet(
            entity="product",
            golden_key="isin",
            record_count=2,
            records=[
                GoldenRecord(golden_id="GR-PRD-0001", entity="product", natural_key="US0378331005"),
                GoldenRecord(golden_id="GR-PRD-0002", entity="product", natural_key="US5949181045")
            ]
        )
        meta.save_golden_records("product", record_set)
        rec = meta.load_golden_record("product", "GR-PRD-0002")
        assert rec is not None
        assert rec.natural_key == "US5949181045"

    def test_golden_records_not_found_returns_none(self, meta):
        result = meta.load_golden_records("nonexistent")
        assert result is None
