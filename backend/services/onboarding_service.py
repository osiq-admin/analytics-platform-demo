"""Onboarding workflow orchestrator — manages upload -> detect -> profile -> stage jobs."""
from __future__ import annotations
from pathlib import Path
import uuid
from backend.models.onboarding import OnboardingJob
from backend.services.schema_detector import detect_schema
from backend.services.data_profiler import profile_data

_jobs: dict[str, OnboardingJob] = {}


def create_job(filename: str, file_path: Path) -> OnboardingJob:
    job_id = str(uuid.uuid4())[:8]
    fmt = file_path.suffix.lstrip(".").lower()
    job = OnboardingJob(job_id=job_id, status="uploaded", filename=filename, file_format=fmt)
    try:
        job.detected_schema = detect_schema(file_path)
        job.row_count = job.detected_schema.row_count
        job.status = "schema_detected"
    except Exception as e:
        job.error = str(e)
        job.status = "failed"
    _jobs[job_id] = job
    return job


def get_job(job_id: str) -> OnboardingJob | None:
    return _jobs.get(job_id)


def profile_job(job_id: str, file_path: Path) -> OnboardingJob | None:
    job = _jobs.get(job_id)
    if not job:
        return None
    try:
        job.profile = profile_data(file_path)
        job.status = "profiled"
    except Exception as e:
        job.error = str(e)
        job.status = "failed"
    return job


def confirm_job(job_id: str, target_entity: str) -> OnboardingJob | None:
    job = _jobs.get(job_id)
    if not job:
        return None
    job.target_entity = target_entity
    job.status = "confirmed"
    return job


def list_jobs() -> list[OnboardingJob]:
    return list(_jobs.values())


def clear_jobs() -> None:
    """Clear all jobs (for testing)."""
    _jobs.clear()
