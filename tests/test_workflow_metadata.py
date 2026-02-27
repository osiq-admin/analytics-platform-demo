"""Tests for workflow metadata (M167 — submission workflow states as metadata)."""
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
