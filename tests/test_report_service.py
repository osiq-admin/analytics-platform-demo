"""Tests for ReportService."""
import json
import pytest
from pathlib import Path
from backend.services.report_service import ReportService


@pytest.fixture
def svc(tmp_path):
    # Create template directory with STOR template
    templates_dir = tmp_path / "metadata" / "report_templates"
    templates_dir.mkdir(parents=True)
    stor = {
        "template_id": "stor",
        "name": "STOR",
        "regulation": "UK MAR Article 16",
        "sections": [
            {
                "section_id": "reporting",
                "label": "Reporting",
                "fields": [
                    {"field_id": "firm", "label": "Firm", "source": "static", "default": "Demo"},
                    {"field_id": "reporter", "label": "Reporter", "source": "case.assignee"},
                    {"field_id": "score", "label": "Score", "source": "alert.accumulated_score"},
                    {"field_id": "date", "label": "Date", "source": "generated.timestamp"},
                ],
            }
        ],
    }
    (templates_dir / "stor.json").write_text(json.dumps(stor))
    return ReportService(tmp_path)


class TestReportService:
    def test_list_templates(self, svc):
        templates = svc.list_templates()
        assert len(templates) == 1
        assert templates[0]["template_id"] == "stor"

    def test_get_template(self, svc):
        t = svc.get_template("stor")
        assert t is not None
        assert t["name"] == "STOR"

    def test_get_template_missing(self, svc):
        assert svc.get_template("missing") is None

    def test_generate_report(self, svc):
        report = svc.generate_report(
            template_id="stor",
            case_data={"case_id": "CASE-001", "assignee": "analyst_1"},
            alert_data={"accumulated_score": 85.5},
        )
        assert report["report_id"].startswith("RPT-")
        assert report["template_id"] == "stor"
        assert report["case_id"] == "CASE-001"
        assert len(report["sections"]) == 1

        fields = {f["field_id"]: f["value"] for f in report["sections"][0]["fields"]}
        assert fields["firm"] == "Demo"
        assert fields["reporter"] == "analyst_1"
        assert fields["score"] == "85.5"
        assert len(fields["date"]) > 0  # timestamp generated

    def test_generate_report_invalid_template(self, svc):
        with pytest.raises(ValueError, match="Template not found"):
            svc.generate_report("missing", {})

    def test_list_reports(self, svc):
        svc.generate_report("stor", {"case_id": "C1", "assignee": "a"})
        svc.generate_report("stor", {"case_id": "C2", "assignee": "b"})
        assert len(svc.list_reports()) == 2
        assert len(svc.list_reports("C1")) == 1

    def test_get_report(self, svc):
        report = svc.generate_report("stor", {"case_id": "C1", "assignee": "a"})
        fetched = svc.get_report(report["report_id"])
        assert fetched is not None
        assert fetched["report_id"] == report["report_id"]

    def test_get_report_missing(self, svc):
        assert svc.get_report("RPT-MISSING") is None
