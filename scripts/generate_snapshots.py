"""Generate demo checkpoint snapshots by running the full pipeline step-by-step.

Drives the pipeline through each checkpoint, saving workspace state at each stage:
  pristine      → empty workspace (metadata only, no data/results/alerts)
  data_loaded   → CSV data loaded + Parquet generated
  pipeline_run  → all calculations executed, results in Parquet
  alerts_generated → detection models evaluated, alerts saved
  act1_complete → same as alerts_generated (Act 1 = initial investigation)
  model_deployed → placeholder for Act 2 (user deploys a new model in the UI)
  act2_complete → same as act1_complete (Act 2 work happens interactively)
  final         → full pipeline output (same as alerts_generated)

Each snapshot contains: data/, results/, alerts/, metadata/ directories.
Snapshots are saved to workspace/snapshots/{checkpoint_name}/.

Usage:
    python -m scripts.generate_snapshots [--workspace workspace/]
"""
from __future__ import annotations

import argparse
import logging
import shutil
import sys
from pathlib import Path

from backend.db import DuckDBManager
from backend.engine.calculation_engine import CalculationEngine
from backend.engine.data_loader import DataLoader
from backend.engine.detection_engine import DetectionEngine
from backend.engine.settings_resolver import SettingsResolver
from backend.services.alert_service import AlertService
from backend.services.demo_controller import DemoController
from backend.services.metadata_service import MetadataService

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)


def clear_runtime_dirs(workspace: Path) -> None:
    """Remove data/parquet, results, and alerts — leaves data/csv and metadata intact."""
    for subdir in ["data/parquet", "results", "alerts"]:
        target = workspace / subdir
        if target.exists():
            shutil.rmtree(target)
            log.info("Cleared %s", target)


def save_snapshot(demo: DemoController, name: str) -> None:
    """Save a snapshot and log its size."""
    demo.save_snapshot(name)
    snap_dir = demo._snapshots_dir / name
    file_count = sum(1 for _ in snap_dir.rglob("*") if _.is_file())
    log.info("Saved snapshot '%s': %d files", name, file_count)


def verify_snapshot(demo: DemoController, workspace: Path, name: str) -> bool:
    """Verify a snapshot exists and is restorable by checking its contents."""
    snap_dir = demo._snapshots_dir / name
    if not snap_dir.exists():
        log.error("FAIL: snapshot '%s' does not exist", name)
        return False

    # Check that metadata is always present
    meta_dir = snap_dir / "metadata"
    if not meta_dir.exists():
        log.error("FAIL: snapshot '%s' missing metadata/", name)
        return False

    return True


def verify_snapshot_loadable(
    demo: DemoController,
    workspace: Path,
    name: str,
    expect_data: bool = False,
    expect_results: bool = False,
    expect_alerts: bool = False,
) -> bool:
    """Restore a snapshot and verify expected dirs exist."""
    ok = demo.restore_snapshot(name)
    if not ok:
        log.error("FAIL: could not restore snapshot '%s'", name)
        return False

    # Verify state
    state = demo.get_state()
    if state["current_checkpoint"] != name:
        log.error("FAIL: state mismatch after restoring '%s': got '%s'", name, state["current_checkpoint"])
        return False

    # Verify expected directories
    checks = [
        ("data/csv", expect_data),
        ("results", expect_results),
        ("alerts/traces", expect_alerts),
    ]
    for subdir, should_have_files in checks:
        target = workspace / subdir
        if should_have_files:
            files = list(target.rglob("*")) if target.exists() else []
            actual_files = [f for f in files if f.is_file()]
            if not actual_files:
                log.error("FAIL: snapshot '%s' expected files in %s but found none", name, subdir)
                return False

    log.info("PASS: snapshot '%s' verified", name)
    return True


def generate_snapshots(workspace: Path) -> bool:
    """Run the full pipeline and generate all checkpoint snapshots."""
    demo = DemoController(workspace)
    db = DuckDBManager()
    db.connect(":memory:")

    try:
        # ── 1. Pristine: metadata only, no data/results/alerts ──
        log.info("=" * 60)
        log.info("CHECKPOINT: pristine")
        log.info("=" * 60)

        # Clear runtime artifacts to get a clean slate
        clear_runtime_dirs(workspace)
        # Also clear CSV data for pristine (metadata-only state)
        csv_dir = workspace / "data" / "csv"
        csv_backup = {}
        if csv_dir.exists():
            for f in csv_dir.glob("*.csv"):
                csv_backup[f.name] = f.read_bytes()
                f.unlink()

        save_snapshot(demo, "pristine")

        # Restore CSV files for next steps
        csv_dir.mkdir(parents=True, exist_ok=True)
        for fname, content in csv_backup.items():
            (csv_dir / fname).write_bytes(content)

        # ── 2. Data Loaded: CSV → Parquet → DuckDB ──
        log.info("=" * 60)
        log.info("CHECKPOINT: data_loaded")
        log.info("=" * 60)

        metadata = MetadataService(workspace)
        loader = DataLoader(workspace, db)
        tables = loader.load_all()
        log.info("Loaded %d tables: %s", len(tables), tables)

        save_snapshot(demo, "data_loaded")

        # ── 3. Pipeline Run: all calculations executed ──
        log.info("=" * 60)
        log.info("CHECKPOINT: pipeline_run")
        log.info("=" * 60)

        calc_engine = CalculationEngine(workspace, db, metadata, resolver=SettingsResolver())
        results = calc_engine.run_all()
        log.info("Executed %d calculations", len(results))
        for calc_id, info in results.items():
            log.info("  %s: %d rows → %s", calc_id, info["row_count"], info["table_name"])

        save_snapshot(demo, "pipeline_run")

        # ── 4. Alerts Generated: detection models evaluated ──
        log.info("=" * 60)
        log.info("CHECKPOINT: alerts_generated")
        log.info("=" * 60)

        resolver = SettingsResolver()
        det_engine = DetectionEngine(workspace, db, metadata, resolver)
        alert_service = AlertService(workspace, db, det_engine)

        fired = alert_service.generate_all_alerts()
        log.info("Generated %d fired alerts", len(fired))
        model_counts = {}
        for a in fired:
            model_counts[a.model_id] = model_counts.get(a.model_id, 0) + 1
        for model_id, count in sorted(model_counts.items()):
            log.info("  %s: %d alerts", model_id, count)

        save_snapshot(demo, "alerts_generated")

        # ── 5. Act 1 Complete: same state as alerts_generated ──
        # In the demo flow, Act 1 = "data loaded + pipeline run + alerts generated"
        # The user investigates alerts in the Risk Case Manager.
        log.info("=" * 60)
        log.info("CHECKPOINT: act1_complete")
        log.info("=" * 60)
        save_snapshot(demo, "act1_complete")

        # ── 6. Model Deployed: placeholder for interactive Act 2 ──
        # In the live demo, the user deploys a new/modified detection model.
        # For snapshots, this is the same state — the actual model deployment
        # happens interactively through the UI.
        log.info("=" * 60)
        log.info("CHECKPOINT: model_deployed")
        log.info("=" * 60)
        save_snapshot(demo, "model_deployed")

        # ── 7. Act 2 Complete: same as model_deployed ──
        # Act 2 = the user has deployed a model and reviewed new alerts.
        log.info("=" * 60)
        log.info("CHECKPOINT: act2_complete")
        log.info("=" * 60)
        save_snapshot(demo, "act2_complete")

        # ── 8. Final: complete demo state ──
        log.info("=" * 60)
        log.info("CHECKPOINT: final")
        log.info("=" * 60)
        save_snapshot(demo, "final")

        # ── Verification: restore each snapshot and check integrity ──
        log.info("=" * 60)
        log.info("VERIFICATION")
        log.info("=" * 60)

        all_ok = True
        # Verify existence and structure
        for name in ["pristine", "data_loaded", "pipeline_run", "alerts_generated",
                      "act1_complete", "model_deployed", "act2_complete", "final"]:
            if not verify_snapshot(demo, workspace, name):
                all_ok = False

        # Verify loadability with content expectations
        checks = [
            ("pristine", False, False, False),
            ("data_loaded", True, False, False),
            ("pipeline_run", True, True, False),
            ("alerts_generated", True, True, True),
            ("act1_complete", True, True, True),
            ("final", True, True, True),
        ]
        for name, data, results_present, alerts in checks:
            if not verify_snapshot_loadable(demo, workspace, name, data, results_present, alerts):
                all_ok = False

        if all_ok:
            log.info("All snapshots generated and verified successfully!")
        else:
            log.error("Some snapshots failed verification!")

        return all_ok

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Generate demo checkpoint snapshots")
    parser.add_argument("--workspace", type=Path, default=Path("workspace"),
                        help="Path to workspace directory (default: workspace/)")
    args = parser.parse_args()

    if not args.workspace.exists():
        log.error("Workspace directory not found: %s", args.workspace)
        sys.exit(1)

    if not (args.workspace / "metadata").exists():
        log.error("No metadata directory in workspace: %s", args.workspace)
        sys.exit(1)

    if not (args.workspace / "data" / "csv").exists():
        log.error("No CSV data in workspace. Run 'python -m scripts.generate_data' first.")
        sys.exit(1)

    ok = generate_snapshots(args.workspace)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
