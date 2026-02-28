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
