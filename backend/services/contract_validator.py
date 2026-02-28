"""Contract validator service for evaluating data quality rules against DuckDB tables."""
from __future__ import annotations

from dataclasses import dataclass, field

from backend.db import DuckDBManager
from backend.models.medallion import DataContract, QualityRule


@dataclass
class RuleResult:
    """Result of evaluating a single quality rule."""

    rule: str
    field: str
    passed: bool
    violation_count: int = 0
    total_count: int = 0
    details: str = ""


@dataclass
class ContractValidationResult:
    """Aggregate result of validating all rules in a data contract."""

    contract_id: str
    passed: bool
    rule_results: list[RuleResult] = field(default_factory=list)
    quality_score: float = 100.0


class ContractValidator:
    """Evaluates data quality rules from data contract metadata against DuckDB tables.

    Supports rule types: not_null, range_check, enum_check, unique.
    Unsupported rule types pass by default for forward-compatibility.
    """

    def __init__(self, db: DuckDBManager) -> None:
        self._db = db

    def validate(self, contract: DataContract, table_name: str) -> ContractValidationResult:
        """Validate all quality rules in a contract against the given table.

        Returns a ContractValidationResult with per-rule results and an overall
        quality score (0-100).
        """
        rule_results: list[RuleResult] = []

        for quality_rule in contract.quality_rules:
            handler = getattr(self, f"_check_{quality_rule.rule}", None)
            if handler is None:
                # Unsupported rule type — pass by default (forward-compatible)
                rule_results.append(
                    RuleResult(
                        rule=quality_rule.rule,
                        field=quality_rule.field or ",".join(quality_rule.fields),
                        passed=True,
                        details="unsupported rule type — passed by default",
                    )
                )
            else:
                result = handler(quality_rule, table_name)
                rule_results.append(result)

        total = len(rule_results)
        passing = sum(1 for r in rule_results if r.passed)
        quality_score = round((passing / total) * 100, 1) if total > 0 else 100.0
        all_passed = all(r.passed for r in rule_results) if rule_results else True

        return ContractValidationResult(
            contract_id=contract.contract_id,
            passed=all_passed,
            rule_results=rule_results,
            quality_score=quality_score,
        )

    # ------------------------------------------------------------------
    # Rule handlers
    # ------------------------------------------------------------------

    def _check_not_null(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that specified fields contain no NULL values."""
        fields = rule.fields if rule.fields else ([rule.field] if rule.field else [])
        field_name = ",".join(fields)
        try:
            cursor = self._db.cursor()
            conditions = " OR ".join(f'"{f}" IS NULL' for f in fields)
            sql = f"SELECT COUNT(*) AS total, SUM(CASE WHEN {conditions} THEN 1 ELSE 0 END) AS nulls FROM \"{table_name}\""
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            nulls = int(row["nulls"])
            return RuleResult(
                rule="not_null",
                field=field_name,
                passed=nulls == 0,
                violation_count=nulls,
                total_count=total,
                details=f"{nulls} null(s) in {total} rows",
            )
        except Exception as exc:
            return RuleResult(
                rule="not_null",
                field=field_name,
                passed=False,
                details=f"error: {exc}",
            )

    def _check_range_check(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that a numeric field falls within [min, max] bounds."""
        field_name = rule.field or ""
        try:
            cursor = self._db.cursor()
            sql = (
                f'SELECT COUNT(*) AS total, '
                f'SUM(CASE WHEN "{field_name}" < {rule.min} OR "{field_name}" > {rule.max} THEN 1 ELSE 0 END) AS violations '
                f'FROM "{table_name}"'
            )
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            violations = int(row["violations"])
            return RuleResult(
                rule="range_check",
                field=field_name,
                passed=violations == 0,
                violation_count=violations,
                total_count=total,
                details=f"{violations} out-of-range in {total} rows [{rule.min}, {rule.max}]",
            )
        except Exception as exc:
            return RuleResult(
                rule="range_check",
                field=field_name,
                passed=False,
                details=f"error: {exc}",
            )

    def _check_enum_check(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that field values are within an allowed set."""
        field_name = rule.field or ""
        try:
            cursor = self._db.cursor()
            allowed = ", ".join(f"'{v}'" for v in rule.values)
            sql = (
                f'SELECT COUNT(*) AS total, '
                f'SUM(CASE WHEN "{field_name}" NOT IN ({allowed}) THEN 1 ELSE 0 END) AS violations '
                f'FROM "{table_name}"'
            )
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            violations = int(row["violations"])
            return RuleResult(
                rule="enum_check",
                field=field_name,
                passed=violations == 0,
                violation_count=violations,
                total_count=total,
                details=f"{violations} invalid value(s) in {total} rows",
            )
        except Exception as exc:
            return RuleResult(
                rule="enum_check",
                field=field_name,
                passed=False,
                details=f"error: {exc}",
            )

    def _check_unique(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that a field contains only unique values."""
        field_name = rule.field or ""
        try:
            cursor = self._db.cursor()
            sql = (
                f'SELECT COUNT(*) AS total, '
                f'COUNT(*) - COUNT(DISTINCT "{field_name}") AS duplicates '
                f'FROM "{table_name}"'
            )
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            duplicates = int(row["duplicates"])
            return RuleResult(
                rule="unique",
                field=field_name,
                passed=duplicates == 0,
                violation_count=duplicates,
                total_count=total,
                details=f"{duplicates} duplicate(s) in {total} rows",
            )
        except Exception as exc:
            return RuleResult(
                rule="unique",
                field=field_name,
                passed=False,
                details=f"error: {exc}",
            )
