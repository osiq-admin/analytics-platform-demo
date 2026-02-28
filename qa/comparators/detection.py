"""Detection comparator: alert distribution diff."""
from __future__ import annotations


def compare_detection(
    previous: dict,
    current: dict,
    tolerance: dict[str, dict] | None = None,
) -> dict:
    """Compare detection model aggregate metrics.

    Args:
        previous: Dict with model_id and metric fields (count, avg_score, etc.)
        current: Same structure as previous.
        tolerance: Per-metric tolerance. Example: {"count": {"absolute": 2}}

    Returns:
        Dict with metric_diffs, significant_change flag.
    """
    tolerance = tolerance or {}
    metric_diffs = []
    significant = False

    # Compare all numeric fields (excluding model_id)
    for field in set(list(previous.keys()) + list(current.keys())):
        if field == "model_id":
            continue

        old_val = previous.get(field)
        new_val = current.get(field)

        if old_val is None or new_val is None:
            continue
        if not isinstance(old_val, (int, float)) or not isinstance(new_val, (int, float)):
            continue
        if old_val == new_val:
            continue

        abs_diff = abs(new_val - old_val)
        tol = tolerance.get(field, {})
        abs_tol = tol.get("absolute", 0)

        within = abs_diff <= abs_tol if abs_tol else False

        if not within:
            significant = True

        metric_diffs.append({
            "field": field,
            "old": old_val,
            "new": new_val,
            "absolute_diff": round(abs_diff, 6),
            "within_tolerance": within,
        })

    return {
        "model_id": current.get("model_id", previous.get("model_id", "unknown")),
        "metric_diffs": metric_diffs,
        "significant_change": significant,
    }
