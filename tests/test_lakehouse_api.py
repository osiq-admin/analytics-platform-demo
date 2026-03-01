"""Tests for Lakehouse REST API endpoints."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.models.lakehouse import (
    IcebergSnapshot,
    IcebergTableInfo,
    IcebergTierConfig,
    MaterializedViewConfig,
    PipelineRun,
    SchemaEvolution,
    SchemaField,
)
from backend.models.governance import DataClassification, PIIRegistry
from backend.models.calculation_optimization import CalcResultLog


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# 1. Config endpoint
# ---------------------------------------------------------------------------

class TestConfigEndpoint:
    def test_config_returns_environment(self, client):
        resp = client.get("/api/lakehouse/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "environment" in data
        assert "tier_config" in data
        assert "lakehouse_available" in data

    def test_config_loads_yaml_if_exists(self, client, tmp_path):
        """Config endpoint should at minimum return the environment."""
        resp = client.get("/api/lakehouse/config")
        assert resp.status_code == 200
        assert resp.json()["environment"] == "local"


# ---------------------------------------------------------------------------
# 2. Tables endpoints
# ---------------------------------------------------------------------------

class TestTablesEndpoints:
    def test_tables_without_lakehouse(self, client):
        """Without lakehouse initialized, returns 503."""
        resp = client.get("/api/lakehouse/tables")
        assert resp.status_code == 503

    def test_tables_with_lakehouse(self, client):
        """With mock lakehouse, returns tier-grouped tables."""
        mock_lh = MagicMock()
        mock_lh._tier_config = IcebergTierConfig(
            iceberg_tiers=["silver", "gold"], non_iceberg_tiers=[]
        )
        mock_lh.list_tables.side_effect = lambda tier: ["execution", "order"] if tier == "silver" else ["alerts"]
        app.state.lakehouse = mock_lh
        try:
            resp = client.get("/api/lakehouse/tables")
            assert resp.status_code == 200
            data = resp.json()
            assert "silver" in data
            assert "gold" in data
        finally:
            del app.state.lakehouse

    def test_table_info_not_found(self, client):
        mock_lh = MagicMock()
        mock_lh.table_exists.return_value = False
        app.state.lakehouse = mock_lh
        try:
            resp = client.get("/api/lakehouse/tables/silver/nonexistent")
            assert resp.status_code == 404
        finally:
            del app.state.lakehouse

    def test_table_info_found(self, client):
        mock_lh = MagicMock()
        mock_lh.table_exists.return_value = True
        mock_lh.get_table_info.return_value = IcebergTableInfo(
            namespace="default",
            table_name="execution",
            tier="silver",
            schema_fields=[SchemaField(field_id=1, name="exec_id", type_str="string", required=True)],
            snapshot_count=3,
            current_snapshot_id=123,
            total_records=100,
            total_size_bytes=1024,
        )
        app.state.lakehouse = mock_lh
        try:
            resp = client.get("/api/lakehouse/tables/silver/execution")
            assert resp.status_code == 200
            data = resp.json()
            assert data["table_name"] == "execution"
            assert data["total_records"] == 100
        finally:
            del app.state.lakehouse

    def test_snapshots_endpoint(self, client):
        mock_lh = MagicMock()
        mock_lh.table_exists.return_value = True
        mock_lh.list_snapshots.return_value = [
            IcebergSnapshot(snapshot_id=1, timestamp="2026-03-01T00:00:00", operation="append", summary={}),
            IcebergSnapshot(snapshot_id=2, timestamp="2026-03-01T01:00:00", operation="overwrite", summary={}),
        ]
        app.state.lakehouse = mock_lh
        try:
            resp = client.get("/api/lakehouse/tables/silver/execution/snapshots")
            assert resp.status_code == 200
            assert len(resp.json()) == 2
        finally:
            del app.state.lakehouse


# ---------------------------------------------------------------------------
# 3. Governance endpoints
# ---------------------------------------------------------------------------

class TestGovernanceEndpoints:
    def test_pii_registry_without_service(self, client):
        resp = client.get("/api/lakehouse/governance/pii-registry")
        assert resp.status_code == 503

    def test_pii_registry_with_service(self, client):
        mock_gov = MagicMock()
        mock_gov.load_pii_registry.return_value = PIIRegistry(
            registry_version="1.0",
            entities={}
        )
        app.state.governance = mock_gov
        try:
            resp = client.get("/api/lakehouse/governance/pii-registry")
            assert resp.status_code == 200
            assert resp.json()["registry_version"] == "1.0"
        finally:
            del app.state.governance

    def test_classification_without_services(self, client):
        resp = client.get("/api/lakehouse/governance/classification")
        assert resp.status_code == 503


# ---------------------------------------------------------------------------
# 4. Calculation audit endpoints
# ---------------------------------------------------------------------------

class TestCalcEndpoints:
    def test_calc_stats_without_service(self, client):
        resp = client.get("/api/lakehouse/calc/stats")
        assert resp.status_code == 503

    def test_calc_stats_with_service(self, client):
        mock_svc = MagicMock()
        mock_svc.get_execution_stats.return_value = {
            "total_executions": 10,
            "skipped": 3,
            "success": 7,
            "error": 0,
            "skip_rate": 30.0,
        }
        app.state.calc_results = mock_svc
        try:
            resp = client.get("/api/lakehouse/calc/stats")
            assert resp.status_code == 200
            assert resp.json()["skip_rate"] == 30.0
        finally:
            del app.state.calc_results

    def test_result_log(self, client):
        mock_svc = MagicMock()
        mock_svc.get_result_log.return_value = []
        app.state.calc_results = mock_svc
        try:
            resp = client.get("/api/lakehouse/calc/result-log")
            assert resp.status_code == 200
            assert resp.json() == []
        finally:
            del app.state.calc_results

    def test_lineage(self, client):
        mock_svc = MagicMock()
        mock_svc.get_lineage_chain.return_value = []
        app.state.calc_results = mock_svc
        try:
            resp = client.get("/api/lakehouse/calc/lineage/run-123")
            assert resp.status_code == 200
        finally:
            del app.state.calc_results


# ---------------------------------------------------------------------------
# 5. Pipeline runs endpoints
# ---------------------------------------------------------------------------

class TestRunEndpoints:
    def test_runs_without_service(self, client):
        resp = client.get("/api/lakehouse/runs")
        assert resp.status_code == 503

    def test_runs_with_service(self, client):
        mock_svc = MagicMock()
        mock_svc.get_run_history.return_value = []
        app.state.run_versioning = mock_svc
        try:
            resp = client.get("/api/lakehouse/runs")
            assert resp.status_code == 200
            assert resp.json() == []
        finally:
            del app.state.run_versioning

    def test_run_not_found(self, client):
        mock_svc = MagicMock()
        mock_svc.get_run.return_value = None
        app.state.run_versioning = mock_svc
        try:
            resp = client.get("/api/lakehouse/runs/nonexistent")
            assert resp.status_code == 404
        finally:
            del app.state.run_versioning


# ---------------------------------------------------------------------------
# 6. Materialized views endpoints
# ---------------------------------------------------------------------------

class TestMVEndpoints:
    def test_mv_status_without_service(self, client):
        resp = client.get("/api/lakehouse/materialized-views")
        assert resp.status_code == 503

    def test_mv_status_with_service(self, client):
        mock_svc = MagicMock()
        mock_svc.get_mv_status.return_value = [
            {"mv_id": "dashboard_stats", "status": "pending"},
        ]
        app.state.mvs = mock_svc
        try:
            resp = client.get("/api/lakehouse/materialized-views")
            assert resp.status_code == 200
            assert len(resp.json()) == 1
        finally:
            del app.state.mvs

    def test_mv_refresh(self, client):
        mock_svc = MagicMock()
        mock_svc.refresh_all.return_value = {"dashboard_stats": {"status": "success", "record_count": 1}}
        app.state.mvs = mock_svc
        try:
            resp = client.post("/api/lakehouse/materialized-views/refresh")
            assert resp.status_code == 200
            assert "dashboard_stats" in resp.json()
        finally:
            del app.state.mvs
