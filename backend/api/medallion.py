"""Medallion architecture metadata API."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/medallion", tags=["medallion"])


def _meta(request: Request):
    return request.app.state.metadata


@router.get("/tiers")
def list_tiers(request: Request):
    """List all medallion tier definitions."""
    config = _meta(request).load_medallion_tiers()
    return [t.model_dump() for t in config.tiers]


@router.get("/tiers/{tier_id}")
def get_tier(tier_id: str, request: Request):
    """Get a single tier by ID."""
    config = _meta(request).load_medallion_tiers()
    for t in config.tiers:
        if t.tier_id == tier_id:
            return t.model_dump()
    return JSONResponse({"error": "not found"}, status_code=404)


@router.get("/contracts")
def list_contracts(request: Request):
    """List all data contracts."""
    contracts = _meta(request).list_data_contracts()
    return [c.model_dump() for c in contracts]


@router.get("/contracts/{contract_id}")
def get_contract(contract_id: str, request: Request):
    """Get a single data contract."""
    contract = _meta(request).load_data_contract(contract_id)
    if contract is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return contract.model_dump()


@router.get("/transformations")
def list_transformations(request: Request):
    """List all tier-to-tier transformations."""
    items = _meta(request).list_transformations()
    return [t.model_dump() for t in items]


@router.get("/transformations/{transformation_id}")
def get_transformation(transformation_id: str, request: Request):
    """Get a single transformation."""
    t = _meta(request).load_transformation(transformation_id)
    if t is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return t.model_dump()


@router.get("/pipeline-stages")
def list_pipeline_stages(request: Request):
    """List pipeline stages in execution order."""
    config = _meta(request).load_pipeline_stages()
    return [s.model_dump() for s in sorted(config.stages, key=lambda s: s.order)]


@router.get("/lineage/{entity}")
def get_entity_lineage(entity: str, request: Request):
    """Get tier-to-tier lineage graph for an entity."""
    meta = _meta(request)
    tiers_config = meta.load_medallion_tiers()
    contracts = meta.list_data_contracts()
    transformations = meta.list_transformations()

    entity_contracts = [c for c in contracts if c.entity == entity]
    entity_transforms = [t for t in transformations if t.entity == entity]

    tier_ids: set[str] = set()
    for c in entity_contracts:
        tier_ids.add(c.source_tier)
        tier_ids.add(c.target_tier)
    for t in entity_transforms:
        tier_ids.add(t.source_tier)
        tier_ids.add(t.target_tier)

    tier_map = {t.tier_id: t for t in tiers_config.tiers}
    nodes = []
    for tid in sorted(tier_ids):
        tier = tier_map.get(tid)
        if tier:
            nodes.append({"id": tid, "label": tier.name, "tier_number": tier.tier_number})

    edges = []
    for c in entity_contracts:
        edges.append({
            "source": c.source_tier,
            "target": c.target_tier,
            "label": c.contract_id,
            "type": "contract",
        })

    return {"entity": entity, "nodes": nodes, "edges": edges}
