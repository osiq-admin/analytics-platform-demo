"""Tests for observability metadata definitions — event types, metrics, lineage config, standards, coverage."""

import json
from pathlib import Path

METADATA_DIR = Path(__file__).resolve().parent.parent / "workspace" / "metadata" / "observability"


class TestEventTypesMetadata:
    def test_file_exists_and_loads(self):
        data = json.loads((METADATA_DIR / "event_types.json").read_text())
        assert "event_types" in data

    def test_six_event_types(self):
        data = json.loads((METADATA_DIR / "event_types.json").read_text())
        assert len(data["event_types"]) == 6

    def test_event_type_fields(self):
        data = json.loads((METADATA_DIR / "event_types.json").read_text())
        for et in data["event_types"]:
            assert "type" in et
            assert "severity" in et
            assert "retention_days" in et
            assert "description" in et


class TestMetricDefinitionsMetadata:
    def test_file_exists_and_loads(self):
        data = json.loads((METADATA_DIR / "metric_definitions.json").read_text())
        assert "metrics" in data

    def test_six_metrics(self):
        data = json.loads((METADATA_DIR / "metric_definitions.json").read_text())
        assert len(data["metrics"]) == 6

    def test_metric_fields(self):
        data = json.loads((METADATA_DIR / "metric_definitions.json").read_text())
        for m in data["metrics"]:
            assert "id" in m
            assert "type" in m
            assert "unit" in m
            assert "sla_threshold" in m


class TestLineageConfigMetadata:
    def test_file_exists_and_loads(self):
        data = json.loads((METADATA_DIR / "lineage_config.json").read_text())
        assert "entities" in data
        assert "layers" in data

    def test_eight_entities(self):
        data = json.loads((METADATA_DIR / "lineage_config.json").read_text())
        assert len(data["entities"]) == 8

    def test_six_layers(self):
        data = json.loads((METADATA_DIR / "lineage_config.json").read_text())
        assert len(data["layers"]) == 6
        layer_ids = [l["id"] for l in data["layers"]]
        assert "tier_flow" in layer_ids
        assert "field_mapping" in layer_ids
        assert "regulatory_req" in layer_ids


class TestLineageStandardsMetadata:
    def test_file_exists_and_loads(self):
        data = json.loads((METADATA_DIR / "lineage_standards.json").read_text())
        assert "standards" in data

    def test_standards_references(self):
        data = json.loads((METADATA_DIR / "lineage_standards.json").read_text())
        standard_ids = [s["id"] for s in data["standards"]]
        assert "openlineage_1.0" in standard_ids
        assert "w3c_prov_o" in standard_ids
        assert "iso_8000_61" in standard_ids
        assert "iso_25012" in standard_ids

    def test_regulatory_coverage(self):
        data = json.loads((METADATA_DIR / "lineage_standards.json").read_text())
        assert "regulatory_coverage" in data
        assert len(data["regulatory_coverage"]) >= 4


class TestCoverageConfigMetadata:
    def test_file_exists_and_loads(self):
        data = json.loads((METADATA_DIR / "coverage_config.json").read_text())
        assert "abuse_types" in data

    def test_five_abuse_types(self):
        data = json.loads((METADATA_DIR / "coverage_config.json").read_text())
        assert len(data["abuse_types"]) == 5

    def test_regulatory_mappings(self):
        data = json.loads((METADATA_DIR / "coverage_config.json").read_text())
        assert "regulatory_mappings" in data
        for abuse_type in data["abuse_types"]:
            assert abuse_type in data["regulatory_mappings"]
