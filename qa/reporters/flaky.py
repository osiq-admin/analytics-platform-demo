"""Flaky test detection using entropy and flip rate."""
from __future__ import annotations

import json
import math
from pathlib import Path


def compute_entropy(history: str) -> float:
    """Shannon entropy of a pass/fail history string (P/F chars)."""
    if not history:
        return 0.0
    n = len(history)
    p_count = history.count("P")
    f_count = history.count("F")
    if p_count == 0 or f_count == 0:
        return 0.0
    p_prob = p_count / n
    f_prob = f_count / n
    return -(p_prob * math.log2(p_prob) + f_prob * math.log2(f_prob))


def compute_flip_rate(history: str) -> float:
    """Fraction of adjacent status changes in history."""
    if len(history) <= 1:
        return 0.0
    flips = sum(1 for i in range(1, len(history)) if history[i] != history[i - 1])
    return flips / (len(history) - 1)


def update_flaky_history(
    history_file: Path,
    passed: set[str],
    failed: set[str],
    window_size: int = 20,
) -> None:
    """Append current run results to the rolling history."""
    if history_file.exists():
        data = json.loads(history_file.read_text())
    else:
        data = {}

    for test_id in passed:
        data[test_id] = (data.get(test_id, "") + "P")[-window_size:]
    for test_id in failed:
        data[test_id] = (data.get(test_id, "") + "F")[-window_size:]

    history_file.write_text(json.dumps(data, indent=2))


def detect_flaky_tests(
    history_file: Path,
    flip_threshold: float = 0.3,
    entropy_threshold: float = 0.5,
    min_history: int = 5,
) -> list[dict]:
    """Detect flaky test suspects from rolling history."""
    if not history_file.exists():
        return []

    data = json.loads(history_file.read_text())
    suspects = []

    for test_id, history in data.items():
        if len(history) < min_history:
            continue
        flip = compute_flip_rate(history)
        ent = compute_entropy(history)
        if flip > flip_threshold and ent > entropy_threshold:
            suspects.append({
                "test": test_id,
                "flip_rate": round(flip, 3),
                "entropy": round(ent, 3),
                "history": history,
                "runs": len(history),
            })

    return sorted(suspects, key=lambda s: s["flip_rate"], reverse=True)
