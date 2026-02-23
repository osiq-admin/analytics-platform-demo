import pytest
from backend.models.calculations import CalculationDefinition, CalculationLayer
from backend.models.settings import SettingDefinition, ScoreStep
from backend.models.entities import EntityDefinition, FieldDefinition
from backend.models.detection import DetectionModelDefinition, ModelCalculation, Strictness
from backend.models.alerts import AlertTrace, CalculationScore


def test_calculation_definition_valid():
    calc = CalculationDefinition(
        calc_id="value_calc",
        name="Value Calculation",
        layer=CalculationLayer.TRANSACTION,
        description="Calculates transaction value by instrument type",
        inputs=[{"source_type": "entity", "entity_id": "execution", "fields": ["price", "quantity"]}],
        output={"table_name": "calc_value", "fields": [{"name": "calculated_value", "type": "decimal"}]},
    )
    assert calc.calc_id == "value_calc"
    assert calc.layer == CalculationLayer.TRANSACTION


def test_calculation_no_self_dependency():
    with pytest.raises(ValueError):
        CalculationDefinition(
            calc_id="loop",
            name="Loop",
            layer=CalculationLayer.TRANSACTION,
            description="Bad",
            inputs=[],
            output={"table_name": "x", "fields": []},
            depends_on=["loop"],
        )


def test_setting_definition_with_overrides():
    setting = SettingDefinition(
        setting_id="vwap_threshold",
        name="VWAP Threshold",
        description="Proximity threshold for wash detection",
        value_type="decimal",
        default=0.02,
        match_type="hierarchy",
        overrides=[
            {"match": {"asset_class": "equity"}, "value": 0.015, "priority": 1},
            {"match": {"product_id": "AAPL"}, "value": 0.01, "priority": 100},
        ],
    )
    # Overrides should be sorted by priority descending
    assert setting.overrides[0].priority == 100
    assert setting.overrides[1].priority == 1


def test_setting_definition_score_steps():
    setting = SettingDefinition(
        setting_id="large_activity_score_steps",
        name="Score Steps for Large Trading Activity",
        description="Graduated scoring",
        value_type="score_steps",
        default=[
            {"min_value": 0, "max_value": 10000, "score": 0},
            {"min_value": 10000, "max_value": 100000, "score": 3},
            {"min_value": 100000, "max_value": None, "score": 10},
        ],
        match_type="hierarchy",
    )
    assert setting.value_type == "score_steps"
    assert len(setting.default) == 3


def test_entity_definition():
    entity = EntityDefinition(
        entity_id="execution",
        name="Execution",
        description="Trade execution record",
        fields=[
            FieldDefinition(name="execution_id", type="string", description="Unique execution ID", is_key=True),
            FieldDefinition(name="price", type="decimal", description="Execution price"),
            FieldDefinition(name="quantity", type="integer", description="Executed quantity"),
        ],
    )
    assert entity.entity_id == "execution"
    assert len(entity.fields) == 3
    key_fields = [f for f in entity.fields if f.is_key]
    assert len(key_fields) == 1


def test_detection_model_definition():
    model = DetectionModelDefinition(
        model_id="wash_full_day",
        name="Wash Trading — Full Day",
        description="Detects wash trading within a business day",
        time_window="business_date",
        granularity=["product_id", "account_id"],
        calculations=[
            ModelCalculation(calc_id="large_trading_activity", strictness=Strictness.MUST_PASS),
            ModelCalculation(
                calc_id="wash_detection",
                strictness=Strictness.OPTIONAL,
                score_steps_setting="vwap_proximity_score_steps",
            ),
        ],
        score_threshold_setting="wash_score_threshold",
        alert_template={"title": "Wash Trading Alert", "description_template": "Account {account_id} wash in {product_id}"},
    )
    assert model.model_id == "wash_full_day"
    must_pass = [c for c in model.calculations if c.strictness == Strictness.MUST_PASS]
    assert len(must_pass) == 1


def test_alert_trace():
    trace = AlertTrace(
        alert_id="ALT-001",
        model_id="wash_full_day",
        entity_context={"product_id": "AAPL", "account_id": "ACC-001"},
        calculation_scores=[
            CalculationScore(
                calc_id="large_trading_activity",
                computed_value=150000.0,
                threshold=50000.0,
                threshold_passed=True,
                score=7.0,
                strictness=Strictness.MUST_PASS,
            ),
            CalculationScore(
                calc_id="wash_detection",
                computed_value=0.008,
                threshold=0.02,
                threshold_passed=True,
                score=9.0,
                strictness=Strictness.OPTIONAL,
            ),
        ],
        accumulated_score=16.0,
        score_threshold=10.0,
        trigger_path="all_passed",
        alert_fired=True,
    )
    assert trace.alert_fired
    assert trace.trigger_path == "all_passed"
    assert trace.accumulated_score == 16.0
