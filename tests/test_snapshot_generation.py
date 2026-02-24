"""Tests for the snapshot generation script."""
import shutil
from pathlib import Path

import pytest

from backend.services.demo_controller import CHECKPOINTS, DemoController
from scripts.generate_snapshots import generate_snapshots


@pytest.fixture
def snapshot_workspace(tmp_path):
    """Create a workspace with real metadata and generated CSV data."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy metadata (calculations, settings, detection_models, entities)
    for subdir in ["calculations", "settings", "detection_models", "entities"]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    # Generate CSV data using the data generator
    from scripts.generate_data import SyntheticDataGenerator
    gen = SyntheticDataGenerator(ws, seed=42)
    gen.generate_all()

    return ws


class TestSnapshotGeneration:
    def test_all_snapshots_created(self, snapshot_workspace):
        ok = generate_snapshots(snapshot_workspace)
        assert ok, "Snapshot generation should succeed"

        snap_dir = snapshot_workspace / "snapshots"
        for name in CHECKPOINTS:
            assert (snap_dir / name).exists(), f"Snapshot '{name}' should exist"

    def test_pristine_has_metadata_only(self, snapshot_workspace):
        generate_snapshots(snapshot_workspace)

        snap = snapshot_workspace / "snapshots" / "pristine"
        assert (snap / "metadata").exists(), "Pristine should have metadata"

        # Should NOT have data/csv files
        csv_dir = snap / "data" / "csv"
        csv_files = list(csv_dir.glob("*.csv")) if csv_dir.exists() else []
        assert len(csv_files) == 0, "Pristine should not have CSV data"

    def test_data_loaded_has_csv_and_parquet(self, snapshot_workspace):
        generate_snapshots(snapshot_workspace)

        snap = snapshot_workspace / "snapshots" / "data_loaded"
        csv_dir = snap / "data" / "csv"
        parquet_dir = snap / "data" / "parquet"

        csv_files = list(csv_dir.glob("*.csv"))
        parquet_files = list(parquet_dir.glob("*.parquet"))

        assert len(csv_files) == 7, f"Expected 7 CSV files, got {len(csv_files)}"
        assert len(parquet_files) == 7, f"Expected 7 Parquet files, got {len(parquet_files)}"

    def test_pipeline_run_has_results(self, snapshot_workspace):
        generate_snapshots(snapshot_workspace)

        snap = snapshot_workspace / "snapshots" / "pipeline_run"
        results_dir = snap / "results"
        assert results_dir.exists(), "pipeline_run should have results/"

        parquet_files = list(results_dir.rglob("*.parquet"))
        assert len(parquet_files) >= 10, f"Expected >=10 result files, got {len(parquet_files)}"

    def test_alerts_generated_has_traces(self, snapshot_workspace):
        generate_snapshots(snapshot_workspace)

        snap = snapshot_workspace / "snapshots" / "alerts_generated"
        traces_dir = snap / "alerts" / "traces"
        assert traces_dir.exists(), "alerts_generated should have alerts/traces/"

        trace_files = list(traces_dir.glob("*.json"))
        assert len(trace_files) > 0, "Should have alert trace JSON files"

    def test_final_matches_alerts_generated(self, snapshot_workspace):
        generate_snapshots(snapshot_workspace)

        alerts_snap = snapshot_workspace / "snapshots" / "alerts_generated"
        final_snap = snapshot_workspace / "snapshots" / "final"

        # Both should have the same number of alert traces
        alerts_traces = list((alerts_snap / "alerts" / "traces").glob("*.json"))
        final_traces = list((final_snap / "alerts" / "traces").glob("*.json"))

        assert len(alerts_traces) == len(final_traces), \
            f"final ({len(final_traces)}) should match alerts_generated ({len(alerts_traces)})"

    def test_snapshots_independently_restorable(self, snapshot_workspace):
        generate_snapshots(snapshot_workspace)

        demo = DemoController(snapshot_workspace)

        # Restore each snapshot and verify state
        for name in CHECKPOINTS:
            snap_dir = snapshot_workspace / "snapshots" / name
            if not snap_dir.exists():
                continue
            ok = demo.restore_snapshot(name)
            assert ok, f"Should be able to restore snapshot '{name}'"
            assert demo.current_checkpoint == name

    def test_pristine_restore_clears_alerts(self, snapshot_workspace):
        generate_snapshots(snapshot_workspace)

        demo = DemoController(snapshot_workspace)

        # Restore final (has alerts), then restore pristine (should NOT have alerts)
        demo.restore_snapshot("final")
        traces = list((snapshot_workspace / "alerts" / "traces").rglob("*.json"))
        assert len(traces) > 0, "final should have alerts"

        demo.restore_snapshot("pristine")
        alerts_dir = snapshot_workspace / "alerts"
        if alerts_dir.exists():
            remaining = list(alerts_dir.rglob("*.json"))
            assert len(remaining) == 0, "pristine should have no alert traces"
