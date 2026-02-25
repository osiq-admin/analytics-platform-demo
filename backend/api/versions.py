"""Version management API endpoints."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/versions", tags=["versions"])


class RecordVersionRequest(BaseModel):
    item_type: str
    item_id: str
    snapshot: dict
    change_type: str = "update"
    author: str = "system"
    description: str = ""


@router.get("/{item_type}/{item_id}")
def get_history(item_type: str, item_id: str, request: Request):
    """Get version history for a metadata item."""
    versions = request.app.state.versions
    history = versions.get_history(item_type, item_id)
    return {"item_type": item_type, "item_id": item_id, "versions": history}


@router.get("/{item_type}/{item_id}/{version}")
def get_version(item_type: str, item_id: str, version: int, request: Request):
    """Get a specific version."""
    versions = request.app.state.versions
    entry = versions.get_version(item_type, item_id, version)
    if not entry:
        return JSONResponse({"error": "Version not found"}, status_code=404)
    return entry


@router.post("/record")
def record_version(payload: RecordVersionRequest, request: Request):
    """Record a new version snapshot."""
    versions = request.app.state.versions
    entry = versions.record_version(
        payload.item_type, payload.item_id, payload.snapshot,
        payload.change_type, payload.author, payload.description,
    )
    return entry


@router.get("/{item_type}/{item_id}/compare/{version_a}/{version_b}")
def compare_versions(item_type: str, item_id: str, version_a: int, version_b: int, request: Request):
    """Compare two versions."""
    versions = request.app.state.versions
    return versions.compare_versions(item_type, item_id, version_a, version_b)


@router.post("/{item_type}/{item_id}/rollback/{target_version}")
def rollback(item_type: str, item_id: str, target_version: int, request: Request):
    """Rollback to a previous version."""
    versions = request.app.state.versions
    result = versions.rollback(item_type, item_id, target_version)
    if not result:
        return JSONResponse({"error": "Target version not found"}, status_code=404)
    return result
