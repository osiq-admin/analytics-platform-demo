# QA Automation Toolkit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-contained `qa/` toolkit with test execution, regression detection, domain-specific data comparison, quality scanning, file watcher, and git hooks — loosely coupled from the main project.

**Architecture:** Self-contained Python package in `qa/` with its own config. Communicates with the project only via CLI commands (`uv run pytest`), file paths, and JSON. Three runners (test, quality, watch), three comparators (tabular, calculation, detection), hybrid test discovery (convention + AST), immutable timestamped reports.

**Tech Stack:** Python 3.11+, argparse (CLI), watchfiles (already installed), ast (import analysis), difflib (fuzzy comparison), statistics (baselines), subprocess (tool orchestration), json/pathlib (I/O)

**Design doc:** `docs/plans/2026-02-28-qa-automation-toolkit-design.md`

---

## Task 1: Scaffold qa/ Package + Config Files

**Files:**
- Create: `qa/__init__.py`
- Create: `qa/__main__.py`
- Create: `qa/config/__init__.py`
- Create: `qa/config/qa.json`
- Create: `qa/config/comparison.json`
- Create: `qa/config/tools.json`
- Create: `qa/runners/__init__.py`
- Create: `qa/comparators/__init__.py`
- Create: `qa/reporters/__init__.py`
- Create: `qa/discovery/__init__.py`
- Create: `qa/hooks/__init__.py`
- Create: `qa/.gitignore`
- Test: `tests/qa/test_config.py`

**Step 1: Create directory structure**

Create all directories and `__init__.py` files:

```
qa/
├── __init__.py                 # """QA Automation Toolkit."""
├── __main__.py                 # CLI entry point (placeholder)
├── config/
│   ├── __init__.py             # Config loader
│   ├── qa.json
│   ├── comparison.json
│   └── tools.json
├── runners/__init__.py
├── comparators/__init__.py
├── reporters/__init__.py
├── discovery/__init__.py
├── hooks/__init__.py
└── .gitignore                  # reports/
```

**Step 2: Create qa/config/qa.json**

```json
{
  "project": {
    "root": ".",
    "backend_source": "backend/",
    "frontend_source": "frontend/src/",
    "test_dir": "tests/",
    "e2e_dir": "tests/e2e/",
    "test_command": "uv run pytest",
    "build_command": "cd frontend && npm run build",
    "python_version": "3.11"
  },
  "quality_gate": {
    "tests_must_pass": true,
    "coverage_minimum": 80,
    "max_cyclomatic_complexity": 15,
    "security_max_high": 0,
    "security_max_medium": 5,
    "no_new_regressions": true,
    "max_flaky_tests": 5
  },
  "performance": {
    "baseline_sigma": 3,
    "duration_regression_threshold_pct": 50,
    "min_runs_for_baseline": 5
  },
  "flaky_detection": {
    "window_size": 20,
    "flip_rate_threshold": 0.3,
    "entropy_threshold": 0.5
  },
  "reports": {
    "output_dir": "qa/reports",
    "keep_last_n_runs": 50
  }
}
```

**Step 3: Create qa/config/comparison.json**

```json
{
  "scopes": {
    "reference.product": {
      "type": "tabular",
      "description": "Product golden records",
      "source": "workspace/reference/product_golden.json",
      "query": {
        "fields": ["golden_id", "natural_key", "confidence_score", "status"],
        "filter": {"status": "active"},
        "sort_by": "golden_id"
      },
      "key": "golden_id",
      "tolerance": {
        "confidence_score": {"absolute": 0.01}
      },
      "blast_radius_tag": "reference"
    },
    "reference.venue": {
      "type": "tabular",
      "description": "Venue golden records",
      "source": "workspace/reference/venue_golden.json",
      "query": {
        "fields": ["golden_id", "natural_key", "confidence_score", "status"],
        "sort_by": "golden_id"
      },
      "key": "golden_id",
      "tolerance": {
        "confidence_score": {"absolute": 0.01}
      },
      "blast_radius_tag": "reference"
    },
    "reference.account": {
      "type": "tabular",
      "description": "Account golden records",
      "source": "workspace/reference/account_golden.json",
      "query": {
        "fields": ["golden_id", "natural_key", "confidence_score"],
        "sort_by": "golden_id"
      },
      "key": "golden_id",
      "tolerance": {
        "confidence_score": {"absolute": 0.01}
      },
      "blast_radius_tag": "reference"
    },
    "reference.trader": {
      "type": "tabular",
      "description": "Trader golden records",
      "source": "workspace/reference/trader_golden.json",
      "query": {
        "fields": ["golden_id", "natural_key", "confidence_score"],
        "sort_by": "golden_id"
      },
      "key": "golden_id",
      "tolerance": {
        "confidence_score": {"absolute": 0.01}
      },
      "blast_radius_tag": "reference"
    }
  },
  "blast_radius_groups": {
    "reference": ["reference.product", "reference.venue", "reference.account", "reference.trader"]
  },
  "e2e_comparison": {
    "default_mode": "assertion_only",
    "per_view": {}
  }
}
```

**Step 4: Create qa/config/tools.json**

```json
{
  "python": {
    "ruff": {
      "enabled": true,
      "command": "ruff check {targets}",
      "report_format": "json",
      "report_flag": "--output-format json",
      "targets": ["backend/", "tests/", "scripts/"]
    },
    "bandit": {
      "enabled": true,
      "command": "bandit -r {targets} -f json",
      "targets": ["backend/"]
    },
    "radon": {
      "enabled": true,
      "command_cc": "radon cc {targets} -j -n C",
      "command_mi": "radon mi {targets} -j",
      "targets": ["backend/"]
    },
    "vulture": {
      "enabled": true,
      "command": "vulture {targets} --min-confidence 80",
      "targets": ["backend/"]
    },
    "coverage": {
      "enabled": true,
      "command": "coverage run -m pytest tests/ --ignore=tests/e2e -q",
      "report_command": "coverage json -o {output_file}",
      "fail_under": 80
    }
  },
  "typescript": {
    "eslint": {
      "enabled": false,
      "command": "cd frontend && npx eslint src/ --format json",
      "note": "Enable when ESLint is configured"
    }
  },
  "cross_language": {
    "semgrep": {
      "enabled": false,
      "command": "semgrep scan --config auto --json {targets}",
      "targets": ["backend/", "frontend/src/"],
      "note": "Enable after installing semgrep"
    }
  }
}
```

**Step 5: Create qa/config/__init__.py — Config loader**

```python
"""Configuration loader for QA toolkit."""
from __future__ import annotations

import json
from pathlib import Path

_CONFIG_DIR = Path(__file__).parent


def load_config(name: str = "qa") -> dict:
    """Load a JSON config file by name (without .json extension)."""
    path = _CONFIG_DIR / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"Config not found: {path}")
    return json.loads(path.read_text())


def get_project_root() -> Path:
    """Return the project root (parent of qa/)."""
    return Path(__file__).resolve().parent.parent.parent


def get_reports_dir() -> Path:
    """Return the reports output directory."""
    cfg = load_config("qa")
    return get_project_root() / cfg["reports"]["output_dir"]
```

**Step 6: Create qa/__init__.py**

```python
"""QA Automation Toolkit — self-contained test and quality automation."""
```

**Step 7: Create qa/__main__.py — CLI placeholder**

```python
"""CLI entry point: uv run python -m qa <command>."""
from __future__ import annotations

import argparse
import sys


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="qa",
        description="QA Automation Toolkit",
    )
    sub = parser.add_subparsers(dest="command")

    # test command
    test_p = sub.add_parser("test", help="Run tests with regression detection")
    test_p.add_argument(
        "suite",
        nargs="?",
        default="backend",
        choices=["backend", "e2e", "all", "affected"],
    )
    test_p.add_argument("-x", "--failfast", action="store_true")
    test_p.add_argument("-k", "--keyword", type=str)
    test_p.add_argument("-q", "--quiet", action="store_true")
    test_p.add_argument("--since", type=str, default="HEAD",
                        help="Git ref for affected test discovery")

    # quality command
    qual_p = sub.add_parser("quality", help="Run quality scanning tools")
    qual_p.add_argument("--python", action="store_true")
    qual_p.add_argument("--typescript", action="store_true")
    qual_p.add_argument("--security", action="store_true")
    qual_p.add_argument("--coverage", action="store_true")

    # report command
    rep_p = sub.add_parser("report", help="View test reports")
    rep_p.add_argument("--latest", action="store_true")
    rep_p.add_argument("--regression", action="store_true")
    rep_p.add_argument("--flaky", action="store_true")
    rep_p.add_argument("--quality", action="store_true")
    rep_p.add_argument("--diff", nargs=2, metavar=("RUN1", "RUN2"))

    # watch command
    sub.add_parser("watch", help="Watch files and auto-run affected tests")

    # gate command
    sub.add_parser("gate", help="Evaluate quality gate pass/fail")

    # hooks command
    hooks_p = sub.add_parser("hooks", help="Manage git hooks")
    hooks_p.add_argument("action", choices=["install", "uninstall"])

    # baseline command
    base_p = sub.add_parser("baseline", help="Manage baselines")
    base_p.add_argument("action", choices=["update"])

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 0

    if args.command == "test":
        from qa.runners.test_runner import run_tests
        return run_tests(args)
    elif args.command == "quality":
        from qa.runners.quality_runner import run_quality
        return run_quality(args)
    elif args.command == "watch":
        from qa.runners.watch_runner import run_watch
        return run_watch()
    elif args.command == "report":
        from qa.reporters.summary import show_report
        return show_report(args)
    elif args.command == "gate":
        from qa.reporters.summary import evaluate_gate
        return evaluate_gate()
    elif args.command == "hooks":
        from qa.hooks import manage_hooks
        return manage_hooks(args.action)
    elif args.command == "baseline":
        from qa.reporters.summary import update_baseline
        return update_baseline()

    return 0


if __name__ == "__main__":
    sys.exit(main())
```

**Step 8: Create qa/.gitignore**

```
reports/
```

**Step 9: Create tests/qa/ directory and test file**

Create `tests/qa/__init__.py` (empty) and `tests/qa/test_config.py`:

```python
"""Tests for QA toolkit configuration."""
import json
from pathlib import Path

import pytest

from qa.config import load_config, get_project_root, get_reports_dir


class TestConfigLoader:
    def test_load_qa_config(self):
        cfg = load_config("qa")
        assert "project" in cfg
        assert "quality_gate" in cfg
        assert "reports" in cfg

    def test_load_comparison_config(self):
        cfg = load_config("comparison")
        assert "scopes" in cfg
        assert "blast_radius_groups" in cfg

    def test_load_tools_config(self):
        cfg = load_config("tools")
        assert "python" in cfg
        assert "ruff" in cfg["python"]

    def test_load_nonexistent_raises(self):
        with pytest.raises(FileNotFoundError):
            load_config("nonexistent")

    def test_project_root_is_repo_root(self):
        root = get_project_root()
        assert (root / "backend").is_dir()
        assert (root / "frontend").is_dir()

    def test_reports_dir(self):
        reports = get_reports_dir()
        assert str(reports).endswith("qa/reports")

    def test_qa_json_has_required_keys(self):
        cfg = load_config("qa")
        assert cfg["project"]["test_command"] == "uv run pytest"
        assert cfg["quality_gate"]["tests_must_pass"] is True
        assert cfg["flaky_detection"]["window_size"] == 20

    def test_comparison_scopes_are_valid(self):
        cfg = load_config("comparison")
        for scope_id, scope in cfg["scopes"].items():
            assert "type" in scope
            assert scope["type"] in ("tabular", "calculation", "detection")
            assert "key" in scope or scope["type"] != "tabular"

    def test_tools_have_command_and_targets(self):
        cfg = load_config("tools")
        for tool_name, tool_cfg in cfg["python"].items():
            assert "enabled" in tool_cfg
            assert "command" in tool_cfg or "command_cc" in tool_cfg
```

**Step 10: Run tests**

Run: `uv run pytest tests/qa/test_config.py -v`
Expected: 9 passed

**Step 11: Commit**

```bash
git add qa/ tests/qa/
git commit -m "feat(qa): scaffold qa/ package with config loader and 3 config files"
```

---

## Task 2: Convention-Based Test Discovery

**Files:**
- Create: `qa/discovery/convention.py`
- Create: `tests/qa/test_discovery.py`

**Step 1: Write failing tests**

`tests/qa/test_discovery.py`:

```python
"""Tests for convention-based test discovery."""
from pathlib import Path

import pytest

from qa.discovery.convention import convention_map


class TestConventionMap:
    def test_service_to_test(self):
        result = convention_map("backend/services/reference_service.py")
        assert "tests/test_reference_service.py" in result

    def test_api_to_test(self):
        result = convention_map("backend/api/reference.py")
        assert "tests/test_reference_api.py" in result

    def test_model_to_test(self):
        result = convention_map("backend/models/medallion.py")
        assert "tests/test_medallion.py" in result

    def test_engine_to_test(self):
        result = convention_map("backend/engine/calculation_engine.py")
        assert "tests/test_calculation_engine.py" in result

    def test_test_file_maps_to_self(self):
        result = convention_map("tests/test_reference_models.py")
        assert "tests/test_reference_models.py" in result

    def test_frontend_file_returns_empty(self):
        result = convention_map("frontend/src/views/Dashboard/index.tsx")
        assert result == []

    def test_nonexistent_source_returns_empty(self):
        result = convention_map("backend/services/does_not_exist_xyz.py")
        assert result == []

    def test_db_explicit_mapping(self):
        result = convention_map("backend/db.py")
        assert "tests/test_db.py" in result

    def test_calculation_engine_maps_to_multiple(self):
        result = convention_map("backend/engine/calculation_engine.py")
        assert len(result) >= 2  # test_calculation_engine + layer tests
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_discovery.py -v`
Expected: FAIL (ImportError — module not found)

**Step 3: Implement convention_map**

`qa/discovery/convention.py`:

```python
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
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_discovery.py -v`
Expected: 9 passed

**Step 5: Commit**

```bash
git add qa/discovery/convention.py tests/qa/test_discovery.py
git commit -m "feat(qa): add convention-based test file discovery"
```

---

## Task 3: AST Import Analysis Discovery

**Files:**
- Create: `qa/discovery/imports.py`
- Modify: `tests/qa/test_discovery.py` — add import analysis tests

**Step 1: Write failing tests**

Add to `tests/qa/test_discovery.py`:

```python
from qa.discovery.imports import find_tests_by_import


class TestImportAnalysis:
    def test_finds_tests_importing_reference_service(self):
        result = find_tests_by_import("backend.services.reference_service")
        assert any("test_reference_service" in t for t in result)

    def test_finds_tests_importing_db(self):
        result = find_tests_by_import("backend.db")
        # Multiple test files import backend.db
        assert len(result) >= 1

    def test_nonexistent_module_returns_empty(self):
        result = find_tests_by_import("backend.services.totally_fake_xyz")
        assert result == []

    def test_partial_module_match(self):
        # "backend.services" should match tests importing "backend.services.X"
        result = find_tests_by_import("backend.services")
        assert len(result) >= 5
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_discovery.py::TestImportAnalysis -v`
Expected: FAIL (ImportError)

**Step 3: Implement AST import analysis**

`qa/discovery/imports.py`:

```python
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
            changed_module.startswith(imp) or imp.startswith(changed_module)
            for imp in imports
        ):
            results.append(str(test_file.relative_to(root)))
    return results


def path_to_module(file_path: str) -> str:
    """Convert a file path to a dotted module path.

    "backend/services/reference_service.py" → "backend.services.reference_service"
    """
    return file_path.replace("/", ".").removesuffix(".py")
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_discovery.py -v`
Expected: All passed (13 total: 9 convention + 4 import)

**Step 5: Commit**

```bash
git add qa/discovery/imports.py tests/qa/test_discovery.py
git commit -m "feat(qa): add AST import analysis for cross-cutting test discovery"
```

---

## Task 4: Git Integration + Affected Test Resolution

**Files:**
- Create: `qa/discovery/affected.py`
- Modify: `tests/qa/test_discovery.py` — add affected tests

**Step 1: Write failing tests**

Add to `tests/qa/test_discovery.py`:

```python
from unittest.mock import patch

from qa.discovery.affected import get_changed_files, resolve_affected_tests


class TestAffectedDiscovery:
    def test_resolve_affected_from_service_change(self):
        with patch("qa.discovery.affected.get_changed_files") as mock:
            mock.return_value = ["backend/services/reference_service.py"]
            result = resolve_affected_tests()
            assert any("test_reference_service" in t for t in result)

    def test_resolve_affected_from_api_change(self):
        with patch("qa.discovery.affected.get_changed_files") as mock:
            mock.return_value = ["backend/api/reference.py"]
            result = resolve_affected_tests()
            assert any("test_reference_api" in t for t in result)

    def test_resolve_affected_from_test_change(self):
        with patch("qa.discovery.affected.get_changed_files") as mock:
            mock.return_value = ["tests/test_reference_models.py"]
            result = resolve_affected_tests()
            assert "tests/test_reference_models.py" in result

    def test_resolve_affected_empty_changes(self):
        with patch("qa.discovery.affected.get_changed_files") as mock:
            mock.return_value = []
            result = resolve_affected_tests()
            assert result == []

    def test_resolve_deduplicates(self):
        with patch("qa.discovery.affected.get_changed_files") as mock:
            mock.return_value = [
                "backend/services/reference_service.py",
                "tests/test_reference_service.py",
            ]
            result = resolve_affected_tests()
            assert result.count("tests/test_reference_service.py") == 1
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_discovery.py::TestAffectedDiscovery -v`
Expected: FAIL (ImportError)

**Step 3: Implement affected.py**

`qa/discovery/affected.py`:

```python
"""Affected test discovery: git changes → convention + AST → test files."""
from __future__ import annotations

import subprocess
from pathlib import Path

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
    result = subprocess.run(
        ["git", "diff", "--name-only", since],
        capture_output=True, text=True, cwd=root,
    )
    if result.returncode == 0 and result.stdout.strip():
        files.update(result.stdout.strip().split("\n"))

    # Staged changes
    result = subprocess.run(
        ["git", "diff", "--name-only", "--cached"],
        capture_output=True, text=True, cwd=root,
    )
    if result.returncode == 0 and result.stdout.strip():
        files.update(result.stdout.strip().split("\n"))

    # Untracked files
    result = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard"],
        capture_output=True, text=True, cwd=root,
    )
    if result.returncode == 0 and result.stdout.strip():
        files.update(result.stdout.strip().split("\n"))

    return [f for f in sorted(files) if f]


def get_changed_files_for_push() -> list[str]:
    """Get files changed in commits about to be pushed."""
    root = get_project_root()
    result = subprocess.run(
        ["git", "diff", "--name-only", "@{push}..HEAD"],
        capture_output=True, text=True, cwd=root,
    )
    if result.returncode != 0:
        result = subprocess.run(
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
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_discovery.py -v`
Expected: All passed (18 total)

**Step 5: Commit**

```bash
git add qa/discovery/affected.py tests/qa/test_discovery.py
git commit -m "feat(qa): add affected test discovery with git integration"
```

---

## Task 5: Test Runner — Execute + Capture Results

**Files:**
- Create: `qa/runners/test_runner.py`
- Create: `tests/qa/test_runner.py`

**Step 1: Write failing tests**

`tests/qa/test_runner.py`:

```python
"""Tests for the test runner."""
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from qa.runners.test_runner import (
    create_run_dir,
    parse_pytest_output,
    write_summary,
    run_tests,
)


class TestRunDir:
    def test_create_run_dir_creates_timestamped_dir(self, tmp_path):
        run_dir = create_run_dir(tmp_path)
        assert run_dir.exists()
        assert run_dir.is_dir()
        # Timestamped format: YYYY-MM-DDTHH-MM-SS
        assert len(run_dir.name) >= 19

    def test_create_run_dir_updates_latest_symlink(self, tmp_path):
        run_dir = create_run_dir(tmp_path)
        latest = tmp_path / "LATEST"
        assert latest.is_symlink()
        assert latest.resolve() == run_dir.resolve()

    def test_multiple_runs_update_latest(self, tmp_path):
        run_dir_1 = create_run_dir(tmp_path)
        run_dir_2 = create_run_dir(tmp_path)
        latest = tmp_path / "LATEST"
        assert latest.resolve() == run_dir_2.resolve()


class TestParsePytestOutput:
    def test_parse_all_passed(self):
        output = "===== 705 passed in 12.34s ====="
        result = parse_pytest_output(output, 0)
        assert result["passed"] == 705
        assert result["failed"] == 0
        assert result["total"] == 705

    def test_parse_with_failures(self):
        output = "===== 700 passed, 5 failed in 15.67s ====="
        result = parse_pytest_output(output, 1)
        assert result["passed"] == 700
        assert result["failed"] == 5
        assert result["total"] == 705

    def test_parse_with_skipped(self):
        output = "===== 700 passed, 3 skipped in 10.00s ====="
        result = parse_pytest_output(output, 0)
        assert result["passed"] == 700
        assert result["skipped"] == 3

    def test_parse_with_errors(self):
        output = "===== 2 errors in 1.00s ====="
        result = parse_pytest_output(output, 2)
        assert result["errors"] == 2


class TestWriteSummary:
    def test_writes_valid_json(self, tmp_path):
        run_dir = tmp_path / "run1"
        run_dir.mkdir()
        write_summary(run_dir, "backend", {
            "passed": 10, "failed": 0, "skipped": 0,
            "errors": 0, "total": 10,
        }, 5.0)
        summary_path = run_dir / "summary.json"
        assert summary_path.exists()
        data = json.loads(summary_path.read_text())
        assert data["suite"] == "backend"
        assert data["passed"] == 10
        assert data["duration_seconds"] == 5.0
        assert "git_sha" in data
        assert "timestamp" in data
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_runner.py -v`
Expected: FAIL (ImportError)

**Step 3: Implement test_runner.py**

`qa/runners/test_runner.py`:

```python
"""Test runner: execute pytest suites with result capture."""
from __future__ import annotations

import json
import os
import re
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

from qa.config import load_config, get_project_root, get_reports_dir


def create_run_dir(base_dir: Path | None = None) -> Path:
    """Create a timestamped immutable run directory and update LATEST symlink."""
    if base_dir is None:
        base_dir = get_reports_dir() / "runs"
    base_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    run_dir = base_dir / timestamp

    # Handle sub-second collisions
    counter = 0
    while run_dir.exists():
        counter += 1
        run_dir = base_dir / f"{timestamp}-{counter}"
    run_dir.mkdir(parents=True)

    # Update LATEST symlink
    latest = base_dir / "LATEST"
    if latest.is_symlink() or latest.exists():
        latest.unlink()
    latest.symlink_to(run_dir.name)

    return run_dir


def parse_pytest_output(output: str, return_code: int) -> dict:
    """Parse pytest summary line into structured results."""
    result = {"passed": 0, "failed": 0, "skipped": 0, "errors": 0, "total": 0}

    # Match patterns like "705 passed", "5 failed", "3 skipped", "2 errors"
    for key in ("passed", "failed", "skipped", "errors"):
        match = re.search(rf"(\d+) {key}", output)
        if match:
            result[key] = int(match.group(1))

    result["total"] = result["passed"] + result["failed"] + result["skipped"] + result["errors"]
    return result


def _get_git_sha() -> str:
    """Get current git SHA."""
    root = get_project_root()
    result = subprocess.run(
        ["git", "rev-parse", "--short", "HEAD"],
        capture_output=True, text=True, cwd=root,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _get_git_branch() -> str:
    """Get current git branch."""
    root = get_project_root()
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True, text=True, cwd=root,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def write_summary(
    run_dir: Path,
    suite: str,
    results: dict,
    duration: float,
) -> None:
    """Write summary.json to the run directory."""
    summary = {
        "run_id": run_dir.name,
        "git_sha": _get_git_sha(),
        "git_branch": _get_git_branch(),
        "suite": suite,
        "total": results["total"],
        "passed": results["passed"],
        "failed": results["failed"],
        "skipped": results["skipped"],
        "errors": results["errors"],
        "duration_seconds": round(duration, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2))


def run_tests(args) -> int:
    """Main test runner entry point."""
    cfg = load_config("qa")
    root = get_project_root()
    test_cmd = cfg["project"]["test_command"].split()

    # Build pytest command
    cmd = list(test_cmd)

    if args.suite == "backend":
        cmd += [cfg["project"]["test_dir"], "--ignore=" + cfg["project"]["e2e_dir"]]
    elif args.suite == "e2e":
        cmd += [cfg["project"]["e2e_dir"]]
    elif args.suite == "affected":
        from qa.discovery.affected import resolve_affected_tests
        affected = resolve_affected_tests(args.since)
        if not affected:
            print("[qa] No affected tests found. Running full backend suite.")
            cmd += [cfg["project"]["test_dir"], "--ignore=" + cfg["project"]["e2e_dir"]]
        else:
            print(f"[qa] Running {len(affected)} affected test files:")
            for f in affected:
                print(f"  {f}")
            cmd += affected
    else:  # all
        cmd += [cfg["project"]["test_dir"]]

    if args.failfast:
        cmd.append("-x")
    if args.keyword:
        cmd += ["-k", args.keyword]
    if args.quiet:
        cmd.append("-q")
    else:
        cmd.append("-v")

    # Execute
    print(f"[qa] Running: {' '.join(cmd)}")
    start = time.monotonic()

    try:
        result = subprocess.run(
            cmd, cwd=root,
            capture_output=True, text=True,
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        print("[qa] TIMEOUT: Tests exceeded 600s")
        return 124
    except KeyboardInterrupt:
        print("\n[qa] Interrupted.")
        return 130

    duration = time.monotonic() - start

    # Print output
    if result.stdout:
        print(result.stdout)
    if result.stderr and result.returncode != 0:
        print(result.stderr)

    # Parse and save results
    output = result.stdout + result.stderr
    parsed = parse_pytest_output(output, result.returncode)

    run_dir = create_run_dir()
    write_summary(run_dir, args.suite, parsed, duration)

    # Write raw output for reference
    (run_dir / "raw_output.txt").write_text(output)

    print(f"\n[qa] Results saved to: {run_dir}")
    print(f"[qa] {parsed['passed']} passed, {parsed['failed']} failed, "
          f"{parsed['skipped']} skipped, {parsed['errors']} errors "
          f"in {duration:.1f}s")

    # Trigger regression analysis if previous run exists
    runs_dir = run_dir.parent
    latest_symlink = runs_dir / "LATEST"
    all_runs = sorted([d for d in runs_dir.iterdir()
                       if d.is_dir() and d.name != "LATEST"])
    if len(all_runs) >= 2:
        prev_run = all_runs[-2]
        _run_regression_analysis(run_dir, prev_run)

    return result.returncode


def _run_regression_analysis(current: Path, previous: Path) -> None:
    """Run regression analysis comparing current and previous runs."""
    try:
        from qa.reporters.regression import analyze_regression
        diffs_dir = current / "diffs"
        diffs_dir.mkdir(exist_ok=True)
        analysis = analyze_regression(current, previous)
        (diffs_dir / "regression.json").write_text(json.dumps(analysis, indent=2))

        # Print regression summary
        new_failures = analysis.get("new_failures", [])
        new_passes = analysis.get("new_passes", [])
        if new_failures:
            print(f"\n[qa] REGRESSION: {len(new_failures)} new failure(s):")
            for f in new_failures[:10]:
                print(f"  FAIL: {f}")
        if new_passes:
            print(f"[qa] {len(new_passes)} newly passing test(s)")
    except ImportError:
        pass  # Regression reporter not yet implemented
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_runner.py -v`
Expected: All passed (9 tests)

**Step 5: Commit**

```bash
git add qa/runners/test_runner.py tests/qa/test_runner.py
git commit -m "feat(qa): add test runner with result capture and immutable reports"
```

---

## Task 6: Regression Detection Reporter

**Files:**
- Create: `qa/reporters/regression.py`
- Create: `tests/qa/test_regression.py`

**Step 1: Write failing tests**

`tests/qa/test_regression.py`:

```python
"""Tests for regression detection."""
import json
from pathlib import Path

import pytest

from qa.reporters.regression import analyze_regression, extract_test_names


class TestExtractTestNames:
    def test_extract_from_summary(self, tmp_path):
        run_dir = tmp_path / "run1"
        run_dir.mkdir()
        (run_dir / "summary.json").write_text(json.dumps({
            "passed": 3, "failed": 1, "total": 4,
        }))
        (run_dir / "raw_output.txt").write_text(
            "tests/test_a.py::test_one PASSED\n"
            "tests/test_a.py::test_two PASSED\n"
            "tests/test_b.py::test_three PASSED\n"
            "tests/test_b.py::test_four FAILED\n"
        )
        passed, failed = extract_test_names(run_dir)
        assert "tests/test_a.py::test_one" in passed
        assert "tests/test_b.py::test_four" in failed
        assert len(passed) == 3
        assert len(failed) == 1


class TestAnalyzeRegression:
    def _make_run(self, tmp_path, name, passed_tests, failed_tests):
        run_dir = tmp_path / name
        run_dir.mkdir()
        lines = []
        for t in passed_tests:
            lines.append(f"{t} PASSED")
        for t in failed_tests:
            lines.append(f"{t} FAILED")
        (run_dir / "raw_output.txt").write_text("\n".join(lines))
        (run_dir / "summary.json").write_text(json.dumps({
            "passed": len(passed_tests),
            "failed": len(failed_tests),
            "total": len(passed_tests) + len(failed_tests),
        }))
        return run_dir

    def test_no_regression(self, tmp_path):
        prev = self._make_run(tmp_path, "prev", ["t::a", "t::b"], [])
        curr = self._make_run(tmp_path, "curr", ["t::a", "t::b"], [])
        result = analyze_regression(curr, prev)
        assert result["new_failures"] == []
        assert result["new_passes"] == []

    def test_new_failure_detected(self, tmp_path):
        prev = self._make_run(tmp_path, "prev", ["t::a", "t::b"], [])
        curr = self._make_run(tmp_path, "curr", ["t::a"], ["t::b"])
        result = analyze_regression(curr, prev)
        assert "t::b" in result["new_failures"]

    def test_new_pass_detected(self, tmp_path):
        prev = self._make_run(tmp_path, "prev", ["t::a"], ["t::b"])
        curr = self._make_run(tmp_path, "curr", ["t::a", "t::b"], [])
        result = analyze_regression(curr, prev)
        assert "t::b" in result["new_passes"]

    def test_unchanged_failure_not_regression(self, tmp_path):
        prev = self._make_run(tmp_path, "prev", ["t::a"], ["t::b"])
        curr = self._make_run(tmp_path, "curr", ["t::a"], ["t::b"])
        result = analyze_regression(curr, prev)
        assert result["new_failures"] == []
        assert "t::b" in result["unchanged_failures"]
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_regression.py -v`
Expected: FAIL (ImportError)

**Step 3: Implement regression.py**

`qa/reporters/regression.py`:

```python
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
        # Match: tests/test_foo.py::TestClass::test_method PASSED
        match = re.match(r"^([\w/.:]+::\w+(?:::\w+)?)\s+(PASSED|FAILED)", line.strip())
        if match:
            test_id, status = match.group(1), match.group(2)
            if status == "PASSED":
                passed.add(test_id)
            else:
                failed.add(test_id)

    return passed, failed


def analyze_regression(current_dir: Path, previous_dir: Path) -> dict:
    """Analyze regression between two runs.

    Categories:
    - new_failures: passed before, failed now
    - new_passes: failed before, passed now
    - unchanged_failures: failed in both
    - total_current / total_previous
    """
    curr_passed, curr_failed = extract_test_names(current_dir)
    prev_passed, prev_failed = extract_test_names(previous_dir)

    new_failures = sorted(curr_failed - prev_failed)
    new_passes = sorted(curr_passed - prev_passed - (curr_passed - prev_passed - prev_failed))
    # More precisely: tests that were failed before and are passed now
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
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_regression.py -v`
Expected: 5 passed

**Step 5: Commit**

```bash
git add qa/reporters/regression.py tests/qa/test_regression.py
git commit -m "feat(qa): add regression detection reporter"
```

---

## Task 7: Flaky Test Detection

**Files:**
- Create: `qa/reporters/flaky.py`
- Create: `tests/qa/test_flaky.py`

**Step 1: Write failing tests**

`tests/qa/test_flaky.py`:

```python
"""Tests for flaky test detection."""
import json
from pathlib import Path

import pytest

from qa.reporters.flaky import (
    update_flaky_history,
    detect_flaky_tests,
    compute_entropy,
    compute_flip_rate,
)


class TestMetrics:
    def test_entropy_all_pass(self):
        assert compute_entropy("PPPPPPPPPP") == 0.0

    def test_entropy_all_fail(self):
        assert compute_entropy("FFFFFFFFFF") == 0.0

    def test_entropy_balanced(self):
        # 50/50 split has maximum entropy of 1.0
        e = compute_entropy("PFPFPFPFPF")
        assert 0.95 <= e <= 1.0

    def test_flip_rate_no_flips(self):
        assert compute_flip_rate("PPPPPPPPPP") == 0.0

    def test_flip_rate_every_flip(self):
        rate = compute_flip_rate("PFPFPFPFPF")
        assert rate == pytest.approx(0.9, abs=0.05)

    def test_flip_rate_single_flip(self):
        rate = compute_flip_rate("PPPPPFPPPP")
        assert rate == pytest.approx(0.2, abs=0.05)


class TestFlakyHistory:
    def test_update_creates_history(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        update_flaky_history(
            history_file,
            passed={"t::a", "t::b"},
            failed={"t::c"},
            window_size=20,
        )
        data = json.loads(history_file.read_text())
        assert data["t::a"] == "P"
        assert data["t::c"] == "F"

    def test_update_appends_to_existing(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        history_file.write_text(json.dumps({"t::a": "PP", "t::b": "PF"}))
        update_flaky_history(
            history_file,
            passed={"t::a"},
            failed={"t::b"},
            window_size=20,
        )
        data = json.loads(history_file.read_text())
        assert data["t::a"] == "PPP"
        assert data["t::b"] == "PFF"

    def test_window_truncation(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        history_file.write_text(json.dumps({"t::a": "P" * 20}))
        update_flaky_history(history_file, passed={"t::a"}, failed=set(), window_size=20)
        data = json.loads(history_file.read_text())
        assert len(data["t::a"]) == 20  # Truncated to window


class TestDetectFlaky:
    def test_detect_flaky_suspect(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        history_file.write_text(json.dumps({"t::flaky": "PFPFPFPFPFPFPFPFPFPF"}))
        suspects = detect_flaky_tests(history_file, flip_threshold=0.3, entropy_threshold=0.5)
        assert any(s["test"] == "t::flaky" for s in suspects)

    def test_stable_test_not_flagged(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        history_file.write_text(json.dumps({"t::stable": "PPPPPPPPPPPPPPPPPPPP"}))
        suspects = detect_flaky_tests(history_file, flip_threshold=0.3, entropy_threshold=0.5)
        assert len(suspects) == 0
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_flaky.py -v`
Expected: FAIL (ImportError)

**Step 3: Implement flaky.py**

`qa/reporters/flaky.py`:

```python
"""Flaky test detection using entropy and flip rate."""
from __future__ import annotations

import json
import math
from pathlib import Path


def compute_entropy(history: str) -> float:
    """Shannon entropy of a pass/fail history string (P/F chars).

    Returns 0.0 for uniform, 1.0 for balanced 50/50.
    """
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
    """Fraction of adjacent status changes in history.

    "PPFPP" has 2 flips out of 4 transitions = 0.5
    """
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
    """Detect flaky test suspects from rolling history.

    A test is flagged if both:
    - flip_rate > flip_threshold
    - entropy > entropy_threshold
    - has at least min_history data points
    """
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
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_flaky.py -v`
Expected: 10 passed

**Step 5: Commit**

```bash
git add qa/reporters/flaky.py tests/qa/test_flaky.py
git commit -m "feat(qa): add flaky test detection with entropy and flip rate"
```

---

## Task 8: Tabular Domain Comparator

**Files:**
- Create: `qa/comparators/tabular.py`
- Create: `tests/qa/test_comparators.py`

**Step 1: Write failing tests**

`tests/qa/test_comparators.py`:

```python
"""Tests for domain comparators."""
import pytest

from qa.comparators.tabular import compare_tabular


class TestTabularComparator:
    def test_identical_data(self):
        prev = [{"id": "1", "name": "Alpha", "score": 0.95}]
        curr = [{"id": "1", "name": "Alpha", "score": 0.95}]
        result = compare_tabular(prev, curr, key="id")
        assert result["added"] == []
        assert result["removed"] == []
        assert result["changed"] == []

    def test_added_record(self):
        prev = [{"id": "1", "name": "Alpha"}]
        curr = [{"id": "1", "name": "Alpha"}, {"id": "2", "name": "Beta"}]
        result = compare_tabular(prev, curr, key="id")
        assert result["added"] == [{"id": "2", "name": "Beta"}]

    def test_removed_record(self):
        prev = [{"id": "1", "name": "Alpha"}, {"id": "2", "name": "Beta"}]
        curr = [{"id": "1", "name": "Alpha"}]
        result = compare_tabular(prev, curr, key="id")
        assert result["removed"] == [{"id": "2", "name": "Beta"}]

    def test_changed_field(self):
        prev = [{"id": "1", "name": "Alpha", "score": 0.90}]
        curr = [{"id": "1", "name": "Alpha", "score": 0.95}]
        result = compare_tabular(prev, curr, key="id")
        assert len(result["changed"]) == 1
        assert result["changed"][0]["key"] == "1"
        assert result["changed"][0]["diffs"]["score"]["old"] == 0.90
        assert result["changed"][0]["diffs"]["score"]["new"] == 0.95

    def test_within_tolerance(self):
        prev = [{"id": "1", "score": 0.950}]
        curr = [{"id": "1", "score": 0.955}]
        result = compare_tabular(prev, curr, key="id",
                                 tolerance={"score": {"absolute": 0.01}})
        assert result["changed"] == []
        assert result["within_tolerance"] == 1

    def test_beyond_tolerance(self):
        prev = [{"id": "1", "score": 0.90}]
        curr = [{"id": "1", "score": 0.95}]
        result = compare_tabular(prev, curr, key="id",
                                 tolerance={"score": {"absolute": 0.01}})
        assert len(result["changed"]) == 1

    def test_field_filter(self):
        prev = [{"id": "1", "name": "Alpha", "extra": "x"}]
        curr = [{"id": "1", "name": "Beta", "extra": "y"}]
        result = compare_tabular(prev, curr, key="id", fields=["id", "name"])
        assert len(result["changed"]) == 1
        # "extra" should not appear in diffs
        assert "extra" not in result["changed"][0]["diffs"]

    def test_summary_counts(self):
        prev = [{"id": "1", "v": 1}, {"id": "2", "v": 2}]
        curr = [{"id": "1", "v": 1}, {"id": "3", "v": 3}]
        result = compare_tabular(prev, curr, key="id")
        assert result["total_previous"] == 2
        assert result["total_current"] == 2
        assert len(result["added"]) == 1
        assert len(result["removed"]) == 1
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_comparators.py -v`
Expected: FAIL (ImportError)

**Step 3: Implement tabular.py**

`qa/comparators/tabular.py`:

```python
"""Tabular comparator: key-based join with per-field tolerance."""
from __future__ import annotations

import math


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
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_comparators.py -v`
Expected: 8 passed

**Step 5: Commit**

```bash
git add qa/comparators/tabular.py tests/qa/test_comparators.py
git commit -m "feat(qa): add tabular domain comparator with key-based join and tolerance"
```

---

## Task 9: Calculation + Detection Comparators

**Files:**
- Create: `qa/comparators/calculation.py`
- Create: `qa/comparators/detection.py`
- Modify: `tests/qa/test_comparators.py` — add tests

**Step 1: Write failing tests**

Add to `tests/qa/test_comparators.py`:

```python
from qa.comparators.calculation import compare_calculations
from qa.comparators.detection import compare_detection


class TestCalculationComparator:
    def test_identical_results(self):
        prev = [{"id": "p1", "vwap": 150.25}]
        curr = [{"id": "p1", "vwap": 150.25}]
        result = compare_calculations(prev, curr, key="id",
                                      value_fields=["vwap"],
                                      absolute_tol=0.01, relative_tol=0.001)
        assert result["drifted"] == 0

    def test_within_absolute_tolerance(self):
        prev = [{"id": "p1", "vwap": 150.250}]
        curr = [{"id": "p1", "vwap": 150.255}]
        result = compare_calculations(prev, curr, key="id",
                                      value_fields=["vwap"],
                                      absolute_tol=0.01, relative_tol=0.001)
        assert result["drifted"] == 0
        assert result["within_tolerance"] == 1

    def test_beyond_tolerance(self):
        prev = [{"id": "p1", "vwap": 150.00}]
        curr = [{"id": "p1", "vwap": 152.00}]
        result = compare_calculations(prev, curr, key="id",
                                      value_fields=["vwap"],
                                      absolute_tol=0.01, relative_tol=0.001)
        assert result["drifted"] == 1
        assert result["details"][0]["field"] == "vwap"

    def test_multiple_fields(self):
        prev = [{"id": "p1", "vwap": 150.0, "pnl": 1000.0}]
        curr = [{"id": "p1", "vwap": 150.0, "pnl": 1500.0}]
        result = compare_calculations(prev, curr, key="id",
                                      value_fields=["vwap", "pnl"],
                                      absolute_tol=0.01, relative_tol=0.001)
        assert result["drifted"] == 1


class TestDetectionComparator:
    def test_identical_distributions(self):
        prev = {"model_id": "wash", "count": 14, "avg_score": 0.75}
        curr = {"model_id": "wash", "count": 14, "avg_score": 0.75}
        result = compare_detection(prev, curr,
                                   tolerance={"count": {"absolute": 2}, "avg_score": {"absolute": 0.05}})
        assert result["significant_change"] is False

    def test_count_within_tolerance(self):
        prev = {"model_id": "wash", "count": 14}
        curr = {"model_id": "wash", "count": 15}
        result = compare_detection(prev, curr, tolerance={"count": {"absolute": 2}})
        assert result["significant_change"] is False

    def test_count_beyond_tolerance(self):
        prev = {"model_id": "wash", "count": 14}
        curr = {"model_id": "wash", "count": 20}
        result = compare_detection(prev, curr, tolerance={"count": {"absolute": 2}})
        assert result["significant_change"] is True
        assert any(d["field"] == "count" for d in result["metric_diffs"])

    def test_score_drift(self):
        prev = {"model_id": "wash", "avg_score": 0.75}
        curr = {"model_id": "wash", "avg_score": 0.90}
        result = compare_detection(prev, curr,
                                   tolerance={"avg_score": {"absolute": 0.05}})
        assert result["significant_change"] is True
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_comparators.py::TestCalculationComparator -v`
Expected: FAIL (ImportError)

**Step 3: Implement calculation.py**

`qa/comparators/calculation.py`:

```python
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
```

**Step 4: Implement detection.py**

`qa/comparators/detection.py`:

```python
"""Detection comparator: alert distribution diff."""
from __future__ import annotations


def compare_detection(
    previous: dict,
    current: dict,
    tolerance: dict[str, dict] | None = None,
) -> dict:
    """Compare detection model aggregate metrics.

    Args:
        previous: Dict with model_id and metric fields (count, avg_score, etc.)
        current: Same structure as previous.
        tolerance: Per-metric tolerance. Example: {"count": {"absolute": 2}}

    Returns:
        Dict with metric_diffs, significant_change flag.
    """
    tolerance = tolerance or {}
    metric_diffs = []
    significant = False

    # Compare all numeric fields (excluding model_id)
    for field in set(list(previous.keys()) + list(current.keys())):
        if field == "model_id":
            continue

        old_val = previous.get(field)
        new_val = current.get(field)

        if old_val is None or new_val is None:
            continue
        if not isinstance(old_val, (int, float)) or not isinstance(new_val, (int, float)):
            continue
        if old_val == new_val:
            continue

        abs_diff = abs(new_val - old_val)
        tol = tolerance.get(field, {})
        abs_tol = tol.get("absolute", 0)

        within = abs_diff <= abs_tol if abs_tol else False

        if not within:
            significant = True

        metric_diffs.append({
            "field": field,
            "old": old_val,
            "new": new_val,
            "absolute_diff": round(abs_diff, 6),
            "within_tolerance": within,
        })

    return {
        "model_id": current.get("model_id", previous.get("model_id", "unknown")),
        "metric_diffs": metric_diffs,
        "significant_change": significant,
    }
```

**Step 5: Run tests**

Run: `uv run pytest tests/qa/test_comparators.py -v`
Expected: 16 passed (8 tabular + 4 calculation + 4 detection)

**Step 6: Commit**

```bash
git add qa/comparators/calculation.py qa/comparators/detection.py tests/qa/test_comparators.py
git commit -m "feat(qa): add calculation and detection domain comparators"
```

---

## Task 10: Summary Reporter + Quality Gate

**Files:**
- Create: `qa/reporters/summary.py`
- Create: `tests/qa/test_summary.py`

**Step 1: Write failing tests**

`tests/qa/test_summary.py`:

```python
"""Tests for summary reporter and quality gate."""
import json
from pathlib import Path

import pytest

from qa.reporters.summary import (
    load_latest_summary,
    load_latest_regression,
    format_summary_text,
)


class TestLoadLatestSummary:
    def test_loads_from_latest_symlink(self, tmp_path):
        runs_dir = tmp_path / "runs"
        run1 = runs_dir / "2026-01-01T00-00-00"
        run1.mkdir(parents=True)
        (run1 / "summary.json").write_text(json.dumps({
            "suite": "backend", "passed": 100, "failed": 0,
            "skipped": 0, "errors": 0, "total": 100,
            "duration_seconds": 5.0, "git_sha": "abc",
        }))
        (runs_dir / "LATEST").symlink_to(run1.name)

        summary = load_latest_summary(runs_dir)
        assert summary["passed"] == 100
        assert summary["suite"] == "backend"

    def test_returns_none_when_no_runs(self, tmp_path):
        runs_dir = tmp_path / "runs"
        runs_dir.mkdir()
        assert load_latest_summary(runs_dir) is None


class TestFormatSummary:
    def test_format_all_passed(self):
        summary = {
            "suite": "backend", "passed": 705, "failed": 0,
            "skipped": 0, "errors": 0, "total": 705,
            "duration_seconds": 12.3, "git_sha": "abc123",
            "git_branch": "main", "run_id": "2026-01-01T00-00-00",
            "timestamp": "2026-01-01T00:00:00Z",
        }
        text = format_summary_text(summary)
        assert "705 passed" in text
        assert "PASS" in text

    def test_format_with_failures(self):
        summary = {
            "suite": "backend", "passed": 700, "failed": 5,
            "skipped": 0, "errors": 0, "total": 705,
            "duration_seconds": 12.3, "git_sha": "abc123",
            "git_branch": "main", "run_id": "2026-01-01T00-00-00",
            "timestamp": "2026-01-01T00:00:00Z",
        }
        text = format_summary_text(summary)
        assert "5 failed" in text
        assert "FAIL" in text
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_summary.py -v`
Expected: FAIL (ImportError)

**Step 3: Implement summary.py**

`qa/reporters/summary.py`:

```python
"""Summary reporter and quality gate evaluation."""
from __future__ import annotations

import json
from pathlib import Path

from qa.config import get_reports_dir, load_config


def load_latest_summary(runs_dir: Path | None = None) -> dict | None:
    """Load the most recent run's summary.json."""
    if runs_dir is None:
        runs_dir = get_reports_dir() / "runs"
    latest = runs_dir / "LATEST"
    if not latest.exists():
        return None
    target = runs_dir / latest.resolve().name / "summary.json"
    if not target.exists():
        return None
    return json.loads(target.read_text())


def load_latest_regression(runs_dir: Path | None = None) -> dict | None:
    """Load the most recent run's regression analysis."""
    if runs_dir is None:
        runs_dir = get_reports_dir() / "runs"
    latest = runs_dir / "LATEST"
    if not latest.exists():
        return None
    target = runs_dir / latest.resolve().name / "diffs" / "regression.json"
    if not target.exists():
        return None
    return json.loads(target.read_text())


def format_summary_text(summary: dict) -> str:
    """Format a summary dict into human-readable text."""
    status = "PASS" if summary["failed"] == 0 and summary["errors"] == 0 else "FAIL"
    lines = [
        f"[{status}] {summary['suite']} test run — {summary['run_id']}",
        f"  Branch: {summary.get('git_branch', '?')} ({summary.get('git_sha', '?')})",
        f"  {summary['passed']} passed, {summary['failed']} failed, "
        f"{summary['skipped']} skipped, {summary['errors']} errors",
        f"  Duration: {summary['duration_seconds']}s",
    ]
    return "\n".join(lines)


def show_report(args) -> int:
    """Show reports based on CLI args."""
    if args.latest:
        summary = load_latest_summary()
        if summary is None:
            print("[qa] No test runs found.")
            return 1
        print(format_summary_text(summary))
        return 0

    if args.regression:
        regression = load_latest_regression()
        if regression is None:
            print("[qa] No regression data found.")
            return 1
        new_f = regression.get("new_failures", [])
        new_p = regression.get("new_passes", [])
        unchanged_f = regression.get("unchanged_failures", [])
        print(f"[qa] Regression analysis (vs {regression.get('compared_to', '?')}):")
        print(f"  New failures: {len(new_f)}")
        for f in new_f:
            print(f"    FAIL: {f}")
        print(f"  New passes: {len(new_p)}")
        print(f"  Unchanged failures: {len(unchanged_f)}")
        return 1 if new_f else 0

    if args.flaky:
        from qa.reporters.flaky import detect_flaky_tests
        history_file = get_reports_dir() / "flaky_history.json"
        cfg = load_config("qa")
        suspects = detect_flaky_tests(
            history_file,
            flip_threshold=cfg["flaky_detection"]["flip_rate_threshold"],
            entropy_threshold=cfg["flaky_detection"]["entropy_threshold"],
        )
        if not suspects:
            print("[qa] No flaky test suspects.")
            return 0
        print(f"[qa] {len(suspects)} flaky test suspect(s):")
        for s in suspects:
            print(f"  {s['test']} — flip_rate={s['flip_rate']}, entropy={s['entropy']}, "
                  f"history={s['history']}")
        return 0

    if args.quality:
        quality_dir = get_reports_dir() / "quality"
        latest = quality_dir / "LATEST"
        if not latest.exists():
            print("[qa] No quality reports found.")
            return 1
        gate_file = quality_dir / latest.resolve().name / "gate.json"
        if gate_file.exists():
            gate = json.loads(gate_file.read_text())
            print(f"[qa] Quality gate: {gate['gate_result']}")
            for check in gate.get("checks", []):
                status = "PASS" if check["status"] == "PASS" else "FAIL"
                print(f"  [{status}] {check['check']}: {check['detail']}")
            return 0 if gate["gate_result"] == "PASS" else 1
        print("[qa] No quality gate results found.")
        return 1

    print("[qa] Specify --latest, --regression, --flaky, or --quality")
    return 0


def evaluate_gate() -> int:
    """Evaluate quality gate against latest results."""
    cfg = load_config("qa")
    gate_cfg = cfg["quality_gate"]
    checks = []

    # Check test results
    summary = load_latest_summary()
    if summary and gate_cfg["tests_must_pass"]:
        passed = summary["failed"] == 0 and summary["errors"] == 0
        checks.append({
            "check": "tests_pass",
            "status": "PASS" if passed else "FAIL",
            "detail": f"{summary['passed']}/{summary['total']} passed" if passed
                      else f"{summary['failed']} failures, {summary['errors']} errors",
        })

    # Check regressions
    if gate_cfg["no_new_regressions"]:
        regression = load_latest_regression()
        if regression:
            new_f = len(regression.get("new_failures", []))
            checks.append({
                "check": "no_regressions",
                "status": "PASS" if new_f == 0 else "FAIL",
                "detail": f"{new_f} new failure(s)",
            })

    gate_result = "PASS" if all(c["status"] == "PASS" for c in checks) else "FAIL"

    print(f"[qa] Quality gate: {gate_result}")
    for check in checks:
        print(f"  [{check['status']}] {check['check']}: {check['detail']}")

    return 0 if gate_result == "PASS" else 1


def update_baseline() -> int:
    """Update baselines from the latest run."""
    baselines_dir = get_reports_dir() / "baselines"
    baselines_dir.mkdir(parents=True, exist_ok=True)

    summary = load_latest_summary()
    if summary is None:
        print("[qa] No test runs to baseline from.")
        return 1

    # Save performance baseline (test durations)
    baseline = {
        "source_run": summary.get("run_id", "unknown"),
        "suite": summary.get("suite", "unknown"),
        "total_duration": summary.get("duration_seconds", 0),
    }
    (baselines_dir / "performance_baseline.json").write_text(
        json.dumps(baseline, indent=2)
    )
    print(f"[qa] Baseline updated from run {summary.get('run_id', '?')}")
    return 0
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_summary.py -v`
Expected: 4 passed

**Step 5: Commit**

```bash
git add qa/reporters/summary.py tests/qa/test_summary.py
git commit -m "feat(qa): add summary reporter and quality gate evaluation"
```

---

## Task 11: Quality Runner — Tool Orchestration

**Files:**
- Create: `qa/runners/quality_runner.py`
- Create: `tests/qa/test_quality_runner.py`

**Step 1: Write failing tests**

`tests/qa/test_quality_runner.py`:

```python
"""Tests for quality runner."""
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from qa.runners.quality_runner import (
    run_tool,
    get_enabled_tools,
    create_quality_dir,
)


class TestGetEnabledTools:
    def test_returns_enabled_python_tools(self):
        tools = get_enabled_tools(category="python")
        # ruff, bandit, radon, vulture, coverage should be enabled by default
        tool_names = [t["name"] for t in tools]
        assert "ruff" in tool_names
        assert "bandit" in tool_names

    def test_filters_disabled_tools(self):
        tools = get_enabled_tools(category="typescript")
        # eslint is disabled by default
        tool_names = [t["name"] for t in tools]
        assert "eslint" not in tool_names


class TestCreateQualityDir:
    def test_creates_timestamped_dir(self, tmp_path):
        d = create_quality_dir(tmp_path)
        assert d.exists()
        latest = tmp_path / "LATEST"
        assert latest.is_symlink()


class TestRunTool:
    def test_run_returns_result_dict(self):
        result = run_tool("echo", ["echo", "hello"], timeout=10)
        assert result["return_code"] == 0
        assert "hello" in result["stdout"]

    def test_run_captures_failure(self):
        result = run_tool("false", ["false"], timeout=10)
        assert result["return_code"] != 0

    def test_run_handles_timeout(self):
        result = run_tool("sleep", ["sleep", "60"], timeout=1)
        assert result["timed_out"] is True
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_quality_runner.py -v`
Expected: FAIL (ImportError)

**Step 3: Implement quality_runner.py**

`qa/runners/quality_runner.py`:

```python
"""Quality runner: orchestrate linting, security, and complexity tools."""
from __future__ import annotations

import json
import subprocess
import time
from datetime import datetime
from pathlib import Path

from qa.config import load_config, get_project_root, get_reports_dir


def create_quality_dir(base_dir: Path | None = None) -> Path:
    """Create a timestamped quality report directory."""
    if base_dir is None:
        base_dir = get_reports_dir() / "quality"
    base_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    quality_dir = base_dir / timestamp
    counter = 0
    while quality_dir.exists():
        counter += 1
        quality_dir = base_dir / f"{timestamp}-{counter}"
    quality_dir.mkdir()

    latest = base_dir / "LATEST"
    if latest.is_symlink() or latest.exists():
        latest.unlink()
    latest.symlink_to(quality_dir.name)

    return quality_dir


def get_enabled_tools(category: str | None = None) -> list[dict]:
    """Get list of enabled tools from tools.json config."""
    cfg = load_config("tools")
    tools = []

    categories = [category] if category else list(cfg.keys())
    for cat in categories:
        if cat not in cfg:
            continue
        for name, tool_cfg in cfg[cat].items():
            if tool_cfg.get("enabled", False):
                tools.append({"name": name, "category": cat, **tool_cfg})

    return tools


def run_tool(name: str, cmd: list[str], timeout: int = 120) -> dict:
    """Run a single quality tool and capture output."""
    root = get_project_root()
    start = time.monotonic()

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            cwd=root, timeout=timeout,
        )
        duration = time.monotonic() - start
        return {
            "name": name,
            "return_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "duration_seconds": round(duration, 2),
            "timed_out": False,
        }
    except subprocess.TimeoutExpired:
        return {
            "name": name,
            "return_code": -1,
            "stdout": "",
            "stderr": f"Timed out after {timeout}s",
            "duration_seconds": timeout,
            "timed_out": True,
        }


def run_quality(args) -> int:
    """Main quality runner entry point."""
    quality_dir = create_quality_dir()
    tools = []

    # Determine which tools to run based on flags
    if args.python:
        tools = get_enabled_tools("python")
    elif args.typescript:
        tools = get_enabled_tools("typescript")
    elif args.security:
        tools = [t for t in get_enabled_tools() if t["name"] in ("bandit", "semgrep")]
    elif args.coverage:
        tools = [t for t in get_enabled_tools("python") if t["name"] == "coverage"]
    else:
        tools = get_enabled_tools()

    if not tools:
        print("[qa] No enabled quality tools found.")
        return 0

    print(f"[qa] Running {len(tools)} quality tool(s)...")
    results = []

    for tool in tools:
        name = tool["name"]
        print(f"  Running {name}...")

        # Build command
        targets = " ".join(tool.get("targets", []))
        if "command_cc" in tool:
            # Radon has two commands
            cmd_str = tool["command_cc"].replace("{targets}", targets)
            result_cc = run_tool(f"{name}_cc", cmd_str.split())
            (quality_dir / f"{name}_cc.json").write_text(result_cc["stdout"] or "{}")
            results.append(result_cc)

            cmd_str = tool["command_mi"].replace("{targets}", targets)
            result_mi = run_tool(f"{name}_mi", cmd_str.split())
            (quality_dir / f"{name}_mi.json").write_text(result_mi["stdout"] or "{}")
            results.append(result_mi)
        else:
            cmd_str = tool["command"].replace("{targets}", targets)
            if tool.get("report_flag"):
                cmd_str = cmd_str + " " + tool["report_flag"]
            result = run_tool(name, cmd_str.split())
            # Save output
            output = result["stdout"] or result["stderr"] or ""
            (quality_dir / f"{name}.json").write_text(output)
            results.append(result)

    # Print summary
    print(f"\n[qa] Quality results saved to: {quality_dir}")
    for r in results:
        status = "PASS" if r["return_code"] == 0 else ("TIMEOUT" if r["timed_out"] else "ISSUES")
        print(f"  [{status}] {r['name']} ({r['duration_seconds']}s)")

    return 0
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_quality_runner.py -v`
Expected: 5 passed

**Step 5: Commit**

```bash
git add qa/runners/quality_runner.py tests/qa/test_quality_runner.py
git commit -m "feat(qa): add quality runner for linting, security, and complexity tools"
```

---

## Task 12: File Watcher

**Files:**
- Create: `qa/runners/watch_runner.py`
- Create: `tests/qa/test_watch_runner.py`

**Step 1: Write failing tests**

`tests/qa/test_watch_runner.py`:

```python
"""Tests for watch runner components."""
import pytest

from qa.runners.watch_runner import resolve_test_files_from_changes


class TestResolveTestFiles:
    def test_resolves_backend_service(self):
        changes = [("modified", "backend/services/reference_service.py")]
        result = resolve_test_files_from_changes(changes)
        assert any("test_reference_service" in f for f in result)

    def test_resolves_test_file_self(self):
        changes = [("modified", "tests/test_db.py")]
        result = resolve_test_files_from_changes(changes)
        assert "tests/test_db.py" in result

    def test_ignores_non_python_files(self):
        changes = [("modified", "frontend/src/App.tsx")]
        result = resolve_test_files_from_changes(changes)
        assert result == []

    def test_deduplicates(self):
        changes = [
            ("modified", "backend/services/reference_service.py"),
            ("modified", "tests/test_reference_service.py"),
        ]
        result = resolve_test_files_from_changes(changes)
        count = sum(1 for f in result if "test_reference_service" in f)
        assert count == 1
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_watch_runner.py -v`
Expected: FAIL (ImportError)

**Step 3: Implement watch_runner.py**

`qa/runners/watch_runner.py`:

```python
"""File watcher: auto-run affected tests on file changes."""
from __future__ import annotations

import subprocess
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

        subprocess.run(cmd, cwd=root)
        print("\n[qa] Waiting for changes...\n")

    print("\n[qa] Watch stopped.")
    return 0
```

**Step 4: Run tests**

Run: `uv run pytest tests/qa/test_watch_runner.py -v`
Expected: 4 passed

**Step 5: Commit**

```bash
git add qa/runners/watch_runner.py tests/qa/test_watch_runner.py
git commit -m "feat(qa): add file watcher with affected test auto-execution"
```

---

## Task 13: Git Hooks

**Files:**
- Create: `qa/hooks/pre-push`
- Create: `qa/hooks/__init__.py` — hook management
- Create: `tests/qa/test_hooks.py`

**Step 1: Write failing tests**

`tests/qa/test_hooks.py`:

```python
"""Tests for git hook management."""
from pathlib import Path
from unittest.mock import patch

import pytest

from qa.hooks import get_hook_source, get_hook_target


class TestHookPaths:
    def test_hook_source_exists(self):
        source = get_hook_source("pre-push")
        assert source.exists()
        assert source.name == "pre-push"

    def test_hook_target_is_in_git_hooks(self):
        target = get_hook_target("pre-push")
        assert ".git/hooks/pre-push" in str(target)
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/qa/test_hooks.py -v`
Expected: FAIL (ImportError)

**Step 3: Create pre-push hook**

`qa/hooks/pre-push`:

```bash
#!/usr/bin/env bash
# QA Toolkit pre-push hook
# Runs affected backend tests + frontend build before push.
# Bypass with: git push --no-verify
set -euo pipefail

echo "[qa] Pre-push: checking for regressions..."

# Get changed files in commits about to be pushed
changed=$(git diff --name-only @{push}..HEAD 2>/dev/null || git diff --name-only origin/main..HEAD 2>/dev/null || echo "")

if echo "$changed" | grep -q '\.py$'; then
    echo "[qa] Running affected backend tests..."
    if ! uv run python -m qa test affected --failfast --quiet 2>/dev/null; then
        echo "[qa] FAILED: Backend tests failed. Push blocked."
        echo "[qa] Use 'git push --no-verify' to bypass."
        exit 1
    fi
    echo "[qa] Backend tests passed."
fi

if echo "$changed" | grep -q '^frontend/'; then
    echo "[qa] Building frontend..."
    if ! (cd frontend && npm run build --silent 2>/dev/null); then
        echo "[qa] FAILED: Frontend build failed. Push blocked."
        echo "[qa] Use 'git push --no-verify' to bypass."
        exit 1
    fi
    echo "[qa] Frontend build passed."
fi

echo "[qa] Pre-push checks passed."
exit 0
```

**Step 4: Implement hook management**

`qa/hooks/__init__.py`:

```python
"""Git hook management."""
from __future__ import annotations

import os
import stat
from pathlib import Path

from qa.config import get_project_root

_HOOKS_DIR = Path(__file__).parent


def get_hook_source(hook_name: str) -> Path:
    """Get the path to a hook source file."""
    return _HOOKS_DIR / hook_name


def get_hook_target(hook_name: str) -> Path:
    """Get the target path in .git/hooks/."""
    return get_project_root() / ".git" / "hooks" / hook_name


def manage_hooks(action: str) -> int:
    """Install or uninstall git hooks."""
    if action == "install":
        return _install_hook("pre-push")
    elif action == "uninstall":
        return _uninstall_hook("pre-push")
    return 1


def _install_hook(hook_name: str) -> int:
    """Symlink a hook from qa/hooks/ to .git/hooks/."""
    source = get_hook_source(hook_name)
    target = get_hook_target(hook_name)

    if not source.exists():
        print(f"[qa] Hook source not found: {source}")
        return 1

    target.parent.mkdir(parents=True, exist_ok=True)

    if target.exists() or target.is_symlink():
        print(f"[qa] Removing existing hook: {target}")
        target.unlink()

    target.symlink_to(source.resolve())

    # Ensure executable
    source.chmod(source.stat().st_mode | stat.S_IEXEC)

    print(f"[qa] Installed {hook_name} hook: {target} -> {source}")
    return 0


def _uninstall_hook(hook_name: str) -> int:
    """Remove a hook symlink."""
    target = get_hook_target(hook_name)
    if target.is_symlink():
        target.unlink()
        print(f"[qa] Uninstalled {hook_name} hook")
        return 0
    elif target.exists():
        print(f"[qa] {target} exists but is not a symlink (not managed by qa toolkit)")
        return 1
    else:
        print(f"[qa] No {hook_name} hook installed")
        return 0
```

**Step 5: Make pre-push executable**

```bash
chmod +x qa/hooks/pre-push
```

**Step 6: Run tests**

Run: `uv run pytest tests/qa/test_hooks.py -v`
Expected: 2 passed

**Step 7: Commit**

```bash
git add qa/hooks/ tests/qa/test_hooks.py
git commit -m "feat(qa): add git pre-push hook with install/uninstall management"
```

---

## Task 14: Integration Test — Full Pipeline

**Files:**
- Create: `tests/qa/test_integration.py`

**Step 1: Write integration tests**

`tests/qa/test_integration.py`:

```python
"""Integration tests: verify the full QA pipeline works end-to-end."""
import json
import subprocess
from pathlib import Path

import pytest

from qa.config import get_project_root


class TestCLIEntryPoint:
    def test_help_command(self):
        result = subprocess.run(
            ["uv", "run", "python", "-m", "qa", "--help"],
            capture_output=True, text=True,
            cwd=get_project_root(),
        )
        assert result.returncode == 0
        assert "QA Automation Toolkit" in result.stdout

    def test_test_help(self):
        result = subprocess.run(
            ["uv", "run", "python", "-m", "qa", "test", "--help"],
            capture_output=True, text=True,
            cwd=get_project_root(),
        )
        assert result.returncode == 0
        assert "backend" in result.stdout

    def test_report_no_runs(self):
        result = subprocess.run(
            ["uv", "run", "python", "-m", "qa", "report", "--latest"],
            capture_output=True, text=True,
            cwd=get_project_root(),
        )
        # Should handle gracefully (no runs yet)
        assert "No test runs found" in result.stdout or result.returncode == 0


class TestConventionDiscoveryIntegration:
    """Verify convention mapping works against the real codebase."""

    def test_all_services_have_test_mapping(self):
        from qa.discovery.convention import convention_map
        root = get_project_root()
        services = list((root / "backend" / "services").glob("*.py"))
        mapped = 0
        for service in services:
            if service.name == "__init__.py":
                continue
            result = convention_map(f"backend/services/{service.name}")
            if result:
                mapped += 1
        # At least 50% of services should map to tests
        assert mapped / (len(services) - 1) >= 0.5

    def test_all_apis_have_test_mapping(self):
        from qa.discovery.convention import convention_map
        root = get_project_root()
        apis = list((root / "backend" / "api").glob("*.py"))
        mapped = 0
        for api in apis:
            if api.name == "__init__.py":
                continue
            result = convention_map(f"backend/api/{api.name}")
            if result:
                mapped += 1
        assert mapped >= 3  # At least some APIs have tests


class TestComparatorIntegration:
    """Verify comparators work with real project data."""

    def test_tabular_comparator_with_golden_records(self):
        from qa.comparators.tabular import compare_tabular
        root = get_project_root()
        golden_file = root / "workspace" / "reference" / "product_golden.json"
        if not golden_file.exists():
            pytest.skip("Golden records not generated")
        data = json.loads(golden_file.read_text())
        records = data.get("records", [])
        if not records:
            pytest.skip("No records in golden file")
        # Compare data with itself — should have no changes
        simple = [{"golden_id": r["golden_id"], "confidence_score": r.get("confidence_score", 1.0)}
                  for r in records]
        result = compare_tabular(simple, simple, key="golden_id")
        assert result["changed"] == []
        assert result["added"] == []
        assert result["removed"] == []
```

**Step 2: Run tests**

Run: `uv run pytest tests/qa/test_integration.py -v`
Expected: All passed (6 tests)

**Step 3: Commit**

```bash
git add tests/qa/test_integration.py
git commit -m "feat(qa): add integration tests for CLI, discovery, and comparators"
```

---

## Task 15: Run Full Test Suite + Final Commit

**Step 1: Run all QA toolkit tests**

```bash
uv run pytest tests/qa/ -v
```
Expected: ~53 tests passed (9 config + 13 discovery + 9 runner + 5 regression + 10 flaky + 16 comparators + 4 summary + 5 quality + 4 watch + 2 hooks + 6 integration ≈ 83 tests — exact count depends on implementation)

**Step 2: Run existing backend tests (verify no regressions)**

```bash
uv run pytest tests/ --ignore=tests/e2e --ignore=tests/qa -v 2>&1 | tail -5
```
Expected: 705 passed (existing tests unaffected)

**Step 3: Run the QA toolkit against itself**

```bash
uv run python -m qa test backend
```
Expected: Runs backend tests, creates report in qa/reports/runs/

**Step 4: Verify CLI commands**

```bash
uv run python -m qa --help
uv run python -m qa report --latest
uv run python -m qa gate
```

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(qa): complete QA Automation Toolkit — test runner, regression detection, domain comparators, quality scanning, file watcher, git hooks"
```

---

## Dependencies

```
Task 1 (Scaffold) ──── Task 2 (Convention) ──── Task 3 (AST Import) ──── Task 4 (Affected)
                                                                              │
Task 5 (Test Runner) ◄────────────────────────────────────────────────────────┘
        │
        ├── Task 6 (Regression)
        ├── Task 7 (Flaky)
        ├── Task 8 (Tabular Comparator) ── Task 9 (Calc + Detection)
        ├── Task 10 (Summary + Gate)
        ├── Task 11 (Quality Runner)
        └── Task 12 (File Watcher)

Task 13 (Git Hooks) — independent after Task 1
Task 14 (Integration) — depends on all above
Task 15 (Full Suite) — depends on all above
```

Tasks 1→4 are sequential (each builds on previous). Tasks 5→13 can mostly be done in parallel after Task 4. Tasks 14→15 are final validation.

---

## New Files (21)

| File | Purpose |
|------|---------|
| `qa/__init__.py` | Package marker |
| `qa/__main__.py` | CLI entry point |
| `qa/.gitignore` | Ignore reports/ |
| `qa/config/__init__.py` | Config loader |
| `qa/config/qa.json` | Project paths + thresholds |
| `qa/config/comparison.json` | Domain scoped queries + tolerances |
| `qa/config/tools.json` | Quality tool configs |
| `qa/runners/__init__.py` | Package marker |
| `qa/runners/test_runner.py` | Test execution + capture |
| `qa/runners/quality_runner.py` | Quality tool orchestration |
| `qa/runners/watch_runner.py` | File watcher |
| `qa/comparators/__init__.py` | Package marker |
| `qa/comparators/tabular.py` | Key-based tabular diff |
| `qa/comparators/calculation.py` | Numeric drift comparison |
| `qa/comparators/detection.py` | Alert distribution diff |
| `qa/reporters/__init__.py` | Package marker |
| `qa/reporters/regression.py` | Regression detection |
| `qa/reporters/flaky.py` | Flaky test detection |
| `qa/reporters/summary.py` | Summary + quality gate |
| `qa/discovery/__init__.py` | Package marker |
| `qa/discovery/convention.py` | Convention-based file mapping |
| `qa/discovery/imports.py` | AST import analysis |
| `qa/discovery/affected.py` | Git + affected test resolution |
| `qa/hooks/__init__.py` | Hook management |
| `qa/hooks/pre-push` | Git pre-push hook script |
| `tests/qa/__init__.py` | Test package marker |
| `tests/qa/test_config.py` | Config tests |
| `tests/qa/test_discovery.py` | Discovery tests |
| `tests/qa/test_runner.py` | Runner tests |
| `tests/qa/test_regression.py` | Regression tests |
| `tests/qa/test_flaky.py` | Flaky detection tests |
| `tests/qa/test_comparators.py` | Comparator tests |
| `tests/qa/test_summary.py` | Summary/gate tests |
| `tests/qa/test_quality_runner.py` | Quality runner tests |
| `tests/qa/test_watch_runner.py` | Watch runner tests |
| `tests/qa/test_hooks.py` | Hook management tests |
| `tests/qa/test_integration.py` | Integration tests |

## Modified Files (0)

No existing files are modified. The QA toolkit is completely self-contained.

---

## Verification Plan

```bash
# QA toolkit tests — expect ALL PASS
uv run pytest tests/qa/ -v

# Existing backend tests — expect 705 passed (no regressions)
uv run pytest tests/ --ignore=tests/e2e --ignore=tests/qa -v

# CLI entry point works
uv run python -m qa --help
uv run python -m qa test backend
uv run python -m qa report --latest
uv run python -m qa gate

# Watch mode starts (Ctrl+C to exit)
uv run python -m qa watch

# Hook management
uv run python -m qa hooks install
uv run python -m qa hooks uninstall
```
