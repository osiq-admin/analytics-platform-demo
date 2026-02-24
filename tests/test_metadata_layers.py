"""Tests for OOB/User layer resolution in MetadataService."""
import json

import pytest

from backend.services.metadata_service import MetadataService


@pytest.fixture
def layer_workspace(tmp_path):
    """Workspace with OOB manifest, entities, calculations, settings, detection models."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    for d in [
        "metadata/entities",
        "metadata/calculations/transaction",
        "metadata/settings/thresholds",
        "metadata/settings/score_thresholds",
        "metadata/detection_models",
        "metadata/user_overrides/entities",
        "metadata/user_overrides/calculations/transaction",
        "metadata/user_overrides/settings/thresholds",
        "metadata/user_overrides/settings/score_thresholds",
        "metadata/user_overrides/detection_models",
    ]:
        (ws / d).mkdir(parents=True)

    # OOB entity: product
    entity_data = {
        "entity_id": "product",
        "name": "Product",
        "description": "OOB product entity",
        "fields": [{"name": "product_id", "type": "string", "is_key": True}],
    }
    (ws / "metadata/entities/product.json").write_text(json.dumps(entity_data))

    # OOB calculation: value_calc
    calc_data = {
        "calc_id": "value_calc",
        "name": "Value Calculation",
        "layer": "transaction",
        "description": "OOB value calc",
        "inputs": [],
        "output": {},
        "logic": "",
        "depends_on": [],
    }
    (ws / "metadata/calculations/transaction/value_calc.json").write_text(json.dumps(calc_data))

    # OOB setting: wash_vwap_threshold
    setting_data = {
        "setting_id": "wash_vwap_threshold",
        "name": "Wash VWAP Threshold",
        "value_type": "decimal",
        "default": 0.02,
    }
    (ws / "metadata/settings/thresholds/wash_vwap_threshold.json").write_text(json.dumps(setting_data))

    # OOB setting: wash_score_threshold
    score_setting_data = {
        "setting_id": "wash_score_threshold",
        "name": "Wash Score Threshold",
        "value_type": "decimal",
        "default": 70.0,
    }
    (ws / "metadata/settings/score_thresholds/wash_score_threshold.json").write_text(json.dumps(score_setting_data))

    # OOB detection model: wash_full_day
    model_data = {
        "model_id": "wash_full_day",
        "name": "Wash Trading Full Day",
        "time_window": "business_date",
        "granularity": ["product_id", "account_id"],
        "calculations": [],
        "score_threshold_setting": "wash_score_threshold",
        "regulatory_coverage": [],
    }
    (ws / "metadata/detection_models/wash_full_day.json").write_text(json.dumps(model_data))

    # OOB manifest
    manifest = {
        "oob_version": "1.0.0",
        "items": {
            "entities": {
                "product": {"checksum": "abc123", "version": "1.0.0", "path": "entities/product.json"},
            },
            "calculations": {
                "value_calc": {"checksum": "def456", "version": "1.0.0", "path": "calculations/transaction/value_calc.json"},
            },
            "settings": {
                "wash_vwap_threshold": {"checksum": "ghi789", "version": "1.0.0", "path": "settings/thresholds/wash_vwap_threshold.json"},
                "wash_score_threshold": {"checksum": "jkl012", "version": "1.0.0", "path": "settings/score_thresholds/wash_score_threshold.json"},
            },
            "detection_models": {
                "wash_full_day": {"checksum": "mno345", "version": "1.0.0", "path": "detection_models/wash_full_day.json"},
            },
        },
    }
    (ws / "metadata/oob_manifest.json").write_text(json.dumps(manifest))

    return ws


@pytest.fixture
def svc(layer_workspace):
    return MetadataService(layer_workspace)


class TestLayerResolution:
    def test_load_entity_oob_default(self, svc):
        entity = svc.load_entity("product")
        assert entity is not None
        assert entity.metadata_layer == "oob"

    def test_load_entity_with_user_override(self, svc, layer_workspace):
        override = {
            "entity_id": "product",
            "name": "Product (Custom)",
            "description": "User-modified product",
            "fields": [{"name": "product_id", "type": "string", "is_key": True}],
        }
        (layer_workspace / "metadata/user_overrides/entities/product.json").write_text(json.dumps(override))
        entity = svc.load_entity("product")
        assert entity is not None
        assert entity.metadata_layer == "user"
        assert entity.name == "Product (Custom)"

    def test_list_entities_merges_layers(self, svc, layer_workspace):
        # Add user override for product + a new user-only entity
        override = {
            "entity_id": "product",
            "name": "Product (Custom)",
            "fields": [{"name": "product_id", "type": "string", "is_key": True}],
        }
        (layer_workspace / "metadata/user_overrides/entities/product.json").write_text(json.dumps(override))
        new_entity = {
            "entity_id": "custom_entity",
            "name": "Custom Entity",
            "fields": [],
        }
        (layer_workspace / "metadata/user_overrides/entities/custom_entity.json").write_text(json.dumps(new_entity))

        entities = svc.list_entities()
        ids = [e.entity_id for e in entities]
        assert "product" in ids
        assert "custom_entity" in ids
        product = next(e for e in entities if e.entity_id == "product")
        assert product.metadata_layer == "user"
        assert product.name == "Product (Custom)"
        custom = next(e for e in entities if e.entity_id == "custom_entity")
        assert custom.metadata_layer == "user"

    def test_save_oob_entity_creates_override(self, svc, layer_workspace):
        entity = svc.load_entity("product")
        entity.description = "Modified by user"
        svc.save_entity(entity)
        assert (layer_workspace / "metadata/user_overrides/entities/product.json").exists()
        # Original stays untouched
        original = json.loads((layer_workspace / "metadata/entities/product.json").read_text())
        assert original["description"] == "OOB product entity"

    def test_save_new_entity_in_standard_dir(self, svc, layer_workspace):
        from backend.models.entities import EntityDefinition
        new = EntityDefinition(entity_id="custom_new", name="Custom New", fields=[])
        svc.save_entity(new)
        assert (layer_workspace / "metadata/entities/custom_new.json").exists()
        assert not (layer_workspace / "metadata/user_overrides/entities/custom_new.json").exists()

    def test_delete_user_override_reverts(self, svc, layer_workspace):
        # Create override
        override = {
            "entity_id": "product",
            "name": "Product (Custom)",
            "fields": [{"name": "product_id", "type": "string", "is_key": True}],
        }
        (layer_workspace / "metadata/user_overrides/entities/product.json").write_text(json.dumps(override))
        assert svc.load_entity("product").name == "Product (Custom)"
        # Delete override
        assert svc.delete_user_override("entities", "product") is True
        # Load returns OOB
        entity = svc.load_entity("product")
        assert entity.name == "Product"
        assert entity.metadata_layer == "oob"

    def test_delete_oob_item_blocked(self, svc):
        result = svc.delete_entity("product")
        assert result is False

    def test_is_oob_item_true(self, svc):
        assert svc.is_oob_item("entities", "product") is True

    def test_is_oob_item_false(self, svc):
        assert svc.is_oob_item("entities", "random_entity") is False

    def test_load_oob_version(self, svc, layer_workspace):
        # Create override
        override = {
            "entity_id": "product",
            "name": "Product (Custom)",
            "fields": [{"name": "product_id", "type": "string", "is_key": True}],
        }
        (layer_workspace / "metadata/user_overrides/entities/product.json").write_text(json.dumps(override))
        oob = svc.load_oob_version("entities", "product")
        assert oob is not None
        assert oob["name"] == "Product"

    def test_get_item_layer_info_oob(self, svc):
        info = svc.get_item_layer_info("entities", "product")
        assert info["is_oob"] is True
        assert info["has_override"] is False
        assert info["layer"] == "oob"
        assert info["oob_version"] == "1.0.0"

    def test_get_item_layer_info_overridden(self, svc, layer_workspace):
        override = {
            "entity_id": "product",
            "name": "Product (Custom)",
            "fields": [{"name": "product_id", "type": "string", "is_key": True}],
        }
        (layer_workspace / "metadata/user_overrides/entities/product.json").write_text(json.dumps(override))
        info = svc.get_item_layer_info("entities", "product")
        assert info["is_oob"] is True
        assert info["has_override"] is True
        assert info["layer"] == "user"
