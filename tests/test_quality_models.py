"""Tests for quality Pydantic models."""
import json
from pathlib import Path
import pytest
from backend.models.quality import (
    QualityDimension,
    QualityDimensionsConfig,
    DimensionScore,
    EntityQualityScore,
    QuarantineRecord,
    QuarantineSummary,
    QualityProfile,
    EntityProfile,
)


class TestQualityDimensionModels:
    def test_dimension_defaults(self):
        d = QualityDimension(id="completeness", name="Completeness")
        assert d.weight == 0.0
        assert d.score_method == "ratio"
        assert d.rule_types == []

    def test_dimension_with_all_fields(self):
        d = QualityDimension(
            id="accuracy",
            name="Accuracy",
            iso_ref="ISO/IEC 25012:2008 §4.2.2",
            weight=0.2,
            rule_types=["range_check", "enum_check"],
            score_method="ratio",
            thresholds={"good": 99, "warning": 95, "critical": 90},
        )
        assert d.weight == 0.2
        assert len(d.rule_types) == 2
        assert d.thresholds["good"] == 99

    def test_dimensions_config(self):
        cfg = QualityDimensionsConfig(dimensions=[
            QualityDimension(id="completeness", name="Completeness", weight=0.2),
            QualityDimension(id="accuracy", name="Accuracy", weight=0.2),
        ])
        assert len(cfg.dimensions) == 2
        total_weight = sum(d.weight for d in cfg.dimensions)
        assert total_weight == pytest.approx(0.4)

    def test_dimensions_metadata_loads(self):
        path = Path("workspace/metadata/quality/dimensions.json")
        if path.exists():
            data = json.loads(path.read_text())
            cfg = QualityDimensionsConfig.model_validate(data)
            assert len(cfg.dimensions) == 7
            total_weight = sum(d.weight for d in cfg.dimensions)
            assert total_weight == pytest.approx(1.0)


class TestDimensionScore:
    def test_defaults(self):
        ds = DimensionScore(dimension_id="completeness")
        assert ds.score == 100.0
        assert ds.status == "good"

    def test_with_violations(self):
        ds = DimensionScore(
            dimension_id="completeness",
            score=95.5,
            rules_evaluated=3,
            rules_passed=2,
            violation_count=5,
            total_count=100,
            status="warning",
        )
        assert ds.score == 95.5
        assert ds.status == "warning"


class TestEntityQualityScore:
    def test_defaults(self):
        eqs = EntityQualityScore(entity="execution", tier="silver")
        assert eqs.overall_score == 100.0
        assert eqs.dimension_scores == []

    def test_with_dimensions(self):
        eqs = EntityQualityScore(
            entity="execution",
            tier="silver",
            overall_score=97.5,
            dimension_scores=[
                DimensionScore(dimension_id="completeness", score=100.0),
                DimensionScore(dimension_id="accuracy", score=95.0, status="warning"),
            ],
        )
        assert len(eqs.dimension_scores) == 2
        assert eqs.dimension_scores[1].status == "warning"


class TestQuarantineRecord:
    def test_defaults(self):
        qr = QuarantineRecord(
            record_id="q1",
            source_tier="bronze",
            target_tier="silver",
            entity="execution",
        )
        assert qr.status == "pending"
        assert qr.retry_count == 0

    def test_with_failed_rules(self):
        qr = QuarantineRecord(
            record_id="q2",
            source_tier="bronze",
            target_tier="silver",
            entity="execution",
            failed_rules=[
                {"rule": "not_null", "field": "order_id", "error": "NULL value"},
                {"rule": "referential_integrity", "field": "product_id", "error": "No match"},
            ],
            original_data={"execution_id": "E001", "order_id": None},
            status="pending",
        )
        assert len(qr.failed_rules) == 2
        assert qr.original_data["order_id"] is None


class TestQuarantineSummary:
    def test_defaults(self):
        qs = QuarantineSummary()
        assert qs.total_records == 0

    def test_with_data(self):
        qs = QuarantineSummary(
            total_records=15,
            by_entity={"execution": 10, "order": 5},
            by_rule_type={"not_null": 8, "referential_integrity": 7},
            by_status={"pending": 12, "retried": 3},
        )
        assert qs.total_records == 15
        assert qs.by_entity["execution"] == 10


class TestQualityProfile:
    def test_defaults(self):
        qp = QualityProfile(field_name="price")
        assert qp.null_pct == 0.0

    def test_with_stats(self):
        qp = QualityProfile(
            field_name="price",
            total_count=1000,
            null_count=5,
            null_pct=0.5,
            distinct_count=450,
            min_value="0.01",
            max_value="99999.99",
            top_values=[{"value": "100.00", "count": 15}],
        )
        assert qp.null_pct == 0.5


class TestEntityProfile:
    def test_defaults(self):
        ep = EntityProfile(entity="execution", tier="bronze")
        assert ep.row_count == 0
        assert ep.field_profiles == []
