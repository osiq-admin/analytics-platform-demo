"""Tests for the ContractValidator service."""
import pytest

from backend.db import DuckDBManager
from backend.models.medallion import DataContract, QualityRule
from backend.services.contract_validator import ContractValidator


@pytest.fixture()
def db():
    """In-memory DuckDB with a test_alerts table and 3 rows."""
    manager = DuckDBManager()
    manager.connect(":memory:")
    cursor = manager.cursor()
    cursor.execute(
        "CREATE TABLE test_alerts (alert_id VARCHAR NOT NULL, model_id VARCHAR NOT NULL, score DOUBLE)"
    )
    cursor.execute(
        "INSERT INTO test_alerts VALUES ('A1','M1',75.0), ('A2','M2',50.0), ('A3','M3',110.0)"
    )
    cursor.close()
    yield manager
    manager.close()


@pytest.fixture()
def contract():
    """Minimal DataContract for testing."""
    return DataContract(
        contract_id="test_contract",
        source_tier="silver",
        target_tier="gold",
        entity="alert",
    )


def test_validate_passes_not_null(db, contract):
    """All alert_id values are non-null — not_null should pass."""
    contract.quality_rules = [QualityRule(rule="not_null", fields=["alert_id"])]
    result = ContractValidator(db).validate(contract, "test_alerts")
    assert result.passed is True
    assert result.rule_results[0].passed is True
    assert result.rule_results[0].violation_count == 0


def test_validate_fails_range_check(db, contract):
    """Score 110 is out of [0, 100] range — range_check should fail with 1 violation."""
    contract.quality_rules = [QualityRule(rule="range_check", field="score", min=0, max=100)]
    result = ContractValidator(db).validate(contract, "test_alerts")
    assert result.passed is False
    assert result.rule_results[0].passed is False
    assert result.rule_results[0].violation_count == 1


def test_validate_with_nulls(db, contract):
    """Insert a NULL alert_id — not_null should fail."""
    cursor = db.cursor()
    cursor.execute("CREATE TABLE test_nullable (alert_id VARCHAR, model_id VARCHAR, score DOUBLE)")
    cursor.execute(
        "INSERT INTO test_nullable VALUES ('A1','M1',75.0), (NULL,'M4',60.0), ('A3','M3',90.0)"
    )
    cursor.close()

    contract.quality_rules = [QualityRule(rule="not_null", fields=["alert_id"])]
    result = ContractValidator(db).validate(contract, "test_nullable")
    assert result.passed is False
    assert result.rule_results[0].violation_count == 1


def test_validate_enum_check_passes(db, contract):
    """Create a table with only BUY/SELL — enum_check should pass."""
    cursor = db.cursor()
    cursor.execute("CREATE TABLE test_sides (side VARCHAR)")
    cursor.execute("INSERT INTO test_sides VALUES ('BUY'), ('SELL'), ('BUY')")
    cursor.close()

    contract.quality_rules = [QualityRule(rule="enum_check", field="side", values=["BUY", "SELL"])]
    result = ContractValidator(db).validate(contract, "test_sides")
    assert result.passed is True
    assert result.rule_results[0].violation_count == 0


def test_validate_enum_check_fails(db, contract):
    """INVALID is not in allowed set — enum_check should fail with 1 violation."""
    cursor = db.cursor()
    cursor.execute("CREATE TABLE test_sides2 (side VARCHAR)")
    cursor.execute("INSERT INTO test_sides2 VALUES ('BUY'), ('SELL'), ('INVALID')")
    cursor.close()

    contract.quality_rules = [QualityRule(rule="enum_check", field="side", values=["BUY", "SELL"])]
    result = ContractValidator(db).validate(contract, "test_sides2")
    assert result.passed is False
    assert result.rule_results[0].violation_count == 1


def test_validate_unique_check_passes(db, contract):
    """A, B, C are all unique — unique check should pass."""
    cursor = db.cursor()
    cursor.execute("CREATE TABLE test_unique (code VARCHAR)")
    cursor.execute("INSERT INTO test_unique VALUES ('A'), ('B'), ('C')")
    cursor.close()

    contract.quality_rules = [QualityRule(rule="unique", field="code")]
    result = ContractValidator(db).validate(contract, "test_unique")
    assert result.passed is True
    assert result.rule_results[0].violation_count == 0


def test_validate_unique_check_fails(db, contract):
    """A appears twice — unique check should fail with 1 duplicate."""
    cursor = db.cursor()
    cursor.execute("CREATE TABLE test_unique2 (code VARCHAR)")
    cursor.execute("INSERT INTO test_unique2 VALUES ('A'), ('A'), ('B')")
    cursor.close()

    contract.quality_rules = [QualityRule(rule="unique", field="code")]
    result = ContractValidator(db).validate(contract, "test_unique2")
    assert result.passed is False
    assert result.rule_results[0].violation_count == 1


def test_validate_quality_score(db, contract):
    """2 rules: not_null passes, range_check fails → quality_score should be 50.0."""
    contract.quality_rules = [
        QualityRule(rule="not_null", fields=["alert_id"]),
        QualityRule(rule="range_check", field="score", min=0, max=100),
    ]
    result = ContractValidator(db).validate(contract, "test_alerts")
    assert result.quality_score == 50.0
    assert result.passed is False


def test_validate_empty_rules(db, contract):
    """No rules → passes with quality_score 100.0."""
    contract.quality_rules = []
    result = ContractValidator(db).validate(contract, "test_alerts")
    assert result.passed is True
    assert result.quality_score == 100.0


def test_unsupported_rule_type_passes(db, contract):
    """Unsupported rule type 'future_check' should pass by default."""
    contract.quality_rules = [QualityRule(rule="future_check", field="alert_id")]
    result = ContractValidator(db).validate(contract, "test_alerts")
    assert result.passed is True
    assert result.rule_results[0].passed is True
    assert "unsupported" in result.rule_results[0].details


def test_validate_range_check_passes(db, contract):
    """All scores within [0, 200] range — range_check should pass."""
    contract.quality_rules = [QualityRule(rule="range_check", field="score", min=0, max=200)]
    result = ContractValidator(db).validate(contract, "test_alerts")
    assert result.passed is True
    assert result.rule_results[0].passed is True
    assert result.rule_results[0].violation_count == 0


def test_missing_table_fails(db, contract):
    """Querying a nonexistent table should fail gracefully, not raise."""
    contract.quality_rules = [QualityRule(rule="not_null", fields=["alert_id"])]
    result = ContractValidator(db).validate(contract, "nonexistent_table")
    assert result.passed is False
    assert result.rule_results[0].passed is False
    assert "error" in result.rule_results[0].details.lower()


class TestRegexMatch:
    def test_regex_passes(self, db, contract):
        """ISIN-like pattern passes when all values match."""
        cursor = db.cursor()
        cursor.execute("CREATE TABLE test_products (isin VARCHAR)")
        cursor.execute("INSERT INTO test_products VALUES ('US0378331005'), ('GB0002634946')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="regex_match", field="isin", pattern="^[A-Z]{2}[A-Z0-9]{10}$")]
        result = ContractValidator(db).validate(contract, "test_products")
        assert result.rule_results[0].passed is True

    def test_regex_fails(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE test_products2 (isin VARCHAR)")
        cursor.execute("INSERT INTO test_products2 VALUES ('US0378331005'), ('invalid')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="regex_match", field="isin", pattern="^[A-Z]{2}[A-Z0-9]{10}$")]
        result = ContractValidator(db).validate(contract, "test_products2")
        assert result.rule_results[0].passed is False
        assert result.rule_results[0].violation_count == 1


class TestReferentialIntegrity:
    def test_referential_integrity_passes(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE ref_orders (order_id VARCHAR)")
        cursor.execute("INSERT INTO ref_orders VALUES ('O1'), ('O2')")
        cursor.execute("CREATE TABLE ref_exec (order_id VARCHAR)")
        cursor.execute("INSERT INTO ref_exec VALUES ('O1'), ('O2')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="referential_integrity", field="order_id", reference="ref_orders.order_id")]
        result = ContractValidator(db).validate(contract, "ref_exec")
        assert result.rule_results[0].passed is True

    def test_referential_integrity_fails(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE ref_orders2 (order_id VARCHAR)")
        cursor.execute("INSERT INTO ref_orders2 VALUES ('O1')")
        cursor.execute("CREATE TABLE ref_exec2 (order_id VARCHAR)")
        cursor.execute("INSERT INTO ref_exec2 VALUES ('O1'), ('O999')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="referential_integrity", field="order_id", reference="ref_orders2.order_id")]
        result = ContractValidator(db).validate(contract, "ref_exec2")
        assert result.rule_results[0].passed is False
        assert result.rule_results[0].violation_count == 1

    def test_invalid_reference_format(self, db, contract):
        contract.quality_rules = [QualityRule(rule="referential_integrity", field="x", reference="bad_format")]
        result = ContractValidator(db).validate(contract, "test_alerts")
        assert result.rule_results[0].passed is False
        assert "invalid reference format" in result.rule_results[0].details


class TestFreshness:
    def test_freshness_passes(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE fresh_data (ts TIMESTAMP)")
        cursor.execute("INSERT INTO fresh_data VALUES (NOW()), (NOW() - INTERVAL '5 minutes')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="freshness", field="ts", freshness_minutes=60)]
        result = ContractValidator(db).validate(contract, "fresh_data")
        assert result.rule_results[0].passed is True

    def test_freshness_fails(self, db, contract):
        cursor = db.cursor()
        cursor.execute("CREATE TABLE stale_data (ts TIMESTAMP)")
        cursor.execute("INSERT INTO stale_data VALUES (NOW() - INTERVAL '2 hours')")
        cursor.close()
        contract.quality_rules = [QualityRule(rule="freshness", field="ts", freshness_minutes=60)]
        result = ContractValidator(db).validate(contract, "stale_data")
        assert result.rule_results[0].passed is False
        assert result.rule_results[0].violation_count == 1


class TestCustomSQL:
    def test_custom_sql_passes(self, db, contract):
        contract.quality_rules = [QualityRule(
            rule="custom_sql", field="score",
            sql="SELECT COUNT(*) AS total, SUM(CASE WHEN score < 0 THEN 1 ELSE 0 END) AS violations FROM {table}",
        )]
        result = ContractValidator(db).validate(contract, "test_alerts")
        assert result.rule_results[0].passed is True

    def test_custom_sql_fails(self, db, contract):
        contract.quality_rules = [QualityRule(
            rule="custom_sql", field="score",
            sql="SELECT COUNT(*) AS total, SUM(CASE WHEN score > 50 THEN 1 ELSE 0 END) AS violations FROM {table}",
        )]
        result = ContractValidator(db).validate(contract, "test_alerts")
        assert result.rule_results[0].passed is False

    def test_custom_sql_no_expression(self, db, contract):
        contract.quality_rules = [QualityRule(rule="custom_sql", field="x")]
        result = ContractValidator(db).validate(contract, "test_alerts")
        assert result.rule_results[0].passed is False
        assert "no SQL expression" in result.rule_results[0].details
