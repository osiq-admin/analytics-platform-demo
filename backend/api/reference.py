"""Reference Data / Master Data Management REST API."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend import config
from backend.services.reference_service import ReferenceService

router = APIRouter(prefix="/api/reference", tags=["reference"])


def _meta(request: Request):
    return request.app.state.metadata


def _db(request: Request):
    return request.app.state.db


def _service(request: Request) -> ReferenceService:
    return ReferenceService(config.settings.workspace_dir, _db(request), _meta(request))


# --- Reference Configs ---


@router.get("/configs")
def list_configs(request: Request):
    """List all reference data configurations."""
    configs = _meta(request).list_reference_configs()
    return [c.model_dump() for c in configs]


@router.get("/configs/{entity}")
def get_config(entity: str, request: Request):
    """Get reference config for a specific entity."""
    cfg = _meta(request).load_reference_config(entity)
    if not cfg:
        return JSONResponse({"error": f"Reference config not found: {entity}"}, status_code=404)
    return cfg.model_dump()


# --- Golden Records ---


@router.get("/{entity}")
def list_golden_records(entity: str, request: Request):
    """List all golden records for an entity."""
    record_set = _meta(request).load_golden_records(entity)
    if not record_set:
        return {"entity": entity, "golden_key": "", "record_count": 0, "records": [], "last_reconciled": ""}
    return record_set.model_dump()


@router.get("/{entity}/summary")
def get_summary(entity: str, request: Request):
    """Get golden record summary statistics."""
    svc = _service(request)
    return svc.get_reconciliation_summary(entity)


@router.get("/{entity}/{golden_id}")
def get_golden_record(entity: str, golden_id: str, request: Request):
    """Get a single golden record with provenance."""
    rec = _meta(request).load_golden_record(entity, golden_id)
    if not rec:
        return JSONResponse({"error": f"Golden record not found: {golden_id}"}, status_code=404)
    return rec.model_dump()


@router.get("/{entity}/{golden_id}/sources")
def get_sources(entity: str, golden_id: str, request: Request):
    """Get source record provenance for a golden record."""
    rec = _meta(request).load_golden_record(entity, golden_id)
    if not rec:
        return JSONResponse({"error": f"Golden record not found: {golden_id}"}, status_code=404)
    return {
        "golden_id": golden_id,
        "entity": entity,
        "source_records": rec.source_records,
        "provenance": {k: v.model_dump() for k, v in rec.provenance.items()},
    }


@router.get("/{entity}/{golden_id}/cross-references")
def get_cross_references(entity: str, golden_id: str, request: Request):
    """Get downstream references for a golden record."""
    svc = _service(request)
    refs = svc.get_cross_references(entity, golden_id)
    return [r.model_dump() for r in refs]


# --- Reconciliation ---


@router.post("/{entity}/reconcile")
def reconcile(entity: str, request: Request):
    """Trigger reconciliation for an entity."""
    cfg = _meta(request).load_reference_config(entity)
    if not cfg:
        return JSONResponse({"error": f"Reference config not found: {entity}"}, status_code=404)
    svc = _service(request)
    # Check if golden records already exist
    existing = _meta(request).load_golden_records(entity)
    if existing and existing.record_count > 0:
        result = svc.reconcile(entity)
    else:
        result = svc.generate_golden_records(entity)
    return result.model_dump()


class OverrideRequest(BaseModel):
    field: str
    value: str | float | int | bool
    notes: str = ""


@router.post("/{entity}/{golden_id}/override")
def override_field(entity: str, golden_id: str, body: OverrideRequest, request: Request):
    """Manually override a field in a golden record."""
    svc = _service(request)
    rec = svc.override_field(entity, golden_id, body.field, body.value, body.notes)
    if not rec:
        return JSONResponse({"error": f"Golden record not found: {golden_id}"}, status_code=404)
    return rec.model_dump()
