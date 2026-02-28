"""Integration tests: verify the full QA pipeline works end-to-end."""
import json
import subprocess
from pathlib import Path

import pytest

from qa.config import get_project_root


class TestCLIEntryPoint:
    def test_help_command(self):
        result = subprocess.run(
            ["uv", "run", "python", "-m", "qa", "--help"],
            capture_output=True, text=True,
            cwd=get_project_root(),
        )
        assert result.returncode == 0
        assert "QA Automation Toolkit" in result.stdout

    def test_test_help(self):
        result = subprocess.run(
            ["uv", "run", "python", "-m", "qa", "test", "--help"],
            capture_output=True, text=True,
            cwd=get_project_root(),
        )
        assert result.returncode == 0
        assert "backend" in result.stdout

    def test_report_no_runs(self):
        result = subprocess.run(
            ["uv", "run", "python", "-m", "qa", "report", "--latest"],
            capture_output=True, text=True,
            cwd=get_project_root(),
        )
        # Should handle gracefully (no runs yet)
        assert "No test runs found" in result.stdout or result.returncode == 0


class TestConventionDiscoveryIntegration:
    """Verify convention mapping works against the real codebase."""

    def test_all_services_have_test_mapping(self):
        from qa.discovery.convention import convention_map
        root = get_project_root()
        services = list((root / "backend" / "services").glob("*.py"))
        mapped = 0
        for service in services:
            if service.name == "__init__.py":
                continue
            result = convention_map(f"backend/services/{service.name}")
            if result:
                mapped += 1
        # At least 50% of services should map to tests
        assert mapped / (len(services) - 1) >= 0.5

    def test_all_apis_have_test_mapping(self):
        from qa.discovery.convention import convention_map
        root = get_project_root()
        apis = list((root / "backend" / "api").glob("*.py"))
        mapped = 0
        for api in apis:
            if api.name == "__init__.py":
                continue
            result = convention_map(f"backend/api/{api.name}")
            if result:
                mapped += 1
        assert mapped >= 3  # At least some APIs have tests


class TestComparatorIntegration:
    """Verify comparators work with real project data."""

    def test_tabular_comparator_with_golden_records(self):
        from qa.comparators.tabular import compare_tabular
        root = get_project_root()
        golden_file = root / "workspace" / "reference" / "product_golden.json"
        if not golden_file.exists():
            pytest.skip("Golden records not generated")
        data = json.loads(golden_file.read_text())
        records = data.get("records", [])
        if not records:
            pytest.skip("No records in golden file")
        # Compare data with itself — should have no changes
        simple = [{"golden_id": r["golden_id"], "confidence_score": r.get("confidence_score", 1.0)}
                  for r in records]
        result = compare_tabular(simple, simple, key="golden_id")
        assert result["changed"] == []
        assert result["added"] == []
        assert result["removed"] == []
