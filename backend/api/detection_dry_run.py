"""Dry run endpoint for detection model preview."""
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api/detection-models", tags=["detection-dry-run"])


class DryRunRequest(BaseModel):
    model_id: str
    name: str
    description: str = ""
    time_window: str = ""
    granularity: list[str] = []
    context_fields: list[str] = []
    calculations: list[dict] = []
    score_threshold_setting: str = ""
    query: str = ""


@router.post("/dry-run")
def dry_run_model(payload: DryRunRequest, request: Request):
    """Run detection model query without persisting alerts. Returns preview results."""
    detection = request.app.state.detection

    # If query is provided, execute it directly for preview
    if not payload.query.strip():
        return {"status": "error", "error": "No query provided", "alerts": []}

    try:
        # Execute the query to get candidate rows
        rows = detection._execute_query(payload.query)

        # Return preview data — row count, sample rows, column info
        if not rows:
            return {"status": "ok", "row_count": 0, "alerts": [], "columns": []}

        columns = list(rows[0].keys()) if rows else []

        # For full model preview, try to evaluate if the model exists
        # Otherwise just return the query results as preview
        preview_alerts = []
        for i, row in enumerate(rows[:50]):  # Limit to 50 preview rows
            # Build a simplified alert preview
            accumulated_score = 0.0
            calc_details = []
            for calc_config in payload.calculations:
                value_field = calc_config.get("value_field") or calc_config.get("calc_id", "")
                computed_value = float(row.get(value_field, 0) or 0)
                calc_details.append({
                    "calc_id": calc_config.get("calc_id", ""),
                    "value_field": value_field,
                    "computed_value": computed_value,
                    "strictness": calc_config.get("strictness", "OPTIONAL"),
                })

            preview_alerts.append({
                "row_index": i,
                "entity_context": {k: str(v) for k, v in row.items() if k in payload.context_fields},
                "accumulated_score": accumulated_score,
                "calculation_details": calc_details,
                "raw_row": {k: str(v) if v is not None else None for k, v in row.items()},
            })

        return {
            "status": "ok",
            "row_count": len(rows),
            "preview_count": len(preview_alerts),
            "columns": columns,
            "alerts": preview_alerts,
        }
    except Exception as e:
        return {"status": "error", "error": str(e), "alerts": []}
