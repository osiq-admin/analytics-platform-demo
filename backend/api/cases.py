"""Cases API endpoints."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


router = APIRouter(prefix="/api/cases", tags=["cases"])


def _svc(request: Request):
    return request.app.state.case_service


class CreateCaseRequest(BaseModel):
    title: str
    alert_ids: list[str] = []
    description: str = ""
    priority: str = "medium"
    category: str = "market_abuse"
    assignee: str = "analyst_1"


class UpdateStatusRequest(BaseModel):
    status: str


class AnnotationRequest(BaseModel):
    type: str = "note"
    content: str = ""
    metadata: dict = {}


# Static paths MUST come before /{case_id} to avoid path collision
@router.get("/stats")
def get_stats(request: Request):
    return _svc(request).get_stats()


@router.get("/for-alert/{alert_id}")
def get_cases_for_alert(alert_id: str, request: Request):
    return {"cases": _svc(request).get_cases_for_alert(alert_id)}


@router.post("/from-alert/{alert_id}")
def create_case_from_alert(alert_id: str, request: Request):
    return _svc(request).create_case(
        title=f"Investigation: {alert_id}",
        alert_ids=[alert_id],
    )


@router.get("")
@router.get("/")
def list_cases(request: Request):
    return {"cases": _svc(request).list_cases()}


@router.get("/{case_id}")
def get_case(case_id: str, request: Request):
    case = _svc(request).get_case(case_id)
    if case is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return case


@router.post("")
@router.post("/")
def create_case(body: CreateCaseRequest, request: Request):
    return _svc(request).create_case(**body.model_dump())


@router.put("/{case_id}")
def update_case(case_id: str, body: dict, request: Request):
    result = _svc(request).update_case(case_id, body)
    if result is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return result


@router.put("/{case_id}/status")
def update_status(case_id: str, body: UpdateStatusRequest, request: Request):
    result = _svc(request).update_status(case_id, body.status)
    if result is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return result


@router.post("/{case_id}/annotate")
def add_annotation(case_id: str, body: AnnotationRequest, request: Request):
    result = _svc(request).add_annotation(case_id, body.model_dump())
    if result is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return result


@router.delete("/{case_id}")
def delete_case(case_id: str, request: Request):
    deleted = _svc(request).delete_case(case_id)
    if not deleted:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"deleted": True}
