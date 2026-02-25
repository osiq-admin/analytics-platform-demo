"""Validation API endpoints."""
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/validation", tags=["validation"])


class ValidateModelRequest(BaseModel):
    model_id: str = ""
    name: str = ""
    description: str = ""
    calculations: list[dict] = []
    query: str = ""
    context_fields: list[str] = []
    score_threshold_setting: str = ""
    time_window: str = ""
    granularity: list[str] = []


class ValidateCalcRequest(BaseModel):
    calc_id: str = ""
    name: str = ""
    logic: str = ""
    depends_on: list[str] = []
    layer: str = ""


class ValidateSettingRequest(BaseModel):
    setting_id: str = ""
    name: str = ""
    value_type: str = ""
    default: object = None
    overrides: list[dict] = []


@router.post("/detection-model")
def validate_detection_model(payload: ValidateModelRequest, request: Request):
    """Validate a detection model definition."""
    validation = request.app.state.validation
    results = validation.validate_detection_model(payload.model_dump())
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    return {
        "total": len(results),
        "passed": passed,
        "failed": failed,
        "results": results,
    }


@router.post("/calculation")
def validate_calculation(payload: ValidateCalcRequest, request: Request):
    """Validate a calculation definition."""
    validation = request.app.state.validation
    results = validation.validate_calculation(payload.model_dump())
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    return {
        "total": len(results),
        "passed": passed,
        "failed": failed,
        "results": results,
    }


@router.post("/setting")
def validate_setting(payload: ValidateSettingRequest, request: Request):
    """Validate a setting definition."""
    validation = request.app.state.validation
    results = validation.validate_setting(payload.model_dump())
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    return {
        "total": len(results),
        "passed": passed,
        "failed": failed,
        "results": results,
    }
