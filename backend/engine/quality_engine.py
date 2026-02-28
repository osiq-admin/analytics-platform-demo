"""Quality engine for ISO 8000/25012-aligned per-dimension scoring.

Wraps ContractValidator to produce weighted dimension scores from data
contract quality rules evaluated against DuckDB tables.
"""
from __future__ import annotations

from backend.db import DuckDBManager
from backend.models.medallion import DataContract
from backend.models.quality import (
    DimensionScore,
    EntityQualityScore,
    QualityDimensionsConfig,
    EntityProfile,
    QualityProfile,
)
from backend.services.contract_validator import ContractValidator, RuleResult


# Map each rule type to its primary quality dimension
_RULE_TO_DIMENSION: dict[str, str] = {
    "not_null": "completeness",
    "unique": "uniqueness",
    "range_check": "accuracy",
    "enum_check": "validity",
    "regex_match": "validity",
    "referential_integrity": "consistency",
    "freshness": "timeliness",
    "custom_sql": "consistency",
}


class QualityEngine:
    """Evaluates data quality rules and produces ISO 8000/25012 dimension scores.

    Uses ContractValidator for rule evaluation, then maps rule results
    to quality dimensions with weighted scoring.
    """

    def __init__(self, db: DuckDBManager, dimensions: QualityDimensionsConfig) -> None:
        self._db = db
        self._validator = ContractValidator(db)
        self._dimensions = {d.id: d for d in dimensions.dimensions}

    def _score_dimension(self, dim_id: str, dim_def, rules: list[RuleResult]) -> DimensionScore:
        """Compute a single dimension's quality score from its rule results."""
        if not rules:
            return DimensionScore(dimension_id=dim_id, score=100.0)

        total_evaluated = len(rules)
        total_passed = sum(1 for r in rules if r.passed)
        total_violations = sum(r.violation_count for r in rules)
        total_records = max((r.total_count for r in rules), default=0)

        if dim_def.score_method == "binary":
            score = 100.0 if total_passed == total_evaluated else 0.0
        else:
            score = round((total_passed / total_evaluated) * 100, 1) if total_evaluated > 0 else 100.0

        # Determine status from thresholds
        thresholds = dim_def.thresholds
        if score >= thresholds.get("good", 99):
            score_status = "good"
        elif score >= thresholds.get("warning", 95):
            score_status = "warning"
        else:
            score_status = "critical"

        return DimensionScore(
            dimension_id=dim_id,
            score=score,
            rules_evaluated=total_evaluated,
            rules_passed=total_passed,
            violation_count=total_violations,
            total_count=total_records,
            status=score_status,
        )

    def _weighted_overall(self, dimension_scores: list[DimensionScore]) -> float:
        """Compute weighted overall score from dimension scores."""
        overall = 0.0
        total_weight = 0.0
        for ds in dimension_scores:
            dim_def = self._dimensions.get(ds.dimension_id)
            weight = dim_def.weight if dim_def else 0.0
            overall += ds.score * weight
            total_weight += weight
        return round(overall / total_weight, 1) if total_weight > 0 else 0.0

    def score_entity(
        self, contract: DataContract, table_name: str,
    ) -> EntityQualityScore:
        """Evaluate contract rules and compute per-dimension quality scores.

        Returns an EntityQualityScore with overall weighted score and
        per-dimension breakdowns.
        """
        validation = self._validator.validate(contract, table_name)

        # Group rule results by dimension
        dim_results: dict[str, list[RuleResult]] = {d_id: [] for d_id in self._dimensions}
        for rr in validation.rule_results:
            dim_id = _RULE_TO_DIMENSION.get(rr.rule, "consistency")
            if dim_id in dim_results:
                dim_results[dim_id].append(rr)

        # Compute per-dimension scores
        dimension_scores = [
            self._score_dimension(dim_id, dim_def, dim_results.get(dim_id, []))
            for dim_id, dim_def in self._dimensions.items()
        ]

        return EntityQualityScore(
            entity=contract.entity,
            tier=contract.target_tier,
            overall_score=self._weighted_overall(dimension_scores),
            dimension_scores=dimension_scores,
            contract_id=contract.contract_id,
        )

    def profile_entity(self, table_name: str, entity: str, tier: str) -> EntityProfile:
        """Profile all columns of a table for data quality analysis.

        Returns per-field statistics: null count, distinct count, min/max,
        top values.
        """
        try:
            cursor = self._db.cursor()
            # Get column names
            cursor.execute(f'SELECT * FROM "{table_name}" LIMIT 0')  # nosec B608
            columns = [desc[0] for desc in cursor.description]
            cursor.close()

            # Get row count
            cursor = self._db.cursor()
            row = cursor.execute(f'SELECT COUNT(*) AS cnt FROM "{table_name}"').fetchone()  # nosec B608
            row_count = int(row[0]) if row else 0
            cursor.close()

            field_profiles: list[QualityProfile] = []
            for col in columns:
                cursor = self._db.cursor()
                sql = (
                    f'SELECT '  # nosec B608
                    f'COUNT(*) AS total, '
                    f'SUM(CASE WHEN "{col}" IS NULL THEN 1 ELSE 0 END) AS nulls, '
                    f'COUNT(DISTINCT "{col}") AS distincts, '
                    f'MIN("{col}")::VARCHAR AS min_val, '
                    f'MAX("{col}")::VARCHAR AS max_val '
                    f'FROM "{table_name}"'
                )
                result = cursor.execute(sql)
                cols = [desc[0] for desc in result.description]
                r = dict(zip(cols, result.fetchone()))
                cursor.close()

                total = int(r["total"])
                nulls = int(r["nulls"])
                field_profiles.append(QualityProfile(
                    field_name=col,
                    total_count=total,
                    null_count=nulls,
                    null_pct=round((nulls / total) * 100, 2) if total > 0 else 0.0,
                    distinct_count=int(r["distincts"]),
                    min_value=str(r["min_val"] or ""),
                    max_value=str(r["max_val"] or ""),
                ))

            return EntityProfile(
                entity=entity,
                tier=tier,
                table_name=table_name,
                row_count=row_count,
                field_profiles=field_profiles,
            )
        except Exception:
            return EntityProfile(entity=entity, tier=tier, table_name=table_name)
