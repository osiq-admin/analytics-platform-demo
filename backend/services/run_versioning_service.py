"""Run versioning service — pipeline run tracking with Iceberg branch lifecycle.

Supports daily, backfill, rerun, and correction run types using the
Write-Audit-Publish pattern via Iceberg branches and tags.
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

from backend.models.lakehouse import PipelineRun

if TYPE_CHECKING:
    from backend.services.lakehouse_service import LakehouseService

log = logging.getLogger(__name__)


class RunVersioningService:
    """Manages pipeline run lifecycle with Iceberg branches for isolation."""

    def __init__(self, workspace: Path, lakehouse: "LakehouseService | None" = None):
        self._workspace = workspace
        self._lakehouse = lakehouse
        self._runs_path = workspace / "metadata" / "governance" / "pipeline_runs.json"
        self._runs: list[PipelineRun] = []
        self._load_runs()

    def start_run(
        self,
        run_type: str,
        entities: list[str],
        parameters: dict | None = None,
        parent_run_id: str | None = None,
    ) -> PipelineRun:
        """Start a new pipeline run. Creates Iceberg branch for non-daily runs."""
        now = datetime.now()
        seq = sum(1 for r in self._runs if r.run_type == run_type and r.started_at.date() == now.date()) + 1
        run_id = f"{run_type}-{now.strftime('%Y%m%d')}-{seq:03d}"

        branch_name = None
        if run_type in ("backfill", "rerun", "correction"):
            branch_name = f"{run_type}-{now.strftime('%Y%m%d')}-{seq:03d}"

        run = PipelineRun(
            run_id=run_id,
            run_type=run_type,
            status="running",
            branch_name=branch_name,
            started_at=now,
            entities_processed=entities,
            parameters=parameters or {},
            parent_run_id=parent_run_id,
        )
        self._runs.append(run)
        self._save_runs()

        if branch_name and self._lakehouse:
            self._create_branches(run)

        log.info("Started pipeline run %s (type=%s, entities=%s)", run_id, run_type, entities)
        return run

    def tag_run_completion(self, run: PipelineRun) -> None:
        """Tag run as published and create Iceberg snapshot tags."""
        run.status = "published"
        run.completed_at = datetime.now()
        run.tag_name = f"run-{run.run_id}"

        if self._lakehouse:
            for tier in run.tiers_affected:
                for table_name in self._lakehouse.list_tables(tier):
                    try:
                        self._lakehouse.tag_snapshot(tier, table_name, run.tag_name)
                    except Exception:
                        log.warning("Could not tag %s.%s for run %s", tier, table_name, run.run_id)

        self._save_runs()
        log.info("Run %s published with tag %s", run.run_id, run.tag_name)

    def merge_branch(self, run: PipelineRun) -> None:
        """Fast-forward merge a branch run back to main (simulated for demo)."""
        if not run.branch_name:
            return

        run.status = "published"
        run.completed_at = datetime.now()

        if self._lakehouse:
            for tier in run.tiers_affected:
                for table_name in self._lakehouse.list_tables(tier):
                    try:
                        self._lakehouse.remove_branch(tier, table_name, run.branch_name)
                    except Exception:
                        log.warning("Could not remove branch %s from %s.%s", run.branch_name, tier, table_name)

        self._save_runs()
        log.info("Run %s branch %s merged and removed", run.run_id, run.branch_name)

    def rollback_run(self, run: PipelineRun) -> None:
        """Mark a run as rolled back and clean up branches."""
        run.status = "rolled_back"
        run.completed_at = datetime.now()

        if run.branch_name and self._lakehouse:
            for tier in run.tiers_affected:
                for table_name in self._lakehouse.list_tables(tier):
                    try:
                        self._lakehouse.remove_branch(tier, table_name, run.branch_name)
                    except Exception:
                        pass

        self._save_runs()
        log.info("Run %s rolled back", run.run_id)

    def fail_run(self, run: PipelineRun, error: str = "") -> None:
        """Mark a run as failed."""
        run.status = "failed"
        run.completed_at = datetime.now()
        run.parameters["error"] = error
        self._save_runs()
        log.info("Run %s failed: %s", run.run_id, error)

    def get_run_history(self) -> list[PipelineRun]:
        return list(self._runs)

    def get_run(self, run_id: str) -> PipelineRun | None:
        for run in self._runs:
            if run.run_id == run_id:
                return run
        return None

    def _create_branches(self, run: PipelineRun) -> None:
        if not self._lakehouse or not run.branch_name:
            return
        for tier in run.tiers_affected:
            for table_name in self._lakehouse.list_tables(tier):
                try:
                    self._lakehouse.create_branch(tier, table_name, run.branch_name)
                except Exception:
                    log.warning("Could not create branch %s on %s.%s", run.branch_name, tier, table_name)

    def _load_runs(self) -> None:
        if self._runs_path.exists():
            with open(self._runs_path) as f:
                data = json.load(f)
            self._runs = [PipelineRun(**item) for item in data]

    def _save_runs(self) -> None:
        self._runs_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._runs_path, "w") as f:
            json.dump([r.model_dump(mode="json") for r in self._runs], f, indent=2, default=str)
