"""Tests for model-specific alert detail layouts."""
import json
import pathlib

import pytest
from backend.models.detection import DetectionModelDefinition


class TestAlertDetailLayout:
    def test_model_has_alert_detail_layout(self):
        model = DetectionModelDefinition.model_validate({
            "model_id": "test",
            "name": "Test",
            "time_window": "business_date",
            "granularity": ["product_id"],
            "query": "SELECT 1",
            "calculations": [],
            "score_threshold_setting": "test_threshold",
            "alert_template": {"title": "Test Alert", "sections": ["business_description"]},
            "alert_detail_layout": {
                "panels": ["business", "entity", "calcTrace", "scores"],
                "emphasis": ["scores"],
                "investigation_hint": "Focus on scoring breakdown"
            }
        })
        assert model.alert_detail_layout is not None
        assert "business" in model.alert_detail_layout["panels"]
        assert "scores" in model.alert_detail_layout["emphasis"]

    def test_model_without_layout_gets_none(self):
        model = DetectionModelDefinition.model_validate({
            "model_id": "test",
            "name": "Test",
            "time_window": "business_date",
            "granularity": ["product_id"],
            "query": "SELECT 1",
            "calculations": [],
            "score_threshold_setting": "test_threshold",
            "alert_template": {"title": "Test Alert", "sections": ["business_description"]}
        })
        assert model.alert_detail_layout is None

    def test_all_production_models_have_layouts(self):
        """Verify each real detection model JSON has alert_detail_layout."""
        models_dir = pathlib.Path("workspace/metadata/detection_models")
        if not models_dir.exists():
            pytest.skip("Not in project root")
        for f in sorted(models_dir.glob("*.json")):
            data = json.loads(f.read_text())
            assert "alert_detail_layout" in data, f"{f.name} missing alert_detail_layout"
            layout = data["alert_detail_layout"]
            assert "panels" in layout, f"{f.name} layout missing panels"
            assert "emphasis" in layout, f"{f.name} layout missing emphasis"
            assert "investigation_hint" in layout, f"{f.name} layout missing investigation_hint"
            assert len(layout["panels"]) >= 2, f"{f.name} should have at least 2 panels"
