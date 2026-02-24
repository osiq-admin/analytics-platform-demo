import pytest
from backend.engine.settings_resolver import SettingsResolver
from backend.models.settings import SettingDefinition, SettingOverride, ScoreStep


def _make_setting(**kwargs) -> SettingDefinition:
    defaults = dict(
        setting_id="test_setting",
        name="Test Setting",
        description="test",
        value_type="decimal",
        default=0.5,
        match_type="hierarchy",
        overrides=[],
    )
    defaults.update(kwargs)
    return SettingDefinition(**defaults)


class TestDefaultFallback:
    def test_no_overrides_returns_default(self):
        setting = _make_setting(default=0.02)
        resolver = SettingsResolver()
        result = resolver.resolve(setting, {})
        assert result.value == 0.02
        assert result.matched_override is None

    def test_no_matching_override_returns_default(self):
        setting = _make_setting(
            default=0.02,
            overrides=[
                SettingOverride(match={"asset_class": "fx"}, value=0.05, priority=1),
            ],
        )
        resolver = SettingsResolver()
        result = resolver.resolve(setting, {"asset_class": "equity"})
        assert result.value == 0.02


class TestProductSpecificOverride:
    def test_product_specific_always_wins(self):
        setting = _make_setting(
            default=0.02,
            overrides=[
                SettingOverride(match={"asset_class": "equity"}, value=0.015, priority=1),
                SettingOverride(match={"product_id": "AAPL"}, value=0.01, priority=100),
            ],
        )
        resolver = SettingsResolver()
        result = resolver.resolve(setting, {"asset_class": "equity", "product_id": "AAPL"})
        assert result.value == 0.01
        assert result.matched_override is not None
        assert result.matched_override.priority == 100


class TestHierarchyResolution:
    def test_more_specific_wins(self):
        setting = _make_setting(
            match_type="hierarchy",
            default=0.02,
            overrides=[
                SettingOverride(match={"asset_class": "equity"}, value=0.015, priority=1),
                SettingOverride(match={"asset_class": "equity", "exchange_mic": "XNYS"}, value=0.012, priority=2),
            ],
        )
        resolver = SettingsResolver()
        result = resolver.resolve(setting, {"asset_class": "equity", "exchange_mic": "XNYS"})
        assert result.value == 0.012

    def test_partial_match_still_works(self):
        setting = _make_setting(
            match_type="hierarchy",
            default=0.02,
            overrides=[
                SettingOverride(match={"asset_class": "equity", "exchange_mic": "XNYS"}, value=0.012, priority=2),
            ],
        )
        resolver = SettingsResolver()
        # Context has asset_class but not exchange — override requires both, so no match
        result = resolver.resolve(setting, {"asset_class": "equity"})
        assert result.value == 0.02


class TestMultiDimensionalResolution:
    def test_most_dimensions_wins(self):
        setting = _make_setting(
            match_type="multi_dimensional",
            default=0.02,
            overrides=[
                SettingOverride(match={"asset_class": "equity"}, value=0.015, priority=1),
                SettingOverride(
                    match={"asset_class": "equity", "instrument_type": "common_stock"},
                    value=0.012,
                    priority=1,
                ),
            ],
        )
        resolver = SettingsResolver()
        result = resolver.resolve(
            setting, {"asset_class": "equity", "instrument_type": "common_stock"}
        )
        assert result.value == 0.012

    def test_tie_broken_by_priority(self):
        setting = _make_setting(
            match_type="multi_dimensional",
            default=0.02,
            overrides=[
                SettingOverride(match={"asset_class": "equity"}, value=0.015, priority=5),
                SettingOverride(match={"instrument_type": "common_stock"}, value=0.018, priority=10),
            ],
        )
        resolver = SettingsResolver()
        result = resolver.resolve(
            setting, {"asset_class": "equity", "instrument_type": "common_stock"}
        )
        # Both match 1 dimension, priority 10 wins
        assert result.value == 0.018


class TestResolutionTrace:
    def test_trace_records_why(self):
        setting = _make_setting(
            default=0.02,
            overrides=[
                SettingOverride(match={"asset_class": "equity"}, value=0.015, priority=1),
            ],
        )
        resolver = SettingsResolver()
        result = resolver.resolve(setting, {"asset_class": "equity"})
        assert result.value == 0.015
        assert result.why != ""
        assert "equity" in result.why.lower() or "asset_class" in result.why.lower()

    def test_trace_for_default(self):
        setting = _make_setting(default=0.02)
        resolver = SettingsResolver()
        result = resolver.resolve(setting, {"asset_class": "fx"})
        assert "default" in result.why.lower()


class TestScoreSteps:
    def test_resolve_score_steps_for_context(self):
        setting = _make_setting(
            setting_id="activity_score_steps",
            value_type="score_steps",
            default=[
                {"min_value": 0, "max_value": 10000, "score": 0},
                {"min_value": 10000, "max_value": 100000, "score": 3},
                {"min_value": 100000, "max_value": None, "score": 10},
            ],
            overrides=[
                SettingOverride(
                    match={"asset_class": "equity"},
                    value=[
                        {"min_value": 0, "max_value": 5000, "score": 0},
                        {"min_value": 5000, "max_value": 50000, "score": 5},
                        {"min_value": 50000, "max_value": None, "score": 10},
                    ],
                    priority=1,
                ),
            ],
        )
        resolver = SettingsResolver()

        # Default context (no match)
        result_default = resolver.resolve(setting, {"asset_class": "fx"})
        assert len(result_default.value) == 3
        assert result_default.value[1]["score"] == 3

        # Equity context
        result_equity = resolver.resolve(setting, {"asset_class": "equity"})
        assert len(result_equity.value) == 3
        assert result_equity.value[1]["score"] == 5

    def test_evaluate_score_step(self):
        steps = [
            ScoreStep(min_value=0, max_value=10000, score=0),
            ScoreStep(min_value=10000, max_value=100000, score=3),
            ScoreStep(min_value=100000, max_value=None, score=10),
        ]
        resolver = SettingsResolver()

        assert resolver.evaluate_score(steps, 5000) == 0
        assert resolver.evaluate_score(steps, 10000) == 3
        assert resolver.evaluate_score(steps, 50000) == 3
        assert resolver.evaluate_score(steps, 100000) == 10
        assert resolver.evaluate_score(steps, 999999) == 10

    def test_evaluate_score_empty_steps(self):
        resolver = SettingsResolver()
        assert resolver.evaluate_score([], 100) == 0
