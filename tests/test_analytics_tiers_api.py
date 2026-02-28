"""Tests for Platinum, Sandbox, and Archive tier APIs (M235)."""
import json

import pytest
from fastapi.testclient import TestClient

from backend import config
from backend.main import app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def workspace(tmp_path):
    """Minimal workspace with platinum KPI, sandbox template, and archive policies."""
    ws = tmp_path / "workspace"
    # Required base dirs for app startup
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
    ]:
        (ws / d).mkdir(parents=True, exist_ok=True)

    # Navigation (required by app)
    (ws / "metadata" / "navigation" / "main.json").write_text(
        json.dumps({"navigation_id": "main", "groups": []})
    )

    # Required data dirs
    (ws / "data" / "csv").mkdir(parents=True, exist_ok=True)
    (ws / "data" / "parquet").mkdir(parents=True, exist_ok=True)
    (ws / "results").mkdir(parents=True, exist_ok=True)
    (ws / "alerts" / "traces").mkdir(parents=True, exist_ok=True)

    # --- Platinum KPI definitions ---
    plat_dir = ws / "metadata" / "medallion" / "platinum"
    plat_dir.mkdir(parents=True, exist_ok=True)
    (plat_dir / "alert_volume.json").write_text(
        json.dumps(
            {
                "kpi_id": "alert_volume",
                "name": "Alert Volume by Model",
                "description": "Total alerts per model per period",
                "category": "alert_summary",
                "sql_template": "SELECT model_id, COUNT(*) ...",
                "dimensions": [
                    {"field": "model_id", "label": "Model"},
                    {"field": "asset_class", "label": "Asset Class"},
                ],
                "schedule": "daily",
                "source_tier": "gold",
                "output_format": "json",
            }
        )
    )
    (plat_dir / "model_effectiveness.json").write_text(
        json.dumps(
            {
                "kpi_id": "model_effectiveness",
                "name": "Model Effectiveness",
                "description": "Triggered vs total alerts per model",
                "category": "model_effectiveness",
                "sql_template": "SELECT ...",
                "dimensions": [{"field": "model_id", "label": "Model"}],
                "schedule": "daily",
                "source_tier": "gold",
                "output_format": "json",
            }
        )
    )

    # --- Sandbox template ---
    sbx_dir = ws / "metadata" / "medallion" / "sandbox"
    sbx_dir.mkdir(parents=True, exist_ok=True)
    (sbx_dir / "template.json").write_text(
        json.dumps(
            {
                "tier_id": "sandbox",
                "default_source_tier": "gold",
                "available_overrides": [
                    {
                        "setting_id": "mpr_score_threshold",
                        "label": "MPR Score Threshold",
                        "type": "float",
                        "default": 30.0,
                    },
                    {
                        "setting_id": "wash_time_window_minutes",
                        "label": "Wash Time Window",
                        "type": "int",
                        "default": 60,
                    },
                ],
                "lifecycle_states": [
                    "created",
                    "configured",
                    "running",
                    "completed",
                    "discarded",
                ],
                "max_sandboxes": 5,
                "auto_discard_days": 7,
            }
        )
    )

    # --- Archive policies ---
    arch_dir = ws / "metadata" / "medallion" / "archive"
    arch_dir.mkdir(parents=True, exist_ok=True)
    (arch_dir / "policies.json").write_text(
        json.dumps(
            {
                "tier_id": "archive",
                "policies": [
                    {
                        "policy_id": "mifid2",
                        "regulation": "MiFID II",
                        "retention_years": 7,
                        "data_types": ["order", "execution", "alert"],
                        "description": "Orders, executions, communications",
                        "gdpr_relevant": False,
                        "crypto_shred": False,
                    },
                    {
                        "policy_id": "gdpr",
                        "regulation": "GDPR",
                        "retention_years": 1,
                        "data_types": ["account", "trader"],
                        "description": "PII data",
                        "gdpr_relevant": True,
                        "crypto_shred": True,
                    },
                ],
                "archive_dir": "workspace/archive",
                "default_format": "compressed_parquet",
            }
        )
    )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    """Create a test client with the analytics tiers workspace."""
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


# ---------------------------------------------------------------------------
# Platinum API tests
# ---------------------------------------------------------------------------


class TestPlatinumAPI:
    def test_get_config(self, client):
        """GET /api/platinum/config returns KPI definitions."""
        r = client.get("/api/platinum/config")
        assert r.status_code == 200
        data = r.json()
        assert data["tier_id"] == "platinum"
        assert len(data["kpi_definitions"]) == 2
        kpi_ids = [k["kpi_id"] for k in data["kpi_definitions"]]
        assert "alert_volume" in kpi_ids
        assert "model_effectiveness" in kpi_ids

    def test_list_datasets_empty(self, client):
        """GET /api/platinum/datasets returns empty list before generation."""
        r = client.get("/api/platinum/datasets")
        assert r.status_code == 200
        assert r.json() == []

    def test_generate_creates_datasets(self, client):
        """POST /api/platinum/generate creates datasets for all KPIs."""
        r = client.post("/api/platinum/generate")
        assert r.status_code == 200
        data = r.json()
        assert data["generated"] == 2
        assert len(data["datasets"]) == 2
        kpi_ids = [d["kpi_id"] for d in data["datasets"]]
        assert "alert_volume" in kpi_ids
        assert "model_effectiveness" in kpi_ids
        # Each dataset should have data points
        for ds in data["datasets"]:
            assert ds["record_count"] > 0
            assert len(ds["data_points"]) > 0

    def test_get_dataset(self, client):
        """GET /api/platinum/datasets/{kpi_id} returns a single dataset after generation."""
        # Generate first
        client.post("/api/platinum/generate")
        r = client.get("/api/platinum/datasets/alert_volume")
        assert r.status_code == 200
        data = r.json()
        assert data["kpi_id"] == "alert_volume"
        assert data["name"] == "Alert Volume by Model"
        assert len(data["data_points"]) > 0

    def test_get_dataset_not_found(self, client):
        """GET /api/platinum/datasets/nonexistent returns 404."""
        r = client.get("/api/platinum/datasets/nonexistent")
        assert r.status_code == 404
        assert "error" in r.json()


# ---------------------------------------------------------------------------
# Sandbox API tests
# ---------------------------------------------------------------------------


class TestSandboxAPI:
    def test_get_template(self, client):
        """GET /api/sandbox/template returns available overrides."""
        r = client.get("/api/sandbox/template")
        assert r.status_code == 200
        data = r.json()
        assert data["tier_id"] == "sandbox"
        assert len(data["available_overrides"]) == 2
        setting_ids = [o["setting_id"] for o in data["available_overrides"]]
        assert "mpr_score_threshold" in setting_ids

    def test_create_sandbox(self, client):
        """POST /api/sandbox/create creates a new sandbox."""
        r = client.post(
            "/api/sandbox/create",
            json={"name": "Test Sandbox", "description": "Testing overrides"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["sandbox_id"] == "SBX-0001"
        assert data["name"] == "Test Sandbox"
        assert data["status"] == "created"

    def test_configure_sandbox(self, client):
        """POST /api/sandbox/{id}/configure applies overrides."""
        # Create first
        create_resp = client.post(
            "/api/sandbox/create", json={"name": "Config Test"}
        )
        sid = create_resp.json()["sandbox_id"]

        r = client.post(
            f"/api/sandbox/{sid}/configure",
            json={
                "overrides": [
                    {
                        "setting_id": "mpr_score_threshold",
                        "original_value": 30.0,
                        "sandbox_value": 25.0,
                    }
                ]
            },
        )
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "configured"
        assert len(data["overrides"]) == 1
        assert data["overrides"][0]["sandbox_value"] == 25.0

    def test_run_and_compare(self, client):
        """Full sandbox lifecycle: create -> configure -> run -> compare."""
        # Create
        create_resp = client.post(
            "/api/sandbox/create", json={"name": "Full Lifecycle"}
        )
        sid = create_resp.json()["sandbox_id"]

        # Configure
        client.post(
            f"/api/sandbox/{sid}/configure",
            json={
                "overrides": [
                    {
                        "setting_id": "mpr_score_threshold",
                        "original_value": 30.0,
                        "sandbox_value": 20.0,
                    }
                ]
            },
        )

        # Run
        run_resp = client.post(f"/api/sandbox/{sid}/run")
        assert run_resp.status_code == 200
        run_data = run_resp.json()
        assert run_data["status"] == "completed"
        assert "results_summary" in run_data
        assert run_data["results_summary"]["overrides_applied"] == 1

        # Compare
        cmp_resp = client.get(f"/api/sandbox/{sid}/compare")
        assert cmp_resp.status_code == 200
        cmp_data = cmp_resp.json()
        assert cmp_data["sandbox_id"] == sid
        assert "production_alerts" in cmp_data
        assert "sandbox_alerts" in cmp_data
        assert "alerts_added" in cmp_data
        assert "alerts_removed" in cmp_data

    def test_discard_sandbox(self, client):
        """DELETE /api/sandbox/{id} discards the sandbox."""
        create_resp = client.post(
            "/api/sandbox/create", json={"name": "Discard Me"}
        )
        sid = create_resp.json()["sandbox_id"]

        r = client.delete(f"/api/sandbox/{sid}")
        assert r.status_code == 200
        assert r.json()["status"] == "discarded"

    def test_list_sandboxes(self, client):
        """GET /api/sandbox/list returns all sandboxes."""
        client.post("/api/sandbox/create", json={"name": "SBX A"})
        client.post("/api/sandbox/create", json={"name": "SBX B"})

        r = client.get("/api/sandbox/list")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2

    def test_configure_not_found(self, client):
        """POST /api/sandbox/FAKE/configure returns 404."""
        r = client.post(
            "/api/sandbox/FAKE/configure", json={"overrides": []}
        )
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Archive API tests
# ---------------------------------------------------------------------------


class TestArchiveAPI:
    def test_get_policies(self, client):
        """GET /api/archive/config returns retention policies."""
        r = client.get("/api/archive/config")
        assert r.status_code == 200
        data = r.json()
        assert data["tier_id"] == "archive"
        assert len(data["policies"]) == 2
        policy_ids = [p["policy_id"] for p in data["policies"]]
        assert "mifid2" in policy_ids
        assert "gdpr" in policy_ids

    def test_export_entity(self, client):
        """POST /api/archive/export/order creates an archive entry."""
        r = client.post("/api/archive/export/order?policy_id=mifid2")
        assert r.status_code == 200
        data = r.json()
        assert data["entity"] == "order"
        assert data["policy_id"] == "mifid2"
        assert data["source_tier"] == "gold"
        assert data["record_count"] == 786
        assert data["format"] == "compressed_parquet"
        assert data["entry_id"].startswith("ARC-ORD-")

    def test_export_entity_bad_policy(self, client):
        """POST /api/archive/export/order with bad policy returns 404."""
        r = client.post("/api/archive/export/order?policy_id=nonexistent")
        assert r.status_code == 404

    def test_export_entity_missing_policy_param(self, client):
        """POST /api/archive/export/order without policy_id returns 400."""
        r = client.post("/api/archive/export/order")
        assert r.status_code == 400

    def test_list_entries(self, client):
        """GET /api/archive/entries returns all archive entries."""
        # Export two entities first
        client.post("/api/archive/export/order?policy_id=mifid2")
        client.post("/api/archive/export/execution?policy_id=mifid2")

        r = client.get("/api/archive/entries")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        entities = [e["entity"] for e in data]
        assert "order" in entities
        assert "execution" in entities

    def test_compliance_summary(self, client):
        """GET /api/archive/compliance returns compliance stats."""
        r = client.get("/api/archive/compliance")
        assert r.status_code == 200
        data = r.json()
        assert data["total_policies"] == 2
        assert "archived_entities" in data
        assert "required_entities" in data
        assert "coverage_pct" in data
        assert data["gdpr_policies"] == 1

    def test_timeline(self, client):
        """GET /api/archive/timeline returns retention timeline."""
        r = client.get("/api/archive/timeline")
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        # Each entry should have entity, regulation, retention_years
        for entry in data:
            assert "entity" in entry
            assert "regulation" in entry
            assert "retention_years" in entry
            assert "start" in entry
            assert "end" in entry

    def test_export_entity_not_covered(self, client):
        """POST /api/archive/export/product with mifid2 fails (product not in mifid2 data_types)."""
        r = client.post("/api/archive/export/product?policy_id=mifid2")
        assert r.status_code == 404
