"""Tests for reports API endpoints."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(autouse=True)
def _setup_services(tmp_path):
    from backend.services.case_service import CaseService
    from backend.services.report_service import ReportService

    # Create template
    templates_dir = tmp_path / "metadata" / "report_templates"
    templates_dir.mkdir(parents=True)
    stor = {
        "template_id": "stor",
        "name": "STOR",
        "regulation": "UK MAR",
        "sections": [
            {
                "section_id": "s1",
                "label": "Section 1",
                "fields": [
                    {"field_id": "f1", "label": "Field", "source": "case.assignee"},
                ],
            }
        ],
    }
    (templates_dir / "stor.json").write_text(json.dumps(stor))

    app.state.case_service = CaseService(tmp_path)
    app.state.report_service = ReportService(tmp_path)
    yield


client = TestClient(app)


class TestReportAPI:
    def test_list_templates(self):
        r = client.get("/api/reports/templates")
        assert r.status_code == 200
        assert len(r.json()["templates"]) == 1

    def test_generate_report(self):
        # Create a case first
        case = client.post("/api/cases", json={"title": "Test", "alert_ids": []}).json()
        r = client.post("/api/reports/generate", json={
            "template_id": "stor",
            "case_id": case["case_id"],
        })
        assert r.status_code == 200
        assert r.json()["report_id"].startswith("RPT-")

    def test_generate_report_missing_case(self):
        r = client.post("/api/reports/generate", json={
            "template_id": "stor",
            "case_id": "CASE-MISSING",
        })
        assert r.status_code == 404

    def test_list_reports(self):
        case = client.post("/api/cases", json={"title": "Test", "alert_ids": []}).json()
        client.post("/api/reports/generate", json={
            "template_id": "stor",
            "case_id": case["case_id"],
        })
        r = client.get("/api/reports")
        assert r.status_code == 200
        assert len(r.json()["reports"]) == 1

    def test_get_report(self):
        case = client.post("/api/cases", json={"title": "Test", "alert_ids": []}).json()
        report = client.post("/api/reports/generate", json={
            "template_id": "stor",
            "case_id": case["case_id"],
        }).json()
        r = client.get(f"/api/reports/{report['report_id']}")
        assert r.status_code == 200
        assert r.json()["template_id"] == "stor"
