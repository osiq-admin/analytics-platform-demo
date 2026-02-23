"""Dashboard summary statistics endpoint."""
from fastapi import APIRouter, Request

from backend.services.query_service import QueryService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(request: Request):
    """Return summary statistics for the dashboard."""
    svc = QueryService(request.app.state.db)

    # Total alerts
    total = svc.execute("SELECT COUNT(*) AS cnt FROM alert_summary")
    total_alerts = total["rows"][0]["cnt"] if total.get("rows") else 0

    # Alerts by model
    by_model = svc.execute(
        "SELECT model_id, COUNT(*) AS cnt FROM alert_summary GROUP BY model_id ORDER BY cnt DESC"
    )

    # Alerts by trigger_path
    by_trigger = svc.execute(
        "SELECT trigger_path, COUNT(*) AS cnt FROM alert_summary GROUP BY trigger_path ORDER BY cnt DESC"
    )

    # Average scores
    avg_scores = svc.execute(
        "SELECT ROUND(AVG(accumulated_score), 2) AS avg_score,"
        " ROUND(AVG(score_threshold), 2) AS avg_threshold"
        " FROM alert_summary"
    )

    # Score distribution (buckets of 10)
    score_dist = svc.execute(
        "SELECT FLOOR(accumulated_score / 10) * 10 AS bucket, COUNT(*) AS cnt"
        " FROM alert_summary GROUP BY bucket ORDER BY bucket"
    )

    # Alerts by asset_class (from entity_context in alert_trace parquet)
    by_asset = svc.execute(
        "SELECT asset_class, COUNT(*) AS cnt FROM alert_summary"
        " WHERE asset_class IS NOT NULL GROUP BY asset_class ORDER BY cnt DESC"
    )

    return {
        "total_alerts": total_alerts,
        "by_model": by_model.get("rows", []),
        "by_trigger": by_trigger.get("rows", []),
        "avg_scores": avg_scores.get("rows", [{}])[0] if avg_scores.get("rows") else {},
        "score_distribution": score_dist.get("rows", []),
        "by_asset": by_asset.get("rows", []),
    }
