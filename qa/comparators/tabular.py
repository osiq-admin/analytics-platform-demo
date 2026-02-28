"""Tabular comparator: key-based join with per-field tolerance."""
from __future__ import annotations



def _compute_field_diffs(prev_rec: dict, curr_rec: dict, key: str) -> dict:
    """Compute field-level diffs between two records, excluding the join key."""
    diffs = {}
    for field in prev_rec:
        if field == key:
            continue
        old_val = prev_rec.get(field)
        new_val = curr_rec.get(field)
        if old_val != new_val:
            diffs[field] = {"old": old_val, "new": new_val}
    return diffs


def _classify_diffs(diffs: dict, tolerance: dict) -> tuple[bool, dict]:
    """Apply tolerance checks to diffs, return (all_within_tolerance, significant_diffs)."""
    all_within = True
    for field, diff in diffs.items():
        tol = tolerance.get(field, {})
        if tol and _within_tolerance(diff["old"], diff["new"], tol):
            diff["within_tolerance"] = True
        else:
            all_within = False
            diff["within_tolerance"] = False

    significant = {f: d for f, d in diffs.items() if not d.get("within_tolerance")}
    return all_within, significant


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
        diffs = _compute_field_diffs(prev_map[k], curr_map[k], key)
        if not diffs:
            continue

        all_within, significant = _classify_diffs(diffs, tolerance)
        if all_within:
            within_tolerance_count += 1
        else:
            changed.append({"key": k, "diffs": significant})

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
