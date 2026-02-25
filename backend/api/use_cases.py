"""Use cases API endpoints."""
import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.models.use_cases import UseCase

router = APIRouter(prefix="/api/use-cases", tags=["use-cases"])


def _use_cases_dir() -> Path:
    d = settings.workspace_dir / "use_cases"
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.get("")
@router.get("/")
def list_use_cases():
    """List all use cases."""
    d = _use_cases_dir()
    cases = []
    for f in sorted(d.glob("*.json")):
        data = json.loads(f.read_text())
        cases.append(data)
    return {"use_cases": cases}


@router.get("/{use_case_id}")
def get_use_case(use_case_id: str):
    """Get a single use case by ID."""
    path = _use_cases_dir() / f"{use_case_id}.json"
    if not path.exists():
        return JSONResponse({"error": "not found"}, status_code=404)
    return json.loads(path.read_text())


@router.put("/{use_case_id}")
def save_use_case(use_case_id: str, payload: UseCase):
    """Create or update a use case."""
    payload.use_case_id = use_case_id
    payload.updated_at = datetime.now().isoformat()
    path = _use_cases_dir() / f"{use_case_id}.json"
    path.write_text(json.dumps(payload.model_dump(), indent=2, default=str))
    return payload.model_dump()


@router.delete("/{use_case_id}")
def delete_use_case(use_case_id: str):
    """Delete a use case."""
    path = _use_cases_dir() / f"{use_case_id}.json"
    if path.exists():
        path.unlink()
        return {"deleted": use_case_id}
    return JSONResponse({"error": "not found"}, status_code=404)


@router.post("/{use_case_id}/run")
def run_use_case(use_case_id: str, request: Request):
    """Execute pipeline on use case data (simplified — runs detection on sample data)."""
    path = _use_cases_dir() / f"{use_case_id}.json"
    if not path.exists():
        return JSONResponse({"error": "not found"}, status_code=404)

    uc = json.loads(path.read_text())

    # Find detection model component
    model_components = [c for c in uc.get("components", []) if c.get("type") == "detection_model"]
    if not model_components:
        return {"status": "error", "error": "No detection model component in use case", "results": []}

    # Try to run each model
    results = []
    detection = request.app.state.detection
    for mc in model_components:
        model_id = mc.get("id", "")
        try:
            alerts = detection.evaluate_model(model_id)
            results.append({
                "model_id": model_id,
                "alerts_evaluated": len(alerts),
                "alerts_fired": sum(1 for a in alerts if a.alert_fired),
                "status": "ok",
            })
        except Exception as e:
            results.append({
                "model_id": model_id,
                "alerts_evaluated": 0,
                "alerts_fired": 0,
                "status": "error",
                "error": str(e),
            })

    return {"status": "ok", "use_case_id": use_case_id, "results": results}
