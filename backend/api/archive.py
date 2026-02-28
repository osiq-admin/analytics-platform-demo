"""Archive tier API — regulatory retention and export management."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend import config
from backend.services.archive_service import ArchiveService

router = APIRouter(prefix="/api/archive", tags=["archive"])


def _meta(request: Request):
    return request.app.state.metadata


def _service(request: Request) -> ArchiveService:
    return ArchiveService(config.settings.workspace_dir, _meta(request))


@router.get("/config")
def get_config(request: Request):
    """Load retention policies (archive config)."""
    cfg = _meta(request).load_archive_config()
    if not cfg:
        return {"tier_id": "archive", "policies": [], "archive_dir": "", "default_format": ""}
    return cfg.model_dump()


@router.get("/entries")
def list_entries(request: Request):
    """List all archive entries."""
    svc = _service(request)
    entries = svc.list_entries()
    return [e.model_dump() for e in entries]


@router.post("/export/{entity}")
def export_entity(entity: str, request: Request, policy_id: str = ""):
    """Export entity data to archive (query param: policy_id)."""
    if not policy_id:
        return JSONResponse({"error": "policy_id query parameter is required"}, status_code=400)
    svc = _service(request)
    entry = svc.export_entity(entity, policy_id)
    if not entry:
        return JSONResponse(
            {"error": f"Export failed: entity '{entity}' not covered by policy '{policy_id}'"},
            status_code=404,
        )
    return entry.model_dump()


@router.get("/timeline")
def get_timeline(request: Request):
    """Get retention timeline for visualization."""
    svc = _service(request)
    return svc.get_retention_timeline()


@router.get("/compliance")
def get_compliance(request: Request):
    """Get compliance summary."""
    svc = _service(request)
    return svc.get_compliance_summary()
