"""Pipeline execution and monitoring endpoints."""
import logging
import time

from fastapi import APIRouter, Request

from backend.config import settings
from backend.engine.calculation_engine import CalculationEngine
from backend.services.query_service import QueryService

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/run")
def run_pipeline(request: Request):
    """Execute the full calculation pipeline, returning steps for the frontend."""
    engine = CalculationEngine(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
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
    engine = CalculationEngine(
        settings.workspace_dir,
        request.app.state.db,
        request.app.state.metadata,
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
