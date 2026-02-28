"""Tests for the quality engine with per-dimension scoring."""
import pytest

from backend.db import DuckDBManager
from backend.models.medallion import DataContract, QualityRule
from backend.models.quality import QualityDimensionsConfig, QualityDimension
from backend.engine.quality_engine import QualityEngine


@pytest.fixture()
def db():
    manager = DuckDBManager()
    manager.connect(":memory:")
    cursor = manager.cursor()
    cursor.execute("""
        CREATE TABLE test_exec (
            execution_id VARCHAR, order_id VARCHAR, product_id VARCHAR,
            price DOUBLE, side VARCHAR, ts TIMESTAMP
        )
    """)
    cursor.execute("""
        INSERT INTO test_exec VALUES
        ('E1', 'O1', 'P1', 100.0, 'BUY', NOW()),
        ('E2', 'O2', 'P2', 200.0, 'SELL', NOW()),
        ('E3', 'O3', 'P3', 150.0, 'BUY', NOW())
    """)
    cursor.execute("CREATE TABLE ref_orders (order_id VARCHAR)")
    cursor.execute("INSERT INTO ref_orders VALUES ('O1'), ('O2'), ('O3')")
    cursor.close()
    yield manager
    manager.close()


@pytest.fixture()
def dimensions():
    return QualityDimensionsConfig(dimensions=[
        QualityDimension(id="completeness", name="Completeness", weight=0.3, rule_types=["not_null"], score_method="ratio", thresholds={"good": 99, "warning": 95, "critical": 90}),
        QualityDimension(id="accuracy", name="Accuracy", weight=0.3, rule_types=["range_check"], score_method="ratio", thresholds={"good": 99, "warning": 95, "critical": 90}),
        QualityDimension(id="uniqueness", name="Uniqueness", weight=0.2, rule_types=["unique"], score_method="ratio", thresholds={"good": 100, "warning": 99, "critical": 95}),
        QualityDimension(id="consistency", name="Consistency", weight=0.2, rule_types=["referential_integrity"], score_method="ratio", thresholds={"good": 99, "warning": 95, "critical": 90}),
    ])


@pytest.fixture()
def contract():
    return DataContract(
        contract_id="test_quality", source_tier="bronze", target_tier="silver", entity="execution",
    )


class TestQualityEngineScoring:
    def test_all_rules_pass_gives_100(self, db, dimensions, contract):
        contract.quality_rules = [
            QualityRule(rule="not_null", fields=["execution_id", "order_id"]),
            QualityRule(rule="range_check", field="price", min=0, max=1000),
            QualityRule(rule="unique", field="execution_id"),
        ]
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "test_exec")
        assert score.overall_score == 100.0
        assert all(ds.status == "good" for ds in score.dimension_scores)

    def test_failed_rule_reduces_dimension_score(self, db, dimensions, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE bad_exec (execution_id VARCHAR, price DOUBLE)")
        cursor.execute("INSERT INTO bad_exec VALUES ('E1', 100.0), ('E2', -5.0)")
        cursor.close()
        contract.quality_rules = [
            QualityRule(rule="not_null", fields=["execution_id"]),
            QualityRule(rule="range_check", field="price", min=0, max=1000),
        ]
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "bad_exec")
        # completeness passes (100), accuracy fails (0), overall < 100
        accuracy = next(d for d in score.dimension_scores if d.dimension_id == "accuracy")
        assert accuracy.score == 0.0
        assert accuracy.status == "critical"
        assert score.overall_score < 100.0

    def test_weighted_overall_score(self, db, dimensions, contract):
        """2 dimensions with rules, 1 passes 1 fails — overall is weighted."""
        cursor = db.cursor()
        cursor.execute("CREATE TABLE weighted_test (id VARCHAR, val DOUBLE)")
        cursor.execute("INSERT INTO weighted_test VALUES ('A', 10), ('B', 20)")
        cursor.close()
        contract.quality_rules = [
            QualityRule(rule="not_null", fields=["id"]),  # completeness passes (weight 0.3)
            QualityRule(rule="range_check", field="val", min=100, max=200),  # accuracy fails (weight 0.3)
        ]
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "weighted_test")
        # completeness=100*0.3=30, accuracy=0*0.3=0, uniqueness/consistency=100*0.2+100*0.2=40
        # total weight=1.0, overall=70.0
        assert score.overall_score == pytest.approx(70.0, abs=0.5)

    def test_no_rules_gives_100(self, db, dimensions, contract):
        contract.quality_rules = []
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "test_exec")
        assert score.overall_score == 100.0

    def test_entity_and_tier_in_result(self, db, dimensions, contract):
        contract.quality_rules = []
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "test_exec")
        assert score.entity == "execution"
        assert score.tier == "silver"
        assert score.contract_id == "test_quality"

    def test_referential_integrity_scored_under_consistency(self, db, dimensions, contract):
        contract.quality_rules = [
            QualityRule(rule="referential_integrity", field="order_id", reference="ref_orders.order_id"),
        ]
        engine = QualityEngine(db, dimensions)
        score = engine.score_entity(contract, "test_exec")
        consistency = next(d for d in score.dimension_scores if d.dimension_id == "consistency")
        assert consistency.score == 100.0
        assert consistency.rules_evaluated == 1


class TestQualityEngineProfiling:
    def test_profile_entity(self, db, dimensions):
        engine = QualityEngine(db, dimensions)
        profile = engine.profile_entity("test_exec", "execution", "bronze")
        assert profile.entity == "execution"
        assert profile.tier == "bronze"
        assert profile.row_count == 3
        assert len(profile.field_profiles) == 6  # 6 columns

        id_profile = next(p for p in profile.field_profiles if p.field_name == "execution_id")
        assert id_profile.null_count == 0
        assert id_profile.distinct_count == 3

    def test_profile_missing_table(self, db, dimensions):
        engine = QualityEngine(db, dimensions)
        profile = engine.profile_entity("nonexistent", "x", "y")
        assert profile.row_count == 0
        assert profile.field_profiles == []
