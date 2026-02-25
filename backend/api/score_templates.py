"""Score templates API — reusable scoring tiers."""
from fastapi import APIRouter, Query, Request

from backend.models.score_templates import ScoreTemplate

router = APIRouter(prefix="/api/metadata/score-templates", tags=["score-templates"])


@router.get("")
def list_templates(request: Request, value_category: str | None = Query(None)):
    ms = request.app.state.metadata
    templates = ms.list_score_templates(value_category=value_category)
    return {
        "templates": [
            {
                **t.model_dump(),
                "usage_count": ms.get_score_template_usage_count(t.template_id),
            }
            for t in templates
        ]
    }


@router.get("/{template_id}")
def get_template(template_id: str, request: Request):
    ms = request.app.state.metadata
    template = ms.load_score_template(template_id)
    if not template:
        return {"error": f"Template {template_id} not found"}
    return {
        **template.model_dump(),
        "usage_count": ms.get_score_template_usage_count(template_id),
    }


@router.put("/{template_id}")
def save_template(template_id: str, template: ScoreTemplate, request: Request):
    ms = request.app.state.metadata
    template.template_id = template_id
    ms.save_score_template(template)
    return {"status": "saved", "template_id": template_id}


@router.delete("/{template_id}")
def delete_template(template_id: str, request: Request):
    ms = request.app.state.metadata
    deleted = ms.delete_score_template(template_id)
    return {"deleted": deleted, "template_id": template_id}
