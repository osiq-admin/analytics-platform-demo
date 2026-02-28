"""Tests for the test runner."""
import json
from pathlib import Path

import pytest

from qa.runners.test_runner import (
    create_run_dir,
    parse_pytest_output,
    write_summary,
)


class TestRunDir:
    def test_create_run_dir_creates_timestamped_dir(self, tmp_path):
        run_dir = create_run_dir(tmp_path)
        assert run_dir.exists()
        assert run_dir.is_dir()
        assert len(run_dir.name) >= 19

    def test_create_run_dir_updates_latest_symlink(self, tmp_path):
        run_dir = create_run_dir(tmp_path)
        latest = tmp_path / "LATEST"
        assert latest.is_symlink()
        assert latest.resolve() == run_dir.resolve()

    def test_multiple_runs_update_latest(self, tmp_path):
        run_dir_1 = create_run_dir(tmp_path)
        run_dir_2 = create_run_dir(tmp_path)
        latest = tmp_path / "LATEST"
        assert latest.resolve() == run_dir_2.resolve()


class TestParsePytestOutput:
    def test_parse_all_passed(self):
        output = "===== 705 passed in 12.34s ====="
        result = parse_pytest_output(output, 0)
        assert result["passed"] == 705
        assert result["failed"] == 0
        assert result["total"] == 705

    def test_parse_with_failures(self):
        output = "===== 700 passed, 5 failed in 15.67s ====="
        result = parse_pytest_output(output, 1)
        assert result["passed"] == 700
        assert result["failed"] == 5
        assert result["total"] == 705

    def test_parse_with_skipped(self):
        output = "===== 700 passed, 3 skipped in 10.00s ====="
        result = parse_pytest_output(output, 0)
        assert result["passed"] == 700
        assert result["skipped"] == 3

    def test_parse_with_errors(self):
        output = "===== 2 errors in 1.00s ====="
        result = parse_pytest_output(output, 2)
        assert result["errors"] == 2


class TestWriteSummary:
    def test_writes_valid_json(self, tmp_path):
        run_dir = tmp_path / "run1"
        run_dir.mkdir()
        write_summary(run_dir, "backend", {
            "passed": 10, "failed": 0, "skipped": 0,
            "errors": 0, "total": 10,
        }, 5.0)
        summary_path = run_dir / "summary.json"
        assert summary_path.exists()
        data = json.loads(summary_path.read_text())
        assert data["suite"] == "backend"
        assert data["passed"] == 10
        assert data["duration_seconds"] == 5.0
        assert "git_sha" in data
        assert "timestamp" in data
