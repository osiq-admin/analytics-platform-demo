"""Data onboarding API — upload, detect, profile, stage."""
from pathlib import Path
from fastapi import APIRouter, Request, UploadFile, File
from fastapi.responses import JSONResponse
from backend.services import onboarding_service

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

UPLOAD_DIR = Path("workspace/data/uploads")


def _meta(request: Request):
    return request.app.state.metadata


@router.get("/connectors")
def list_connectors(request: Request):
    connectors = _meta(request).list_connectors()
    return [c.model_dump() for c in connectors]


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_DIR / file.filename
    content = await file.read()
    dest.write_bytes(content)
    job = onboarding_service.create_job(file.filename, dest)
    return job.model_dump()


@router.get("/jobs")
def list_jobs():
    return [j.model_dump() for j in onboarding_service.list_jobs()]


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = onboarding_service.get_job(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, status_code=404)
    return job.model_dump()


@router.post("/jobs/{job_id}/profile")
def profile_job(job_id: str):
    job = onboarding_service.get_job(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, status_code=404)
    file_path = UPLOAD_DIR / job.filename
    result = onboarding_service.profile_job(job_id, file_path)
    return result.model_dump()


@router.post("/jobs/{job_id}/confirm")
async def confirm_job(job_id: str, request: Request):
    body = await request.json()
    target_entity = body.get("target_entity", "")
    job = onboarding_service.confirm_job(job_id, target_entity)
    if not job:
        return JSONResponse({"error": "Job not found"}, status_code=404)
    return job.model_dump()
