"""Submissions API endpoints."""
import json
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.config import settings
from backend.models.submissions import Submission, ReviewComment

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


def _submissions_dir() -> Path:
    d = settings.workspace_dir / "submissions"
    d.mkdir(parents=True, exist_ok=True)
    return d


class CreateSubmissionRequest(BaseModel):
    use_case_id: str
    name: str
    description: str = ""
    author: str = "demo_user"
    components: list[dict] = []
    tags: list[str] = []
    expected_results: dict = {}


class UpdateStatusRequest(BaseModel):
    status: str
    reviewer: str | None = None
    comment: str | None = None


@router.get("")
@router.get("/")
def list_submissions():
    """List all submissions."""
    d = _submissions_dir()
    subs = []
    for f in sorted(d.glob("*.json")):
        data = json.loads(f.read_text())
        subs.append(data)
    return {"submissions": subs}


@router.get("/{submission_id}")
def get_submission(submission_id: str):
    """Get a single submission."""
    path = _submissions_dir() / f"{submission_id}.json"
    if not path.exists():
        return JSONResponse({"error": "not found"}, status_code=404)
    return json.loads(path.read_text())


@router.post("")
@router.post("/")
def create_submission(payload: CreateSubmissionRequest, request: Request):
    """Create a new submission from a use case."""
    submission_id = f"SUB-{uuid.uuid4().hex[:8].upper()}"

    # Auto-generate recommendations
    rec_service = request.app.state.recommendations
    recommendations = rec_service.analyze_submission({
        "components": payload.components,
        "description": payload.description,
        "tags": payload.tags,
        "expected_results": payload.expected_results,
    })

    submission = Submission(
        submission_id=submission_id,
        use_case_id=payload.use_case_id,
        name=payload.name,
        description=payload.description,
        author=payload.author,
        components=payload.components,
        recommendations=recommendations,
        tags=payload.tags,
        expected_results=payload.expected_results,
    )

    path = _submissions_dir() / f"{submission_id}.json"
    path.write_text(json.dumps(submission.model_dump(), indent=2, default=str))
    return submission.model_dump()


@router.put("/{submission_id}/status")
def update_status(submission_id: str, payload: UpdateStatusRequest):
    """Update submission status (in_review, approved, rejected, implemented)."""
    path = _submissions_dir() / f"{submission_id}.json"
    if not path.exists():
        return JSONResponse({"error": "not found"}, status_code=404)

    data = json.loads(path.read_text())
    data["status"] = payload.status
    data["updated_at"] = datetime.now().isoformat()

    if payload.reviewer:
        data["reviewer"] = payload.reviewer

    if payload.status == "implemented":
        data["implemented_at"] = datetime.now().isoformat()

    # Add comment if provided
    if payload.comment:
        comment = ReviewComment(
            author=payload.reviewer or "system",
            content=payload.comment,
            type="approval" if payload.status == "approved" else "rejection" if payload.status == "rejected" else "comment",
        )
        if "comments" not in data:
            data["comments"] = []
        data["comments"].append(comment.model_dump())

    path.write_text(json.dumps(data, indent=2, default=str))
    return data


@router.post("/{submission_id}/recommend")
def get_recommendations(submission_id: str, request: Request):
    """Re-run recommendation engine on a submission."""
    path = _submissions_dir() / f"{submission_id}.json"
    if not path.exists():
        return JSONResponse({"error": "not found"}, status_code=404)

    data = json.loads(path.read_text())
    rec_service = request.app.state.recommendations
    recommendations = rec_service.analyze_submission(data)

    # Update stored recommendations
    data["recommendations"] = recommendations
    path.write_text(json.dumps(data, indent=2, default=str))

    return {"recommendations": recommendations}


@router.delete("/{submission_id}")
def delete_submission(submission_id: str):
    """Delete a submission."""
    path = _submissions_dir() / f"{submission_id}.json"
    if path.exists():
        path.unlink()
        return {"deleted": submission_id}
    return JSONResponse({"error": "not found"}, status_code=404)
