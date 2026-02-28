"""Convention-based file → test mapping."""
from __future__ import annotations

from pathlib import Path

from qa.config import get_project_root

# Explicit overrides for non-standard mappings
_EXPLICIT_MAP: dict[str, list[str]] = {
    "backend/engine/calculation_engine.py": [
        "tests/test_calculation_engine.py",
        "tests/test_layer1_calcs.py",
        "tests/test_layer2_calcs.py",
        "tests/test_layer3_calcs.py",
        "tests/test_layer35_calcs.py",
    ],
    "backend/engine/detection_engine.py": [
        "tests/test_detection_engine.py",
        "tests/test_detection_dry_run.py",
    ],
    "backend/db.py": ["tests/test_db.py"],
    "backend/main.py": ["tests/test_lifespan_wiring.py"],
}


# Convention: backend subdirectory → list of test file name patterns (using {stem} placeholder)
_SUBDIR_PATTERNS: dict[str, list[str]] = {
    "services": ["tests/test_{stem}.py"],
    "api": ["tests/test_{stem}_api.py", "tests/test_{stem}.py"],
    "models": ["tests/test_{stem}.py", "tests/test_{stem}_models.py"],
    "engine": ["tests/test_{stem}.py"],
}


def convention_map(source_path: str) -> list[str]:
    """Map a source file path to its test file paths by naming convention.

    Returns only test files that actually exist on disk.
    """
    root = get_project_root()
    p = Path(source_path)
    parts = p.parts
    stem = p.stem

    # If it's already a test file, return it (if it exists)
    if parts[0] == "tests" and p.name.startswith("test_"):
        return [source_path] if (root / source_path).exists() else []

    # Check explicit map first
    for prefix, tests in _EXPLICIT_MAP.items():
        if source_path.endswith(prefix) or source_path == prefix:
            return [t for t in tests if (root / t).exists()]

    if parts[0] != "backend":
        return []

    # Look up patterns by backend subdirectory, fallback to generic pattern
    subdir = parts[1] if len(parts) >= 3 else None
    patterns = _SUBDIR_PATTERNS.get(subdir, ["tests/test_{stem}.py"])
    candidates = [pat.format(stem=stem) for pat in patterns]

    return [c for c in candidates if (root / c).exists()]
