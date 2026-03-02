"""Tests for MetadataService observability loaders — event types, metrics, lineage config."""

import json
from pathlib import Path

from backend.services.metadata_service import MetadataService


class TestMetadataServiceEventTypes:
    def test_load_event_types(self, tmp_path):
        ws = tmp_path / "workspace"
        obs = ws / "metadata" / "observability"
        obs.mkdir(parents=True)
        (obs / "event_types.json").write_text(json.dumps({
            "event_types": [{"type": "pipeline_execution", "severity": "info"}]
        }))
        svc = MetadataService(ws)
        result = svc.load_event_types()
        assert len(result["event_types"]) == 1

    def test_load_event_types_missing(self, tmp_path):
        ws = tmp_path / "workspace"
        ws.mkdir(parents=True)
        svc = MetadataService(ws)
        result = svc.load_event_types()
        assert result["event_types"] == []


class TestMetadataServiceMetricDefs:
    def test_load_metric_definitions(self, tmp_path):
        ws = tmp_path / "workspace"
        obs = ws / "metadata" / "observability"
        obs.mkdir(parents=True)
        (obs / "metric_definitions.json").write_text(json.dumps({
            "metrics": [{"id": "m1", "type": "execution_time"}]
        }))
        svc = MetadataService(ws)
        result = svc.load_metric_definitions()
        assert len(result["metrics"]) == 1

    def test_load_metric_definitions_missing(self, tmp_path):
        ws = tmp_path / "workspace"
        ws.mkdir(parents=True)
        svc = MetadataService(ws)
        result = svc.load_metric_definitions()
        assert result["metrics"] == []


class TestMetadataServiceLineageConfig:
    def test_load_lineage_config(self, tmp_path):
        ws = tmp_path / "workspace"
        obs = ws / "metadata" / "observability"
        obs.mkdir(parents=True)
        (obs / "lineage_config.json").write_text(json.dumps({
            "entities": ["execution", "order"],
            "layers": [{"id": "tier_flow"}],
        }))
        svc = MetadataService(ws)
        result = svc.load_lineage_config()
        assert len(result["entities"]) == 2
        assert len(result["layers"]) == 1

    def test_load_lineage_config_missing(self, tmp_path):
        ws = tmp_path / "workspace"
        ws.mkdir(parents=True)
        svc = MetadataService(ws)
        result = svc.load_lineage_config()
        assert result["entities"] == []
