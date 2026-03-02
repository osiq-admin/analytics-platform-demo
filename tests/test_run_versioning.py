"""Tests for RunVersioningService — pipeline runs, branches, tags, rollback."""

import json
from pathlib import Path

import pyarrow as pa
import pytest

from backend.models.lakehouse import IcebergTierConfig, LakehouseConfig
from backend.services.lakehouse_service import LakehouseService
from backend.services.run_versioning_service import RunVersioningService


@pytest.fixture
def rv_workspace(tmp_path):
    ws = tmp_path / "workspace"
    ws.mkdir()
    (ws / "metadata" / "governance").mkdir(parents=True)
    return ws


@pytest.fixture
def rv_lakehouse(tmp_path):
    config = LakehouseConfig(
        catalog={"type": "sql", "uri": f"sqlite:///{tmp_path}/iceberg/catalog.db", "warehouse": f"file://{tmp_path}/iceberg/warehouse"},
    )
    tier_config = IcebergTierConfig(
        iceberg_tiers=["silver", "gold"], non_iceberg_tiers=[], tier_namespace_mapping={"silver": "default", "gold": "default"},
    )
    ws = tmp_path / "workspace"
    ws.mkdir(exist_ok=True)
    (tmp_path / "iceberg").mkdir(exist_ok=True)
    (tmp_path / "iceberg" / "warehouse").mkdir(exist_ok=True)
    return LakehouseService(ws, config, tier_config)


@pytest.fixture
def rv_svc(rv_workspace):
    return RunVersioningService(rv_workspace)


@pytest.fixture
def rv_svc_with_lakehouse(rv_workspace, rv_lakehouse):
    return RunVersioningService(rv_workspace, lakehouse=rv_lakehouse)


class TestStartRun:
    def test_start_daily_run(self, rv_svc):
        run = rv_svc.start_run("daily", ["execution", "order"])
        assert run.run_type == "daily"
        assert run.status == "running"
        assert run.branch_name is None
        assert "execution" in run.entities_processed

    def test_start_backfill_creates_branch(self, rv_svc):
        run = rv_svc.start_run("backfill", ["execution"])
        assert run.branch_name is not None
        assert "backfill" in run.branch_name

    def test_sequential_run_ids(self, rv_svc):
        r1 = rv_svc.start_run("daily", ["a"])
        r2 = rv_svc.start_run("daily", ["b"])
        assert r1.run_id.endswith("-001")
        assert r2.run_id.endswith("-002")

    def test_rerun_with_parent(self, rv_svc):
        parent = rv_svc.start_run("daily", ["execution"])
        rerun = rv_svc.start_run("rerun", ["execution"], parent_run_id=parent.run_id)
        assert rerun.parent_run_id == parent.run_id
        assert rerun.branch_name is not None


class TestRunCompletion:
    def test_tag_run_completion(self, rv_svc):
        run = rv_svc.start_run("daily", ["execution"])
        run.tiers_affected = ["silver", "gold"]
        rv_svc.tag_run_completion(run)
        assert run.status == "published"
        assert run.tag_name is not None
        assert run.completed_at is not None

    def test_merge_branch(self, rv_svc):
        run = rv_svc.start_run("backfill", ["execution"])
        run.tiers_affected = ["silver"]
        rv_svc.merge_branch(run)
        assert run.status == "published"
        assert run.completed_at is not None


class TestRunHistory:
    def test_get_run_history(self, rv_svc):
        rv_svc.start_run("daily", ["a"])
        rv_svc.start_run("backfill", ["b"])
        history = rv_svc.get_run_history()
        assert len(history) == 2

    def test_get_run_by_id(self, rv_svc):
        run = rv_svc.start_run("daily", ["a"])
        found = rv_svc.get_run(run.run_id)
        assert found is not None
        assert found.run_id == run.run_id

    def test_get_run_not_found(self, rv_svc):
        assert rv_svc.get_run("nonexistent") is None

    def test_persistence(self, rv_workspace):
        svc1 = RunVersioningService(rv_workspace)
        svc1.start_run("daily", ["a"])

        svc2 = RunVersioningService(rv_workspace)
        assert len(svc2.get_run_history()) == 1


class TestRollback:
    def test_rollback_run(self, rv_svc):
        run = rv_svc.start_run("backfill", ["execution"])
        run.tiers_affected = ["silver"]
        rv_svc.rollback_run(run)
        assert run.status == "rolled_back"
        assert run.completed_at is not None


class TestFailRun:
    def test_fail_run(self, rv_svc):
        run = rv_svc.start_run("daily", ["execution"])
        rv_svc.fail_run(run, error="data validation failed")
        assert run.status == "failed"
        assert run.parameters["error"] == "data validation failed"
