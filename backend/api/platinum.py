"""Platinum tier API — pre-built KPI datasets."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend import config
from backend.services.platinum_service import PlatinumService

router = APIRouter(prefix="/api/platinum", tags=["platinum"])


def _meta(request: Request):
    return request.app.state.metadata


def _service(request: Request) -> PlatinumService:
    return PlatinumService(config.settings.workspace_dir, _meta(request))


@router.get("/config")
def get_config(request: Request):
    """Load KPI definitions (Platinum config)."""
    cfg = _meta(request).load_platinum_config()
    if not cfg:
        return {"tier_id": "platinum", "kpi_definitions": [], "last_generated": ""}
    return cfg.model_dump()


@router.get("/datasets")
def list_datasets(request: Request):
    """List all generated KPI datasets."""
    datasets = _meta(request).list_kpi_datasets()
    return [d.model_dump() for d in datasets]


@router.get("/datasets/{kpi_id}")
def get_dataset(kpi_id: str, request: Request):
    """Get a single KPI dataset by ID."""
    dataset = _meta(request).load_kpi_dataset(kpi_id)
    if not dataset:
        return JSONResponse({"error": f"KPI dataset not found: {kpi_id}"}, status_code=404)
    return dataset.model_dump()


@router.post("/generate")
def generate(request: Request):
    """Generate/refresh all KPI datasets."""
    svc = _service(request)
    datasets = svc.generate_all()
    return {
        "generated": len(datasets),
        "datasets": [d.model_dump() for d in datasets],
    }
