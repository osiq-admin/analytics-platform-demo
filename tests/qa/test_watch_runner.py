"""Tests for watch runner components."""
import pytest

from qa.runners.watch_runner import resolve_test_files_from_changes


class TestResolveTestFiles:
    def test_resolves_backend_service(self):
        changes = [("modified", "backend/services/reference_service.py")]
        result = resolve_test_files_from_changes(changes)
        assert any("test_reference_service" in f for f in result)

    def test_resolves_test_file_self(self):
        changes = [("modified", "tests/test_db.py")]
        result = resolve_test_files_from_changes(changes)
        assert "tests/test_db.py" in result

    def test_ignores_non_python_files(self):
        changes = [("modified", "frontend/src/App.tsx")]
        result = resolve_test_files_from_changes(changes)
        assert result == []

    def test_deduplicates(self):
        changes = [
            ("modified", "backend/services/reference_service.py"),
            ("modified", "tests/test_reference_service.py"),
        ]
        result = resolve_test_files_from_changes(changes)
        count = sum(1 for f in result if "test_reference_service" in f)
        assert count == 1
