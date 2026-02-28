"""Tests for test discovery (convention, AST import, affected)."""
from unittest.mock import patch


from qa.discovery.convention import convention_map
from qa.discovery.imports import find_tests_by_import, path_to_module
from qa.discovery.affected import resolve_affected_tests


class TestConventionMap:
    def test_service_to_test(self):
        result = convention_map("backend/services/reference_service.py")
        assert "tests/test_reference_service.py" in result

    def test_api_to_test(self):
        result = convention_map("backend/api/reference.py")
        assert "tests/test_reference_api.py" in result

    def test_model_to_test(self):
        result = convention_map("backend/models/medallion.py")
        assert "tests/test_medallion.py" in result

    def test_engine_to_test(self):
        result = convention_map("backend/engine/calculation_engine.py")
        assert "tests/test_calculation_engine.py" in result

    def test_test_file_maps_to_self(self):
        result = convention_map("tests/test_reference_models.py")
        assert "tests/test_reference_models.py" in result

    def test_frontend_file_returns_empty(self):
        result = convention_map("frontend/src/views/Dashboard/index.tsx")
        assert result == []

    def test_nonexistent_source_returns_empty(self):
        result = convention_map("backend/services/does_not_exist_xyz.py")
        assert result == []

    def test_db_explicit_mapping(self):
        result = convention_map("backend/db.py")
        assert "tests/test_db.py" in result

    def test_calculation_engine_maps_to_multiple(self):
        result = convention_map("backend/engine/calculation_engine.py")
        assert len(result) >= 2  # test_calculation_engine + layer tests


class TestImportAnalysis:
    def test_finds_tests_importing_reference_service(self):
        result = find_tests_by_import("backend.services.reference_service")
        assert any("test_reference_service" in t for t in result)

    def test_finds_tests_importing_db(self):
        result = find_tests_by_import("backend.db")
        assert len(result) >= 1

    def test_nonexistent_module_returns_empty(self):
        result = find_tests_by_import("backend.services.totally_fake_xyz")
        assert result == []

    def test_partial_module_match(self):
        result = find_tests_by_import("backend.services")
        assert len(result) >= 5


class TestPathToModule:
    def test_service_path(self):
        assert path_to_module("backend/services/reference_service.py") == "backend.services.reference_service"

    def test_api_path(self):
        assert path_to_module("backend/api/reference.py") == "backend.api.reference"


class TestAffectedDiscovery:
    def test_resolve_affected_from_service_change(self):
        with patch("qa.discovery.affected.get_changed_files") as mock:
            mock.return_value = ["backend/services/reference_service.py"]
            result = resolve_affected_tests()
            assert any("test_reference_service" in t for t in result)

    def test_resolve_affected_empty_changes(self):
        with patch("qa.discovery.affected.get_changed_files") as mock:
            mock.return_value = []
            result = resolve_affected_tests()
            assert result == []

    def test_resolve_deduplicates(self):
        with patch("qa.discovery.affected.get_changed_files") as mock:
            mock.return_value = [
                "backend/services/reference_service.py",
                "tests/test_reference_service.py",
            ]
            result = resolve_affected_tests()
            assert result.count("tests/test_reference_service.py") == 1
