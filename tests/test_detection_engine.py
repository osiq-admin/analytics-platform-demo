"""Tests for the Detection Engine — graduated scoring, MUST_PASS/OPTIONAL, alert triggering."""
import json
from pathlib import Path

import pytest

from backend.db import DuckDBManager
from backend.engine.detection_engine import DetectionEngine
from backend.engine.settings_resolver import SettingsResolver
from backend.models.detection import Strictness
from backend.services.metadata_service import MetadataService


@pytest.fixture
def workspace(tmp_path):
    """Create a workspace with pre-computed calculation results and settings."""
    # Create directories
    for d in [
        "metadata/detection_models",
        "metadata/settings/thresholds",
        "metadata/settings/score_steps",
        "metadata/settings/score_thresholds",
        "metadata/entities",
        "metadata/calculations/transaction",
        "alerts/traces",
    ]:
        (tmp_path / d).mkdir(parents=True)

    # Score steps for large activity
    (tmp_path / "metadata/settings/score_steps/large_activity_score_steps.json").write_text(
        json.dumps({
            "setting_id": "large_activity_score_steps",
            "name": "Large Activity Score Steps",
            "value_type": "score_steps",
            "default": [
                {"min_value": 0, "max_value": 10000, "score": 0},
                {"min_value": 10000, "max_value": 100000, "score": 3},
                {"min_value": 100000, "max_value": 500000, "score": 7},
                {"min_value": 500000, "max_value": None, "score": 10},
            ],
            "match_type": "hierarchy",
            "overrides": [],
        })
    )

    # Score steps for quantity match
    (tmp_path / "metadata/settings/score_steps/quantity_match_score_steps.json").write_text(
        json.dumps({
            "setting_id": "quantity_match_score_steps",
            "name": "Quantity Match Score Steps",
            "value_type": "score_steps",
            "default": [
                {"min_value": 0, "max_value": 0.5, "score": 0},
                {"min_value": 0.5, "max_value": 0.8, "score": 3},
                {"min_value": 0.8, "max_value": 0.95, "score": 7},
                {"min_value": 0.95, "max_value": None, "score": 10},
            ],
            "match_type": "hierarchy",
            "overrides": [],
        })
    )

    # Score steps for VWAP proximity
    (tmp_path / "metadata/settings/score_steps/vwap_proximity_score_steps.json").write_text(
        json.dumps({
            "setting_id": "vwap_proximity_score_steps",
            "name": "VWAP Proximity Score Steps",
            "value_type": "score_steps",
            "default": [
                {"min_value": 0, "max_value": 0.005, "score": 10},
                {"min_value": 0.005, "max_value": 0.01, "score": 7},
                {"min_value": 0.01, "max_value": 0.02, "score": 3},
                {"min_value": 0.02, "max_value": None, "score": 0},
            ],
            "match_type": "hierarchy",
            "overrides": [],
        })
    )

    # Score threshold for wash trading
    (tmp_path / "metadata/settings/score_thresholds/wash_score_threshold.json").write_text(
        json.dumps({
            "setting_id": "wash_score_threshold",
            "name": "Wash Score Threshold",
            "value_type": "decimal",
            "default": 10,
            "match_type": "hierarchy",
            "overrides": [],
        })
    )

    return tmp_path


@pytest.fixture
def db():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    yield mgr
    mgr.close()


def _create_wash_results(db, *, total_value=50000, qty_match=0.9, vwap_proximity=0.003):
    """Create fake calculation result tables in DuckDB for wash detection."""
    cursor = db.cursor()
    cursor.execute(f"""
        CREATE TABLE calc_wash_detection AS
        SELECT
            'AAPL' AS product_id,
            'ACC001' AS account_id,
            DATE '2026-01-15' AS business_date,
            {total_value} AS total_value,
            25000.0 AS buy_value,
            25000.0 AS sell_value,
            100.0 AS buy_qty,
            90.0 AS sell_qty,
            5 AS total_trades,
            0.6 AS same_side_pct,
            TRUE AS is_large,
            40000.0 AS threshold_used,
            {qty_match} AS qty_match_ratio,
            150.0 AS vwap_buy,
            150.05 AS vwap_sell,
            0.05 AS vwap_spread,
            {vwap_proximity} AS vwap_proximity,
            TRUE AS is_wash_candidate
    """)
    cursor.close()


def _create_detection_model(workspace, *, model_id="wash_full_day",
                             large_strictness="MUST_PASS",
                             qty_strictness="OPTIONAL",
                             vwap_strictness="OPTIONAL"):
    """Create a wash detection model JSON file."""
    model = {
        "model_id": model_id,
        "name": "Wash Trading Full Day",
        "description": "Detects wash trading on a full business day basis.",
        "time_window": "business_date",
        "granularity": ["product_id", "account_id"],
        "calculations": [
            {
                "calc_id": "large_trading_activity",
                "strictness": large_strictness,
                "threshold_setting": "large_activity_multiplier",
                "score_steps_setting": "large_activity_score_steps",
                "value_field": "total_value",
            },
            {
                "calc_id": "wash_qty_match",
                "strictness": qty_strictness,
                "threshold_setting": None,
                "score_steps_setting": "quantity_match_score_steps",
                "value_field": "qty_match_ratio",
            },
            {
                "calc_id": "wash_vwap_proximity",
                "strictness": vwap_strictness,
                "threshold_setting": None,
                "score_steps_setting": "vwap_proximity_score_steps",
                "value_field": "vwap_proximity",
            },
        ],
        "score_threshold_setting": "wash_score_threshold",
        "query": (
            "SELECT product_id, account_id, business_date, "
            "total_value, qty_match_ratio, vwap_proximity, "
            "'equity' AS asset_class "
            "FROM calc_wash_detection WHERE is_wash_candidate = TRUE"
        ),
        "alert_template": {
            "title": "Wash Trading Alert",
            "sections": ["business_description", "entity_context", "calculation_trace"],
        },
    }
    path = workspace / "metadata/detection_models" / f"{model_id}.json"
    path.write_text(json.dumps(model))
    return model


@pytest.fixture
def engine(workspace, db):
    meta = MetadataService(workspace)
    resolver = SettingsResolver()
    return DetectionEngine(workspace, db, meta, resolver)


class TestAlertTriggerAllPassed:
    """When all calculations pass their thresholds, alert fires via all_passed path."""

    def test_all_thresholds_pass(self, workspace, db, engine):
        _create_wash_results(db, total_value=50000, qty_match=0.9, vwap_proximity=0.003)
        _create_detection_model(workspace)
        results = engine.evaluate_model("wash_full_day")
        assert len(results) == 1
        alert = results[0]
        assert alert.alert_fired is True
        # total_value=50000 → score 3, qty_match=0.9 → score 7, vwap=0.003 → score 10 = 20
        assert alert.accumulated_score >= 10
        assert alert.trigger_path in ("all_passed", "score_based")


class TestAlertTriggerScoreBased:
    """MUST_PASS passes, some OPTIONAL fail, but score exceeds threshold."""

    def test_optional_fails_but_score_sufficient(self, workspace, db, engine):
        # vwap_proximity=0.05 → score 0 (fails threshold), but total_value + qty_match enough
        _create_wash_results(db, total_value=200000, qty_match=0.96, vwap_proximity=0.05)
        _create_detection_model(workspace)
        results = engine.evaluate_model("wash_full_day")
        assert len(results) == 1
        alert = results[0]
        assert alert.alert_fired is True
        # total_value=200000 → score 7, qty_match=0.96 → score 10, vwap=0.05 → score 0 = 17 >= 10
        assert alert.accumulated_score >= 10
        assert alert.trigger_path == "score_based"


class TestMustPassGating:
    """MUST_PASS failure prevents alert even if score is sufficient."""

    def test_must_pass_fails_no_alert(self, workspace, db, engine):
        # total_value=5000 → score 0 (MUST_PASS fails), even if qty/vwap are perfect
        _create_wash_results(db, total_value=5000, qty_match=0.99, vwap_proximity=0.001)
        _create_detection_model(workspace)
        results = engine.evaluate_model("wash_full_day")
        # Either no results, or alert_fired = False
        if results:
            assert results[0].alert_fired is False


class TestAllOptional:
    """When all calculations are OPTIONAL, only score determines the alert."""

    def test_all_optional_score_based(self, workspace, db, engine):
        _create_wash_results(db, total_value=50000, qty_match=0.9, vwap_proximity=0.003)
        _create_detection_model(
            workspace,
            model_id="wash_all_optional",
            large_strictness="OPTIONAL",
            qty_strictness="OPTIONAL",
            vwap_strictness="OPTIONAL",
        )
        results = engine.evaluate_model("wash_all_optional")
        assert len(results) == 1
        alert = results[0]
        assert alert.alert_fired is True
        assert alert.trigger_path in ("all_passed", "score_based")

    def test_all_optional_low_score_no_alert(self, workspace, db, engine):
        _create_wash_results(db, total_value=5000, qty_match=0.3, vwap_proximity=0.05)
        _create_detection_model(
            workspace,
            model_id="wash_all_optional_low",
            large_strictness="OPTIONAL",
            qty_strictness="OPTIONAL",
            vwap_strictness="OPTIONAL",
        )
        results = engine.evaluate_model("wash_all_optional_low")
        if results:
            assert results[0].alert_fired is False


class TestScoreCalculation:
    """Score step resolution and evaluation."""

    def test_graduated_scores_computed(self, workspace, db, engine):
        _create_wash_results(db, total_value=50000, qty_match=0.9, vwap_proximity=0.003)
        _create_detection_model(workspace)
        results = engine.evaluate_model("wash_full_day")
        alert = results[0]
        scores = {cs.calc_id: cs.score for cs in alert.calculation_scores}
        # total_value=50000 → 10000-100000 range → score 3
        assert scores["large_trading_activity"] == 3
        # qty_match=0.9 → 0.8-0.95 range → score 7
        assert scores["wash_qty_match"] == 7
        # vwap_proximity=0.003 → 0-0.005 range → score 10
        assert scores["wash_vwap_proximity"] == 10

    def test_accumulated_score(self, workspace, db, engine):
        _create_wash_results(db, total_value=50000, qty_match=0.9, vwap_proximity=0.003)
        _create_detection_model(workspace)
        results = engine.evaluate_model("wash_full_day")
        alert = results[0]
        assert alert.accumulated_score == 20  # 3 + 7 + 10

    def test_score_threshold_resolved(self, workspace, db, engine):
        _create_wash_results(db, total_value=50000, qty_match=0.9, vwap_proximity=0.003)
        _create_detection_model(workspace)
        results = engine.evaluate_model("wash_full_day")
        alert = results[0]
        assert alert.score_threshold == 10  # default from setting


class TestEntityContext:
    """Alert should capture entity context from the query results."""

    def test_entity_context_populated(self, workspace, db, engine):
        _create_wash_results(db)
        _create_detection_model(workspace)
        results = engine.evaluate_model("wash_full_day")
        alert = results[0]
        assert alert.entity_context.get("product_id") == "AAPL"
        assert alert.entity_context.get("account_id") == "ACC001"

    def test_settings_trace_populated(self, workspace, db, engine):
        _create_wash_results(db)
        _create_detection_model(workspace)
        results = engine.evaluate_model("wash_full_day")
        alert = results[0]
        assert len(alert.settings_trace) > 0
