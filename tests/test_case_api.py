"""Tests for cases API endpoints."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(autouse=True)
def _setup_case_service(tmp_path):
    from backend.services.case_service import CaseService
    app.state.case_service = CaseService(tmp_path)
    yield


client = TestClient(app)


class TestCaseAPI:
    def test_list_empty(self):
        r = client.get("/api/cases")
        assert r.status_code == 200
        assert r.json()["cases"] == []

    def test_create_case(self):
        r = client.post("/api/cases", json={
            "title": "MPR Alert Review",
            "alert_ids": ["ALT-001"],
            "priority": "high",
        })
        assert r.status_code == 200
        assert r.json()["case_id"].startswith("CASE-")

    def test_get_case(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        r = client.get(f"/api/cases/{created['case_id']}")
        assert r.status_code == 200
        assert r.json()["title"] == "T"

    def test_get_case_404(self):
        r = client.get("/api/cases/CASE-MISSING")
        assert r.status_code == 404

    def test_update_status(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        r = client.put(f"/api/cases/{created['case_id']}/status", json={"status": "investigating"})
        assert r.status_code == 200
        assert r.json()["status"] == "investigating"

    def test_add_annotation(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        r = client.post(f"/api/cases/{created['case_id']}/annotate", json={
            "type": "note", "content": "Looks suspicious"
        })
        assert r.status_code == 200
        assert len(r.json()["annotations"]) == 1

    def test_delete_case(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        r = client.delete(f"/api/cases/{created['case_id']}")
        assert r.status_code == 200

    def test_stats(self):
        client.post("/api/cases", json={"title": "A", "alert_ids": []})
        r = client.get("/api/cases/stats")
        assert r.status_code == 200
        assert r.json()["total_cases"] == 1

    def test_for_alert(self):
        client.post("/api/cases", json={"title": "A", "alert_ids": ["ALT-X"]})
        r = client.get("/api/cases/for-alert/ALT-X")
        assert r.status_code == 200
        assert len(r.json()["cases"]) == 1

    def test_create_from_alert(self):
        r = client.post("/api/cases/from-alert/ALT-001")
        assert r.status_code == 200
        data = r.json()
        assert "ALT-001" in data["alert_ids"]
        assert "ALT-001" in data["title"]

    def test_annotation_types(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        for ann_type in ("note", "disposition", "escalation", "evidence"):
            r = client.post(f"/api/cases/{created['case_id']}/annotate", json={
                "type": ann_type, "content": f"Test {ann_type}"
            })
            assert r.status_code == 200
        case = client.get(f"/api/cases/{created['case_id']}").json()
        assert len(case["annotations"]) == 4

    def test_annotation_ordering(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        client.post(f"/api/cases/{created['case_id']}/annotate", json={
            "content": "First"
        })
        client.post(f"/api/cases/{created['case_id']}/annotate", json={
            "content": "Second"
        })
        case = client.get(f"/api/cases/{created['case_id']}").json()
        assert case["annotations"][0]["content"] == "First"
        assert case["annotations"][1]["content"] == "Second"
