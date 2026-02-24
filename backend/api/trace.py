"""Explainability trace endpoints — drill-down into alert, calculation, and settings details."""
import json
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.config import settings

router = APIRouter(prefix="/api/trace", tags=["trace"])


def _traces_dir() -> Path:
    return settings.workspace_dir / "alerts" / "traces"


@router.get("/alert/{alert_id}")
def get_alert_trace(alert_id: str):
    """Get full explainability trace for an alert.

    Returns the complete alert trace including executed SQL, calculation traces,
    scoring breakdown, resolved settings, and entity context sources.
    """
    path = _traces_dir() / f"{alert_id}.json"
    if not path.exists():
        return JSONResponse({"error": "Alert trace not found"}, status_code=404)

    data = json.loads(path.read_text())

    return {
        "alert_id": data.get("alert_id"),
        "model_id": data.get("model_id"),
        "model_name": data.get("model_name", ""),
        "timestamp": data.get("timestamp"),
        "alert_fired": data.get("alert_fired"),
        "trigger_path": data.get("trigger_path"),
        "accumulated_score": data.get("accumulated_score"),
        "score_threshold": data.get("score_threshold"),
        # Explainability details
        "executed_sql": data.get("executed_sql", ""),
        "sql_row_count": data.get("sql_row_count", 0),
        "entity_context": data.get("entity_context", {}),
        "entity_context_source": data.get("entity_context_source", {}),
        "calculation_scores": data.get("calculation_scores", []),
        "calculation_traces": data.get("calculation_traces", []),
        "scoring_breakdown": data.get("scoring_breakdown", []),
        "resolved_settings": data.get("resolved_settings", {}),
        "settings_trace": data.get("settings_trace", []),
        "calculation_trace": data.get("calculation_trace", {}),
    }


@router.get("/calculation/{calc_id}")
def get_calculation_trace(calc_id: str, request: Request, product_id: str | None = None, date: str | None = None):
    """Get trace details for a specific calculation across alerts.

    Searches alert traces for entries involving this calculation and returns
    how it was evaluated, what value was computed, and what score was awarded.
    """
    traces_dir = _traces_dir()
    if not traces_dir.exists():
        return {"calc_id": calc_id, "traces": []}

    results = []
    for f in sorted(traces_dir.glob("*.json")):
        data = json.loads(f.read_text())

        # Filter by product_id if specified
        if product_id and data.get("entity_context", {}).get("product_id") != product_id:
            continue

        # Filter by date if specified
        if date and data.get("entity_context", {}).get("business_date") != date:
            continue

        # Find this calculation in the alert's traces
        for ct in data.get("calculation_traces", []):
            if ct.get("calc_id") == calc_id:
                results.append({
                    "alert_id": data.get("alert_id"),
                    "model_id": data.get("model_id"),
                    "entity_context": data.get("entity_context", {}),
                    "alert_fired": data.get("alert_fired"),
                    "calculation_trace": ct,
                })
                break

        # Fallback: check calculation_scores for older traces without calculation_traces
        if not any(r["alert_id"] == data.get("alert_id") for r in results):
            for cs in data.get("calculation_scores", []):
                if cs.get("calc_id") == calc_id:
                    results.append({
                        "alert_id": data.get("alert_id"),
                        "model_id": data.get("model_id"),
                        "entity_context": data.get("entity_context", {}),
                        "alert_fired": data.get("alert_fired"),
                        "calculation_trace": {
                            "calc_id": calc_id,
                            "computed_value": cs.get("computed_value"),
                            "score_awarded": cs.get("score"),
                            "passed": cs.get("threshold_passed"),
                        },
                    })
                    break

    return {"calc_id": calc_id, "traces": results, "count": len(results)}


class SettingsTraceRequest(BaseModel):
    context: dict[str, str] = {}


@router.get("/settings/{setting_id}")
def get_settings_trace(setting_id: str, request: Request):
    """Get settings resolution trace — shows which override matched and why.

    Without context, returns the setting definition with default value.
    Use POST /api/metadata/settings/{setting_id}/resolve for context-aware resolution.
    """
    meta = request.app.state.metadata
    setting = meta.load_setting(setting_id)
    if setting is None:
        return JSONResponse({"error": "Setting not found"}, status_code=404)

    return {
        "setting_id": setting.setting_id,
        "name": setting.name,
        "value_type": setting.value_type,
        "default": setting.default,
        "match_type": setting.match_type,
        "num_overrides": len(setting.overrides),
        "overrides": [o.model_dump() for o in setting.overrides],
    }


@router.post("/settings/{setting_id}/resolve")
def resolve_settings_trace(setting_id: str, body: SettingsTraceRequest, request: Request):
    """Resolve a setting with full trace — shows resolution hierarchy and which override matched."""
    meta = request.app.state.metadata
    setting = meta.load_setting(setting_id)
    if setting is None:
        return JSONResponse({"error": "Setting not found"}, status_code=404)

    resolver = request.app.state.resolver
    result = resolver.resolve(setting, body.context)

    # Build detailed trace showing all overrides evaluated
    override_evaluations = []
    for ov in setting.overrides:
        matches = all(body.context.get(k) == v for k, v in ov.match.items())
        override_evaluations.append({
            "match": ov.match,
            "value": ov.value,
            "priority": ov.priority,
            "context_matched": matches,
            "is_selected": (result.matched_override is not None and
                            ov.match == result.matched_override.match and
                            ov.priority == result.matched_override.priority),
        })

    return {
        "setting_id": result.setting_id,
        "resolved_value": result.value,
        "matched_override": result.matched_override.model_dump() if result.matched_override else None,
        "why": result.why,
        "default_value": setting.default,
        "context_provided": body.context,
        "override_evaluations": override_evaluations,
    }
