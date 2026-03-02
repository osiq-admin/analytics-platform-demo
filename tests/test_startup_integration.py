"""Integration test: FastAPI app startup loads CSV data into DuckDB.

This test catches the bug where backend/db.py lifespan failed to call
_load_data(), leaving DuckDB empty after restart.
"""

import json

import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app


@pytest.fixture
def workspace_with_csv(tmp_path):
    """Workspace with a CSV file that should be loaded at startup."""
    ws = tmp_path / "workspace"
    for d in [
        "metadata/entities",
        "metadata/calculations/transaction",
        "metadata/calculations/time_windows",
        "metadata/calculations/derived",
        "metadata/calculations/aggregations",
        "metadata/settings/thresholds",
        "metadata/settings/score_steps",
        "metadata/settings/score_thresholds",
        "metadata/detection_models",
        "metadata/navigation",
        "metadata/widgets",
        "metadata/format_rules",
        "metadata/query_presets",
        "metadata/grids",
        "metadata/view_config",
        "metadata/theme",
        "metadata/workflows",
        "metadata/demo",
        "metadata/tours",
        "metadata/standards/iso",
        "metadata/standards/fix",
        "metadata/standards/compliance",
        "metadata/mappings",
        "metadata/regulations",
        "metadata/match_patterns",
        "metadata/score_templates",
        "metadata/medallion",
        "metadata/quality",
        "metadata/reference",
        "metadata/governance",
        "metadata/_audit",
    ]:
        (ws / d).mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "navigation" / "main.json").write_text(
        json.dumps({"navigation_id": "main", "groups": []})
    )
    csv_dir = ws / "data" / "csv"
    csv_dir.mkdir(parents=True)
    (ws / "data" / "parquet").mkdir(parents=True)
    (csv_dir / "trader.csv").write_text(
        "trader_id,trader_name,desk,trader_type\n"
        "T001,Alice Smith,Equities,senior\n"
        "T002,Bob Jones,FX,junior\n"
    )
    return ws


@pytest.fixture
def client(workspace_with_csv, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace_with_csv)
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


class TestStartupDataLoading:
    """Verify the FastAPI lifespan loads CSV data into DuckDB."""

    def test_health_returns_200(self, client):
        """Basic startup health check."""
        r = client.get("/api/health")
        assert r.status_code == 200

    def test_csv_data_queryable_via_sql(self, client):
        """After startup, trader data from CSV should be queryable."""
        r = client.post(
            "/api/query/execute",
            json={"sql": "SELECT count(*) as cnt FROM trader"},
        )
        assert r.status_code == 200
        data = r.json()
        rows = data.get("rows", [])
        assert len(rows) >= 1
        assert rows[0]["cnt"] >= 2, f"Expected at least 2 traders, got {rows[0]['cnt']}"

    def test_parquet_files_created_on_startup(self, workspace_with_csv, client):
        """Startup should create .parquet files from CSV source data."""
        parquet_dir = workspace_with_csv / "data" / "parquet"
        parquet_files = list(parquet_dir.glob("*.parquet"))
        assert len(parquet_files) >= 1, "No parquet files created during startup"
        names = {f.stem for f in parquet_files}
        assert "trader" in names, f"Expected trader.parquet, found: {names}"
