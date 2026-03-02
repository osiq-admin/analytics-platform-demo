"""Tests for the Pipeline metrics REST API (backend/api/metrics_api.py)."""
import json

import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def workspace(tmp_path):
    """Minimal workspace for metrics API tests."""
    ws = tmp_path / "workspace"
    for d in [
        "metadata/entities",
        "metadata/calculations/transaction",
        "metadata/calculations/time_windows",
        "metadata/calculations/derived",
        "metadata/calculations/aggregations",
        "metadata/settings/thresholds",
        "metadata/settings/score_steps",
        "metadata/settings/score_thresholds",
        "metadata/detection_models",
        "metadata/navigation",
        "metadata/widgets",
        "metadata/format_rules",
        "metadata/query_presets",
        "metadata/grids",
        "metadata/view_config",
        "metadata/theme",
        "metadata/workflows",
        "metadata/demo",
        "metadata/tours",
        "metadata/standards/iso",
        "metadata/standards/fix",
        "metadata/standards/compliance",
        "metadata/mappings",
        "metadata/regulations",
        "metadata/match_patterns",
        "metadata/score_templates",
        "metadata/medallion",
        "metadata/quality",
        "metadata/reference",
    ]:
        (ws / d).mkdir(parents=True, exist_ok=True)

    (ws / "metadata" / "navigation" / "main.json").write_text(
        json.dumps({"navigation_id": "main", "groups": []})
    )

    (ws / "data" / "csv").mkdir(parents=True, exist_ok=True)
    (ws / "data" / "parquet").mkdir(parents=True, exist_ok=True)
    (ws / "results").mkdir(parents=True, exist_ok=True)
    (ws / "alerts" / "traces").mkdir(parents=True, exist_ok=True)

    # Seed one metric series for series/sla tests
    metrics_dir = ws / "metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)
    (metrics_dir / "pipeline_latency.json").write_text(
        json.dumps({
            "metric_id": "pipeline_latency",
            "metric_type": "execution_time",
            "entity": "order",
            "tier": "gold",
            "points": [
                {"metric_id": "pt-1", "metric_type": "execution_time",
                 "value": 120.5, "unit": "ms",
                 "timestamp": "2026-03-01T00:00:00Z", "tags": {}},
                {"metric_id": "pt-2", "metric_type": "execution_time",
                 "value": 95.0, "unit": "ms",
                 "timestamp": "2026-03-02T00:00:00Z", "tags": {}},
            ],
        })
    )

    # Metric definitions with SLA threshold
    obs_dir = ws / "metadata" / "observability"
    obs_dir.mkdir(parents=True, exist_ok=True)
    (obs_dir / "metric_definitions.json").write_text(
        json.dumps({
            "metrics": [
                {"id": "pipeline_latency", "sla_threshold": 200.0},
            ]
        })
    )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestMetricsSummaryAPI:
    def test_summary(self, client):
        """GET /api/metrics/summary returns list of metric summaries."""
        r = client.get("/api/metrics/summary")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        entry = data[0]
        assert "metric_id" in entry
        assert "latest_value" in entry
        assert "point_count" in entry


class TestMetricsSeriesAPI:
    def test_series_found(self, client):
        """GET /api/metrics/series/pipeline_latency returns the series."""
        r = client.get("/api/metrics/series/pipeline_latency")
        assert r.status_code == 200
        data = r.json()
        assert data["metric_id"] == "pipeline_latency"
        assert len(data["points"]) == 2

    def test_series_not_found(self, client):
        """GET /api/metrics/series/nonexistent returns 404."""
        r = client.get("/api/metrics/series/nonexistent")
        assert r.status_code == 404
        assert "error" in r.json()

    def test_series_with_time_filter(self, client):
        """GET /api/metrics/series/pipeline_latency?start=...&end=... filters points."""
        r = client.get(
            "/api/metrics/series/pipeline_latency",
            params={"start": "2026-03-01T12:00:00Z", "end": "2026-03-03T00:00:00Z"},
        )
        assert r.status_code == 200
        data = r.json()
        # Only the second point (2026-03-02) should match
        assert len(data["points"]) == 1
        assert data["points"][0]["value"] == 95.0


class TestMetricsSLAAPI:
    def test_sla_compliance(self, client):
        """GET /api/metrics/sla returns SLA compliance results."""
        r = client.get("/api/metrics/sla")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        entry = data[0]
        assert entry["metric_id"] == "pipeline_latency"
        assert "threshold" in entry
        assert "compliance_pct" in entry
        assert "status" in entry

    def test_sla_empty_when_no_definitions(self, client, workspace):
        """SLA returns empty list when no metric definitions exist."""
        # Remove metric definitions file
        obs_defs = workspace / "metadata" / "observability" / "metric_definitions.json"
        obs_defs.write_text(json.dumps({"metrics": []}))

        r = client.get("/api/metrics/sla")
        assert r.status_code == 200
        assert r.json() == []
