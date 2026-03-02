"""Reports API endpoints — STOR/SAR generation."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


router = APIRouter(prefix="/api/reports", tags=["reports"])


def _svc(request: Request):
    return request.app.state.report_service


def _case_svc(request: Request):
    return request.app.state.case_service


class GenerateReportRequest(BaseModel):
    template_id: str
    case_id: str
    alert_data: dict = {}


@router.get("/templates")
def list_templates(request: Request):
    return {"templates": _svc(request).list_templates()}


@router.post("/generate")
def generate_report(body: GenerateReportRequest, request: Request):
    case_data = _case_svc(request).get_case(body.case_id)
    if case_data is None:
        return JSONResponse({"error": "case not found"}, status_code=404)
    try:
        report = _svc(request).generate_report(
            template_id=body.template_id,
            case_data=case_data,
            alert_data=body.alert_data if body.alert_data else None,
        )
        return report
    except ValueError as e:
        return JSONResponse({"error": str(e)}, status_code=400)


@router.get("")
@router.get("/")
def list_reports(request: Request, case_id: str | None = None):
    return {"reports": _svc(request).list_reports(case_id)}


@router.get("/{report_id}")
def get_report(report_id: str, request: Request):
    report = _svc(request).get_report(report_id)
    if report is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return report
