"""AST-based import analysis for test discovery."""
from __future__ import annotations

import ast
from functools import lru_cache
from pathlib import Path

from qa.config import get_project_root, load_config


@lru_cache(maxsize=256)
def _parse_imports(test_file: str) -> frozenset[str]:
    """Parse and cache all import module paths from a test file."""
    try:
        tree = ast.parse(Path(test_file).read_text())
    except (SyntaxError, OSError):
        return frozenset()

    imports: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.add(node.module)
    return frozenset(imports)


def find_tests_by_import(
    changed_module: str,
    tests_dir: str | None = None,
) -> list[str]:
    """Find test files that import (directly) from the changed module.

    Args:
        changed_module: Dotted module path like "backend.services.reference_service"
        tests_dir: Override test directory (absolute path). Defaults to project's tests/.

    Returns:
        List of test file paths relative to project root.
    """
    root = get_project_root()
    if tests_dir is None:
        cfg = load_config("qa")
        tests_path = root / cfg["project"]["test_dir"]
    else:
        tests_path = Path(tests_dir)

    results: list[str] = []
    for test_file in sorted(tests_path.glob("test_*.py")):
        imports = _parse_imports(str(test_file))
        if any(
            imp == changed_module
            or imp.startswith(changed_module + ".")
            for imp in imports
        ):
            results.append(str(test_file.relative_to(root)))
    return results


def path_to_module(file_path: str) -> str:
    """Convert a file path to a dotted module path.

    "backend/services/reference_service.py" → "backend.services.reference_service"
    """
    return file_path.replace("/", ".").removesuffix(".py")
