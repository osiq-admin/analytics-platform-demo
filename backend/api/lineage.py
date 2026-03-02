"""Lineage graph REST API — exposes the 6-layer lineage engine."""
from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/lineage", tags=["lineage"])


def _svc(request: Request):
    return request.app.state.lineage_service


# ── Tier Flow ────────────────────────────────────────────────────────────

@router.get("/tiers")
def get_full_tier_graph(request: Request):
    """Return the complete tier flow graph for all entities."""
    graph = _svc(request).get_full_tier_graph()
    return graph.model_dump()


@router.get("/tiers/{entity}")
def get_tier_lineage(entity: str, request: Request):
    """Return tier flow graph for a single entity."""
    graph = _svc(request).get_tier_lineage(entity)
    return graph.model_dump()


@router.get("/tiers/{entity}/quality")
def get_quality_overlay(entity: str, request: Request):
    """Return quality scores per tier for an entity."""
    result = _svc(request).get_quality_overlay(entity)
    return result


# ── Field Lineage ────────────────────────────────────────────────────────

@router.get("/fields/{entity}/transitions")
def get_tier_transition_fields(
    entity: str,
    request: Request,
    source_tier: str = Query(..., description="Source tier"),
    target_tier: str = Query(..., description="Target tier"),
):
    """Return column-level lineage for a tier transition."""
    items = _svc(request).get_tier_transition_fields(entity, source_tier, target_tier)
    return [cl.model_dump() for cl in items]


@router.get("/fields/{entity}/{field}")
def trace_field(entity: str, field: str, request: Request):
    """Trace a single field through the lineage graph."""
    ft = _svc(request).trace_field(entity, field)
    return ft.model_dump()


@router.get("/fields/{entity}")
def get_field_lineage(entity: str, request: Request):
    """Return all field traces for an entity."""
    traces = _svc(request).get_field_lineage(entity)
    return [ft.model_dump() for ft in traces]


# ── Calculation Chain ────────────────────────────────────────────────────

@router.get("/calculations")
def get_calc_lineage(request: Request):
    """Return the full calculation dependency graph."""
    graph = _svc(request).get_calc_lineage()
    return graph.model_dump()


@router.get("/calculations/model/{model_id}")
def get_model_lineage(model_id: str, request: Request):
    """Return the lineage subgraph for a single detection model."""
    graph = _svc(request).get_model_lineage(model_id)
    return graph.model_dump()


# ── Impact Analysis ──────────────────────────────────────────────────────

@router.get("/impact/{node_id:path}")
def impact_analysis(
    node_id: str,
    request: Request,
    direction: str = Query("both", description="upstream, downstream, or both"),
):
    """Run weighted BFS impact analysis from a node."""
    result = _svc(request).impact_analysis(node_id, direction)
    return result.model_dump()


# ── Alert Explainability ─────────────────────────────────────────────────

@router.get("/alert/{alert_id}")
def get_alert_lineage(alert_id: str, request: Request):
    """Build reverse-provenance chain for a specific alert."""
    graph = _svc(request).get_alert_lineage(alert_id)
    return graph.model_dump()


# ── Unified Graph ────────────────────────────────────────────────────────

@router.get("/graph")
def get_unified_graph(
    request: Request,
    entities: str = Query(None, description="Comma-separated entity names"),
    layers: str = Query(None, description="Comma-separated layer names"),
):
    """Return a combined graph, optionally filtered by entity and/or layer."""
    entity_list = [e.strip() for e in entities.split(",") if e.strip()] if entities else None
    layer_list = [l.strip() for l in layers.split(",") if l.strip()] if layers else None
    graph = _svc(request).get_unified_graph(entity_list, layer_list)
    return graph.model_dump()


# ── Settings Impact ──────────────────────────────────────────────────────

@router.get("/settings/{setting_id}/impact")
def get_setting_impact(setting_id: str, request: Request):
    """Return the lineage subgraph affected by a setting."""
    graph = _svc(request).get_setting_impact(setting_id)
    return graph.model_dump()


class ThresholdPreviewRequest(BaseModel):
    """Body for threshold change preview."""
    setting_id: str
    parameter: str
    proposed_value: float


@router.post("/settings/preview")
def preview_threshold_change(body: ThresholdPreviewRequest, request: Request):
    """Estimate alert count change if a threshold is modified."""
    result = _svc(request).preview_threshold_change(
        body.setting_id, body.parameter, body.proposed_value,
    )
    return result.model_dump()


# ── Surveillance Coverage ────────────────────────────────────────────────

@router.get("/coverage")
def get_surveillance_coverage(request: Request):
    """Build the surveillance coverage matrix (products x abuse types)."""
    result = _svc(request).get_surveillance_coverage()
    return result.model_dump()


# ── Pipeline Runs (OpenLineage) ──────────────────────────────────────────

@router.get("/runs")
def get_runs(
    request: Request,
    job_name: str = Query(None, description="Filter by job name"),
    start: str = Query(None, description="Start date ISO"),
    end: str = Query(None, description="End date ISO"),
):
    """Return recorded pipeline runs, optionally filtered."""
    runs = _svc(request).get_runs(
        job_name=job_name, start_date=start, end_date=end,
    )
    return [r.model_dump() for r in runs]


@router.get("/runs/{run_id}")
def get_run(run_id: str, request: Request):
    """Return a single pipeline run by ID."""
    run = _svc(request).get_run(run_id)
    if run is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return run.model_dump()
