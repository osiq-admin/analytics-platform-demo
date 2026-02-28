"""Tests for quality runner."""
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from qa.runners.quality_runner import (
    run_tool,
    get_enabled_tools,
    create_quality_dir,
)


class TestGetEnabledTools:
    def test_returns_enabled_python_tools(self):
        tools = get_enabled_tools(category="python")
        # ruff, bandit, radon, vulture, coverage should be enabled by default
        tool_names = [t["name"] for t in tools]
        assert "ruff" in tool_names
        assert "bandit" in tool_names

    def test_filters_disabled_tools(self):
        tools = get_enabled_tools(category="typescript")
        # eslint is disabled by default
        tool_names = [t["name"] for t in tools]
        assert "eslint" not in tool_names


class TestCreateQualityDir:
    def test_creates_timestamped_dir(self, tmp_path):
        d = create_quality_dir(tmp_path)
        assert d.exists()
        latest = tmp_path / "LATEST"
        assert latest.is_symlink()


class TestRunTool:
    def test_run_returns_result_dict(self):
        result = run_tool("echo", ["echo", "hello"], timeout=10)
        assert result["return_code"] == 0
        assert "hello" in result["stdout"]

    def test_run_captures_failure(self):
        result = run_tool("false", ["false"], timeout=10)
        assert result["return_code"] != 0

    def test_run_handles_timeout(self):
        result = run_tool("sleep", ["sleep", "60"], timeout=1)
        assert result["timed_out"] is True
