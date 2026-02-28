"""Affected test discovery: git changes → convention + AST → test files."""
from __future__ import annotations

import subprocess  # nosec B404 — subprocess needed for git commands in test discovery

from qa.config import get_project_root
from qa.discovery.convention import convention_map
from qa.discovery.imports import find_tests_by_import, path_to_module


def get_changed_files(since: str = "HEAD") -> list[str]:
    """Get files changed relative to a git ref.

    Combines unstaged, staged, and untracked files.
    """
    root = get_project_root()
    files: set[str] = set()

    # Unstaged changes
    result = subprocess.run(  # nosec B603 B607
        ["git", "diff", "--name-only", since],
        capture_output=True, text=True, cwd=root,
    )
    if result.returncode == 0 and result.stdout.strip():
        files.update(result.stdout.strip().split("\n"))

    # Staged changes
    result = subprocess.run(  # nosec B603 B607
        ["git", "diff", "--name-only", "--cached"],
        capture_output=True, text=True, cwd=root,
    )
    if result.returncode == 0 and result.stdout.strip():
        files.update(result.stdout.strip().split("\n"))

    # Untracked files
    result = subprocess.run(  # nosec B603 B607
        ["git", "ls-files", "--others", "--exclude-standard"],
        capture_output=True, text=True, cwd=root,
    )
    if result.returncode == 0 and result.stdout.strip():
        files.update(result.stdout.strip().split("\n"))

    return [f for f in sorted(files) if f]


def get_changed_files_for_push() -> list[str]:
    """Get files changed in commits about to be pushed."""
    root = get_project_root()
    result = subprocess.run(  # nosec B603 B607
        ["git", "diff", "--name-only", "@{push}..HEAD"],
        capture_output=True, text=True, cwd=root,
    )
    if result.returncode != 0:
        result = subprocess.run(  # nosec B603 B607
            ["git", "diff", "--name-only", "origin/main..HEAD"],
            capture_output=True, text=True, cwd=root,
        )
    if result.returncode == 0 and result.stdout.strip():
        return result.stdout.strip().split("\n")
    return []


def resolve_affected_tests(since: str = "HEAD") -> list[str]:
    """Resolve changed files to affected test files.

    Strategy:
    1. Convention-based mapping (fast, covers ~90%)
    2. AST import analysis fallback (for unmapped Python files)
    3. Deduplication
    """
    changed = get_changed_files(since)
    if not changed:
        return []

    all_tests: set[str] = set()

    for f in changed:
        # Strategy 1: convention mapping
        mapped = convention_map(f)
        all_tests.update(mapped)

        # Strategy 2: AST import analysis (only for unmapped backend .py files)
        if not mapped and f.endswith(".py") and f.startswith("backend/"):
            module = path_to_module(f)
            import_tests = find_tests_by_import(module)
            all_tests.update(import_tests)

    return sorted(all_tests)
