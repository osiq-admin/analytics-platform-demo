"""Pipeline metrics REST API."""
from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


def _svc(request: Request):
    return request.app.state.metrics_service


@router.get("/summary")
def get_summary(request: Request):
    """Return a summary of all recorded metrics."""
    return _svc(request).get_summary()


@router.get("/series/{metric_id}")
def get_series(
    metric_id: str,
    request: Request,
    start: str = Query(None, description="Start timestamp ISO"),
    end: str = Query(None, description="End timestamp ISO"),
):
    """Return a single metric time series, optionally filtered by time range."""
    series = _svc(request).get_series(metric_id, start=start, end=end)
    if series is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return series.model_dump()


@router.get("/sla")
def get_sla_compliance(request: Request):
    """Return SLA compliance status for all metrics with thresholds."""
    return _svc(request).get_sla_compliance()
