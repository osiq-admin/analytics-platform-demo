"""Tests for metadata-driven format rules."""
import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy metadata subdirectories needed for lifespan boot
    for subdir in [
        "entities",
        "calculations",
        "settings",
        "detection_models",
    ]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    # Create format_rules metadata
    (ws / "metadata" / "format_rules").mkdir(parents=True, exist_ok=True)
    (ws / "metadata" / "format_rules" / "default.json").write_text(json.dumps({
        "format_group_id": "default",
        "rules": {
            "currency": {"type": "number", "precision": 2, "prefix": "$"},
            "percentage": {"type": "number", "precision": 1, "suffix": "%"},
            "score": {"type": "number", "precision": 2},
            "integer": {"type": "number", "precision": 0},
            "label": {"type": "label", "transform": "snake_to_title"}
        },
        "field_mappings": {
            "total_value": "currency",
            "accumulated_score": "score",
            "score_threshold": "score",
            "qty_match_ratio": "percentage",
            "model_id": "label",
            "asset_class": "label"
        }
    }))

    # Create data/csv directory (needed by data loader)
    (ws / "data" / "csv").mkdir(parents=True)

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestFormatRules:
    def test_format_rules_endpoint(self, client):
        resp = client.get("/api/metadata/format-rules")
        assert resp.status_code == 200
        data = resp.json()
        assert "rules" in data
        assert "field_mappings" in data

    def test_format_rules_have_types(self, client):
        resp = client.get("/api/metadata/format-rules")
        rules = resp.json()["rules"]
        assert "currency" in rules
        assert rules["currency"]["type"] == "number"

    def test_field_mappings_reference_existing_rules(self, client):
        resp = client.get("/api/metadata/format-rules")
        data = resp.json()
        rules = data["rules"]
        for field, rule_name in data["field_mappings"].items():
            assert rule_name in rules, f"Field {field} references missing rule {rule_name}"

    def test_empty_format_dir_returns_defaults(self, workspace, monkeypatch):
        (workspace / "metadata" / "format_rules" / "default.json").unlink()
        from backend import config

        monkeypatch.setattr(config.settings, "workspace_dir", workspace)
        with TestClient(app, raise_server_exceptions=False) as tc:
            resp = tc.get("/api/metadata/format-rules")
            assert resp.status_code == 200
            data = resp.json()
            assert data["rules"] == {}
