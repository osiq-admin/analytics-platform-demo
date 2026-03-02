"""Sandbox tier API — what-if threshold testing."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend import config
from backend.models.analytics_tiers import SandboxOverride
from backend.services.sandbox_service import SandboxService

router = APIRouter(prefix="/api/sandbox", tags=["sandbox"])


def _meta(request: Request):
    return request.app.state.metadata


def _service(request: Request) -> SandboxService:
    return SandboxService(config.settings.workspace_dir, _meta(request))


# --- Request bodies ---


class CreateSandboxRequest(BaseModel):
    name: str
    description: str = ""


class ConfigureSandboxRequest(BaseModel):
    overrides: list[SandboxOverride]


# --- Endpoints ---


@router.get("/template")
def get_template(request: Request):
    """Load sandbox template (available overrides)."""
    template = _meta(request).load_sandbox_template()
    if not template:
        return {"tier_id": "sandbox", "available_overrides": []}
    return template


@router.get("/list")
def list_sandboxes(request: Request):
    """List all sandboxes."""
    svc = _service(request)
    sandboxes = svc.list_sandboxes()
    return [s.model_dump() for s in sandboxes]


@router.post("/create")
def create_sandbox(body: CreateSandboxRequest, request: Request):
    """Create a new sandbox."""
    svc = _service(request)
    sandbox = svc.create_sandbox(body.name, body.description)
    return sandbox.model_dump()


@router.post("/{sandbox_id}/configure")
def configure_sandbox(sandbox_id: str, body: ConfigureSandboxRequest, request: Request):
    """Apply setting overrides to a sandbox."""
    svc = _service(request)
    sandbox = svc.configure_sandbox(sandbox_id, body.overrides)
    if not sandbox:
        return JSONResponse({"error": f"Sandbox not found: {sandbox_id}"}, status_code=404)
    return sandbox.model_dump()


@router.post("/{sandbox_id}/run")
def run_sandbox(sandbox_id: str, request: Request):
    """Run sandbox detection simulation."""
    svc = _service(request)
    sandbox = svc.run_sandbox(sandbox_id)
    if not sandbox:
        return JSONResponse({"error": f"Sandbox not found: {sandbox_id}"}, status_code=404)
    return sandbox.model_dump()


@router.get("/{sandbox_id}/compare")
def compare_sandbox(sandbox_id: str, request: Request):
    """Compare sandbox results vs production."""
    svc = _service(request)
    comparison = svc.compare_sandbox(sandbox_id)
    if not comparison:
        return JSONResponse({"error": f"Sandbox not found or not completed: {sandbox_id}"}, status_code=404)
    return comparison.model_dump()


@router.delete("/{sandbox_id}")
def discard_sandbox(sandbox_id: str, request: Request):
    """Discard a sandbox."""
    svc = _service(request)
    success = svc.discard_sandbox(sandbox_id)
    if not success:
        return JSONResponse({"error": f"Sandbox not found: {sandbox_id}"}, status_code=404)
    return {"status": "discarded", "sandbox_id": sandbox_id}
