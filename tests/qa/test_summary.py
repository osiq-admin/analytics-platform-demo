"""Tests for summary reporter and quality gate."""
import json


from qa.reporters.summary import (
    load_latest_summary,
    format_summary_text,
)


class TestLoadLatestSummary:
    def test_loads_from_latest_symlink(self, tmp_path):
        runs_dir = tmp_path / "runs"
        run1 = runs_dir / "2026-01-01T00-00-00"
        run1.mkdir(parents=True)
        (run1 / "summary.json").write_text(json.dumps({
            "suite": "backend", "passed": 100, "failed": 0,
            "skipped": 0, "errors": 0, "total": 100,
            "duration_seconds": 5.0, "git_sha": "abc",
        }))
        (runs_dir / "LATEST").symlink_to(run1.name)

        summary = load_latest_summary(runs_dir)
        assert summary["passed"] == 100
        assert summary["suite"] == "backend"

    def test_returns_none_when_no_runs(self, tmp_path):
        runs_dir = tmp_path / "runs"
        runs_dir.mkdir()
        assert load_latest_summary(runs_dir) is None


class TestFormatSummary:
    def test_format_all_passed(self):
        summary = {
            "suite": "backend", "passed": 705, "failed": 0,
            "skipped": 0, "errors": 0, "total": 705,
            "duration_seconds": 12.3, "git_sha": "abc123",
            "git_branch": "main", "run_id": "2026-01-01T00-00-00",
            "timestamp": "2026-01-01T00:00:00Z",
        }
        text = format_summary_text(summary)
        assert "705 passed" in text
        assert "PASS" in text

    def test_format_with_failures(self):
        summary = {
            "suite": "backend", "passed": 700, "failed": 5,
            "skipped": 0, "errors": 0, "total": 705,
            "duration_seconds": 12.3, "git_sha": "abc123",
            "git_branch": "main", "run_id": "2026-01-01T00-00-00",
            "timestamp": "2026-01-01T00:00:00Z",
        }
        text = format_summary_text(summary)
        assert "5 failed" in text
        assert "FAIL" in text
