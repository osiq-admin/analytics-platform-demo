"""Alert query and trace endpoints."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/")
def list_alerts():
    return []


@router.get("/{alert_id}")
def get_alert(alert_id: str):
    return {"alert_id": alert_id}


@router.get("/{alert_id}/trace")
def get_alert_trace(alert_id: str):
    return {"alert_id": alert_id, "trace": {}}
