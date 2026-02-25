"""Match patterns API — reusable override criteria."""
from fastapi import APIRouter, Request

from backend.models.match_patterns import MatchPattern

router = APIRouter(prefix="/api/metadata/match-patterns", tags=["match-patterns"])


@router.get("")
def list_patterns(request: Request):
    ms = request.app.state.metadata
    patterns = ms.list_match_patterns()
    return {
        "patterns": [
            {
                **p.model_dump(),
                "usage_count": ms.get_match_pattern_usage_count(p.pattern_id),
            }
            for p in patterns
        ]
    }


@router.get("/{pattern_id}")
def get_pattern(pattern_id: str, request: Request):
    ms = request.app.state.metadata
    pattern = ms.load_match_pattern(pattern_id)
    if not pattern:
        return {"error": f"Pattern {pattern_id} not found"}
    return {
        **pattern.model_dump(),
        "usage_count": ms.get_match_pattern_usage_count(pattern_id),
    }


@router.put("/{pattern_id}")
def save_pattern(pattern_id: str, pattern: MatchPattern, request: Request):
    ms = request.app.state.metadata
    pattern.pattern_id = pattern_id
    ms.save_match_pattern(pattern)
    return {"status": "saved", "pattern_id": pattern_id}


@router.delete("/{pattern_id}")
def delete_pattern(pattern_id: str, request: Request):
    ms = request.app.state.metadata
    usage = ms.get_match_pattern_usage_count(pattern_id)
    deleted = ms.delete_match_pattern(pattern_id)
    return {"deleted": deleted, "pattern_id": pattern_id, "was_in_use": usage > 0}
