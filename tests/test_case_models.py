"""Tests for case management Pydantic models."""
import json
from pathlib import Path

import pytest
from backend.models.cases import Case, CaseAnnotation, CaseSLAInfo


class TestCaseAnnotation:
    def test_create_annotation_defaults(self):
        a = CaseAnnotation(annotation_id="ann-1", content="test note")
        assert a.author == "analyst_1"
        assert a.type == "note"
        assert a.metadata == {}

    def test_annotation_types(self):
        for t in ("note", "disposition", "escalation", "evidence"):
            a = CaseAnnotation(annotation_id="a1", content="x", type=t)
            assert a.type == t


class TestCaseSLAInfo:
    def test_sla_defaults(self):
        sla = CaseSLAInfo()
        assert sla.sla_hours == 72
        assert sla.sla_status == "on_track"
        assert sla.due_date is None


class TestCase:
    def test_create_case_minimal(self):
        c = Case(case_id="CASE-001", title="Test case")
        assert c.status == "open"
        assert c.priority == "medium"
        assert c.alert_ids == []
        assert c.annotations == []

    def test_case_round_trip(self):
        c = Case(
            case_id="CASE-002",
            title="MPR Alert Investigation",
            alert_ids=["ALT-001", "ALT-002"],
            priority="high",
            category="market_abuse",
        )
        data = c.model_dump()
        c2 = Case(**data)
        assert c2.case_id == c.case_id
        assert c2.alert_ids == ["ALT-001", "ALT-002"]


class TestCaseWorkflow:
    def test_workflow_metadata_loads(self):
        path = Path("workspace/metadata/workflows/case_management.json")
        data = json.loads(path.read_text())
        assert data["workflow_id"] == "case_management"
        assert len(data["states"]) == 5

    def test_workflow_transitions_valid(self):
        path = Path("workspace/metadata/workflows/case_management.json")
        data = json.loads(path.read_text())
        state_ids = {s["id"] for s in data["states"]}
        for s in data["states"]:
            for t in s["transitions"]:
                assert t in state_ids, f"Invalid transition {t} from {s['id']}"
