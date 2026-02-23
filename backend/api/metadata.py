"""Metadata CRUD endpoints for entities, calculations, settings, detection models."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

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
