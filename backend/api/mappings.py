"""Mapping CRUD API."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from backend.models.mapping import MappingDefinition, MappingValidationResult

router = APIRouter(prefix="/api/mappings", tags=["mappings"])


def _meta(request: Request):
    return request.app.state.metadata


@router.get("/")
def list_mappings(request: Request):
    return [m.model_dump() for m in _meta(request).list_mappings()]


@router.get("/{mapping_id}")
def get_mapping(mapping_id: str, request: Request):
    m = _meta(request).load_mapping(mapping_id)
    if not m:
        return JSONResponse({"error": "Mapping not found"}, status_code=404)
    return m.model_dump()


@router.post("/")
def create_mapping(body: MappingDefinition, request: Request):
    _meta(request).save_mapping(body)
    return body.model_dump()


@router.put("/{mapping_id}")
def update_mapping(mapping_id: str, body: MappingDefinition, request: Request):
    body.mapping_id = mapping_id
    _meta(request).save_mapping(body)
    return body.model_dump()


@router.delete("/{mapping_id}")
def delete_mapping(mapping_id: str, request: Request):
    if not _meta(request).delete_mapping(mapping_id):
        return JSONResponse({"error": "Mapping not found"}, status_code=404)
    return {"deleted": mapping_id}


@router.post("/{mapping_id}/validate")
def validate_mapping(mapping_id: str, request: Request):
    m = _meta(request).load_mapping(mapping_id)
    if not m:
        return JSONResponse({"error": "Mapping not found"}, status_code=404)
    source = _meta(request).load_entity(m.source_entity)
    target = _meta(request).load_entity(m.target_entity)
    errors: list[str] = []
    warnings: list[str] = []
    unmapped_source: list[str] = []
    unmapped_target: list[str] = []
    if source and target:
        source_fields = {f.name for f in source.fields}
        target_fields = {f.name for f in target.fields}
        mapped_source = {fm.source_field for fm in m.field_mappings}
        mapped_target = {fm.target_field for fm in m.field_mappings}
        unmapped_source = sorted(source_fields - mapped_source)
        unmapped_target = sorted(target_fields - mapped_target)
        for fm in m.field_mappings:
            if fm.source_field not in source_fields:
                errors.append(f"Source field '{fm.source_field}' not in entity '{m.source_entity}'")
            if fm.target_field not in target_fields:
                warnings.append(f"Target field '{fm.target_field}' not in entity '{m.target_entity}'")
    return MappingValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        unmapped_source=unmapped_source,
        unmapped_target=unmapped_target,
    ).model_dump()
