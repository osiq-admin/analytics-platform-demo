"""Tests for workflow metadata (M167) and demo checkpoint metadata (M168)."""
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
