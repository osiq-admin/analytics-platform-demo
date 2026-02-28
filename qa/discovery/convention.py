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
        if (root / source_path).exists():
            return [source_path]
        return []

    # Check explicit map first
    for prefix, tests in _EXPLICIT_MAP.items():
        if source_path.endswith(prefix) or source_path == prefix:
            return [t for t in tests if (root / t).exists()]

    if not parts[0] == "backend":
        return []

    candidates: list[str] = []

    # backend/services/X.py → tests/test_X.py
    if len(parts) >= 3 and parts[1] == "services":
        candidates.append(f"tests/test_{stem}.py")

    # backend/api/X.py → tests/test_X_api.py, tests/test_X.py
    elif len(parts) >= 3 and parts[1] == "api":
        candidates.append(f"tests/test_{stem}_api.py")
        candidates.append(f"tests/test_{stem}.py")

    # backend/models/X.py → tests/test_X.py, tests/test_X_models.py
    elif len(parts) >= 3 and parts[1] == "models":
        candidates.append(f"tests/test_{stem}.py")
        candidates.append(f"tests/test_{stem}_models.py")

    # backend/engine/X.py → tests/test_X.py
    elif len(parts) >= 3 and parts[1] == "engine":
        candidates.append(f"tests/test_{stem}.py")

    # Fallback: try tests/test_{stem}.py
    else:
        candidates.append(f"tests/test_{stem}.py")

    return [c for c in candidates if (root / c).exists()]
