"""Pipeline execution and monitoring endpoints."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/run")
def run_pipeline():
    return {"status": "started"}


@router.get("/status")
def pipeline_status():
    return {"state": "idle", "progress": 0}
