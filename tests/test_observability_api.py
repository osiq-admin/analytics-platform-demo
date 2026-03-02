"""Tests for the Observability event log REST API (backend/api/observability.py)."""
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
    """Minimal workspace for observability API tests."""
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

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestObservabilityEventsAPI:
    def test_events_empty(self, client):
        """GET /api/observability/events returns empty list when no events."""
        r = client.get("/api/observability/events")
        assert r.status_code == 200
        assert r.json() == []

    def test_events_with_date_filter(self, client):
        """GET /api/observability/events?date=2026-01-01 returns empty for non-existent date."""
        r = client.get("/api/observability/events", params={"date": "2026-01-01"})
        assert r.status_code == 200
        assert r.json() == []

    def test_events_with_type_filter(self, client):
        """GET /api/observability/events?type=pipeline_execution returns filtered list."""
        r = client.get("/api/observability/events", params={"type": "pipeline_execution"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_events_with_entity_filter(self, client):
        """GET /api/observability/events?entity=order returns filtered list."""
        r = client.get("/api/observability/events", params={"entity": "order"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestObservabilityChainAPI:
    def test_chain_verify_no_events(self, client):
        """GET /api/observability/chain/verify/2026-01-01 returns valid for empty chain."""
        r = client.get("/api/observability/chain/verify/2026-01-01")
        assert r.status_code == 200
        data = r.json()
        assert data["date"] == "2026-01-01"
        assert data["valid"] is True


class TestObservabilityStatsAPI:
    def test_stats_empty(self, client):
        """GET /api/observability/stats returns empty dict when no events."""
        r = client.get("/api/observability/stats")
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_stats_after_events(self, client):
        """Stats reflect events emitted through the service."""
        # Emit a few events directly via the service
        from backend.services.event_service import EventService
        svc = EventService(config.settings.workspace_dir)
        svc.emit("quality_check", entity="order")
        svc.emit("quality_check", entity="execution")
        svc.emit("pipeline_execution", entity="order")

        r = client.get("/api/observability/stats")
        assert r.status_code == 200
        data = r.json()
        assert data.get("quality_check", 0) >= 2
        assert data.get("pipeline_execution", 0) >= 1
