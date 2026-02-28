# tests/test_medallion.py
"""Tests for medallion architecture metadata."""
import json
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend import config


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def workspace(tmp_path):
    """Minimal workspace with medallion metadata."""
    ws = tmp_path / "workspace"
    # Required base dirs for app startup
    for d in ["entities", "calculations/transaction", "calculations/time_windows",
              "calculations/derived", "calculations/aggregations",
              "settings/thresholds", "settings/score_steps", "settings/score_thresholds",
              "detection_models", "navigation", "widgets", "format_rules",
              "query_presets", "grids", "view_config", "theme", "workflows",
              "demo", "tours", "standards/iso", "standards/fix", "standards/compliance",
              "mappings", "regulations", "match_patterns", "score_templates"]:
        (ws / "metadata" / d).mkdir(parents=True, exist_ok=True)

    # Navigation (required by app)
    (ws / "metadata" / "navigation" / "main.json").write_text(json.dumps({
        "navigation_id": "main", "groups": []
    }))

    # Medallion tiers
    (ws / "metadata" / "medallion").mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "medallion" / "tiers.json").write_text(json.dumps({
        "tiers": [
            {
                "tier_id": "landing",
                "tier_number": 1,
                "name": "Landing/Staging",
                "purpose": "Raw ingestion zone",
                "data_state": "raw",
                "storage_format": "original",
                "retention_policy": "7_days",
                "quality_gate": "schema_detection",
                "access_level": "data_engineering",
                "mutable": False,
                "append_only": True
            },
            {
                "tier_id": "bronze",
                "tier_number": 2,
                "name": "Bronze",
                "purpose": "Typed, deduplicated, timestamped",
                "data_state": "typed",
                "storage_format": "parquet",
                "retention_policy": "30_days",
                "quality_gate": "type_validation",
                "access_level": "data_engineering",
                "mutable": False,
                "append_only": True
            }
        ]
    }))

    # Contracts dir
    (ws / "metadata" / "medallion" / "contracts").mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "medallion" / "contracts" / "bronze_to_silver_execution.json").write_text(json.dumps({
        "contract_id": "bronze_to_silver_execution",
        "source_tier": "bronze",
        "target_tier": "silver",
        "entity": "execution",
        "description": "Transform raw executions to canonical schema",
        "field_mappings": [
            {"source": "exec_id", "target": "execution_id", "transform": "rename"},
            {"source": "trade_ts", "target": "trade_timestamp", "transform": "parse_iso8601"}
        ],
        "quality_rules": [
            {"rule": "not_null", "fields": ["execution_id", "order_id"]},
            {"rule": "referential_integrity", "field": "order_id", "reference": "order.order_id"}
        ],
        "sla": {"freshness_minutes": 15, "completeness_pct": 99.5},
        "owner": "data-engineering",
        "classification": "confidential"
    }))

    # Transformations dir
    (ws / "metadata" / "medallion" / "transformations").mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "medallion" / "transformations" / "landing_to_bronze_execution.json").write_text(json.dumps({
        "transformation_id": "landing_to_bronze_execution",
        "source_tier": "landing",
        "target_tier": "bronze",
        "entity": "execution",
        "description": "Type-cast and deduplicate raw executions",
        "sql_template": "SELECT DISTINCT CAST(exec_id AS VARCHAR) AS execution_id, CAST(quantity AS DECIMAL) AS quantity FROM landing_execution",
        "parameters": {},
        "quality_checks": ["row_count_nonzero", "no_null_keys"],
        "error_handling": "quarantine"
    }))

    # Pipeline stages
    (ws / "metadata" / "medallion" / "pipeline_stages.json").write_text(json.dumps({
        "stages": [
            {
                "stage_id": "ingest_landing",
                "name": "Ingest to Landing",
                "tier_from": None,
                "tier_to": "landing",
                "order": 1,
                "depends_on": [],
                "entities": ["execution", "order", "product"],
                "parallel": True
            },
            {
                "stage_id": "landing_to_bronze",
                "name": "Landing to Bronze",
                "tier_from": "landing",
                "tier_to": "bronze",
                "order": 2,
                "depends_on": ["ingest_landing"],
                "entities": ["execution", "order", "product"],
                "parallel": True
            }
        ]
    }))

    # Required data dirs
    (ws / "data" / "csv").mkdir(parents=True, exist_ok=True)
    (ws / "data" / "parquet").mkdir(parents=True, exist_ok=True)
    (ws / "results").mkdir(parents=True, exist_ok=True)
    (ws / "alerts" / "traces").mkdir(parents=True, exist_ok=True)

    return ws


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class TestMedallionModels:
    def test_tier_model_parses(self):
        from backend.models.medallion import TierDefinition
        tier = TierDefinition(
            tier_id="landing", tier_number=1, name="Landing",
            purpose="Raw zone", data_state="raw", storage_format="original",
            retention_policy="7_days", quality_gate="schema_detection",
            access_level="data_engineering",
        )
        assert tier.tier_id == "landing"
        assert tier.mutable is False

    def test_data_contract_parses(self):
        from backend.models.medallion import DataContract
        contract = DataContract(
            contract_id="test", source_tier="bronze", target_tier="silver",
            entity="execution", description="Test contract",
        )
        assert contract.contract_id == "test"
        assert contract.quality_rules == []

    def test_transformation_parses(self):
        from backend.models.medallion import TransformationStep
        t = TransformationStep(
            transformation_id="test", source_tier="landing", target_tier="bronze",
            entity="execution", description="Test",
            sql_template="SELECT * FROM x",
        )
        assert t.transformation_id == "test"

    def test_pipeline_stage_parses(self):
        from backend.models.medallion import PipelineStage
        s = PipelineStage(
            stage_id="test", name="Test", tier_to="landing", order=1,
        )
        assert s.stage_id == "test"
        assert s.depends_on == []


# ---------------------------------------------------------------------------
# API tests
# ---------------------------------------------------------------------------

@pytest.fixture
def client(workspace, monkeypatch):
    """Create a test client with the medallion workspace."""
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestMedallionAPI:
    def test_list_tiers(self, client):
        resp = client.get("/api/medallion/tiers")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2  # landing + bronze from fixture
        assert data[0]["tier_id"] == "landing"

    def test_get_tier(self, client):
        resp = client.get("/api/medallion/tiers/landing")
        assert resp.status_code == 200
        assert resp.json()["tier_id"] == "landing"

    def test_get_tier_not_found(self, client):
        resp = client.get("/api/medallion/tiers/nonexistent")
        assert resp.status_code == 404

    def test_list_contracts(self, client):
        resp = client.get("/api/medallion/contracts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    def test_get_contract(self, client):
        resp = client.get("/api/medallion/contracts/bronze_to_silver_execution")
        assert resp.status_code == 200
        assert resp.json()["entity"] == "execution"

    def test_contract_not_found(self, client):
        resp = client.get("/api/medallion/contracts/nonexistent")
        assert resp.status_code == 404

    def test_list_transformations(self, client):
        resp = client.get("/api/medallion/transformations")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_get_transformation(self, client):
        resp = client.get("/api/medallion/transformations/landing_to_bronze_execution")
        assert resp.status_code == 200

    def test_transformation_not_found(self, client):
        resp = client.get("/api/medallion/transformations/nonexistent")
        assert resp.status_code == 404

    def test_list_pipeline_stages(self, client):
        resp = client.get("/api/medallion/pipeline-stages")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_lineage(self, client):
        resp = client.get("/api/medallion/lineage/execution")
        assert resp.status_code == 200
        data = resp.json()
        assert "nodes" in data
        assert "edges" in data

    def test_lineage_unknown_entity(self, client):
        resp = client.get("/api/medallion/lineage/unknown_entity")
        assert resp.status_code == 200
        data = resp.json()
        assert data["nodes"] == []

    def test_get_calc_results_contract(self, workspace, client):
        """GET a Silver-to-Gold calc results contract by ID."""
        contract = {
            "contract_id": "silver_to_gold_calc_results",
            "source_tier": "silver",
            "target_tier": "gold",
            "entity": "calculation_result",
            "description": "Calc results contract",
            "field_mappings": [],
            "quality_rules": [
                {"rule": "not_null", "fields": ["execution_id", "product_id"]},
                {"rule": "range_check", "field": "calculated_value", "min": 0}
            ],
            "sla": {"freshness_minutes": 30, "completeness_pct": 99.5},
            "owner": "surveillance-ops",
            "classification": "internal"
        }
        (workspace / "metadata" / "medallion" / "contracts" / "silver_to_gold_calc_results.json").write_text(
            json.dumps(contract)
        )
        resp = client.get("/api/medallion/contracts/silver_to_gold_calc_results")
        assert resp.status_code == 200
        data = resp.json()
        assert data["entity"] == "calculation_result"
        assert data["source_tier"] == "silver"
        assert data["target_tier"] == "gold"
        assert len(data["quality_rules"]) == 2

    def test_list_contracts_includes_calc_results(self, workspace, client):
        """List contracts endpoint includes the calc results contract."""
        contract = {
            "contract_id": "silver_to_gold_calc_results",
            "source_tier": "silver",
            "target_tier": "gold",
            "entity": "calculation_result",
            "description": "Calc results contract",
        }
        (workspace / "metadata" / "medallion" / "contracts" / "silver_to_gold_calc_results.json").write_text(
            json.dumps(contract)
        )
        resp = client.get("/api/medallion/contracts")
        assert resp.status_code == 200
        data = resp.json()
        contract_ids = [c["contract_id"] for c in data]
        assert "silver_to_gold_calc_results" in contract_ids
