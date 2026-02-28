"""Regression detection: compare two test runs."""
from __future__ import annotations

import json
import re
from pathlib import Path


def extract_test_names(run_dir: Path) -> tuple[set[str], set[str]]:
    """Extract passed and failed test names from a run's raw output.

    Returns (passed_set, failed_set).
    """
    raw_path = run_dir / "raw_output.txt"
    if not raw_path.exists():
        return set(), set()

    raw = raw_path.read_text()
    passed: set[str] = set()
    failed: set[str] = set()

    for line in raw.split("\n"):
        match = re.match(r"^([\w/.:]+::\w+(?:::\w+)?)\s+(PASSED|FAILED)", line.strip())
        if match:
            test_id, status = match.group(1), match.group(2)
            if status == "PASSED":
                passed.add(test_id)
            else:
                failed.add(test_id)

    return passed, failed


def analyze_regression(current_dir: Path, previous_dir: Path) -> dict:
    """Analyze regression between two runs."""
    curr_passed, curr_failed = extract_test_names(current_dir)
    prev_passed, prev_failed = extract_test_names(previous_dir)

    new_failures = sorted(curr_failed - prev_failed)
    new_passes = sorted(prev_failed & curr_passed)
    unchanged_failures = sorted(curr_failed & prev_failed)

    return {
        "compared_to": previous_dir.name,
        "new_failures": new_failures,
        "new_passes": new_passes,
        "unchanged_failures": unchanged_failures,
        "total_current": len(curr_passed) + len(curr_failed),
        "total_previous": len(prev_passed) + len(prev_failed),
    }
