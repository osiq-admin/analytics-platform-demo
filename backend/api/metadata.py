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


@router.put("/entities/{entity_id}")
def save_entity(entity_id: str, body: dict, request: Request):
    """Create or update an entity definition."""
    from backend.models.entities import EntityDefinition
    body["entity_id"] = entity_id
    entity = EntityDefinition.model_validate(body)
    _meta(request).save_entity(entity)
    return {"saved": True, "entity_id": entity.entity_id}


@router.delete("/entities/{entity_id}")
def delete_entity(entity_id: str, request: Request):
    """Delete an entity definition."""
    deleted = _meta(request).delete_entity(entity_id)
    if not deleted:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"deleted": True, "entity_id": entity_id}


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


@router.put("/calculations/{calc_id}")
def save_calculation(calc_id: str, body: dict, request: Request):
    """Create or update a calculation definition."""
    from backend.models.calculations import CalculationDefinition
    body["calc_id"] = calc_id
    calc = CalculationDefinition.model_validate(body)
    meta = _meta(request)
    errors = meta.validate_calculation(calc)
    if errors:
        return JSONResponse({"errors": errors}, status_code=422)
    meta.save_calculation(calc)
    return {"saved": True, "calc_id": calc.calc_id}


@router.delete("/calculations/{calc_id}")
def delete_calculation(calc_id: str, request: Request):
    """Delete a calculation, fails if other calcs or models depend on it."""
    meta = _meta(request)
    deps = meta.get_calculation_dependents(calc_id)
    if deps["calculations"] or deps["detection_models"]:
        return JSONResponse(
            {"error": "Cannot delete: has dependents", "dependents": deps},
            status_code=409,
        )
    deleted = meta.delete_calculation(calc_id)
    if not deleted:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"deleted": True, "calc_id": calc_id}


@router.get("/calculations/{calc_id}/dependents")
def get_calculation_dependents(calc_id: str, request: Request):
    """Get all calculations and detection models that depend on this calc."""
    return _meta(request).get_calculation_dependents(calc_id)


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


@router.put("/settings/{setting_id}")
def save_setting(setting_id: str, body: dict, request: Request):
    """Create or update a setting definition."""
    from backend.models.settings import SettingDefinition
    body["setting_id"] = setting_id
    setting = SettingDefinition.model_validate(body)
    _meta(request).save_setting(setting)
    return {"saved": True, "setting_id": setting.setting_id}


@router.delete("/settings/{setting_id}")
def delete_setting(setting_id: str, request: Request):
    """Delete a setting, fails if calcs or models depend on it."""
    meta = _meta(request)
    deps = meta.get_setting_dependents(setting_id)
    if deps["calculations"] or deps["detection_models"]:
        return JSONResponse(
            {"error": "Cannot delete: has dependents", "dependents": deps},
            status_code=409,
        )
    deleted = meta.delete_setting(setting_id)
    if not deleted:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"deleted": True, "setting_id": setting_id}


@router.get("/settings/{setting_id}/dependents")
def get_setting_dependents(setting_id: str, request: Request):
    """Get all calculations and detection models that depend on this setting."""
    return _meta(request).get_setting_dependents(setting_id)


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


@router.post("/detection-models")
def save_detection_model(body: dict, request: Request):
    """Save a new detection model definition."""
    from backend.models.detection import DetectionModelDefinition
    model = DetectionModelDefinition.model_validate(body)
    _meta(request).save_detection_model(model)
    return {"saved": True, "model_id": model.model_id}


@router.put("/detection-models/{model_id}")
def update_detection_model(model_id: str, body: dict, request: Request):
    """Create or update a detection model definition."""
    from backend.models.detection import DetectionModelDefinition
    body["model_id"] = model_id
    model = DetectionModelDefinition.model_validate(body)
    meta = _meta(request)
    errors = meta.validate_detection_model(model)
    if errors:
        return JSONResponse({"errors": errors}, status_code=422)
    meta.save_detection_model(model)
    return {"saved": True, "model_id": model.model_id}


@router.delete("/detection-models/{model_id}")
def delete_detection_model(model_id: str, request: Request):
    """Delete a detection model."""
    deleted = _meta(request).delete_detection_model(model_id)
    if not deleted:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"deleted": True, "model_id": model_id}


# -- Dependency Graph & Validation --

@router.get("/dependency-graph")
def get_dependency_graph(request: Request):
    """Get the full dependency graph of calculations, models, and entities."""
    return _meta(request).get_dependency_graph()


class ValidateRequest(BaseModel):
    type: str
    definition: dict


@router.post("/validate")
def validate_definition(body: ValidateRequest, request: Request):
    """Validate a metadata definition before saving."""
    meta = _meta(request)
    if body.type == "calculation":
        from backend.models.calculations import CalculationDefinition
        calc = CalculationDefinition.model_validate(body.definition)
        errors = meta.validate_calculation(calc)
    elif body.type == "detection_model":
        from backend.models.detection import DetectionModelDefinition
        model = DetectionModelDefinition.model_validate(body.definition)
        errors = meta.validate_detection_model(model)
    else:
        return JSONResponse({"error": f"Unknown type: {body.type}"}, status_code=400)
    return {"valid": len(errors) == 0, "errors": errors}


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
