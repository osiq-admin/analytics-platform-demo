"""Domain values API — suggestions for form fields."""
from fastapi import APIRouter, Query, Request

router = APIRouter(prefix="/api/metadata/domain-values", tags=["domain-values"])


# IMPORTANT: Specific routes MUST come before the catch-all /{entity_id}/{field_name}
@router.get("/match-keys")
def get_match_keys(request: Request):
    ms = request.app.state.metadata
    return {"match_keys": ms.get_match_keys()}


@router.get("/setting-ids")
def get_setting_ids(
    request: Request,
    value_type: str | None = Query(None),
):
    ms = request.app.state.metadata
    return {"settings": ms.get_setting_ids(value_type)}


@router.get("/calculation-ids")
def get_calculation_ids(
    request: Request,
    layer: str | None = Query(None),
):
    ms = request.app.state.metadata
    return {"calculations": ms.get_calculation_ids(layer)}


@router.get("/{entity_id}/{field_name}")
def get_domain_values(
    entity_id: str,
    field_name: str,
    request: Request,
    search: str | None = Query(None),
    limit: int = Query(50, ge=1, le=1000),
):
    ms = request.app.state.metadata
    db = request.app.state.db
    return ms.get_domain_values(entity_id, field_name, db=db, search=search, limit=limit)
