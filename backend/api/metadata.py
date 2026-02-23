"""Metadata CRUD endpoints for entities, calculations, settings, detection models."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/metadata", tags=["metadata"])


@router.get("/entities")
def list_entities():
    return []


@router.get("/entities/{entity_id}")
def get_entity(entity_id: str):
    return {"entity_id": entity_id}


@router.get("/calculations")
def list_calculations(layer: str | None = None):
    return []


@router.get("/calculations/{calc_id}")
def get_calculation(calc_id: str):
    return {"calc_id": calc_id}


@router.get("/settings")
def list_settings(category: str | None = None):
    return []


@router.get("/settings/{setting_id}")
def get_setting(setting_id: str):
    return {"setting_id": setting_id}


@router.get("/detection-models")
def list_detection_models():
    return []


@router.get("/detection-models/{model_id}")
def get_detection_model(model_id: str):
    return {"model_id": model_id}
