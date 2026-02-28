"""Test runner: execute pytest suites with result capture."""
from __future__ import annotations

import json
import re
import subprocess  # nosec B404 — subprocess needed for running pytest and git commands
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

    counter = 0
    while run_dir.exists():
        counter += 1
        run_dir = base_dir / f"{timestamp}-{counter}"
    run_dir.mkdir(parents=True)

    latest = base_dir / "LATEST"
    if latest.is_symlink() or latest.exists():
        latest.unlink()
    latest.symlink_to(run_dir.name)

    return run_dir


def parse_pytest_output(output: str, _return_code: int) -> dict:
    """Parse pytest summary line into structured results."""
    result = {"passed": 0, "failed": 0, "skipped": 0, "errors": 0, "total": 0}

    for key in ("passed", "failed", "skipped", "errors"):
        match = re.search(rf"(\d+) {key}", output)
        if match:
            result[key] = int(match.group(1))

    result["total"] = result["passed"] + result["failed"] + result["skipped"] + result["errors"]
    return result


def _get_git_sha() -> str:
    root = get_project_root()
    result = subprocess.run(  # nosec B603 B607
        ["git", "rev-parse", "--short", "HEAD"],
        capture_output=True, text=True, cwd=root,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def _get_git_branch() -> str:
    root = get_project_root()
    result = subprocess.run(  # nosec B603 B607
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True, text=True, cwd=root,
    )
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def write_summary(run_dir: Path, suite: str, results: dict, duration: float) -> None:
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


def _build_suite_args(args, cfg: dict) -> list[str]:
    """Build pytest arguments for the selected test suite."""
    if args.suite == "backend":
        return [cfg["project"]["test_dir"], "--ignore=" + cfg["project"]["e2e_dir"]]
    if args.suite == "e2e":
        return [cfg["project"]["e2e_dir"]]
    if args.suite == "affected":
        from qa.discovery.affected import resolve_affected_tests
        affected = resolve_affected_tests(args.since)
        if not affected:
            print("[qa] No affected tests found. Running full backend suite.")
            return [cfg["project"]["test_dir"], "--ignore=" + cfg["project"]["e2e_dir"]]
        print(f"[qa] Running {len(affected)} affected test files:")
        for f in affected:
            print(f"  {f}")
        return affected
    return [cfg["project"]["test_dir"]]


def _build_flag_args(args) -> list[str]:
    """Build pytest flag arguments from CLI options."""
    flags: list[str] = []
    if args.failfast:
        flags.append("-x")
    if args.keyword:
        flags += ["-k", args.keyword]
    flags.append("-q" if args.quiet else "-v")
    return flags


def _run_regression_analysis(run_dir: Path) -> None:
    """Trigger regression analysis against the previous run if available."""
    runs_dir = run_dir.parent
    all_runs = sorted([d for d in runs_dir.iterdir() if d.is_dir() and d.name != "LATEST"])
    if len(all_runs) < 2:
        return
    prev_run = all_runs[-2]
    try:
        from qa.reporters.regression import analyze_regression
        diffs_dir = run_dir / "diffs"
        diffs_dir.mkdir(exist_ok=True)
        analysis = analyze_regression(run_dir, prev_run)
        (diffs_dir / "regression.json").write_text(json.dumps(analysis, indent=2))
        new_failures = analysis.get("new_failures", [])
        if new_failures:
            print(f"\n[qa] REGRESSION: {len(new_failures)} new failure(s):")
            for f in new_failures[:10]:
                print(f"  FAIL: {f}")
    except ImportError:
        pass


def run_tests(args) -> int:
    """Main test runner entry point."""
    cfg = load_config("qa")
    root = get_project_root()

    cmd = cfg["project"]["test_command"].split()
    cmd += _build_suite_args(args, cfg)
    cmd += _build_flag_args(args)

    print(f"[qa] Running: {' '.join(cmd)}")
    start = time.monotonic()

    try:
        timeout = 1200 if args.suite == "e2e" else 600
        result = subprocess.run(cmd, cwd=root, capture_output=True, text=True, timeout=timeout)  # nosec B603
    except subprocess.TimeoutExpired:
        print("[qa] TIMEOUT: Tests exceeded 600s")
        return 124
    except KeyboardInterrupt:
        print("\n[qa] Interrupted.")
        return 130

    duration = time.monotonic() - start

    if result.stdout:
        print(result.stdout)
    if result.stderr and result.returncode != 0:
        print(result.stderr)

    output = result.stdout + result.stderr
    parsed = parse_pytest_output(output, result.returncode)

    run_dir = create_run_dir()
    write_summary(run_dir, args.suite, parsed, duration)
    (run_dir / "raw_output.txt").write_text(output)

    print(f"\n[qa] Results saved to: {run_dir}")
    print(f"[qa] {parsed['passed']} passed, {parsed['failed']} failed, "
          f"{parsed['skipped']} skipped, {parsed['errors']} errors "
          f"in {duration:.1f}s")

    _run_regression_analysis(run_dir)

    return result.returncode
