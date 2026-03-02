"""Tests for case management medallion integration."""
import json
import pytest
from pathlib import Path

MEDALLION_DIR = Path("workspace/metadata/medallion")
CONTRACTS_DIR = MEDALLION_DIR / "contracts"
TRANSFORMATIONS_DIR = MEDALLION_DIR / "transformations"


class TestCasePipelineStages:
    def test_case_stages_registered(self):
        stages = json.loads((MEDALLION_DIR / "pipeline_stages.json").read_text())["stages"]
        stage_ids = [s["stage_id"] for s in stages]
        assert "gold_to_sandbox_case" in stage_ids
        assert "sandbox_to_archive_case" in stage_ids

    def test_case_stages_reference_valid_tiers(self):
        tiers = json.loads((MEDALLION_DIR / "tiers.json").read_text())["tiers"]
        tier_ids = {t["tier_id"] for t in tiers}
        stages = json.loads((MEDALLION_DIR / "pipeline_stages.json").read_text())["stages"]
        case_stages = [s for s in stages if "case" in s["stage_id"]]
        for s in case_stages:
            assert s["tier_from"] in tier_ids
            assert s["tier_to"] in tier_ids

    def test_case_stages_ordering(self):
        stages = json.loads((MEDALLION_DIR / "pipeline_stages.json").read_text())["stages"]
        sandbox_case = next(s for s in stages if s["stage_id"] == "gold_to_sandbox_case")
        archive_case = next(s for s in stages if s["stage_id"] == "sandbox_to_archive_case")
        assert sandbox_case["order"] < archive_case["order"]

    def test_total_stage_count(self):
        stages = json.loads((MEDALLION_DIR / "pipeline_stages.json").read_text())["stages"]
        assert len(stages) == 10


class TestCaseContracts:
    def test_sandbox_contract_loads(self):
        data = json.loads((CONTRACTS_DIR / "gold_to_sandbox_cases.json").read_text())
        assert data["entity"] == "case"
        assert len(data["quality_rules"]) >= 4

    def test_archive_contract_loads(self):
        data = json.loads((CONTRACTS_DIR / "sandbox_to_archive_cases.json").read_text())
        assert data["entity"] == "case"
        assert data["retention_days"] == 2555

    def test_archive_contract_requires_resolved(self):
        data = json.loads((CONTRACTS_DIR / "sandbox_to_archive_cases.json").read_text())
        enum_rule = next(
            r for r in data["quality_rules"]
            if r.get("rule") == "enum_check" and r.get("field") == "status"
        )
        assert "resolved" in enum_rule["values"]
        assert "open" not in enum_rule["values"]

    def test_contract_count(self):
        contracts = list(CONTRACTS_DIR.glob("*.json"))
        assert len(contracts) == 16


class TestCaseTransformations:
    def test_sandbox_transformation_loads(self):
        data = json.loads((TRANSFORMATIONS_DIR / "gold_to_sandbox_cases.json").read_text())
        assert data["entity"] == "case"
        assert data["source_tier"] == "gold"
        assert data["target_tier"] == "sandbox"

    def test_archive_transformation_loads(self):
        data = json.loads((TRANSFORMATIONS_DIR / "sandbox_to_archive_cases.json").read_text())
        assert data["entity"] == "case"
        assert data["source_tier"] == "sandbox"
        assert data["target_tier"] == "archive"


class TestCaseMaterializedViews:
    def test_case_mvs_registered(self):
        data = json.loads((MEDALLION_DIR / "materialized_views.json").read_text())
        mv_ids = [mv["mv_id"] for mv in data["materialized_views"]]
        assert "case_summary" in mv_ids
        assert "case_resolution_time" in mv_ids

    def test_case_mvs_source_tier(self):
        data = json.loads((MEDALLION_DIR / "materialized_views.json").read_text())
        case_mvs = [
            mv for mv in data["materialized_views"]
            if mv["mv_id"].startswith("case_")
        ]
        for mv in case_mvs:
            assert mv["source_tier"] == "sandbox"

    def test_total_mv_count(self):
        data = json.loads((MEDALLION_DIR / "materialized_views.json").read_text())
        assert len(data["materialized_views"]) == 6
