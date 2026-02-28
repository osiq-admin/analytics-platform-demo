"""Tabular comparator: key-based join with per-field tolerance."""
from __future__ import annotations



def compare_tabular(
    previous: list[dict],
    current: list[dict],
    key: str,
    fields: list[str] | None = None,
    tolerance: dict[str, dict] | None = None,
) -> dict:
    """Compare two lists of records using key-based join.

    Args:
        previous: Previous snapshot records.
        current: Current snapshot records.
        key: Field name to use as the join key.
        fields: If set, only compare these fields (always includes key).
        tolerance: Per-field tolerance. Example: {"score": {"absolute": 0.01}}

    Returns:
        Dict with added, removed, changed, within_tolerance, and summary counts.
    """
    tolerance = tolerance or {}

    def _filter_fields(record: dict) -> dict:
        if fields is None:
            return record
        return {k: v for k, v in record.items() if k in fields}

    prev_map = {r[key]: _filter_fields(r) for r in previous}
    curr_map = {r[key]: _filter_fields(r) for r in current}

    prev_keys = set(prev_map.keys())
    curr_keys = set(curr_map.keys())

    added = [curr_map[k] for k in sorted(curr_keys - prev_keys)]
    removed = [prev_map[k] for k in sorted(prev_keys - curr_keys)]

    changed = []
    within_tolerance_count = 0

    for k in sorted(prev_keys & curr_keys):
        prev_rec = prev_map[k]
        curr_rec = curr_map[k]
        diffs = {}

        for field in prev_rec:
            if field == key:
                continue
            old_val = prev_rec.get(field)
            new_val = curr_rec.get(field)
            if old_val != new_val:
                diffs[field] = {"old": old_val, "new": new_val}

        if diffs:
            # Check tolerance
            all_within = True
            for field, diff in diffs.items():
                tol = tolerance.get(field, {})
                if tol and _within_tolerance(diff["old"], diff["new"], tol):
                    diff["within_tolerance"] = True
                else:
                    all_within = False
                    diff["within_tolerance"] = False

            if all_within:
                within_tolerance_count += 1
            else:
                changed.append({"key": k, "diffs": {
                    f: d for f, d in diffs.items() if not d.get("within_tolerance")
                }})

    return {
        "total_previous": len(previous),
        "total_current": len(current),
        "added": added,
        "removed": removed,
        "changed": changed,
        "within_tolerance": within_tolerance_count,
        "matched_unchanged": len(prev_keys & curr_keys) - len(changed) - within_tolerance_count,
    }


def _within_tolerance(old, new, tol: dict) -> bool:
    """Check if a value change is within configured tolerance."""
    if not isinstance(old, (int, float)) or not isinstance(new, (int, float)):
        return False

    abs_tol = tol.get("absolute")
    rel_tol = tol.get("relative")

    if abs_tol is not None:
        if abs(new - old) <= abs_tol:
            return True

    if rel_tol is not None and old != 0:
        if abs(new - old) / abs(old) <= rel_tol:
            return True

    return False
