"""Metadata CRUD endpoints for entities, calculations, settings, detection models."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/metadata", tags=["metadata"])


def _meta(request: Request):
    return request.app.state.metadata


# -- Entities --

@router.get("/entities")
def list_entities(request: Request):
    entities = _meta(request).list_entities()
    return [e.model_dump() for e in entities]


@router.get("/entities/{entity_id}")
def get_entity(entity_id: str, request: Request):
    entity = _meta(request).load_entity(entity_id)
    if entity is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return entity.model_dump()


# -- Calculations --

@router.get("/calculations")
def list_calculations(request: Request, layer: str | None = None):
    calcs = _meta(request).list_calculations(layer)
    return [c.model_dump() for c in calcs]


@router.get("/calculations/{calc_id}")
def get_calculation(calc_id: str, request: Request):
    calc = _meta(request).load_calculation(calc_id)
    if calc is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return calc.model_dump()


# -- Settings --

@router.get("/settings")
def list_settings(request: Request, category: str | None = None):
    items = _meta(request).list_settings(category)
    return [s.model_dump() for s in items]


@router.get("/settings/{setting_id}")
def get_setting(setting_id: str, request: Request):
    setting = _meta(request).load_setting(setting_id)
    if setting is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return setting.model_dump()


class ResolveRequest(BaseModel):
    context: dict[str, str]


@router.post("/settings/{setting_id}/resolve")
def resolve_setting(setting_id: str, body: ResolveRequest, request: Request):
    """Resolve a setting value for a given entity context."""
    meta = _meta(request)
    setting = meta.load_setting(setting_id)
    if setting is None:
        return JSONResponse({"error": "setting not found"}, status_code=404)

    resolver = request.app.state.resolver
    result = resolver.resolve(setting, body.context)
    return {
        "setting_id": result.setting_id,
        "value": result.value,
        "matched_override": result.matched_override.model_dump() if result.matched_override else None,
        "why": result.why,
    }


# -- Detection Models --

@router.get("/detection-models")
def list_detection_models(request: Request):
    models = _meta(request).list_detection_models()
    return [m.model_dump() for m in models]


@router.get("/detection-models/{model_id}")
def get_detection_model(model_id: str, request: Request):
    model = _meta(request).load_detection_model(model_id)
    if model is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return model.model_dump()


# -- Mappings --

class SaveMappingRequest(BaseModel):
    calc_id: str
    mappings: dict[str, str]


@router.post("/mappings")
def save_mapping(body: SaveMappingRequest, request: Request):
    """Save a field mapping definition for a calculation."""
    import json
    mappings_dir = _meta(request)._base / "mappings"
    mappings_dir.mkdir(parents=True, exist_ok=True)
    path = mappings_dir / f"{body.calc_id}.json"
    path.write_text(json.dumps({"calc_id": body.calc_id, "mappings": body.mappings}, indent=2))
    return {"saved": True, "calc_id": body.calc_id, "field_count": len(body.mappings)}
