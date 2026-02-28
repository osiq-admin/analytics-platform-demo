"""Tests for regression detection."""
import json
from pathlib import Path

import pytest

from qa.reporters.regression import analyze_regression, extract_test_names


class TestExtractTestNames:
    def test_extract_from_summary(self, tmp_path):
        run_dir = tmp_path / "run1"
        run_dir.mkdir()
        (run_dir / "summary.json").write_text(json.dumps({
            "passed": 3, "failed": 1, "total": 4,
        }))
        (run_dir / "raw_output.txt").write_text(
            "tests/test_a.py::test_one PASSED\n"
            "tests/test_a.py::test_two PASSED\n"
            "tests/test_b.py::test_three PASSED\n"
            "tests/test_b.py::test_four FAILED\n"
        )
        passed, failed = extract_test_names(run_dir)
        assert "tests/test_a.py::test_one" in passed
        assert "tests/test_b.py::test_four" in failed
        assert len(passed) == 3
        assert len(failed) == 1


class TestAnalyzeRegression:
    def _make_run(self, tmp_path, name, passed_tests, failed_tests):
        run_dir = tmp_path / name
        run_dir.mkdir()
        lines = []
        for t in passed_tests:
            lines.append(f"{t} PASSED")
        for t in failed_tests:
            lines.append(f"{t} FAILED")
        (run_dir / "raw_output.txt").write_text("\n".join(lines))
        (run_dir / "summary.json").write_text(json.dumps({
            "passed": len(passed_tests),
            "failed": len(failed_tests),
            "total": len(passed_tests) + len(failed_tests),
        }))
        return run_dir

    def test_no_regression(self, tmp_path):
        prev = self._make_run(tmp_path, "prev", ["t::a", "t::b"], [])
        curr = self._make_run(tmp_path, "curr", ["t::a", "t::b"], [])
        result = analyze_regression(curr, prev)
        assert result["new_failures"] == []
        assert result["new_passes"] == []

    def test_new_failure_detected(self, tmp_path):
        prev = self._make_run(tmp_path, "prev", ["t::a", "t::b"], [])
        curr = self._make_run(tmp_path, "curr", ["t::a"], ["t::b"])
        result = analyze_regression(curr, prev)
        assert "t::b" in result["new_failures"]

    def test_new_pass_detected(self, tmp_path):
        prev = self._make_run(tmp_path, "prev", ["t::a"], ["t::b"])
        curr = self._make_run(tmp_path, "curr", ["t::a", "t::b"], [])
        result = analyze_regression(curr, prev)
        assert "t::b" in result["new_passes"]

    def test_unchanged_failure_not_regression(self, tmp_path):
        prev = self._make_run(tmp_path, "prev", ["t::a"], ["t::b"])
        curr = self._make_run(tmp_path, "curr", ["t::a"], ["t::b"])
        result = analyze_regression(curr, prev)
        assert result["new_failures"] == []
        assert "t::b" in result["unchanged_failures"]
