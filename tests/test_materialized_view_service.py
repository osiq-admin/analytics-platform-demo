"""Tests for MaterializedViewService — MV config, refresh, status."""

import json
from pathlib import Path

import duckdb
import pytest

from backend.db import DuckDBManager
from backend.services.materialized_view_service import MaterializedViewService


@pytest.fixture
def mv_workspace(tmp_path):
    ws = tmp_path / "workspace"
    ws.mkdir()
    mv_dir = ws / "metadata" / "medallion"
    mv_dir.mkdir(parents=True)
    (mv_dir / "materialized_views.json").write_text(
        json.dumps(
            {
                "materialized_views": [
                    {
                        "mv_id": "test_stats",
                        "source_tier": "silver",
                        "source_tables": ["test_data"],
                        "refresh_strategy": "on_pipeline_complete",
                        "sql_template": "SELECT count(*) as cnt, sum(value) as total FROM test_data",
                        "target_table": "mv_test_stats",
                        "description": "Test stats MV",
                    },
                    {
                        "mv_id": "on_demand_mv",
                        "source_tier": "silver",
                        "source_tables": ["test_data"],
                        "refresh_strategy": "on_demand",
                        "sql_template": "SELECT max(value) as max_val FROM test_data",
                        "target_table": "mv_on_demand",
                        "description": "On-demand MV",
                    },
                ]
            }
        )
    )
    return ws


@pytest.fixture
def mv_db():
    db = DuckDBManager()
    db.connect(":memory:")
    # Create test source data
    cursor = db.cursor()
    cursor.execute("CREATE TABLE test_data (id INTEGER, value DOUBLE)")
    cursor.execute("INSERT INTO test_data VALUES (1, 10.0), (2, 20.0), (3, 30.0)")
    cursor.close()
    yield db
    db.close()


@pytest.fixture
def mv_svc(mv_workspace, mv_db):
    return MaterializedViewService(mv_workspace, db=mv_db)


class TestLoadConfigs:
    def test_load_configs(self, mv_svc):
        configs = mv_svc.load_mv_configs()
        assert len(configs) == 2
        assert configs[0].mv_id == "test_stats"
        assert configs[1].refresh_strategy == "on_demand"

    def test_load_empty_workspace(self, tmp_path):
        ws = tmp_path / "empty_ws"
        ws.mkdir()
        svc = MaterializedViewService(ws)
        assert svc.load_mv_configs() == []


class TestRefresh:
    def test_refresh_single_mv(self, mv_svc):
        result = mv_svc.refresh("test_stats")
        assert result["status"] == "success"
        assert result["record_count"] == 1
        assert result["duration_ms"] >= 0

    def test_refresh_nonexistent(self, mv_svc):
        result = mv_svc.refresh("nonexistent")
        assert result["status"] == "error"

    def test_refresh_all(self, mv_svc):
        results = mv_svc.refresh_all()
        assert len(results) == 2
        assert results["test_stats"]["status"] == "success"
        assert results["on_demand_mv"]["status"] == "success"

    def test_refresh_by_strategy(self, mv_svc):
        results = mv_svc.refresh_by_strategy("on_pipeline_complete")
        assert len(results) == 1
        assert "test_stats" in results

    def test_refreshed_data_queryable(self, mv_svc, mv_db):
        mv_svc.refresh("test_stats")
        cursor = mv_db.cursor()
        result = cursor.execute("SELECT cnt, total FROM mv_test_stats").fetchone()
        cursor.close()
        assert result[0] == 3
        assert result[1] == 60.0


class TestStatus:
    def test_status_before_refresh(self, mv_svc):
        statuses = mv_svc.get_mv_status()
        assert len(statuses) == 2
        assert statuses[0]["status"] == "pending"

    def test_status_after_refresh(self, mv_svc):
        mv_svc.refresh("test_stats")
        statuses = mv_svc.get_mv_status()
        stats_status = next(s for s in statuses if s["mv_id"] == "test_stats")
        assert stats_status["status"] == "success"
        assert stats_status["record_count"] == 1

    def test_status_includes_metadata(self, mv_svc):
        statuses = mv_svc.get_mv_status()
        assert statuses[0]["description"] == "Test stats MV"
        assert statuses[0]["source_tier"] == "silver"


class TestNoDb:
    def test_refresh_without_db(self, mv_workspace):
        svc = MaterializedViewService(mv_workspace)
        result = svc.refresh("test_stats")
        assert result["status"] == "error"
        assert "No DuckDB" in result["error"]
