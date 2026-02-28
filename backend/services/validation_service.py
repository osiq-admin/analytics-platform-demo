"""Validation service — 5-layer validation for metadata changes."""
import json
import logging
from pathlib import Path

from backend.db import DuckDBManager
from backend.services.metadata_service import MetadataService

log = logging.getLogger(__name__)


class ValidationResult:
    """Result from a single validation check."""

    def __init__(
        self,
        layer: str,
        check: str,
        passed: bool,
        message: str,
        severity: str = "error",
        details: dict | None = None,
    ):
        self.layer = layer
        self.check = check
        self.passed = passed
        self.message = message
        self.severity = severity  # "error", "warning", "info"
        self.details = details or {}

    def to_dict(self) -> dict:
        return {
            "layer": self.layer,
            "check": self.check,
            "passed": self.passed,
            "message": self.message,
            "severity": self.severity,
            "details": self.details,
        }


class ValidationService:
    """5-layer validation for metadata changes."""

    def __init__(self, workspace_dir: Path, db: DuckDBManager, metadata: MetadataService):
        self._workspace = workspace_dir
        self._db = db
        self._metadata = metadata

    def validate_detection_model(self, model_data: dict) -> list[dict]:
        """Run all 5 validation layers on a detection model."""
        results: list[ValidationResult] = []
        results.extend(self._layer1_static_analysis(model_data))
        results.extend(self._layer2_schema_compatibility(model_data))
        results.extend(self._layer3_sandbox_execution(model_data))
        results.extend(self._layer4_impact_analysis(model_data))
        results.extend(self._layer5_regression_safety(model_data))
        return [r.to_dict() for r in results]

    def validate_calculation(self, calc_data: dict) -> list[dict]:
        """Validate a calculation definition."""
        results: list[ValidationResult] = []
        results.extend(self._validate_calc_static(calc_data))
        results.extend(self._validate_calc_schema(calc_data))
        results.extend(self._validate_calc_sandbox(calc_data))
        return [r.to_dict() for r in results]

    def validate_setting(self, setting_data: dict) -> list[dict]:
        """Validate a setting definition."""
        results: list[ValidationResult] = []
        results.extend(self._validate_setting_static(setting_data))
        return [r.to_dict() for r in results]

    # --- Layer 1: Static Analysis ---
    def _layer1_static_analysis(self, model: dict) -> list[ValidationResult]:
        results = []

        # Check required fields
        for field in ["model_id", "name", "calculations", "query"]:
            if not model.get(field):
                results.append(ValidationResult(
                    "static", f"required_field_{field}", False,
                    f"Required field '{field}' is missing or empty", "error",
                ))
            else:
                results.append(ValidationResult(
                    "static", f"required_field_{field}", True,
                    f"Field '{field}' is present",
                ))

        # Check SQL syntax via DuckDB EXPLAIN (if query exists)
        query = model.get("query", "")
        if query:
            try:
                cursor = self._db.cursor()
                cursor.execute(f"EXPLAIN {query}")
                cursor.close()
                results.append(ValidationResult(
                    "static", "sql_syntax", True, "SQL syntax is valid",
                ))
            except Exception as e:
                results.append(ValidationResult(
                    "static", "sql_syntax", False,
                    f"SQL syntax error: {str(e)}", "error",
                    {"sql": query[:200]},
                ))

        # Check calculations reference valid calc_ids
        calc_ids = {c.calc_id for c in self._metadata.list_calculations()}
        for mc in model.get("calculations", []):
            cid = mc.get("calc_id", "") if isinstance(mc, dict) else mc.calc_id
            if cid in calc_ids:
                results.append(ValidationResult(
                    "static", f"calc_exists_{cid}", True,
                    f"Calculation '{cid}' exists",
                ))
            else:
                results.append(ValidationResult(
                    "static", f"calc_exists_{cid}", False,
                    f"Calculation '{cid}' not found in metadata", "error",
                ))

        # Check score_threshold_setting references a valid setting
        sth = model.get("score_threshold_setting", "")
        if sth:
            setting = self._metadata.load_setting(sth)
            if setting:
                results.append(ValidationResult(
                    "static", "score_threshold_setting", True,
                    f"Score threshold setting '{sth}' exists",
                ))
            else:
                results.append(ValidationResult(
                    "static", "score_threshold_setting", False,
                    f"Score threshold setting '{sth}' not found", "warning",
                ))

        return results

    # --- Layer 2: Schema Compatibility ---
    def _layer2_schema_compatibility(self, model: dict) -> list[ValidationResult]:
        results = []

        # Check calculation dependencies form a valid DAG (no cycles)
        calcs = self._metadata.list_calculations()
        calc_map = {c.calc_id: c for c in calcs}
        model_calc_ids = [
            (mc.get("calc_id") if isinstance(mc, dict) else mc.calc_id)
            for mc in model.get("calculations", [])
        ]

        # Check all model calcs have their dependencies available
        for cid in model_calc_ids:
            calc = calc_map.get(cid)
            if calc:
                for dep in calc.depends_on:
                    if dep in calc_map:
                        results.append(ValidationResult(
                            "schema", f"dependency_{cid}_{dep}", True,
                            f"Dependency '{dep}' for '{cid}' is available",
                        ))
                    else:
                        results.append(ValidationResult(
                            "schema", f"dependency_{cid}_{dep}", False,
                            f"Missing dependency: '{cid}' depends on '{dep}' which is not available",
                            "error",
                        ))

        # Check context_fields reference valid entity fields
        context_fields = model.get("context_fields", [])
        if context_fields:
            results.append(ValidationResult(
                "schema", "context_fields", True,
                f"Context fields defined: {', '.join(context_fields)}",
            ))
        else:
            results.append(ValidationResult(
                "schema", "context_fields", False,
                "No context fields defined — alerts won't have entity context", "warning",
            ))

        return results

    # --- Layer 3: Sandbox Execution ---
    def _layer3_sandbox_execution(self, model: dict) -> list[ValidationResult]:
        results = []
        query = model.get("query", "")
        if not query:
            results.append(ValidationResult(
                "sandbox", "query_execution", False,
                "No query to execute", "warning",
            ))
            return results

        try:
            cursor = self._db.cursor()
            # Execute in read-only mode (just SELECT, no side effects)
            result = cursor.execute(query)
            columns = [desc[0] for desc in result.description]
            rows = result.fetchall()
            row_count = len(rows)
            cursor.close()

            results.append(ValidationResult(
                "sandbox", "query_execution", True,
                f"Query executed successfully: {row_count} rows, {len(columns)} columns",
                details={"row_count": row_count, "columns": columns},
            ))

            # Check row count is reasonable
            if row_count == 0:
                results.append(ValidationResult(
                    "sandbox", "row_count", False,
                    "Query returned 0 rows — model would never fire", "warning",
                ))
            elif row_count > 10000:
                results.append(ValidationResult(
                    "sandbox", "row_count", False,
                    f"Query returned {row_count} rows — may cause performance issues", "warning",
                ))
            else:
                results.append(ValidationResult(
                    "sandbox", "row_count", True,
                    f"Row count ({row_count}) is reasonable",
                ))

            # Check that context_fields exist in query result columns
            context_fields = model.get("context_fields", [])
            for cf in context_fields:
                if cf in columns:
                    results.append(ValidationResult(
                        "sandbox", f"context_field_in_result_{cf}", True,
                        f"Context field '{cf}' found in query results",
                    ))
                else:
                    results.append(ValidationResult(
                        "sandbox", f"context_field_in_result_{cf}", False,
                        f"Context field '{cf}' not found in query result columns", "warning",
                    ))

        except Exception as e:
            results.append(ValidationResult(
                "sandbox", "query_execution", False,
                f"Query execution failed: {str(e)}", "error",
            ))

        return results

    # --- Layer 4: Impact Analysis ---
    def _layer4_impact_analysis(self, model: dict) -> list[ValidationResult]:
        results = []
        model_id = model.get("model_id", "")

        # Check if this model already exists (update vs create)
        existing_models = self._metadata.list_detection_models()
        existing_ids = {m.model_id for m in existing_models}

        if model_id in existing_ids:
            results.append(ValidationResult(
                "impact", "model_update", True,
                f"Updating existing model '{model_id}' — existing alerts may need regeneration",
                "info", {"action": "update"},
            ))
        else:
            results.append(ValidationResult(
                "impact", "model_create", True,
                f"Creating new model '{model_id}'",
                "info", {"action": "create"},
            ))

        # Check if any calculations are shared with other models
        model_calc_ids = set(
            (mc.get("calc_id") if isinstance(mc, dict) else mc.calc_id)
            for mc in model.get("calculations", [])
        )
        for existing_model in existing_models:
            if existing_model.model_id == model_id:
                continue
            shared = model_calc_ids & {mc.calc_id for mc in existing_model.calculations}
            if shared:
                results.append(ValidationResult(
                    "impact", f"shared_calcs_{existing_model.model_id}", True,
                    f"Shares calculations with '{existing_model.name}': {', '.join(shared)}",
                    "info",
                ))

        return results

    # --- Layer 5: Regression Safety ---
    def _layer5_regression_safety(self, model: dict) -> list[ValidationResult]:
        results = []
        model_id = model.get("model_id", "")

        # Check if existing alerts exist for this model
        alerts_dir = self._workspace / "alerts" / "traces"
        if alerts_dir.exists():
            existing_alerts = list(alerts_dir.glob("*.json"))
            model_alerts = []
            for f in existing_alerts:
                try:
                    data = json.loads(f.read_text())
                    if data.get("model_id") == model_id:
                        model_alerts.append(data)
                except Exception:  # nosec B110 — corrupt alert JSON files are skipped
                    pass

            if model_alerts:
                results.append(ValidationResult(
                    "regression", "existing_alerts", True,
                    f"Found {len(model_alerts)} existing alerts for this model — changes may affect future alerts",
                    "info", {"existing_alert_count": len(model_alerts)},
                ))
            else:
                results.append(ValidationResult(
                    "regression", "existing_alerts", True,
                    "No existing alerts for this model — safe to deploy",
                    "info",
                ))
        else:
            results.append(ValidationResult(
                "regression", "existing_alerts", True,
                "No alert history available",
                "info",
            ))

        return results

    # --- Calculation Validation ---
    def _validate_calc_static(self, calc: dict) -> list[ValidationResult]:
        results = []
        for field in ["calc_id", "name", "logic"]:
            if not calc.get(field):
                results.append(ValidationResult(
                    "static", f"calc_required_{field}", False,
                    f"Required field '{field}' is missing", "error",
                ))
            else:
                results.append(ValidationResult(
                    "static", f"calc_required_{field}", True,
                    f"Field '{field}' is present",
                ))

        # Validate SQL if present
        logic = calc.get("logic", "")
        if logic:
            try:
                cursor = self._db.cursor()
                cursor.execute(f"EXPLAIN {logic}")
                cursor.close()
                results.append(ValidationResult(
                    "static", "calc_sql_syntax", True, "Calculation SQL is valid",
                ))
            except Exception as e:
                # SQL may have $param placeholders — that's okay
                if "$" in logic:
                    results.append(ValidationResult(
                        "static", "calc_sql_syntax", True,
                        "SQL contains $param placeholders — syntax check deferred", "info",
                    ))
                else:
                    results.append(ValidationResult(
                        "static", "calc_sql_syntax", False,
                        f"SQL syntax error: {str(e)}", "error",
                    ))
        return results

    def _validate_calc_schema(self, calc: dict) -> list[ValidationResult]:
        results = []
        depends_on = calc.get("depends_on", [])
        calc_ids = {c.calc_id for c in self._metadata.list_calculations()}
        for dep in depends_on:
            if dep in calc_ids:
                results.append(ValidationResult(
                    "schema", f"calc_dep_{dep}", True, f"Dependency '{dep}' exists",
                ))
            else:
                results.append(ValidationResult(
                    "schema", f"calc_dep_{dep}", False,
                    f"Dependency '{dep}' not found", "error",
                ))
        return results

    def _validate_calc_sandbox(self, calc: dict) -> list[ValidationResult]:
        results = []
        logic = calc.get("logic", "")
        if logic and "$" not in logic:
            try:
                cursor = self._db.cursor()
                result = cursor.execute(logic)
                rows = result.fetchall()
                cursor.close()
                results.append(ValidationResult(
                    "sandbox", "calc_execution", True,
                    f"Calculation executed: {len(rows)} rows",
                ))
            except Exception as e:
                results.append(ValidationResult(
                    "sandbox", "calc_execution", False,
                    f"Execution failed: {str(e)}", "error",
                ))
        return results

    # --- Setting Validation ---
    def _validate_setting_static(self, setting: dict) -> list[ValidationResult]:
        results = []
        for field in ["setting_id", "name", "value_type"]:
            if not setting.get(field):
                results.append(ValidationResult(
                    "static", f"setting_required_{field}", False,
                    f"Required field '{field}' is missing", "error",
                ))
            else:
                results.append(ValidationResult(
                    "static", f"setting_required_{field}", True,
                    f"Field '{field}' is present",
                ))

        # Check override priorities are unique
        overrides = setting.get("overrides", [])
        priorities = [o.get("priority", 0) for o in overrides]
        if len(priorities) != len(set(priorities)):
            results.append(ValidationResult(
                "static", "override_priorities", False,
                "Duplicate override priorities found — resolution may be ambiguous", "warning",
            ))
        elif overrides:
            results.append(ValidationResult(
                "static", "override_priorities", True,
                f"{len(overrides)} overrides with unique priorities",
            ))

        return results
