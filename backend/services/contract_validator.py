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

    Supports rule types: not_null, range_check, enum_check, unique,
    regex_match, referential_integrity, freshness, custom_sql.
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
            sql = f"SELECT COUNT(*) AS total, SUM(CASE WHEN {conditions} THEN 1 ELSE 0 END) AS nulls FROM \"{table_name}\""  # nosec B608
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
                f'SELECT COUNT(*) AS total, '  # nosec B608
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
                f'SELECT COUNT(*) AS total, '  # nosec B608
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
                f'SELECT COUNT(*) AS total, '  # nosec B608
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

    def _check_regex_match(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that a field matches a regex pattern."""
        field_name = rule.field or ""
        pattern = rule.pattern or ".*"
        try:
            cursor = self._db.cursor()
            sql = (
                f'SELECT COUNT(*) AS total, '  # nosec B608
                f"SUM(CASE WHEN NOT regexp_matches(\"{field_name}\", '{pattern}') THEN 1 ELSE 0 END) AS violations "
                f'FROM "{table_name}" WHERE "{field_name}" IS NOT NULL'
            )
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            violations = int(row["violations"])
            return RuleResult(
                rule="regex_match",
                field=field_name,
                passed=violations == 0,
                violation_count=violations,
                total_count=total,
                details=f"{violations} pattern mismatch(es) in {total} rows",
            )
        except Exception as exc:
            return RuleResult(
                rule="regex_match", field=field_name, passed=False, details=f"error: {exc}"
            )

    def _check_referential_integrity(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that a field's values exist in a referenced table.field."""
        field_name = rule.field or ""
        reference = rule.reference or ""  # format: "table.field"
        try:
            ref_parts = reference.split(".")
            if len(ref_parts) != 2:
                return RuleResult(
                    rule="referential_integrity", field=field_name, passed=False,
                    details=f"invalid reference format: '{reference}' (expected 'table.field')",
                )
            ref_table, ref_field = ref_parts
            cursor = self._db.cursor()
            sql = (
                f'SELECT COUNT(*) AS total, '  # nosec B608
                f'SUM(CASE WHEN "{field_name}" NOT IN (SELECT DISTINCT "{ref_field}" FROM "{ref_table}") '
                f'THEN 1 ELSE 0 END) AS violations '
                f'FROM "{table_name}" WHERE "{field_name}" IS NOT NULL'
            )
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            violations = int(row["violations"])
            return RuleResult(
                rule="referential_integrity",
                field=field_name,
                passed=violations == 0,
                violation_count=violations,
                total_count=total,
                details=f"{violations} orphan(s) in {total} rows (ref: {reference})",
            )
        except Exception as exc:
            return RuleResult(
                rule="referential_integrity", field=field_name, passed=False,
                details=f"error: {exc}",
            )

    def _check_freshness(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Check that data is not older than allowed freshness window."""
        ts_field = rule.timestamp_field or rule.field or ""
        freshness_min = rule.freshness_minutes or 60
        try:
            cursor = self._db.cursor()
            sql = (
                f'SELECT COUNT(*) AS total, '  # nosec B608
                f"SUM(CASE WHEN \"{ts_field}\"::TIMESTAMP < NOW() - INTERVAL '{freshness_min} minutes' "
                f'THEN 1 ELSE 0 END) AS stale '
                f'FROM "{table_name}" WHERE "{ts_field}" IS NOT NULL'
            )
            result = cursor.execute(sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row["total"])
            stale = int(row["stale"])
            return RuleResult(
                rule="freshness",
                field=ts_field,
                passed=stale == 0,
                violation_count=stale,
                total_count=total,
                details=f"{stale} stale record(s) in {total} rows (>{freshness_min}min)",
            )
        except Exception as exc:
            return RuleResult(
                rule="freshness", field=ts_field, passed=False, details=f"error: {exc}"
            )

    def _check_custom_sql(self, rule: QualityRule, table_name: str) -> RuleResult:
        """Execute a custom SQL expression that returns violation_count and total_count."""
        field_name = rule.field or "custom"
        sql_expr = rule.sql or ""
        if not sql_expr:
            return RuleResult(
                rule="custom_sql", field=field_name, passed=False,
                details="no SQL expression provided",
            )
        try:
            cursor = self._db.cursor()
            # Custom SQL must return columns: total, violations
            final_sql = sql_expr.replace("{table}", f'"{table_name}"')
            result = cursor.execute(final_sql)
            cols = [desc[0] for desc in result.description]
            row = dict(zip(cols, result.fetchone()))
            cursor.close()

            total = int(row.get("total", 0))
            violations = int(row.get("violations", 0))
            return RuleResult(
                rule="custom_sql",
                field=field_name,
                passed=violations == 0,
                violation_count=violations,
                total_count=total,
                details=f"{violations} violation(s) in {total} rows",
            )
        except Exception as exc:
            return RuleResult(
                rule="custom_sql", field=field_name, passed=False, details=f"error: {exc}"
            )
