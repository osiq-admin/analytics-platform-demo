"""Pipeline orchestrator — runs medallion pipeline stages with optional contract validation."""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from backend.db import DuckDBManager
from backend.services.contract_validator import ContractValidator, ContractValidationResult

if TYPE_CHECKING:
    from backend.engine.calculation_engine import CalculationEngine
    from backend.engine.detection_engine import DetectionEngine
    from backend.services.metadata_service import MetadataService

log = logging.getLogger(__name__)


@dataclass
class StageResult:
    """Result of executing a single pipeline stage."""

    stage_id: str
    status: str = "pending"  # pending | running | completed | failed
    started_at: str = ""
    completed_at: str = ""
    duration_ms: float = 0.0
    steps: list[dict] = field(default_factory=list)
    contract_validation: ContractValidationResult | None = None
    error: str = ""


@dataclass
class PipelineRunResult:
    """Aggregate result of a full pipeline run."""

    run_id: str = ""
    status: str = "completed"  # completed | failed | partial
    stages: list[StageResult] = field(default_factory=list)
    total_duration_ms: float = 0.0


class PipelineOrchestrator:
    """Executes medallion pipeline stages in order, with optional contract validation."""

    def __init__(
        self,
        workspace_dir: Path,
        db: DuckDBManager,
        metadata: "MetadataService",
        calc_engine: "CalculationEngine | None" = None,
        detection_engine: "DetectionEngine | None" = None,
    ) -> None:
        self._workspace = workspace_dir
        self._db = db
        self._metadata = metadata
        self._calc_engine = calc_engine
        self._detection_engine = detection_engine
        self._validator = ContractValidator(db)

    def run_stage(self, stage_id: str) -> StageResult:
        """Execute a single pipeline stage by its stage_id."""
        result = StageResult(stage_id=stage_id)
        result.status = "running"
        result.started_at = datetime.now(timezone.utc).isoformat()

        try:
            config = self._metadata.load_pipeline_stages()
            stage = None
            for s in config.stages:
                if s.stage_id == stage_id:
                    stage = s
                    break

            if stage is None:
                result.status = "failed"
                result.error = f"Stage '{stage_id}' not found"
                result.completed_at = datetime.now(timezone.utc).isoformat()
                return result

            # If no transformation_id, skip the stage
            if not stage.transformation_id:
                result.steps.append({"type": "skip", "detail": "no transformation_id"})
                result.status = "completed"
                result.completed_at = datetime.now(timezone.utc).isoformat()
                self._compute_duration(result)
                return result

            # Load transformation metadata
            transformation = self._metadata.load_transformation(stage.transformation_id)
            if transformation is None:
                result.steps.append({"type": "skip", "detail": f"transformation '{stage.transformation_id}' not found"})
                result.status = "completed"
                result.completed_at = datetime.now(timezone.utc).isoformat()
                self._compute_duration(result)
                return result

            # Decide execution path based on SQL template content
            sql = transformation.sql_template.strip()
            if sql and not sql.startswith("--"):
                # Real SQL — execute template directly
                self._execute_sql_template(transformation, result)
            else:
                # Comment-only or empty SQL — run programmatic execution
                self._execute_programmatic(result)

            # Contract validation if configured
            if stage.contract_id:
                self._run_contract_validation(stage, result)

            result.status = "completed"

        except Exception as exc:
            result.status = "failed"
            result.error = str(exc)
            log.exception("Stage %s failed: %s", stage_id, exc)

        result.completed_at = datetime.now(timezone.utc).isoformat()
        self._compute_duration(result)
        return result

    def run_all(self) -> PipelineRunResult:
        """Run all pipeline stages in order."""
        run_id = str(uuid.uuid4())
        run_result = PipelineRunResult(run_id=run_id)
        start = datetime.now(timezone.utc)

        config = self._metadata.load_pipeline_stages()
        stages_sorted = sorted(config.stages, key=lambda s: s.order)

        for stage in stages_sorted:
            stage_result = self.run_stage(stage.stage_id)
            run_result.stages.append(stage_result)
            if stage_result.status == "failed":
                run_result.status = "partial"

        end = datetime.now(timezone.utc)
        run_result.total_duration_ms = (end - start).total_seconds() * 1000

        # If no failures occurred, mark completed
        if all(s.status == "completed" for s in run_result.stages):
            run_result.status = "completed"

        return run_result

    # ------------------------------------------------------------------
    # Internal execution helpers
    # ------------------------------------------------------------------

    def _execute_programmatic(self, result: StageResult) -> None:
        """Run calculations via DAG + detection models programmatically."""
        # Run calculation engine if available
        if self._calc_engine is not None:
            dag = self._calc_engine.build_dag()
            for calc in dag:
                self._calc_engine._execute(calc)
                result.steps.append({"type": "calc", "detail": f"calc:{calc.calc_id}"})

        # Run detection engine if available
        if self._detection_engine is not None:
            models = self._metadata.list_detection_models()
            for model in models:
                self._detection_engine.evaluate_model(model.model_id)
                result.steps.append({"type": "detect", "detail": f"detect:{model.model_id}"})

    def _execute_sql_template(self, transformation, result: StageResult) -> None:
        """Execute a SQL template transformation."""
        try:
            cursor = self._db.cursor()
            cursor.execute(transformation.sql_template)
            cursor.close()
            result.steps.append({"type": "sql", "detail": f"executed: {transformation.transformation_id}"})
        except Exception as exc:
            result.steps.append({"type": "sql_error", "detail": str(exc)})
            raise

    def _run_contract_validation(self, stage, result: StageResult) -> None:
        """Load and validate data contract for the stage."""
        contract = self._metadata.load_data_contract(stage.contract_id)
        if contract is None:
            result.steps.append({"type": "contract_skip", "detail": f"contract '{stage.contract_id}' not found"})
            return

        table_name = self._resolve_output_table(stage)
        if table_name is None:
            result.steps.append({"type": "contract_skip", "detail": "no output table resolved"})
            return

        validation = self._validator.validate(contract, table_name)
        result.contract_validation = validation
        result.steps.append({"type": "contract", "detail": f"validated: {validation.passed}"})

    def _resolve_output_table(self, stage) -> str | None:
        """Resolve the output table name for a stage based on its target tier."""
        if stage.tier_to == "gold":
            return "alerts"
        return None

    # ------------------------------------------------------------------
    # Timing helper
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_duration(result: StageResult) -> None:
        """Compute duration_ms from started_at and completed_at timestamps."""
        if result.started_at and result.completed_at:
            try:
                start = datetime.fromisoformat(result.started_at)
                end = datetime.fromisoformat(result.completed_at)
                result.duration_ms = (end - start).total_seconds() * 1000
            except (ValueError, TypeError):
                pass
