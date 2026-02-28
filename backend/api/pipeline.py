"""Pipeline execution and monitoring endpoints."""
import logging
import time

from fastapi import APIRouter, Request

from backend.config import settings
from backend.engine.calculation_engine import CalculationEngine
from backend.engine.detection_engine import DetectionEngine
from backend.engine.settings_resolver import SettingsResolver
from backend.services.pipeline_orchestrator import PipelineOrchestrator

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/run")
def run_pipeline(request: Request):
    """Execute the full calculation pipeline, returning steps for the frontend."""
    resolver = SettingsResolver()
    engine = CalculationEngine(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
        resolver,
    )
    try:
        dag = engine.build_dag()
        steps = []
        for calc in dag:
            t0 = time.time()
            try:
                result = engine._execute(calc)
                duration_ms = int((time.time() - t0) * 1000)
                steps.append({
                    "calc_id": calc.calc_id,
                    "name": calc.name,
                    "layer": calc.layer.value,
                    "status": "done",
                    "duration_ms": duration_ms,
                    "row_count": result.get("row_count", 0),
                    "depends_on": calc.depends_on,
                })
            except Exception as calc_err:
                duration_ms = int((time.time() - t0) * 1000)
                steps.append({
                    "calc_id": calc.calc_id,
                    "name": calc.name,
                    "layer": calc.layer.value,
                    "status": "error",
                    "duration_ms": duration_ms,
                    "error": str(calc_err),
                    "depends_on": calc.depends_on,
                })
        return {"status": "completed", "steps": steps}
    except Exception as e:
        log.error("Pipeline run failed: %s", e)
        return {"status": "error", "error": str(e), "steps": []}


@router.get("/status")
def pipeline_status(request: Request):
    """Get pipeline status — check if calculation results exist."""
    results_dir = settings.workspace_dir / "results"
    if not results_dir.exists():
        return {"state": "idle", "progress": 0, "calculations": []}

    calcs = []
    for layer_dir in sorted(results_dir.iterdir()):
        if layer_dir.is_dir():
            for pq_file in sorted(layer_dir.glob("*.parquet")):
                calcs.append({
                    "name": pq_file.stem,
                    "layer": layer_dir.name,
                    "status": "completed",
                })

    progress = 100 if calcs else 0
    return {"state": "completed" if calcs else "idle", "progress": progress, "calculations": calcs}


@router.get("/dag")
def get_dag(request: Request):
    """Get the calculation DAG (topological order)."""
    resolver = SettingsResolver()
    engine = CalculationEngine(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
        resolver,
    )
    try:
        dag = engine.build_dag()
        return [
            {
                "calc_id": c.calc_id,
                "name": c.name,
                "layer": c.layer.value,
                "depends_on": c.depends_on,
            }
            for c in dag
        ]
    except Exception as e:
        return {"error": str(e)}


# ---------------------------------------------------------------------------
# Stage-based endpoints (medallion pipeline)
# ---------------------------------------------------------------------------


@router.get("/stages")
def list_stages(request: Request):
    """List all pipeline stages from medallion metadata, sorted by order."""
    config = request.app.state.metadata.load_pipeline_stages()
    stages_sorted = sorted(config.stages, key=lambda s: s.order)
    return [
        {
            "stage_id": s.stage_id,
            "name": s.name,
            "tier_from": s.tier_from,
            "tier_to": s.tier_to,
            "order": s.order,
            "depends_on": s.depends_on,
            "entities": s.entities,
            "parallel": s.parallel,
            "transformation_id": s.transformation_id,
            "contract_id": s.contract_id,
        }
        for s in stages_sorted
    ]


@router.post("/stages/{stage_id}/run")
def run_stage(stage_id: str, request: Request):
    """Execute a single pipeline stage by its stage_id."""
    resolver = SettingsResolver()
    calc_engine = CalculationEngine(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
        resolver,
    )
    detection_engine = DetectionEngine(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
        resolver,
    )
    orch = PipelineOrchestrator(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
        calc_engine,
        detection_engine,
    )
    result = orch.run_stage(stage_id)

    # Serialize contract_validation if present
    contract_validation = None
    if result.contract_validation is not None:
        cv = result.contract_validation
        contract_validation = {
            "contract_id": cv.contract_id,
            "passed": cv.passed,
            "quality_score": cv.quality_score,
            "rule_results": [
                {
                    "rule": rr.rule,
                    "field": rr.field,
                    "passed": rr.passed,
                    "violation_count": rr.violation_count,
                    "total_count": rr.total_count,
                    "details": rr.details,
                }
                for rr in cv.rule_results
            ],
        }

    return {
        "stage_id": result.stage_id,
        "status": result.status,
        "duration_ms": result.duration_ms,
        "started_at": result.started_at,
        "completed_at": result.completed_at,
        "steps": result.steps,
        "contract_validation": contract_validation,
        "error": result.error,
    }
