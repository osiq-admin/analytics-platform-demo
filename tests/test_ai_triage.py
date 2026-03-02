"""Tests for AI triage endpoint."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(autouse=True)
def _setup(tmp_path):
    from backend.services.case_service import CaseService
    app.state.case_service = CaseService(tmp_path)
    yield


client = TestClient(app)


class TestAITriage:
    def test_triage_returns_suggestions(self):
        r = client.post("/api/ai/triage/ALT-001")
        assert r.status_code == 200
        data = r.json()
        assert "suggested_priority" in data
        assert "suggested_category" in data
        assert "initial_notes" in data
        assert data["suggested_priority"] in ("critical", "high", "medium", "low")

    def test_triage_different_models(self):
        r1 = client.post("/api/ai/triage/ALT-MPR-001")
        r2 = client.post("/api/ai/triage/ALT-WASH-001")
        assert r1.status_code == 200
        assert r2.status_code == 200

    def test_triage_includes_alert_id(self):
        r = client.post("/api/ai/triage/ALT-TEST-999")
        assert r.status_code == 200
        assert r.json()["alert_id"] == "ALT-TEST-999"
