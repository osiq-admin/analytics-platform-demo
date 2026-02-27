"""Metadata CRUD endpoints for entities, calculations, settings, detection models."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/metadata", tags=["metadata"])


def _meta(request: Request):
    return request.app.state.metadata


# -- Audit Trail --

@router.get("/audit")
def get_audit_history(request: Request, metadata_type: str | None = None, item_id: str | None = None):
    if not hasattr(request.app.state, "audit"):
        return []
    return request.app.state.audit.get_history(metadata_type, item_id)


# -- Entities --

@router.get("/entities")
def list_entities(request: Request):
    entities = _meta(request).list_entities()
    result = []
    for e in entities:
        d = e.model_dump()
        d["metadata_layer"] = e.metadata_layer
        result.append(d)
    return result


@router.get("/entities/{entity_id}")
def get_entity(entity_id: str, request: Request):
    svc = _meta(request)
    entity = svc.load_entity(entity_id)
    if entity is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    data = entity.model_dump()
    data["metadata_layer"] = entity.metadata_layer
    data["_layer"] = svc.get_item_layer_info("entities", entity_id)
    return data


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
    result = []
    for c in calcs:
        d = c.model_dump()
        d["metadata_layer"] = c.metadata_layer
        result.append(d)
    return result


@router.get("/calculations/{calc_id}")
def get_calculation(calc_id: str, request: Request):
    svc = _meta(request)
    calc = svc.load_calculation(calc_id)
    if calc is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    data = calc.model_dump()
    data["metadata_layer"] = calc.metadata_layer
    data["_layer"] = svc.get_item_layer_info("calculations", calc_id)
    return data


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
    result = []
    for s in items:
        d = s.model_dump()
        d["metadata_layer"] = s.metadata_layer
        result.append(d)
    return result


@router.get("/settings/{setting_id}")
def get_setting(setting_id: str, request: Request):
    svc = _meta(request)
    setting = svc.load_setting(setting_id)
    if setting is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    data = setting.model_dump()
    data["metadata_layer"] = setting.metadata_layer
    data["_layer"] = svc.get_item_layer_info("settings", setting_id)
    return data


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
    result = []
    for m in models:
        d = m.model_dump()
        d["metadata_layer"] = m.metadata_layer
        result.append(d)
    return result


@router.get("/detection-models/{model_id}")
def get_detection_model(model_id: str, request: Request):
    svc = _meta(request)
    model = svc.load_detection_model(model_id)
    if model is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    data = model.model_dump()
    data["metadata_layer"] = model.metadata_layer
    data["_layer"] = svc.get_item_layer_info("detection_models", model_id)
    return data


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


# -- OOB Layer Endpoints --

VALID_ITEM_TYPES = ["entities", "calculations", "settings", "detection_models"]


@router.get("/oob-manifest")
def get_oob_manifest(request: Request):
    """Return the OOB manifest with checksums and versions."""
    return _meta(request).load_oob_manifest()


@router.get("/layers/{item_type}/{item_id}/info")
def get_layer_info(item_type: str, item_id: str, request: Request):
    """Get layer info for a specific metadata item."""
    if item_type not in VALID_ITEM_TYPES:
        return JSONResponse(
            {"error": f"Invalid type. Must be one of: {VALID_ITEM_TYPES}"},
            status_code=400,
        )
    return _meta(request).get_item_layer_info(item_type, item_id)


@router.post("/layers/{item_type}/{item_id}/reset")
def reset_to_oob(item_type: str, item_id: str, request: Request):
    """Reset an OOB item to its original definition by removing the user override."""
    svc = _meta(request)
    if not svc.is_oob_item(item_type, item_id):
        return JSONResponse({"error": "Item is not an OOB item"}, status_code=400)
    if not svc.delete_user_override(item_type, item_id):
        return JSONResponse({"error": "No user override found"}, status_code=404)
    return {"reset": True, "item_type": item_type, "item_id": item_id}


@router.get("/layers/{item_type}/{item_id}/oob")
def get_oob_version_endpoint(item_type: str, item_id: str, request: Request):
    """Get the original OOB version of a metadata item."""
    oob = _meta(request).load_oob_version(item_type, item_id)
    if oob is None:
        return JSONResponse({"error": "No OOB version found"}, status_code=404)
    return oob


@router.get("/layers/{item_type}/{item_id}/diff")
def get_item_diff(item_type: str, item_id: str, request: Request):
    """Get a diff between the OOB version and current version of a metadata item."""
    svc = _meta(request)
    oob = svc.load_oob_version(item_type, item_id)
    if oob is None:
        return {"has_diff": False, "changes": []}
    current = _load_current_as_dict(svc, item_type, item_id)
    if current is None:
        return {"has_diff": False, "changes": []}
    changes = []
    all_keys = set(oob.keys()) | set(current.keys())
    for key in sorted(all_keys - {"metadata_layer", "_layer"}):
        if oob.get(key) != current.get(key):
            changes.append({"field": key, "oob_value": oob.get(key), "current_value": current.get(key)})
    return {"has_diff": len(changes) > 0, "changes": changes}


def _load_current_as_dict(svc, item_type: str, item_id: str) -> dict | None:
    """Load the current version of a metadata item as a dict."""
    if item_type == "entities":
        item = svc.load_entity(item_id)
    elif item_type == "calculations":
        item = svc.load_calculation(item_id)
    elif item_type == "settings":
        item = svc.load_setting(item_id)
    elif item_type == "detection_models":
        item = svc.load_detection_model(item_id)
    else:
        return None
    return item.model_dump() if item else None


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


# -- Regulatory Traceability --


@router.get("/regulatory/registry")
def get_regulation_registry(request: Request):
    """Return the regulation registry (MAR, MiFID II, Dodd-Frank, FINRA)."""
    return _meta(request).load_regulation_registry()


@router.get("/regulatory/coverage")
def get_regulatory_coverage(request: Request):
    """Return the regulatory coverage map with article-to-model mappings."""
    return _meta(request).get_regulatory_coverage_map()


@router.get("/regulatory/suggestions")
def get_regulatory_suggestions(request: Request):
    """Analyze regulatory coverage and return improvement suggestions."""
    from backend.services.suggestion_service import SuggestionService
    meta = _meta(request)
    svc = SuggestionService(meta)
    return svc.analyze_gaps()


@router.get("/regulatory/traceability-graph")
def get_traceability_graph(request: Request):
    """Return a node/edge graph for regulatory traceability visualization.

    Node types: regulation, article, detection_model, calculation.
    Edge types: contains (reg→article), detected_by (article→model), uses_calc (model→calc).
    """
    meta = _meta(request)
    coverage = meta.get_regulatory_coverage_map()

    nodes: list[dict] = []
    edges: list[dict] = []
    seen_edges: set[tuple[str, str, str]] = set()

    def add_edge(source: str, target: str, edge_type: str) -> None:
        key = (source, target, edge_type)
        if key not in seen_edges:
            seen_edges.add(key)
            edges.append({"source": source, "target": target, "type": edge_type})

    # Build models_by_article for quick lookup
    models_by_article = coverage["models_by_article"]

    # Add regulation and article nodes
    for reg in coverage["regulations"]:
        reg_node_id = f"reg:{reg['id']}"
        nodes.append({
            "id": reg_node_id,
            "type": "regulation",
            "label": reg["name"],
            "full_name": reg.get("full_name", ""),
            "jurisdiction": reg.get("jurisdiction", ""),
        })
        for article in reg.get("articles", []):
            article_key = f"{reg['name']} {article['article']}"
            article_node_id = f"article:{article['id']}"
            is_covered = article_key in models_by_article
            nodes.append({
                "id": article_node_id,
                "type": "article",
                "label": f"{reg['name']} {article['article']}",
                "title": article.get("title", ""),
                "description": article.get("description", ""),
                "covered": is_covered,
            })
            add_edge(reg_node_id, article_node_id, "contains")

            # Link article → detection models
            if is_covered:
                for model_id in models_by_article[article_key]:
                    add_edge(article_node_id, f"model:{model_id}", "detected_by")

    # Add detection model nodes
    for model in meta.list_detection_models():
        model_node_id = f"model:{model.model_id}"
        nodes.append({
            "id": model_node_id,
            "type": "detection_model",
            "label": model.name,
            "description": model.description if hasattr(model, 'description') else "",
        })
        # Link model → calculations
        for mc in model.calculations:
            add_edge(model_node_id, f"calc:{mc.calc_id}", "uses_calc")

    # Add calculation nodes
    for calc in meta.list_calculations():
        calc_node_id = f"calc:{calc.calc_id}"
        nodes.append({
            "id": calc_node_id,
            "type": "calculation",
            "label": calc.name,
            "description": calc.description if hasattr(calc, 'description') else "",
            "layer": calc.layer,
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "summary": coverage["coverage_summary"],
    }


# -- OOB Version & Upgrade --

@router.get("/oob-version")
def get_oob_version(request: Request):
    from backend.services.oob_version_service import OobVersionService
    svc = OobVersionService(_meta(request)._base)
    return svc.get_summary()


@router.get("/demo-upgrade-manifest")
def get_demo_upgrade_manifest(request: Request):
    import json as _json
    path = _meta(request)._base / "demo_upgrade_manifest.json"
    if not path.exists():
        return JSONResponse(status_code=404, content={"error": "Demo upgrade manifest not found"})
    return _json.loads(path.read_text())


@router.post("/oob-upgrade/simulate")
def simulate_upgrade(request: Request, body: dict):
    from backend.services.oob_version_service import OobVersionService
    svc = OobVersionService(_meta(request)._base)
    report = svc.simulate_upgrade(body)
    return report.model_dump()


# -- Format Rules --

@router.get("/format-rules")
def get_format_rules(request: Request):
    """Return centralized format rules for field formatting."""
    return _meta(request).load_format_rules()


# -- Navigation --

@router.get("/navigation")
def get_navigation(request: Request):
    """Return navigation configuration from metadata."""
    return _meta(request).load_navigation()


# -- Widget Configurations --

@router.get("/widgets/{view_id}")
def get_widget_config(view_id: str, request: Request):
    """Return widget configuration for a view."""
    config = _meta(request).load_widget_config(view_id)
    if config is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return config


@router.put("/widgets/{view_id}")
def save_widget_config(view_id: str, body: dict, request: Request):
    """Create or update widget configuration for a view."""
    body["view_id"] = view_id
    _meta(request).save_widget_config(body)
    return {"saved": True, "view_id": view_id}


# -- Standards Registries --

@router.get("/standards/iso")
def get_iso_standards(request: Request):
    """Return the ISO standards registry with field mappings and validation rules."""
    svc = _meta(request)
    return svc.load_iso_registry()


@router.get("/standards/fix")
def get_fix_standards(request: Request):
    """Return the FIX protocol field registry."""
    svc = _meta(request)
    return svc.load_fix_registry()


@router.get("/standards/compliance")
def get_compliance_requirements(request: Request):
    """Return compliance requirements registry."""
    svc = _meta(request)
    return svc.load_compliance_registry()


# -- View Configurations --

@router.get("/view_config/{view_id}")
def get_view_config(view_id: str, request: Request):
    """Return view configuration (tabs, etc.) for a view."""
    svc = _meta(request)
    config = svc.load_view_config(view_id)
    if config is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return config


# -- Grid Configurations --

@router.get("/grids/{view_id}")
def get_grid_config(view_id: str, request: Request):
    """Return grid column configuration for a view."""
    svc = _meta(request)
    config = svc.load_grid_config(view_id)
    if config is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return config
