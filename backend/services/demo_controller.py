"""Demo state machine — manages snapshots for checkpoint-based demo flow."""
import json
import logging
import shutil
from pathlib import Path

log = logging.getLogger(__name__)

CHECKPOINTS = [
    "pristine",
    "data_loaded",
    "pipeline_run",
    "alerts_generated",
    "act1_complete",
    "model_deployed",
    "act2_complete",
    "final",
]


class DemoController:
    def __init__(self, workspace_dir: Path):
        self._workspace = workspace_dir
        self._snapshots_dir = workspace_dir / "snapshots"
        self._state_file = workspace_dir / "demo_state.json"
        self._state = self._load_state()

    def _load_state(self) -> dict:
        if self._state_file.exists():
            return json.loads(self._state_file.read_text())
        return {"current_checkpoint": "pristine", "checkpoint_index": 0}

    def _save_state(self) -> None:
        self._state_file.parent.mkdir(parents=True, exist_ok=True)
        self._state_file.write_text(json.dumps(self._state, indent=2))

    @property
    def current_checkpoint(self) -> str:
        return self._state["current_checkpoint"]

    @property
    def checkpoints(self) -> list[str]:
        return CHECKPOINTS

    def get_state(self) -> dict:
        return {
            "current_checkpoint": self.current_checkpoint,
            "checkpoint_index": self._state["checkpoint_index"],
            "checkpoints": CHECKPOINTS,
        }

    def save_snapshot(self, checkpoint: str | None = None) -> str:
        """Save current workspace state as a snapshot."""
        name = checkpoint or self.current_checkpoint
        snapshot_dir = self._snapshots_dir / name
        if snapshot_dir.exists():
            shutil.rmtree(snapshot_dir)
        snapshot_dir.mkdir(parents=True)

        # Copy data, results, alerts, metadata
        for subdir in ["data", "results", "alerts", "metadata"]:
            src = self._workspace / subdir
            if src.exists():
                shutil.copytree(src, snapshot_dir / subdir, dirs_exist_ok=True)

        log.info("Snapshot saved: %s", name)
        return name

    def restore_snapshot(self, checkpoint: str) -> bool:
        """Restore workspace from a snapshot."""
        snapshot_dir = self._snapshots_dir / checkpoint
        if not snapshot_dir.exists():
            log.warning("Snapshot not found: %s", checkpoint)
            return False

        # Restore data, results, alerts — clear dirs not present in snapshot
        for subdir in ["data", "results", "alerts"]:
            dest = self._workspace / subdir
            src = snapshot_dir / subdir
            if src.exists():
                if dest.exists():
                    shutil.rmtree(dest)
                shutil.copytree(src, dest)
            elif dest.exists():
                shutil.rmtree(dest)

        idx = CHECKPOINTS.index(checkpoint) if checkpoint in CHECKPOINTS else 0
        self._state = {"current_checkpoint": checkpoint, "checkpoint_index": idx}
        self._save_state()
        log.info("Snapshot restored: %s", checkpoint)
        return True

    def reset(self) -> dict:
        """Reset to pristine state."""
        if self.restore_snapshot("pristine"):
            return self.get_state()
        # No pristine snapshot — just reset state
        self._state = {"current_checkpoint": "pristine", "checkpoint_index": 0}
        self._save_state()
        return self.get_state()

    def step(self) -> dict:
        """Advance to the next checkpoint."""
        idx = self._state["checkpoint_index"]
        if idx < len(CHECKPOINTS) - 1:
            idx += 1
            self._state = {
                "current_checkpoint": CHECKPOINTS[idx],
                "checkpoint_index": idx,
            }
            self._save_state()
        return self.get_state()

    def jump_to(self, checkpoint: str) -> dict:
        """Jump to a specific checkpoint (restores snapshot if available)."""
        self.restore_snapshot(checkpoint)
        return self.get_state()

    def skip_to_end(self) -> dict:
        """Jump to the final checkpoint."""
        self.restore_snapshot("final")
        if self.current_checkpoint != "final":
            self._state = {
                "current_checkpoint": "final",
                "checkpoint_index": len(CHECKPOINTS) - 1,
            }
            self._save_state()
        return self.get_state()
