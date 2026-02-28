"""Detection engine — evaluates detection models against calculation results with graduated scoring."""
import logging
import uuid
from pathlib import Path

from backend.db import DuckDBManager
from backend.engine.settings_resolver import SettingsResolver
from backend.models.alerts import AlertTrace, CalculationScore, CalculationTraceEntry, SettingsTraceEntry
from backend.models.detection import DetectionModelDefinition, ModelCalculation, Strictness
from backend.models.settings import ScoreStep
from backend.services.metadata_service import MetadataService

log = logging.getLogger(__name__)



class DetectionEngine:
    def __init__(
        self,
        workspace_dir: Path,
        db: DuckDBManager,
        metadata: MetadataService,
        resolver: SettingsResolver,
    ):
        self._workspace = workspace_dir
        self._db = db
        self._metadata = metadata
        self._resolver = resolver

    def evaluate_model(self, model_id: str) -> list[AlertTrace]:
        """Evaluate a detection model against calculation results. Returns AlertTrace per candidate."""
        model = self._metadata.load_detection_model(model_id)
        if model is None:
            raise ValueError(f"Detection model '{model_id}' not found")

        # Execute the model's query to get candidate rows
        candidates = self._execute_query(model.query)
        if not candidates:
            return []

        alerts = []
        for row in candidates:
            alert = self._evaluate_candidate(model, row, len(candidates))
            alerts.append(alert)

        return alerts

    def evaluate_all(self) -> list[AlertTrace]:
        """Evaluate all detection models. Returns all AlertTrace objects."""
        models = self._metadata.list_detection_models()
        all_alerts = []
        for model in models:
            try:
                alerts = self.evaluate_model(model.model_id)
                all_alerts.extend(alerts)
            except Exception as e:
                log.error("Error evaluating model %s: %s", model.model_id, e)
        return all_alerts

    def _execute_query(self, sql: str) -> list[dict]:
        """Execute detection query and return rows as dicts."""
        if not sql:
            return []
        cursor = self._db.cursor()
        try:
            result = cursor.execute(sql)
            columns = [desc[0] for desc in result.description]
            rows = result.fetchall()
            return [dict(zip(columns, row)) for row in rows]
        finally:
            cursor.close()

    def _evaluate_candidate(self, model: DetectionModelDefinition, row: dict, sql_row_count: int = 0) -> AlertTrace:
        """Evaluate a single candidate row against the model's calculations."""
        entity_context = {
            k: str(v) for k, v in row.items()
            if k in model.context_fields and v is not None
        }

        # Track which query columns provided entity context
        entity_context_source = {
            k: k for k in entity_context
        }

        # Resolve score threshold for this entity context
        score_threshold = self._resolve_score_threshold(model, entity_context)

        # Evaluate each calculation
        calc_scores: list[CalculationScore] = []
        settings_trace: list[SettingsTraceEntry] = []
        calc_trace_entries: list[CalculationTraceEntry] = []
        scoring_breakdown: list[dict] = []
        resolved_settings: dict = {}
        accumulated_score = 0.0

        for mc in model.calculations:
            cs, traces = self._evaluate_calculation(mc, row, entity_context)
            calc_scores.append(cs)
            settings_trace.extend(traces)
            accumulated_score += cs.score

            # Build calculation trace entry
            calc_trace_entries.append(CalculationTraceEntry(
                calc_id=mc.calc_id,
                value_field=mc.value_field or mc.calc_id,
                computed_value=cs.computed_value,
                threshold_setting_id=mc.threshold_setting,
                score_steps_setting_id=mc.score_steps_setting,
                score_awarded=cs.score,
                score_step_matched=cs.score_step_matched,
                passed=cs.threshold_passed,
                strictness=mc.strictness.value,
            ))

            # Build scoring breakdown entry
            scoring_breakdown.append({
                "calc_id": mc.calc_id,
                "value_field": mc.value_field or mc.calc_id,
                "computed_value": cs.computed_value,
                "score": cs.score,
                "step_matched": cs.score_step_matched,
                "passed": cs.threshold_passed,
            })

            # Capture resolved settings
            for t in traces:
                resolved_settings[t.setting_id] = {
                    "value": t.resolved_value,
                    "why": t.why,
                    "matched_override": t.matched_override,
                }

        # Determine alert trigger
        must_pass_ok = all(
            cs.threshold_passed
            for cs, mc in zip(calc_scores, model.calculations)
            if mc.strictness == Strictness.MUST_PASS
        )
        all_passed = all(cs.threshold_passed for cs in calc_scores)
        score_ok = accumulated_score >= score_threshold

        if all_passed:
            trigger_path = "all_passed"
        elif score_ok:
            trigger_path = "score_based"
        else:
            trigger_path = "none"

        alert_fired = must_pass_ok and (all_passed or score_ok)

        alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"

        return AlertTrace(
            alert_id=alert_id,
            model_id=model.model_id,
            model_name=model.name,
            entity_context=entity_context,
            calculation_scores=calc_scores,
            accumulated_score=accumulated_score,
            score_threshold=score_threshold,
            trigger_path=trigger_path,
            alert_fired=alert_fired,
            # Explainability fields
            executed_sql=model.query,
            sql_row_count=sql_row_count,
            resolved_settings=resolved_settings,
            calculation_traces=calc_trace_entries,
            scoring_breakdown=scoring_breakdown,
            entity_context_source=entity_context_source,
            # Legacy fields
            settings_trace=settings_trace,
            calculation_trace={"query_row": {k: str(v) for k, v in row.items()}},
        )

    def _evaluate_calculation(
        self, mc: ModelCalculation, row: dict, context: dict[str, str]
    ) -> tuple[CalculationScore, list[SettingsTraceEntry]]:
        """Evaluate a single model calculation against the candidate row."""
        traces: list[SettingsTraceEntry] = []

        # Get the computed value from the query row using metadata-driven value_field
        value_column = mc.value_field or mc.calc_id
        computed_value = float(row.get(value_column, 0) or 0)

        # Resolve score steps via settings
        score = 0.0
        score_step_matched = None
        if mc.score_steps_setting:
            setting = self._metadata.load_setting(mc.score_steps_setting)
            if setting:
                resolution = self._resolver.resolve(setting, context)
                traces.append(SettingsTraceEntry(
                    setting_id=setting.setting_id,
                    setting_name=setting.name,
                    matched_override=resolution.matched_override.model_dump() if resolution.matched_override else None,
                    resolved_value=str(resolution.value),
                    why=resolution.why,
                ))

                # Parse score steps from resolved value
                steps = self._parse_score_steps(resolution.value)
                score = self._resolver.evaluate_score(steps, computed_value)

                # Find matched step for trace
                for step in steps:
                    min_v = step.min_value if step.min_value is not None else float("-inf")
                    max_v = step.max_value if step.max_value is not None else float("inf")
                    if min_v <= computed_value < max_v or (max_v == float("inf") and computed_value >= min_v):
                        score_step_matched = {"min": step.min_value, "max": step.max_value, "score": step.score}
                        break

        # Gate calcs (MUST_PASS with no score steps) auto-pass when present in
        # query results — the query already pre-filters for the required condition.
        # Scored calcs pass when score > 0 (value fell in a scoring range).
        if not mc.score_steps_setting:
            threshold_passed = True
        else:
            threshold_passed = score > 0

        return CalculationScore(
            calc_id=mc.calc_id,
            computed_value=computed_value,
            threshold=None,
            threshold_passed=threshold_passed,
            score=score,
            score_step_matched=score_step_matched,
            strictness=mc.strictness,
        ), traces

    def _resolve_score_threshold(self, model: DetectionModelDefinition, context: dict[str, str]) -> float:
        """Resolve the model's score threshold for the given entity context."""
        setting = self._metadata.load_setting(model.score_threshold_setting)
        if setting is None:
            log.warning("Score threshold setting '%s' not found, using 0", model.score_threshold_setting)
            return 0.0
        resolution = self._resolver.resolve(setting, context)
        return float(resolution.value)

    def _parse_score_steps(self, value) -> list[ScoreStep]:
        """Parse score steps from a resolved setting value (list of dicts or ScoreStep objects)."""
        if isinstance(value, list):
            return [
                ScoreStep(
                    min_value=s.get("min_value") if isinstance(s, dict) else s.min_value,
                    max_value=s.get("max_value") if isinstance(s, dict) else s.max_value,
                    score=s.get("score") if isinstance(s, dict) else s.score,
                )
                for s in value
            ]
        return []
