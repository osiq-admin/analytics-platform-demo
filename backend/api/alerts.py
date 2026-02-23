"""Alert query and trace endpoints."""
import json
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend.config import settings

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _traces_dir() -> Path:
    return settings.workspace_dir / "alerts" / "traces"


@router.get("/")
def list_alerts(request: Request):
    """List alert summaries from DuckDB if available, else from trace files."""
    try:
        from backend.services.query_service import QueryService
        svc = QueryService(request.app.state.db)
        result = svc.execute("SELECT * FROM alerts_summary ORDER BY timestamp DESC", limit=500)
        return result.get("rows", [])
    except Exception:
        # Fallback: read trace files
        traces_dir = _traces_dir()
        if not traces_dir.exists():
            return []
        alerts = []
        for f in sorted(traces_dir.glob("*.json")):
            data = json.loads(f.read_text())
            alerts.append({
                "alert_id": data.get("alert_id"),
                "model_id": data.get("model_id"),
                "timestamp": data.get("timestamp"),
                "accumulated_score": data.get("accumulated_score"),
                "score_threshold": data.get("score_threshold"),
                "trigger_path": data.get("trigger_path"),
                "alert_fired": data.get("alert_fired"),
            })
        return alerts


@router.get("/{alert_id}")
def get_alert(alert_id: str):
    """Get full alert trace JSON."""
    path = _traces_dir() / f"{alert_id}.json"
    if not path.exists():
        return JSONResponse({"error": "not found"}, status_code=404)
    return json.loads(path.read_text())


@router.get("/{alert_id}/trace")
def get_alert_trace(alert_id: str):
    """Get alert trace (same as full alert for now)."""
    return get_alert(alert_id)
