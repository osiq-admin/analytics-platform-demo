"""Tests for the PipelineOrchestrator service."""
from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest
from starlette.testclient import TestClient

from backend import config
from backend.db import DuckDBManager
from backend.main import app
from backend.models.medallion import PipelineConfig, PipelineStage
from backend.services.pipeline_orchestrator import PipelineOrchestrator


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def mock_db():
    """In-memory DuckDB."""
    manager = DuckDBManager()
    manager.connect(":memory:")
    yield manager
    manager.close()


@pytest.fixture()
def mock_metadata():
    """Mock MetadataService with a silver_to_gold stage and programmatic transformation."""
    meta = MagicMock()

    stage = PipelineStage(
        stage_id="silver_to_gold",
        name="Silver to Gold",
        tier_from="silver",
        tier_to="gold",
        order=4,
        entities=["alert", "calculation_result"],
        transformation_id="silver_to_gold_alerts",
        contract_id="silver_to_gold_alerts",
    )
    meta.load_pipeline_stages.return_value = PipelineConfig(stages=[stage])

    # Transformation with comment-only SQL triggers programmatic path
    mock_transformation = MagicMock()
    mock_transformation.sql_template = "-- programmatic"
    mock_transformation.transformation_id = "silver_to_gold_alerts"
    meta.load_transformation.return_value = mock_transformation

    # No data contract validation by default
    meta.load_data_contract.return_value = None

    # No detection models by default
    meta.list_detection_models.return_value = []

    return meta


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_run_stage_not_found(mock_db, mock_metadata):
    """Empty stages list → stage 'silver_to_gold' not found error."""
    mock_metadata.load_pipeline_stages.return_value = PipelineConfig(stages=[])

    orch = PipelineOrchestrator(
        workspace_dir=MagicMock(),
        db=mock_db,
        metadata=mock_metadata,
    )
    result = orch.run_stage("silver_to_gold")

    assert result.status == "failed"
    assert "not found" in result.error


def test_run_stage_programmatic_no_engines(mock_db, mock_metadata):
    """No calc/detection engines provided → stage still completes with no steps."""
    orch = PipelineOrchestrator(
        workspace_dir=MagicMock(),
        db=mock_db,
        metadata=mock_metadata,
    )
    result = orch.run_stage("silver_to_gold")

    assert result.status == "completed"
    # No calc or detect steps since engines are None
    calc_steps = [s for s in result.steps if s["type"] == "calc"]
    detect_steps = [s for s in result.steps if s["type"] == "detect"]
    assert len(calc_steps) == 0
    assert len(detect_steps) == 0


def test_run_stage_with_calc_engine(mock_db, mock_metadata):
    """Mock calc engine with build_dag/_execute → steps include 'calc:value_calc'."""
    mock_calc = MagicMock()
    mock_calc_def = MagicMock()
    mock_calc_def.calc_id = "value_calc"
    mock_calc.build_dag.return_value = [mock_calc_def]
    mock_calc._execute.return_value = {}

    orch = PipelineOrchestrator(
        workspace_dir=MagicMock(),
        db=mock_db,
        metadata=mock_metadata,
        calc_engine=mock_calc,
    )
    result = orch.run_stage("silver_to_gold")

    assert result.status == "completed"
    calc_steps = [s for s in result.steps if s["type"] == "calc"]
    assert len(calc_steps) == 1
    assert "calc:value_calc" in calc_steps[0]["detail"]


def test_run_stage_with_detection(mock_db, mock_metadata):
    """Mock detection engine → steps include 'detect:wash_full_day'."""
    mock_detect = MagicMock()
    mock_detect.evaluate_model.return_value = []

    mock_model = MagicMock()
    mock_model.model_id = "wash_full_day"
    mock_metadata.list_detection_models.return_value = [mock_model]

    orch = PipelineOrchestrator(
        workspace_dir=MagicMock(),
        db=mock_db,
        metadata=mock_metadata,
        detection_engine=mock_detect,
    )
    result = orch.run_stage("silver_to_gold")

    assert result.status == "completed"
    detect_steps = [s for s in result.steps if s["type"] == "detect"]
    assert len(detect_steps) == 1
    assert "detect:wash_full_day" in detect_steps[0]["detail"]


def test_run_stage_calc_failure_propagates(mock_db, mock_metadata):
    """Calc engine raises Exception → stage fails with error."""
    mock_calc = MagicMock()
    mock_calc.build_dag.side_effect = Exception("DAG cycle detected")

    orch = PipelineOrchestrator(
        workspace_dir=MagicMock(),
        db=mock_db,
        metadata=mock_metadata,
        calc_engine=mock_calc,
    )
    result = orch.run_stage("silver_to_gold")

    assert result.status == "failed"
    assert "DAG cycle detected" in result.error


def test_run_all(mock_db, mock_metadata):
    """run_all executes all stages → completed."""
    orch = PipelineOrchestrator(
        workspace_dir=MagicMock(),
        db=mock_db,
        metadata=mock_metadata,
    )
    run_result = orch.run_all()

    assert run_result.status == "completed"
    assert len(run_result.stages) == 1
    assert run_result.stages[0].stage_id == "silver_to_gold"
    assert run_result.run_id != ""


def test_run_stage_records_timing(mock_db, mock_metadata):
    """started_at and completed_at are non-empty ISO timestamps."""
    orch = PipelineOrchestrator(
        workspace_dir=MagicMock(),
        db=mock_db,
        metadata=mock_metadata,
    )
    result = orch.run_stage("silver_to_gold")

    assert result.started_at != ""
    assert result.completed_at != ""
    assert result.duration_ms >= 0


def test_run_stage_no_transformation(mock_db, mock_metadata):
    """Stage without transformation_id → skips with 'skip' step."""
    stage = PipelineStage(
        stage_id="ingest_landing",
        name="Ingest to Landing",
        tier_to="landing",
        order=1,
    )
    mock_metadata.load_pipeline_stages.return_value = PipelineConfig(stages=[stage])

    orch = PipelineOrchestrator(
        workspace_dir=MagicMock(),
        db=mock_db,
        metadata=mock_metadata,
    )
    result = orch.run_stage("ingest_landing")

    assert result.status == "completed"
    skip_steps = [s for s in result.steps if s["type"] == "skip"]
    assert len(skip_steps) == 1
    assert "no transformation_id" in skip_steps[0]["detail"]


# ---------------------------------------------------------------------------
# API integration tests
# ---------------------------------------------------------------------------

class TestPipelineStageAPI:
    """Integration tests for /api/pipeline/stages endpoints."""

    @pytest.fixture
    def workspace(self, tmp_path):
        """Minimal workspace with medallion pipeline stage metadata."""
        ws = tmp_path / "workspace"
        # Required base dirs for app startup
        for d in [
            "entities", "calculations/transaction", "calculations/time_windows",
            "calculations/derived", "calculations/aggregations",
            "settings/thresholds", "settings/score_steps", "settings/score_thresholds",
            "detection_models", "navigation", "widgets", "format_rules",
            "query_presets", "grids", "view_config", "theme", "workflows",
            "demo", "tours", "standards/iso", "standards/fix", "standards/compliance",
            "mappings", "regulations", "match_patterns", "score_templates",
            "connectors",
        ]:
            (ws / "metadata" / d).mkdir(parents=True, exist_ok=True)

        # Navigation (required by app)
        (ws / "metadata" / "navigation" / "main.json").write_text(json.dumps({
            "navigation_id": "main", "groups": []
        }))

        # Medallion dirs
        (ws / "metadata" / "medallion").mkdir(parents=True, exist_ok=True)
        (ws / "metadata" / "medallion" / "transformations").mkdir(parents=True, exist_ok=True)
        (ws / "metadata" / "medallion" / "contracts").mkdir(parents=True, exist_ok=True)

        # Pipeline stages with a silver_to_gold stage
        (ws / "metadata" / "medallion" / "pipeline_stages.json").write_text(json.dumps({
            "stages": [
                {
                    "stage_id": "silver_to_gold",
                    "name": "Silver to Gold",
                    "tier_from": "silver",
                    "tier_to": "gold",
                    "order": 4,
                    "depends_on": ["bronze_to_silver"],
                    "entities": ["alert", "calculation_result"],
                    "parallel": False,
                    "transformation_id": "silver_to_gold_alerts",
                    "contract_id": "silver_to_gold_alerts",
                }
            ]
        }))

        # Transformation with comment-only SQL (triggers programmatic path)
        (ws / "metadata" / "medallion" / "transformations" / "silver_to_gold_alerts.json").write_text(json.dumps({
            "transformation_id": "silver_to_gold_alerts",
            "source_tier": "silver",
            "target_tier": "gold",
            "entity": "alert",
            "description": "Programmatic: run calc + detection engines",
            "sql_template": "-- programmatic: handled by calc + detection engines",
            "parameters": {},
            "quality_checks": [],
            "error_handling": "fail",
        }))

        # Required data dirs
        (ws / "data" / "csv").mkdir(parents=True, exist_ok=True)
        (ws / "data" / "parquet").mkdir(parents=True, exist_ok=True)
        (ws / "results").mkdir(parents=True, exist_ok=True)
        (ws / "alerts" / "traces").mkdir(parents=True, exist_ok=True)

        return ws

    @pytest.fixture
    def client(self, workspace, monkeypatch):
        """Create a test client with the pipeline workspace."""
        monkeypatch.setattr(config.settings, "workspace_dir", workspace)
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc

    def test_list_stages(self, client):
        """GET /api/pipeline/stages returns 200 with at least 1 stage."""
        resp = client.get("/api/pipeline/stages")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["stage_id"] == "silver_to_gold"

    def test_run_stage_completes(self, client):
        """POST /api/pipeline/stages/silver_to_gold/run returns 200 with valid status."""
        resp = client.post("/api/pipeline/stages/silver_to_gold/run")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("completed", "failed")

    def test_run_stage_not_found(self, client):
        """POST /api/pipeline/stages/nonexistent/run returns 200 with failed status."""
        resp = client.post("/api/pipeline/stages/nonexistent/run")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "failed"
        assert "not found" in data["error"].lower()

    def test_run_stage_returns_timing(self, client):
        """Response includes duration_ms, started_at, completed_at keys."""
        resp = client.post("/api/pipeline/stages/silver_to_gold/run")
        assert resp.status_code == 200
        data = resp.json()
        assert "duration_ms" in data
        assert "started_at" in data
        assert "completed_at" in data
