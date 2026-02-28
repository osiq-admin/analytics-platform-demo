"""Calculation comparator: numeric drift with tolerance."""
from __future__ import annotations


def compare_calculations(
    previous: list[dict],
    current: list[dict],
    key: str,
    value_fields: list[str],
    absolute_tol: float = 0.01,
    relative_tol: float = 0.001,
) -> dict:
    """Compare calculation results with numeric tolerance.

    Returns dict with total_compared, within_tolerance, drifted, details.
    """
    prev_map = {r[key]: r for r in previous}
    curr_map = {r[key]: r for r in current}

    common_keys = sorted(set(prev_map) & set(curr_map))
    details = []
    within = 0
    drifted = 0

    for k in common_keys:
        prev_rec = prev_map[k]
        curr_rec = curr_map[k]
        rec_drifted = False

        for field in value_fields:
            old_val = prev_rec.get(field)
            new_val = curr_rec.get(field)

            if old_val is None or new_val is None:
                continue
            if not isinstance(old_val, (int, float)) or not isinstance(new_val, (int, float)):
                continue

            abs_diff = abs(new_val - old_val)
            rel_diff = abs_diff / abs(old_val) if old_val != 0 else (float("inf") if abs_diff > 0 else 0.0)

            if abs_diff > absolute_tol and rel_diff > relative_tol:
                rec_drifted = True
                details.append({
                    "key": k,
                    "field": field,
                    "old": old_val,
                    "new": new_val,
                    "absolute_diff": round(abs_diff, 6),
                    "relative_diff": round(rel_diff, 6),
                })

        if rec_drifted:
            drifted += 1
        else:
            within += 1

    return {
        "total_compared": len(common_keys),
        "within_tolerance": within,
        "drifted": drifted,
        "added": len(set(curr_map) - set(prev_map)),
        "removed": len(set(prev_map) - set(curr_map)),
        "details": details,
    }
