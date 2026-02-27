"""Tests for workflow metadata (M167), demo checkpoint metadata (M168), and tour registry metadata (M169)."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    (ws / "metadata" / "workflows").mkdir(parents=True)
    (ws / "metadata" / "workflows" / "submission.json").write_text(json.dumps({
        "workflow_id": "submission",
        "description": "Regulatory submission workflow with approval process",
        "states": [
            {"id": "pending", "label": "Pending", "badge_variant": "info", "transitions": ["in_review", "approved", "rejected"]},
            {"id": "in_review", "label": "In Review", "badge_variant": "warning", "transitions": ["approved", "rejected"]},
            {"id": "approved", "label": "Approved", "badge_variant": "success", "transitions": ["implemented"]},
            {"id": "rejected", "label": "Rejected", "badge_variant": "error", "transitions": ["pending"]},
            {"id": "implemented", "label": "Implemented", "badge_variant": "success", "transitions": []}
        ]
    }))
    # Demo checkpoint metadata (M168)
    (ws / "metadata" / "demo").mkdir(parents=True)
    (ws / "metadata" / "demo" / "default.json").write_text(json.dumps({
        "demo_id": "default",
        "description": "Default demo flow for trade surveillance platform",
        "checkpoints": [
            {"id": "pristine", "label": "Pristine", "description": "Initial state with empty pipeline", "order": 0},
            {"id": "data_loaded", "label": "Data Loaded", "description": "All entities and market data loaded", "order": 1},
            {"id": "pipeline_run", "label": "Pipeline Run", "description": "Calculations and detection models executed", "order": 2},
            {"id": "alerts_generated", "label": "Alerts Generated", "description": "Alerts generated from detection results", "order": 3},
            {"id": "act1_complete", "label": "Act 1 Complete", "description": "Data loaded, entities configured, pipeline ready to run", "order": 4},
            {"id": "model_deployed", "label": "Model Deployed", "description": "Detection models deployed and configured", "order": 5},
            {"id": "act2_complete", "label": "Act 2 Complete", "description": "Models deployed, alerts generated, risk cases available", "order": 6},
            {"id": "final", "label": "Final", "description": "Full demo state with all data, models, alerts, and risk cases", "order": 7}
        ]
    }))
    # Tour registry metadata (M169)
    (ws / "metadata" / "tours").mkdir(parents=True)
    (ws / "metadata" / "tours" / "registry.json").write_text(json.dumps({
        "registry_id": "tours",
        "description": "Tour and scenario registry for guided help system",
        "tours": [
            {"tour_id": "overview", "view_path": "/", "title": "App Overview", "step_count": 4},
            {"tour_id": "dashboard", "view_path": "/dashboard", "title": "Dashboard Tour", "step_count": 4},
            {"tour_id": "entities", "view_path": "/entities", "title": "Entity Designer Tour", "step_count": 3},
            {"tour_id": "settings", "view_path": "/settings", "title": "Settings Manager Tour", "step_count": 3},
            {"tour_id": "models", "view_path": "/models", "title": "Model Composer Tour", "step_count": 2},
            {"tour_id": "alerts", "view_path": "/alerts", "title": "Risk Case Manager Tour", "step_count": 2},
            {"tour_id": "sql", "view_path": "/sql", "title": "SQL Console Tour", "step_count": 3},
            {"tour_id": "pipeline", "view_path": "/pipeline", "title": "Pipeline Monitor Tour", "step_count": 2},
            {"tour_id": "schema", "view_path": "/schema", "title": "Schema Explorer Tour", "step_count": 2},
            {"tour_id": "mappings", "view_path": "/mappings", "title": "Mapping Studio Tour", "step_count": 2},
            {"tour_id": "data", "view_path": "/data", "title": "Data Manager Tour", "step_count": 2},
            {"tour_id": "assistant", "view_path": "/assistant", "title": "AI Assistant Tour", "step_count": 2},
            {"tour_id": "editor", "view_path": "/editor", "title": "Metadata Editor Tour", "step_count": 4},
            {"tour_id": "regulatory", "view_path": "/regulatory", "title": "Regulatory Traceability Tour", "step_count": 5},
            {"tour_id": "act1_guide", "view_path": "/data", "title": "Act 1: Data-to-Alerts Workflow", "step_count": 9},
            {"tour_id": "act2_guide", "view_path": "/models", "title": "Act 2: Model Composition", "step_count": 5},
            {"tour_id": "oob", "view_path": "/editor", "title": "OOB vs Custom Metadata Tour", "step_count": 7},
            {"tour_id": "ux_features", "view_path": "/entities", "title": "Grid & Layout Features", "step_count": 5},
            {"tour_id": "act3_guide", "view_path": "/alerts", "title": "Act 3: Investigation & Analysis", "step_count": 3}
        ],
        "scenarios": {
            "total_count": 26,
            "categories": [
                {"category": "Settings", "count": 6},
                {"category": "Calculations", "count": 4},
                {"category": "Detection Models", "count": 4},
                {"category": "Use Cases", "count": 4},
                {"category": "Entities", "count": 2},
                {"category": "Investigation", "count": 3},
                {"category": "Administration", "count": 3}
            ]
        }
    }))
    for d in ["entities", "calculations", "settings", "detection_models", "query_presets"]:
        (ws / "metadata" / d).mkdir(parents=True)
    (ws / "data" / "csv").mkdir(parents=True)
    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestWorkflowMetadata:
    def test_submission_workflow_loads(self, client):
        resp = client.get("/api/metadata/workflows/submission")
        assert resp.status_code == 200
        data = resp.json()
        assert data["workflow_id"] == "submission"
        assert len(data["states"]) >= 4

    def test_states_have_required_fields(self, client):
        resp = client.get("/api/metadata/workflows/submission")
        for state in resp.json()["states"]:
            assert "id" in state
            assert "label" in state
            assert "badge_variant" in state
            assert "transitions" in state

    def test_pending_can_transition(self, client):
        resp = client.get("/api/metadata/workflows/submission")
        pending = [s for s in resp.json()["states"] if s["id"] == "pending"][0]
        assert "in_review" in pending["transitions"]
        assert "approved" in pending["transitions"]
        assert "rejected" in pending["transitions"]

    def test_approved_transitions_to_implemented(self, client):
        resp = client.get("/api/metadata/workflows/submission")
        approved = [s for s in resp.json()["states"] if s["id"] == "approved"][0]
        assert "implemented" in approved["transitions"]

    def test_implemented_has_no_transitions(self, client):
        resp = client.get("/api/metadata/workflows/submission")
        implemented = [s for s in resp.json()["states"] if s["id"] == "implemented"][0]
        assert len(implemented["transitions"]) == 0

    def test_rejected_can_return_to_pending(self, client):
        resp = client.get("/api/metadata/workflows/submission")
        rejected = [s for s in resp.json()["states"] if s["id"] == "rejected"][0]
        assert "pending" in rejected["transitions"]

    def test_badge_variants_are_valid(self, client):
        resp = client.get("/api/metadata/workflows/submission")
        valid_variants = {"info", "warning", "success", "error", "muted"}
        for state in resp.json()["states"]:
            assert state["badge_variant"] in valid_variants

    def test_workflow_has_description(self, client):
        resp = client.get("/api/metadata/workflows/submission")
        data = resp.json()
        assert "description" in data
        assert len(data["description"]) > 0

    def test_nonexistent_workflow_returns_404(self, client):
        resp = client.get("/api/metadata/workflows/nonexistent")
        assert resp.status_code == 404


class TestDemoCheckpointMetadata:
    """Tests for demo toolbar checkpoint metadata (M168)."""

    def test_demo_config_loads(self, client):
        resp = client.get("/api/metadata/demo/default")
        assert resp.status_code == 200
        data = resp.json()
        assert data["demo_id"] == "default"

    def test_checkpoints_present(self, client):
        resp = client.get("/api/metadata/demo/default")
        data = resp.json()
        assert len(data["checkpoints"]) >= 3

    def test_checkpoints_have_required_fields(self, client):
        resp = client.get("/api/metadata/demo/default")
        for cp in resp.json()["checkpoints"]:
            assert "id" in cp
            assert "label" in cp
            assert "order" in cp

    def test_checkpoints_have_descriptions(self, client):
        resp = client.get("/api/metadata/demo/default")
        for cp in resp.json()["checkpoints"]:
            assert "description" in cp
            assert len(cp["description"]) > 0

    def test_checkpoints_ordered_correctly(self, client):
        resp = client.get("/api/metadata/demo/default")
        checkpoints = resp.json()["checkpoints"]
        orders = [cp["order"] for cp in checkpoints]
        assert orders == sorted(orders), "Checkpoints should be in ascending order"

    def test_first_checkpoint_is_pristine(self, client):
        resp = client.get("/api/metadata/demo/default")
        checkpoints = resp.json()["checkpoints"]
        assert checkpoints[0]["id"] == "pristine"
        assert checkpoints[0]["order"] == 0

    def test_last_checkpoint_is_final(self, client):
        resp = client.get("/api/metadata/demo/default")
        checkpoints = resp.json()["checkpoints"]
        assert checkpoints[-1]["id"] == "final"

    def test_demo_has_description(self, client):
        resp = client.get("/api/metadata/demo/default")
        data = resp.json()
        assert "description" in data
        assert len(data["description"]) > 0

    def test_nonexistent_demo_returns_404(self, client):
        resp = client.get("/api/metadata/demo/nonexistent")
        assert resp.status_code == 404


class TestTourRegistryMetadata:
    """Tests for tour/scenario registry metadata (M169)."""

    def test_tour_registry_loads(self, client):
        resp = client.get("/api/metadata/tours")
        assert resp.status_code == 200
        data = resp.json()
        assert "tours" in data
        assert "scenarios" in data

    def test_tour_registry_has_id(self, client):
        resp = client.get("/api/metadata/tours")
        data = resp.json()
        assert data["registry_id"] == "tours"

    def test_tour_registry_has_description(self, client):
        resp = client.get("/api/metadata/tours")
        data = resp.json()
        assert "description" in data
        assert len(data["description"]) > 0

    def test_tours_have_required_fields(self, client):
        resp = client.get("/api/metadata/tours")
        for tour in resp.json()["tours"]:
            assert "tour_id" in tour
            assert "view_path" in tour
            assert "title" in tour
            assert "step_count" in tour

    def test_tour_count_matches_views(self, client):
        resp = client.get("/api/metadata/tours")
        assert len(resp.json()["tours"]) >= 10  # at least 10 tours for 16 views

    def test_scenarios_have_categories(self, client):
        resp = client.get("/api/metadata/tours")
        scenarios = resp.json()["scenarios"]
        assert scenarios["total_count"] >= 20
        assert len(scenarios["categories"]) >= 5

    def test_scenario_categories_have_required_fields(self, client):
        resp = client.get("/api/metadata/tours")
        for cat in resp.json()["scenarios"]["categories"]:
            assert "category" in cat
            assert "count" in cat
            assert cat["count"] > 0

    def test_scenario_counts_sum_to_total(self, client):
        resp = client.get("/api/metadata/tours")
        scenarios = resp.json()["scenarios"]
        total = sum(c["count"] for c in scenarios["categories"])
        assert total == scenarios["total_count"]

    def test_known_tours_present(self, client):
        """Verify key tours exist in the registry."""
        resp = client.get("/api/metadata/tours")
        tour_ids = {t["tour_id"] for t in resp.json()["tours"]}
        assert "dashboard" in tour_ids
        assert "entities" in tour_ids
        assert "settings" in tour_ids
        assert "overview" in tour_ids

    def test_step_counts_positive(self, client):
        resp = client.get("/api/metadata/tours")
        for tour in resp.json()["tours"]:
            assert tour["step_count"] > 0
