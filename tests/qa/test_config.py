"""Tests for QA toolkit configuration."""

import pytest

from qa.config import load_config, get_project_root, get_reports_dir


class TestConfigLoader:
    def test_load_qa_config(self):
        cfg = load_config("qa")
        assert "project" in cfg
        assert "quality_gate" in cfg
        assert "reports" in cfg

    def test_load_comparison_config(self):
        cfg = load_config("comparison")
        assert "scopes" in cfg
        assert "blast_radius_groups" in cfg

    def test_load_tools_config(self):
        cfg = load_config("tools")
        assert "python" in cfg
        assert "ruff" in cfg["python"]

    def test_load_nonexistent_raises(self):
        with pytest.raises(FileNotFoundError):
            load_config("nonexistent")

    def test_project_root_is_repo_root(self):
        root = get_project_root()
        assert (root / "backend").is_dir()
        assert (root / "frontend").is_dir()

    def test_reports_dir(self):
        reports = get_reports_dir()
        assert str(reports).endswith("qa/reports")

    def test_qa_json_has_required_keys(self):
        cfg = load_config("qa")
        assert cfg["project"]["test_command"] == "uv run pytest"
        assert cfg["quality_gate"]["tests_must_pass"] is True
        assert cfg["flaky_detection"]["window_size"] == 20

    def test_comparison_scopes_are_valid(self):
        cfg = load_config("comparison")
        for scope_id, scope in cfg["scopes"].items():
            assert "type" in scope
            assert scope["type"] in ("tabular", "calculation", "detection")
            assert "key" in scope or scope["type"] != "tabular"

    def test_tools_have_command_and_targets(self):
        cfg = load_config("tools")
        for tool_name, tool_cfg in cfg["python"].items():
            assert "enabled" in tool_cfg
            assert "command" in tool_cfg or "command_cc" in tool_cfg
