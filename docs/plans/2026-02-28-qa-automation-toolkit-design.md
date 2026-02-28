# QA Automation Toolkit — Design Document

**Date:** 2026-02-28
**Status:** Draft
**Goal:** A self-contained, loosely coupled quality automation toolkit that runs test suites with regression detection, quality scanning (linting, security, complexity, coverage), and domain-specific data comparison — operated and updated by AI during development but runs independently via CLI, file watcher, and git hooks.

---

## 1. Architecture Principles

1. **Self-contained**: Lives in `qa/` with its own dependencies. No imports from `backend/` or `frontend/`.
2. **Loosely coupled**: Communicates with the project only via CLI commands, file paths, and JSON config.
3. **Replaceable**: Could be extracted to its own repo or replaced with another framework without touching the main project.
4. **Config-driven**: All project-specific paths, thresholds, scopes, and tool settings are in `qa/config/` — point it at a different project by changing config.
5. **Zero heavy infrastructure**: No servers, no Docker, no Java. All tools are lightweight CLIs.
6. **Immutable reports**: Every run produces a timestamped report directory that never changes. Only a `LATEST` symlink is mutable.
7. **AI-operable**: Designed so Claude Code can create, update, and run it as part of the development workflow, but also works manually.

---

## 2. Directory Structure

```
qa/
├── __init__.py
├── __main__.py                    # Entry: `uv run python -m qa <command>`
├── pyproject.toml                 # Own deps (ruff, bandit, radon, vulture, semgrep, coverage)
├── config/
│   ├── qa.json                    # Project paths, thresholds, quality gates
│   ├── comparison.json            # Domain scoped queries, tolerances, blast radius tags
│   └── tools.json                 # Tool configs (which tools, flags, report formats)
├── runners/
│   ├── __init__.py
│   ├── test_runner.py             # Test execution + regression detection
│   ├── quality_runner.py          # Linting, security, complexity, coverage
│   └── watch_runner.py            # File watcher (watchfiles-based)
├── comparators/
│   ├── __init__.py
│   ├── tabular.py                 # Key-based tabular diff
│   ├── calculation.py             # Numeric drift with tolerance
│   └── detection.py               # Alert distribution diff
├── reporters/
│   ├── __init__.py
│   ├── regression.py              # 5-category regression analysis
│   ├── flaky.py                   # Entropy + flip rate detection
│   └── summary.py                 # Consolidated report generator
├── discovery/
│   ├── __init__.py
│   ├── convention.py              # Convention-based file → test mapping
│   └── imports.py                 # AST import analysis fallback
├── hooks/
│   ├── pre-push                   # Standalone bash git hook
│   ├── install_hooks.py           # Script to symlink hooks into .git/hooks/
│   └── conftest_plugin.py         # pytest plugin for domain data capture
├── reports/                       # Output directory (.gitignored)
│   ├── runs/                      # Immutable timestamped test runs
│   │   ├── YYYY-MM-DDTHH-MM-SS/
│   │   │   ├── summary.json       # Pass/fail counts, duration, git SHA
│   │   │   ├── results.json       # Per-test details (status, duration, domain_data)
│   │   │   ├── domain/            # Captured domain data snapshots
│   │   │   └── diffs/             # Auto-generated diffs vs previous run
│   │   │       ├── regression.json
│   │   │       └── domain_diffs.json
│   │   └── LATEST -> ...          # Symlink (only mutable artifact)
│   ├── quality/                   # Linting/security/complexity outputs
│   │   ├── YYYY-MM-DDTHH-MM-SS/
│   │   │   ├── ruff.json
│   │   │   ├── bandit.json
│   │   │   ├── radon.json
│   │   │   ├── vulture.json
│   │   │   ├── semgrep.json
│   │   │   ├── coverage.json
│   │   │   └── gate.json          # Quality gate pass/fail result
│   │   └── LATEST -> ...
│   ├── baselines/
│   │   ├── domain_baseline.json   # Approved domain data baseline
│   │   └── performance_baseline.json  # Test duration baselines
│   └── flaky_history.json         # Rolling 20-run pass/fail per test
└── README.md                      # Standalone documentation
```

---

## 3. CLI Interface

Single entry point: `uv run python -m qa <command> [options]`

### Test Commands

```bash
uv run python -m qa test backend           # Run backend tests + regression analysis
uv run python -m qa test e2e               # Run E2E Playwright tests + regression
uv run python -m qa test all               # Run all tests
uv run python -m qa test affected          # Run only tests affected by git changes
uv run python -m qa test affected --since HEAD~3  # Affected since 3 commits ago
uv run python -m qa test backend -x        # Stop on first failure
uv run python -m qa test backend -k "reference"   # pytest -k filter
```

### Quality Commands

```bash
uv run python -m qa quality                # Run all quality tools
uv run python -m qa quality --python       # Python tools only (ruff, bandit, mypy, radon, vulture)
uv run python -m qa quality --typescript   # TypeScript tools only (eslint)
uv run python -m qa quality --security     # Security only (bandit + semgrep)
uv run python -m qa quality --coverage     # Coverage only with threshold enforcement
```

### Report Commands

```bash
uv run python -m qa report --latest        # Show latest test run summary
uv run python -m qa report --regression    # Show regression analysis
uv run python -m qa report --flaky         # Show flaky test suspects
uv run python -m qa report --diff RUN1 RUN2  # Compare two runs
uv run python -m qa report --quality       # Show latest quality scan results
```

### Other Commands

```bash
uv run python -m qa watch                  # File watcher: auto-run affected tests on save
uv run python -m qa gate                   # Pass/fail quality gate evaluation
uv run python -m qa hooks install          # Install git pre-push hook
uv run python -m qa hooks uninstall        # Remove git pre-push hook
uv run python -m qa baseline update        # Update domain + performance baselines from latest run
```

---

## 4. Configuration

### qa/config/qa.json — Project Paths and Thresholds

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
    "max_maintainability_index_c_grade": 0,
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
    "keep_last_n_runs": 50,
    "immutable": true
  }
}
```

### qa/config/comparison.json — Domain Scoped Queries and Tolerances

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
    "detection.wash_trading": {
      "type": "detection",
      "description": "Wash trading alert distribution",
      "source_query": "SELECT model_id, COUNT(*) as count, ROUND(AVG(accumulated_score),2) as avg_score FROM alerts WHERE model_id='wash_trading' GROUP BY model_id",
      "tolerance": {
        "count": {"absolute": 2},
        "avg_score": {"absolute": 0.05}
      },
      "blast_radius_tag": "detection"
    },
    "detection.market_manipulation": {
      "type": "detection",
      "description": "Market manipulation alert distribution",
      "source_query": "SELECT model_id, COUNT(*) as count FROM alerts WHERE model_id='market_manipulation' GROUP BY model_id",
      "tolerance": {
        "count": {"absolute": 3}
      },
      "blast_radius_tag": "detection"
    },
    "calculation.vwap": {
      "type": "calculation",
      "description": "VWAP calculation outputs",
      "source_query": "SELECT product_id, vwap FROM calculations WHERE calc_id='vwap' ORDER BY product_id",
      "key": "product_id",
      "tolerance": {
        "vwap": {"relative": 0.001, "absolute": 0.01}
      },
      "blast_radius_tag": "calculations"
    }
  },
  "blast_radius_groups": {
    "reference": ["reference.product", "reference.venue", "reference.account", "reference.trader"],
    "detection": ["detection.wash_trading", "detection.market_manipulation", "detection.insider", "detection.spoofing"],
    "calculations": ["calculation.vwap", "calculation.pnl", "calculation.exposure"]
  },
  "e2e_comparison": {
    "default_mode": "assertion_only",
    "per_view": {
      "/reference": {"mode": "full", "description": "Compare entire page state"},
      "/dashboard": {"mode": "selector", "selector": "[data-tour='dashboard-stats']"},
      "/model-composer": {"mode": "assertion_only"}
    }
  }
}
```

### qa/config/tools.json — Quality Tool Configuration

```json
{
  "python": {
    "ruff": {
      "enabled": true,
      "command": "ruff check {source_dirs}",
      "report_format": "json",
      "report_flag": "--output-format json",
      "targets": ["backend/", "tests/", "scripts/"]
    },
    "bandit": {
      "enabled": true,
      "command": "bandit -r {source_dirs} -f json",
      "targets": ["backend/"],
      "severity_filter": "medium"
    },
    "radon": {
      "enabled": true,
      "command_cc": "radon cc {source_dirs} -j -n C",
      "command_mi": "radon mi {source_dirs} -j",
      "targets": ["backend/"]
    },
    "vulture": {
      "enabled": true,
      "command": "vulture {source_dirs} --min-confidence 80",
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
      "note": "Enable when ESLint is configured in the project"
    }
  },
  "cross_language": {
    "semgrep": {
      "enabled": false,
      "command": "semgrep scan --config auto --json {source_dirs}",
      "targets": ["backend/", "frontend/src/"],
      "note": "Enable after installing semgrep"
    }
  }
}
```

---

## 5. Test Runner — Execution and Regression

### Test Execution Flow

```
qa test backend
    │
    ├── 1. Create timestamped report directory
    ├── 2. Resolve test files (all, affected, or filtered)
    ├── 3. Run pytest with JSON capture hook
    ├── 4. Collect results: per-test status, duration, domain data
    ├── 5. Write results.json + summary.json
    ├── 6. If previous run exists:
    │   ├── 6a. Compute regression diff (5 categories)
    │   ├── 6b. Compute domain diffs (tabular, calc, detection)
    │   ├── 6c. Update flaky history
    │   └── 6d. Write diffs/ directory
    ├── 7. Update LATEST symlink
    └── 8. Print summary to terminal
```

### Regression Detection (5 Categories)

| Category | Algorithm | Description |
|----------|-----------|-------------|
| `new_failures` | `failed_now - failed_before` | Tests that newly broke |
| `new_passes` | `passed_now - passed_before` | Tests that newly started passing |
| `flaky_suspects` | Entropy + flip rate over 20-run window | Tests with inconsistent results |
| `performance_regression` | 3-sigma gate vs baseline median | Tests that got significantly slower |
| `domain_drift` | Key-based join with per-field tolerance | Data results that changed beyond tolerance |

### Flaky Detection (Atlassian Flakinator)

Maintains a rolling window (last 20 runs) of pass/fail per test in `flaky_history.json`.

- **Flip rate**: Number of status changes / window size. Threshold: 0.3
- **Entropy**: Shannon entropy of pass/fail distribution. Threshold: 0.5
- Tests exceeding both thresholds are flagged as flaky suspects.

### Performance Regression

- Baseline: median duration from the last N successful runs (configurable, default 5)
- Gate: if current duration > baseline_median + (3 * baseline_stddev), flag as regression
- Only flags tests that regressed by more than 50% (avoids noise from minor fluctuations)

---

## 6. Domain Comparators

### Tabular Comparator (DataComPy-inspired)

For comparing structured data (golden records, query results) with key-based join:

```
Input: previous snapshot (JSON) + current snapshot (JSON)
Config: key field, selected fields, per-field tolerance, sort order

Process:
1. Apply query filter (e.g., status=active)
2. Select configured fields only
3. Join on key field
4. For each matched row:
   - Compare field values with tolerance
   - Report: field, old_value, new_value, within_tolerance
5. Report unmatched keys (added/removed records)

Output: {matched, added, removed, changed_within_tolerance, changed_beyond_tolerance, details[]}
```

### Calculation Comparator

For numeric results with absolute and relative tolerance:

```
Input: previous calc results + current calc results
Config: key field, value fields, absolute_tolerance, relative_tolerance

Process:
1. Join on key
2. For each value field:
   - absolute_diff = |new - old|
   - relative_diff = |new - old| / |old| (when old != 0)
   - drift = exceeds either tolerance
3. Report drifted values with both absolute and relative diff

Output: {total_compared, within_tolerance, drifted, max_absolute_drift, max_relative_drift, details[]}
```

### Detection Comparator

For alert distributions and model outputs:

```
Input: previous detection summary + current detection summary
Config: model_id, metric fields, tolerances

Process:
1. Compare aggregate metrics (count, avg_score, distribution)
2. Apply per-metric tolerance
3. Flag significant distribution shifts

Output: {model_id, metric_diffs[], distribution_shift, significant_change: bool}
```

---

## 7. Affected Test Discovery

Hybrid approach with zero new dependencies:

### Strategy 1: Convention-Based Mapping (Primary, ~90% coverage)

Maps source files to test files by naming convention:

| Source Pattern | Test Pattern |
|---|---|
| `backend/services/X.py` | `tests/test_X.py` |
| `backend/api/X.py` | `tests/test_X_api.py` |
| `backend/models/X.py` | `tests/test_X.py` or `tests/test_X_models.py` |
| `backend/engines/X.py` | `tests/test_X.py` |
| `tests/test_X.py` | `tests/test_X.py` (self) |

Plus explicit overrides for non-standard mappings (e.g., `calculation_engine.py` → multiple layer test files).

### Strategy 2: AST Import Analysis (Fallback)

For files not matched by convention, parse test file imports using stdlib `ast` module:
- Extract all `import` and `from X import` statements from each test file
- Match against the changed module's dotted path
- ~30-50ms to parse all ~63 test files (cached with `lru_cache`)

### Git Integration

```bash
# For affected command: get files changed since ref
git diff --name-only HEAD           # Uncommitted changes
git diff --name-only --cached       # Staged changes
git diff --name-only origin/main..HEAD  # Branch changes
```

---

## 8. Quality Runner

Runs configured quality tools and produces structured reports:

```
qa quality
    │
    ├── 1. Create timestamped quality report directory
    ├── 2. Read tools.json for enabled tools
    ├── 3. Run each tool (parallel where possible):
    │   ├── Ruff → ruff.json
    │   ├── Bandit → bandit.json
    │   ├── Radon CC → radon_cc.json
    │   ├── Radon MI → radon_mi.json
    │   ├── Vulture → vulture.json
    │   ├── Coverage → coverage.json
    │   ├── ESLint → eslint.json (if enabled)
    │   └── Semgrep → semgrep.json (if enabled)
    ├── 4. Evaluate quality gate thresholds
    ├── 5. Write gate.json (pass/fail with details)
    ├── 6. Update LATEST symlink
    └── 7. Print summary to terminal
```

### Quality Gate Evaluation

Reads `qa.json` thresholds and evaluates against tool outputs:

```json
{
  "gate_result": "FAIL",
  "timestamp": "2026-02-28T14:30:00",
  "checks": [
    {"check": "tests_pass", "status": "PASS", "detail": "705/705 passed"},
    {"check": "coverage", "status": "PASS", "detail": "82% >= 80% threshold"},
    {"check": "security_high", "status": "PASS", "detail": "0 high severity findings"},
    {"check": "complexity", "status": "FAIL", "detail": "2 functions exceed CC=15"},
    {"check": "no_regressions", "status": "PASS", "detail": "0 new failures"}
  ]
}
```

---

## 9. File Watcher

Uses `watchfiles` (already installed, Rust-backed) with `PythonFilter`:

```
qa watch
    │
    ├── Watch backend/ and tests/ for .py changes
    ├── On change (1600ms debounce):
    │   ├── Map changed files → affected tests (convention + AST)
    │   ├── Run affected tests only
    │   └── Print pass/fail summary
    └── Ctrl+C to exit
```

- `PythonFilter` ignores `__pycache__`, `.git`, `node_modules`, `.venv`
- Falls back to full backend suite when no mapping found

---

## 10. Git Hooks

### Pre-Push Hook

Standalone bash script at `qa/hooks/pre-push`:

```bash
#!/usr/bin/env bash
# Runs affected backend tests + frontend build before push
# Bypass: git push --no-verify

# Only run if relevant files changed
changed=$(git diff --name-only @{push}..HEAD 2>/dev/null || git diff --name-only origin/main..HEAD)

if echo "$changed" | grep -q '\.py$'; then
    uv run python -m qa test affected --failfast --quiet
fi

if echo "$changed" | grep -q '^frontend/'; then
    cd frontend && npm run build --silent
fi
```

### Installation

```bash
uv run python -m qa hooks install    # Symlinks pre-push to .git/hooks/
uv run python -m qa hooks uninstall  # Removes symlink
```

---

## 11. pytest Plugin for Domain Data Capture

A lightweight conftest plugin (`qa/hooks/conftest_plugin.py`) that tests can optionally use to register domain data for regression tracking:

```python
# In any test file:
def test_golden_records_product(capture_domain):
    records = load_golden_records("product")
    capture_domain("reference.product", {
        "record_count": len(records),
        "records": [{"golden_id": r.golden_id, "confidence": r.confidence_score} for r in records]
    })
    assert len(records) == 50
```

The plugin collects captured data after each test and writes it to the run's `domain/` directory. Non-intrusive — tests work with or without it.

---

## 12. Report Format

### summary.json

```json
{
  "run_id": "2026-02-28T14-30-00",
  "git_sha": "abc123",
  "git_branch": "feature/reference/reference-data-mdm",
  "suite": "backend",
  "total": 705,
  "passed": 705,
  "failed": 0,
  "skipped": 0,
  "errors": 0,
  "duration_seconds": 12.3,
  "timestamp": "2026-02-28T14:30:00Z"
}
```

### regression.json

```json
{
  "compared_to": "2026-02-28T12-00-00",
  "new_failures": [],
  "new_passes": ["tests/test_reference_models.py::test_golden_record_defaults"],
  "flaky_suspects": [
    {
      "test": "tests/e2e/test_sql_console_view.py::test_custom_query",
      "flip_rate": 0.35,
      "entropy": 0.62,
      "last_20": "PPPPFPPPFPPPPPFPPPPF"
    }
  ],
  "performance_regressions": [],
  "domain_drifts": []
}
```

---

## 13. Dependencies

### qa/pyproject.toml (separate from main project)

```toml
[project]
name = "qa-toolkit"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = []  # Core has zero deps beyond stdlib + watchfiles (from main project)

[project.optional-dependencies]
quality = [
    "ruff>=0.8",
    "bandit>=1.7",
    "radon>=6.0",
    "vulture>=2.12",
    "coverage>=7.0",
]
security = [
    "semgrep>=1.0",
]
all = [
    "qa-toolkit[quality,security]",
]
```

Core test runner needs only: `watchfiles` (already in main project), `ast`, `argparse`, `json`, `pathlib`, `subprocess`, `statistics`, `difflib`, `math` — all stdlib.

Quality tools are optional dependencies installed when the user wants quality scanning.

---

## 14. Future-Proofing

### Export Converters (add when needed)

```bash
uv run python -m qa export --format junit --run LATEST    # JUnit XML for CI/CD
uv run python -m qa export --format sonarqube --run LATEST # SonarQube generic format
uv run python -m qa export --format html --run LATEST      # HTML dashboard
uv run python -m qa export --format sarif --run LATEST     # SARIF for GitHub/VS Code
```

Converters read our canonical JSON and transform to target format. Each converter is a single file in `qa/exporters/`.

### trunk.io / SonarQube Integration

If the project scales to need a managed quality platform:
- trunk.io: reads our tool configs, manages versions, adds "hold-the-line"
- SonarQube: our export converters produce JUnit XML + Cobertura XML it consumes
- Both can be adopted without changing the core toolkit

---

## 15. What This Is NOT

- Not a CI/CD pipeline (runs locally, could feed into CI later)
- Not a test framework (uses pytest, doesn't replace it)
- Not a linter (orchestrates existing linters)
- Not coupled to this specific project (configurable paths and thresholds)
