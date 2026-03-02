"""Tests for CaseService."""
import pytest
from pathlib import Path
from backend.services.case_service import CaseService


@pytest.fixture
def svc(tmp_path):
    return CaseService(tmp_path)


class TestCaseServiceCRUD:
    def test_list_empty(self, svc):
        assert svc.list_cases() == []

    def test_create_and_get(self, svc):
        case = svc.create_case(title="Test", alert_ids=["ALT-001"])
        assert case["case_id"].startswith("CASE-")
        assert case["status"] == "open"
        fetched = svc.get_case(case["case_id"])
        assert fetched["title"] == "Test"

    def test_list_after_create(self, svc):
        svc.create_case(title="A", alert_ids=[])
        svc.create_case(title="B", alert_ids=[])
        assert len(svc.list_cases()) == 2

    def test_get_nonexistent(self, svc):
        assert svc.get_case("CASE-MISSING") is None

    def test_update_case(self, svc):
        case = svc.create_case(title="Old", alert_ids=[])
        updated = svc.update_case(case["case_id"], {"title": "New", "priority": "high"})
        assert updated["title"] == "New"
        assert updated["priority"] == "high"

    def test_delete_case(self, svc):
        case = svc.create_case(title="Del", alert_ids=[])
        assert svc.delete_case(case["case_id"]) is True
        assert svc.get_case(case["case_id"]) is None

    def test_delete_nonexistent(self, svc):
        assert svc.delete_case("CASE-NOPE") is False


class TestCaseServiceStatus:
    def test_update_status(self, svc):
        case = svc.create_case(title="Test", alert_ids=[])
        updated = svc.update_status(case["case_id"], "investigating")
        assert updated["status"] == "investigating"

    def test_resolve_sets_timestamp(self, svc):
        case = svc.create_case(title="Test", alert_ids=[])
        svc.update_status(case["case_id"], "investigating")
        resolved = svc.update_status(case["case_id"], "resolved")
        assert resolved["resolved_at"] is not None


class TestCaseServiceAnnotations:
    def test_add_annotation(self, svc):
        case = svc.create_case(title="Test", alert_ids=[])
        updated = svc.add_annotation(case["case_id"], {
            "type": "note", "content": "Initial review complete"
        })
        assert len(updated["annotations"]) == 1
        assert updated["annotations"][0]["content"] == "Initial review complete"

    def test_multiple_annotations(self, svc):
        case = svc.create_case(title="Test", alert_ids=[])
        svc.add_annotation(case["case_id"], {"content": "Note 1"})
        updated = svc.add_annotation(case["case_id"], {"content": "Note 2"})
        assert len(updated["annotations"]) == 2


class TestCaseServiceQueries:
    def test_get_cases_for_alert(self, svc):
        svc.create_case(title="A", alert_ids=["ALT-001", "ALT-002"])
        svc.create_case(title="B", alert_ids=["ALT-002", "ALT-003"])
        svc.create_case(title="C", alert_ids=["ALT-004"])
        result = svc.get_cases_for_alert("ALT-002")
        assert len(result) == 2

    def test_get_stats(self, svc):
        svc.create_case(title="A", alert_ids=["ALT-001"])
        svc.create_case(title="B", alert_ids=["ALT-002"])
        stats = svc.get_stats()
        assert stats["total_cases"] == 2
        assert "by_status" in stats
        assert "by_priority" in stats

    def test_get_stats_extended(self, svc):
        svc.create_case(title="A", alert_ids=["ALT-001", "ALT-002"])
        c = svc.create_case(title="B", alert_ids=["ALT-003"])
        svc.update_status(c["case_id"], "investigating")
        svc.update_status(c["case_id"], "resolved")
        stats = svc.get_stats()
        assert stats["total_linked_alerts"] == 3
        assert stats["resolution_rate"] == 0.5
        assert "by_category" in stats
        assert stats["archived_cases"] == 0
        assert stats["pending_reports"] == 1  # case A is open, no report
