"""Tests for sandbox service — what-if threshold testing."""
import pytest

from backend.models.analytics_tiers import SandboxOverride
from backend.services.metadata_service import MetadataService
from backend.services.sandbox_service import SandboxService


@pytest.fixture
def service(tmp_path):
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    (workspace / "metadata").mkdir()
    ms = MetadataService(workspace)
    return SandboxService(workspace, ms)


class TestCreateSandbox:
    def test_create_sandbox(self, service):
        sbx = service.create_sandbox("Test Sandbox", "A test sandbox")
        assert sbx.sandbox_id == "SBX-0001"
        assert sbx.name == "Test Sandbox"
        assert sbx.description == "A test sandbox"
        assert sbx.status == "created"
        assert sbx.created_at != ""
        assert sbx.updated_at != ""

    def test_create_sequential_ids(self, service):
        s1 = service.create_sandbox("First")
        s2 = service.create_sandbox("Second")
        assert s1.sandbox_id == "SBX-0001"
        assert s2.sandbox_id == "SBX-0002"


class TestConfigureSandbox:
    def test_configure_sandbox_with_overrides(self, service):
        sbx = service.create_sandbox("Config Test")
        overrides = [
            SandboxOverride(
                setting_id="mpr_score_threshold",
                original_value=30.0,
                sandbox_value=25.0,
            ),
            SandboxOverride(
                setting_id="wash_time_window_minutes",
                original_value=60,
                sandbox_value=90,
            ),
        ]
        result = service.configure_sandbox(sbx.sandbox_id, overrides)
        assert result is not None
        assert result.status == "configured"
        assert len(result.overrides) == 2
        assert result.overrides[0].setting_id == "mpr_score_threshold"
        assert result.overrides[0].sandbox_value == 25.0

    def test_configure_nonexistent_returns_none(self, service):
        assert service.configure_sandbox("SBX-9999", []) is None


class TestRunSandbox:
    def test_run_sandbox(self, service):
        sbx = service.create_sandbox("Run Test")
        overrides = [
            SandboxOverride(
                setting_id="mpr_score_threshold",
                original_value=30.0,
                sandbox_value=20.0,
            ),
        ]
        service.configure_sandbox(sbx.sandbox_id, overrides)
        result = service.run_sandbox(sbx.sandbox_id)
        assert result is not None
        assert result.status == "completed"
        assert "production_alerts" in result.results_summary
        assert "sandbox_alerts" in result.results_summary
        assert "score_shift_avg" in result.results_summary
        assert "overrides_applied" in result.results_summary
        assert result.results_summary["overrides_applied"] == 1

    def test_run_nonexistent_returns_none(self, service):
        assert service.run_sandbox("SBX-9999") is None


class TestCompareSandbox:
    def test_compare_sandbox(self, service):
        sbx = service.create_sandbox("Compare Test")
        overrides = [
            SandboxOverride(
                setting_id="mpr_score_threshold",
                original_value=30.0,
                sandbox_value=15.0,
            ),
        ]
        service.configure_sandbox(sbx.sandbox_id, overrides)
        service.run_sandbox(sbx.sandbox_id)
        comparison = service.compare_sandbox(sbx.sandbox_id)
        assert comparison is not None
        assert comparison.sandbox_id == sbx.sandbox_id
        assert isinstance(comparison.production_alerts, int)
        assert isinstance(comparison.sandbox_alerts, int)
        assert isinstance(comparison.alerts_added, int)
        assert isinstance(comparison.alerts_removed, int)
        assert isinstance(comparison.score_shift_avg, float)
        # Either alerts_added or alerts_removed should be non-negative
        assert comparison.alerts_added >= 0
        assert comparison.alerts_removed >= 0

    def test_compare_without_run_returns_none(self, service):
        sbx = service.create_sandbox("No Run")
        assert service.compare_sandbox(sbx.sandbox_id) is None

    def test_compare_nonexistent_returns_none(self, service):
        assert service.compare_sandbox("SBX-9999") is None


class TestDiscardSandbox:
    def test_discard_sandbox(self, service):
        sbx = service.create_sandbox("Discard Test")
        assert service.discard_sandbox(sbx.sandbox_id) is True
        # Verify status persisted
        sandboxes = service.list_sandboxes()
        assert sandboxes[0].status == "discarded"

    def test_discard_nonexistent_returns_false(self, service):
        assert service.discard_sandbox("SBX-9999") is False


class TestListSandboxes:
    def test_list_empty(self, service):
        assert service.list_sandboxes() == []

    def test_list_sandboxes(self, service):
        service.create_sandbox("First")
        service.create_sandbox("Second")
        result = service.list_sandboxes()
        assert len(result) == 2
        assert result[0].name == "First"
        assert result[1].name == "Second"


class TestSandboxLifecycle:
    def test_sandbox_lifecycle(self, service):
        """Full lifecycle: create -> configure -> run -> compare -> discard."""
        # Create
        sbx = service.create_sandbox("Lifecycle Test", "Full cycle")
        assert sbx.status == "created"
        assert sbx.sandbox_id == "SBX-0001"

        # Configure
        overrides = [
            SandboxOverride(
                setting_id="mpr_score_threshold",
                original_value=30.0,
                sandbox_value=20.0,
            ),
            SandboxOverride(
                setting_id="insider_score_threshold",
                original_value=25.0,
                sandbox_value=15.0,
            ),
        ]
        configured = service.configure_sandbox(sbx.sandbox_id, overrides)
        assert configured.status == "configured"
        assert len(configured.overrides) == 2

        # Run
        ran = service.run_sandbox(sbx.sandbox_id)
        assert ran.status == "completed"
        assert ran.results_summary["overrides_applied"] == 2

        # Compare
        comparison = service.compare_sandbox(sbx.sandbox_id)
        assert comparison is not None
        assert comparison.sandbox_id == "SBX-0001"
        assert comparison.production_alerts >= 0
        assert comparison.sandbox_alerts >= 0

        # Discard
        assert service.discard_sandbox(sbx.sandbox_id) is True
        sandboxes = service.list_sandboxes()
        assert sandboxes[0].status == "discarded"
