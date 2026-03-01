"""Glossary REST API — business glossary, semantic metrics, DAMA-DMBOK, standards."""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.services.glossary_service import GlossaryService
from backend.services.semantic_service import SemanticLayerService

router = APIRouter(prefix="/api/glossary", tags=["glossary"])
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _glossary(request: Request) -> GlossaryService:
    return request.app.state.glossary_service


def _semantic(request: Request) -> SemanticLayerService:
    return request.app.state.semantic_service


def _workspace(request: Request) -> Path:
    return request.app.state.glossary_service._workspace


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class UpdateTermRequest(BaseModel):
    definition: str | None = None
    status: str | None = None
    owner: str | None = None
    steward: str | None = None


# ---------------------------------------------------------------------------
# 1. Terms
# ---------------------------------------------------------------------------


@router.get("/terms")
def list_terms(request: Request, category: str | None = None, search: str | None = None):
    """List glossary terms with optional category and search filters."""
    terms = _glossary(request).list_terms(category=category, search=search)
    return {"count": len(terms), "terms": [t.model_dump() for t in terms]}


@router.get("/terms/{term_id}")
def get_term(term_id: str, request: Request):
    """Get a single glossary term by ID."""
    term = _glossary(request).get_term(term_id)
    if term is None:
        return JSONResponse({"error": f"Term not found: {term_id}"}, status_code=404)
    return term.model_dump()


@router.put("/terms/{term_id}")
def update_term(term_id: str, body: UpdateTermRequest, request: Request):
    """Update a glossary term's fields."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return JSONResponse({"error": "No fields to update"}, status_code=400)
    updated = _glossary(request).update_term(term_id, updates)
    if updated is None:
        return JSONResponse({"error": f"Term not found: {term_id}"}, status_code=404)
    return updated.model_dump()


# ---------------------------------------------------------------------------
# 2. Reverse lookup
# ---------------------------------------------------------------------------


@router.get("/field/{entity}/{field}")
def reverse_lookup(entity: str, field: str, request: Request):
    """Find glossary terms that map to a given entity.field."""
    terms = _glossary(request).reverse_lookup(entity, field)
    return {"count": len(terms), "terms": [t.model_dump() for t in terms]}


# ---------------------------------------------------------------------------
# 3. Categories
# ---------------------------------------------------------------------------


@router.get("/categories")
def list_categories(request: Request):
    """Return all categories with term counts."""
    return {"categories": _glossary(request).list_categories()}


# ---------------------------------------------------------------------------
# 4. Ownership
# ---------------------------------------------------------------------------


@router.get("/ownership")
def ownership_matrix(request: Request):
    """Return the {owner: {domain: [term_ids]}} ownership matrix."""
    return _glossary(request).get_ownership_matrix()


# ---------------------------------------------------------------------------
# 5. Summary
# ---------------------------------------------------------------------------


@router.get("/summary")
def glossary_summary(request: Request):
    """Return combined glossary + semantic summary."""
    g = _glossary(request).get_summary()
    s = _semantic(request).get_summary()
    return {"glossary": g, "semantic": s}


# ---------------------------------------------------------------------------
# 6. Semantic metrics
# ---------------------------------------------------------------------------


@router.get("/metrics")
def list_metrics(request: Request, tier: str | None = None):
    """List semantic metrics, optionally filtered by source tier."""
    metrics = _semantic(request).list_metrics(tier=tier)
    return {"count": len(metrics), "metrics": [m.model_dump() for m in metrics]}


@router.get("/metrics/{metric_id}")
def get_metric(metric_id: str, request: Request):
    """Get a single semantic metric by ID."""
    metric = _semantic(request).get_metric(metric_id)
    if metric is None:
        return JSONResponse({"error": f"Metric not found: {metric_id}"}, status_code=404)
    return metric.model_dump()


# ---------------------------------------------------------------------------
# 7. Dimensions
# ---------------------------------------------------------------------------


@router.get("/dimensions")
def list_dimensions(request: Request):
    """List all semantic dimensions."""
    dims = _semantic(request).list_dimensions()
    return {"count": len(dims), "dimensions": [d.model_dump() for d in dims]}


# ---------------------------------------------------------------------------
# 8. DAMA-DMBOK coverage
# ---------------------------------------------------------------------------


@router.get("/dmbok")
def dmbok_coverage(request: Request):
    """Return DAMA-DMBOK 2.0 knowledge area coverage."""
    path = _workspace(request) / "metadata" / "dmbok" / "coverage.json"
    if not path.exists():
        return JSONResponse({"error": "DMBOK coverage not found"}, status_code=404)
    with open(path) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 9. Standards compliance registry
# ---------------------------------------------------------------------------


@router.get("/standards")
def standards_registry(request: Request):
    """Return the standards compliance registry."""
    path = _workspace(request) / "metadata" / "standards" / "compliance_registry.json"
    if not path.exists():
        return JSONResponse({"error": "Standards registry not found"}, status_code=404)
    with open(path) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 10. Entity gap analysis
# ---------------------------------------------------------------------------


@router.get("/entity-gaps")
def entity_gaps(request: Request):
    """Return entity attribute gap analysis."""
    path = _workspace(request) / "metadata" / "glossary" / "entity_gaps.json"
    if not path.exists():
        return JSONResponse({"error": "Entity gap analysis not found"}, status_code=404)
    with open(path) as f:
        return json.load(f)
