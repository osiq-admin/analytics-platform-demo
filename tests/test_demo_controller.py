"""Tests for Demo Controller — state machine, snapshots, reset/step/jump."""

import pytest

from backend.services.demo_controller import DemoController, CHECKPOINTS


@pytest.fixture
def workspace(tmp_path):
    for d in ["data/csv", "results/transaction", "alerts/traces", "metadata/entities", "snapshots"]:
        (tmp_path / d).mkdir(parents=True)
    # Add some dummy data
    (tmp_path / "data/csv/test.csv").write_text("a,b\n1,2\n")
    (tmp_path / "alerts/traces/alert1.json").write_text('{"alert_id":"1"}')
    return tmp_path


@pytest.fixture
def controller(workspace):
    return DemoController(workspace)


class TestDemoState:
    def test_initial_state_is_pristine(self, controller):
        state = controller.get_state()
        assert state["current_checkpoint"] == "pristine"
        assert state["checkpoint_index"] == 0

    def test_checkpoints_list(self, controller):
        assert controller.checkpoints == CHECKPOINTS

    def test_step_advances_checkpoint(self, controller):
        state = controller.step()
        assert state["current_checkpoint"] == "data_loaded"
        assert state["checkpoint_index"] == 1

    def test_step_twice(self, controller):
        controller.step()
        state = controller.step()
        assert state["current_checkpoint"] == "pipeline_run"

    def test_step_at_end_stays(self, controller):
        for _ in range(len(CHECKPOINTS) + 5):
            controller.step()
        assert controller.current_checkpoint == "final"


class TestSnapshots:
    def test_save_and_restore(self, workspace, controller):
        controller.save_snapshot("pristine")
        # Modify workspace
        (workspace / "data/csv/test.csv").write_text("a,b\n3,4\n")
        assert (workspace / "data/csv/test.csv").read_text() == "a,b\n3,4\n"

        # Restore
        controller.restore_snapshot("pristine")
        assert (workspace / "data/csv/test.csv").read_text() == "a,b\n1,2\n"

    def test_restore_nonexistent_returns_false(self, controller):
        assert controller.restore_snapshot("nonexistent") is False

    def test_reset_goes_to_pristine(self, controller):
        controller.step()
        controller.step()
        state = controller.reset()
        assert state["current_checkpoint"] == "pristine"

    def test_skip_to_end(self, controller):
        state = controller.skip_to_end()
        assert state["current_checkpoint"] == "final"


class TestStatePersistence:
    def test_state_persists_to_disk(self, workspace):
        ctrl = DemoController(workspace)
        ctrl.step()
        # New controller reads from disk
        ctrl2 = DemoController(workspace)
        assert ctrl2.current_checkpoint == "data_loaded"

    def test_jump_to_checkpoint(self, controller):
        controller.save_snapshot("alerts_generated")
        controller.step()
        state = controller.jump_to("alerts_generated")
        assert state["current_checkpoint"] == "alerts_generated"
