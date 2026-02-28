"""File watcher: auto-run affected tests on file changes."""
from __future__ import annotations

import subprocess  # nosec B404 — subprocess needed for running pytest on file changes
from pathlib import Path

from qa.config import get_project_root, load_config
from qa.discovery.convention import convention_map


def resolve_test_files_from_changes(
    changes: list[tuple[str, str]],
) -> list[str]:
    """Map file changes to affected test files.

    Args:
        changes: List of (change_type, absolute_or_relative_path) tuples.

    Returns:
        Deduplicated, sorted list of test file paths.
    """
    root = get_project_root()
    test_files: set[str] = set()

    for _, path_str in changes:
        # Normalize to relative path
        try:
            rel = str(Path(path_str).relative_to(root))
        except ValueError:
            rel = path_str

        if not rel.endswith(".py"):
            continue

        mapped = convention_map(rel)
        if mapped:
            test_files.update(mapped)
        elif rel.startswith("tests/") and rel.split("/")[-1].startswith("test_"):
            test_files.add(rel)

    return sorted(test_files)


def run_watch() -> int:
    """Watch for file changes and run affected tests."""
    try:
        from watchfiles import watch, PythonFilter
    except ImportError:
        print("[qa] watchfiles not installed. Install with: pip install watchfiles")
        return 1

    root = get_project_root()
    cfg = load_config("qa")
    backend_dir = str(root / cfg["project"]["backend_source"])
    tests_dir = str(root / cfg["project"]["test_dir"])

    print(f"[qa] Watching {cfg['project']['backend_source']} and {cfg['project']['test_dir']} for changes...")
    print("[qa] Press Ctrl+C to stop.\n")

    for changes in watch(
        backend_dir, tests_dir,
        watch_filter=PythonFilter(),
        debounce=1600,
        raise_interrupt=False,
    ):
        change_list = [(c.name, p) for c, p in changes]
        test_files = resolve_test_files_from_changes(change_list)

        if not test_files:
            print("[qa] No matching tests, running full backend suite...")
            cmd = cfg["project"]["test_command"].split() + [
                cfg["project"]["test_dir"],
                "--ignore=" + cfg["project"]["e2e_dir"],
                "-x", "-q",
            ]
        else:
            print(f"[qa] Running {len(test_files)} affected test file(s):")
            for f in test_files:
                print(f"  {f}")
            cmd = cfg["project"]["test_command"].split() + test_files + ["-x", "-q"]

        subprocess.run(cmd, cwd=root)  # nosec B603
        print("\n[qa] Waiting for changes...\n")

    print("\n[qa] Watch stopped.")
    return 0
