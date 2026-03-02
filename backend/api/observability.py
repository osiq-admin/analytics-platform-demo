"""Observability event log REST API."""
from fastapi import APIRouter, Request, Query

router = APIRouter(prefix="/api/observability", tags=["observability"])


def _svc(request: Request):
    return request.app.state.event_service


@router.get("/events")
def get_events(
    request: Request,
    date: str = Query(None, description="Filter by date (YYYY-MM-DD)"),
    type: str = Query(None, description="Filter by event type"),
    entity: str = Query(None, description="Filter by entity"),
):
    """Return event records with optional filters."""
    events = _svc(request).get_events(date=date, event_type=type, entity=entity)
    return [e.model_dump() for e in events]


@router.get("/chain/verify/{date}")
def verify_chain(date: str, request: Request):
    """Verify the hash chain integrity for a given date."""
    valid = _svc(request).verify_chain(date)
    return {"date": date, "valid": valid}


@router.get("/stats")
def get_stats(request: Request):
    """Return aggregate event type counts."""
    return _svc(request).get_stats()
