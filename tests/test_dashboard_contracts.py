"""Contract tests: dashboard API response shape matches frontend expectations.

The dashboard endpoint /api/dashboard/stats returns a dict with keys:
  total_alerts, by_model, by_trigger, avg_scores, score_distribution, by_asset
This test validates the shape even when no alerts_summary table exists
(graceful degradation).
"""

import json

import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app


@pytest.fixture
def workspace(tmp_path):
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
        "metadata/governance",
        "metadata/_audit",
    ]:
        (ws / d).mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "navigation" / "main.json").write_text(
        json.dumps({"navigation_id": "main", "groups": []})
    )
    (ws / "data" / "csv").mkdir(parents=True)
    (ws / "data" / "parquet").mkdir(parents=True)
    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestDashboardStatsContract:
    """Validate /api/dashboard/stats response shape."""

    def test_stats_returns_200(self, client):
        r = client.get("/api/dashboard/stats")
        assert r.status_code == 200

    def test_stats_has_required_keys(self, client):
        r = client.get("/api/dashboard/stats")
        data = r.json()
        required = {"total_alerts", "by_model", "by_trigger", "avg_scores",
                     "score_distribution", "by_asset"}
        missing = required - set(data.keys())
        assert not missing, f"Dashboard stats missing keys: {missing}"

    def test_stats_types_correct(self, client):
        r = client.get("/api/dashboard/stats")
        data = r.json()
        assert isinstance(data["total_alerts"], (int, float))
        assert isinstance(data["by_model"], list)
        assert isinstance(data["by_trigger"], list)
        assert isinstance(data["avg_scores"], dict)
        assert isinstance(data["score_distribution"], list)
        assert isinstance(data["by_asset"], list)

    def test_stats_graceful_without_alerts(self, client):
        """Without alerts_summary table, dashboard should return zeros/empty lists."""
        r = client.get("/api/dashboard/stats")
        data = r.json()
        assert data["total_alerts"] == 0
        assert data["by_model"] == []
