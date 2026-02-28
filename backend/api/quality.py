"""Quality and quarantine REST API."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.models.quality import QuarantineRecord

router = APIRouter(prefix="/api/quality", tags=["quality"])


def _meta(request: Request):
    return request.app.state.metadata


def _db(request: Request):
    return request.app.state.db


def _quarantine(request: Request):
    from backend.services.quarantine_service import QuarantineService
    from backend import config
    return QuarantineService(config.settings.workspace_dir)


def _engine(request: Request):
    from backend.engine.quality_engine import QualityEngine
    dims = _meta(request).load_quality_dimensions()
    return QualityEngine(_db(request), dims)


# --- Quality Dimensions ---

@router.get("/dimensions")
def get_dimensions(request: Request):
    """Return quality dimension definitions (ISO 8000/25012)."""
    cfg = _meta(request).load_quality_dimensions()
    return [d.model_dump() for d in cfg.dimensions]


# --- Quality Scoring ---

@router.get("/scores")
def get_all_scores(request: Request):
    """Score all entities across all data contracts."""
    engine = _engine(request)
    contracts = _meta(request).list_data_contracts()
    scores = []
    for contract in contracts:
        table_name = _resolve_table(contract, request)
        if table_name:
            try:
                score = engine.score_entity(contract, table_name)
                scores.append(score.model_dump())
            except Exception:
                pass
    return scores


@router.get("/scores/{contract_id}")
def get_score(contract_id: str, request: Request):
    """Score a specific data contract."""
    contract = _meta(request).load_data_contract(contract_id)
    if not contract:
        return JSONResponse({"error": "Contract not found"}, status_code=404)
    table_name = _resolve_table(contract, request)
    if not table_name:
        return JSONResponse({"error": "No table resolved for contract"}, status_code=404)
    engine = _engine(request)
    score = engine.score_entity(contract, table_name)
    return score.model_dump()


# --- Data Profiling ---

@router.get("/profile/{entity}")
def profile_entity(entity: str, tier: str = "bronze", request: Request = None):
    """Profile an entity table for data quality analysis."""
    table_map = {"execution": "execution", "order": "order", "product": "product",
                 "md_eod": "md_eod", "md_intraday": "md_intraday",
                 "venue": "venue", "account": "account", "trader": "trader"}
    table_name = table_map.get(entity)
    if not table_name:
        return JSONResponse({"error": f"Unknown entity: {entity}"}, status_code=404)
    engine = _engine(request)
    profile = engine.profile_entity(table_name, entity, tier)
    return profile.model_dump()


# --- Quarantine ---

@router.get("/quarantine")
def list_quarantine(
    entity: str | None = None,
    status: str | None = None,
    source_tier: str | None = None,
    request: Request = None,
):
    """List quarantined records with optional filters."""
    svc = _quarantine(request)
    records = svc.list_records(entity=entity, status=status, source_tier=source_tier)
    return [r.model_dump() for r in records]


@router.get("/quarantine/summary")
def quarantine_summary(request: Request):
    """Get quarantine queue summary statistics."""
    svc = _quarantine(request)
    return svc.summary().model_dump()


@router.get("/quarantine/{record_id}")
def get_quarantine_record(record_id: str, request: Request):
    """Get a single quarantine record."""
    svc = _quarantine(request)
    rec = svc.get_record(record_id)
    if not rec:
        return JSONResponse({"error": "Record not found"}, status_code=404)
    return rec.model_dump()


@router.post("/quarantine/{record_id}/retry")
def retry_quarantine(record_id: str, request: Request):
    """Retry processing a quarantined record."""
    svc = _quarantine(request)
    rec = svc.retry(record_id)
    if not rec:
        return JSONResponse({"error": "Record not found"}, status_code=404)
    return rec.model_dump()


@router.post("/quarantine/{record_id}/override")
def override_quarantine(record_id: str, request: Request, notes: str = ""):
    """Force-accept a quarantined record with justification."""
    svc = _quarantine(request)
    rec = svc.override(record_id, notes=notes)
    if not rec:
        return JSONResponse({"error": "Record not found"}, status_code=404)
    return rec.model_dump()


@router.delete("/quarantine/{record_id}")
def discard_quarantine(record_id: str, request: Request):
    """Discard a quarantined record."""
    svc = _quarantine(request)
    if not svc.discard(record_id):
        return JSONResponse({"error": "Record not found"}, status_code=404)
    return {"discarded": record_id}


# --- Helpers ---

def _resolve_table(contract, request) -> str | None:
    """Resolve a data contract to a DuckDB table name."""
    entity_to_table = {
        "alert": "alerts", "execution": "execution", "order": "order",
        "product": "product", "calculation_result": "alerts",
    }
    return entity_to_table.get(contract.entity)
