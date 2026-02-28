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

    return _dispatch_command(args)


def _dispatch_command(args) -> int:
    """Dispatch CLI command to its handler."""
    # Each entry: (import_path, callable_name, not_found_label, needs_args)
    _COMMANDS: dict[str, tuple[str, str, str, bool]] = {
        "test":     ("qa.runners.test_runner",    "run_tests",      "Test runner",       True),
        "quality":  ("qa.runners.quality_runner",  "run_quality",    "Quality runner",    True),
        "watch":    ("qa.runners.watch_runner",    "run_watch",      "Watch runner",      False),
        "report":   ("qa.reporters.summary",       "show_report",    "Reporter",          True),
        "gate":     ("qa.reporters.summary",       "evaluate_gate",  "Gate evaluator",    False),
        "baseline": ("qa.reporters.summary",       "update_baseline","Baseline manager",  False),
    }

    # Special case for hooks (needs args.action, not args)
    if args.command == "hooks":
        try:
            from qa.hooks import manage_hooks
            return manage_hooks(args.action)
        except ImportError:
            print("[qa] Hook manager not yet implemented.")
            return 1

    entry = _COMMANDS.get(args.command)
    if not entry:
        return 0

    module_path, func_name, label, needs_args = entry
    try:
        import importlib
        mod = importlib.import_module(module_path)
        handler = getattr(mod, func_name)
        return handler(args) if needs_args else handler()
    except ImportError:
        print(f"[qa] {label} not yet implemented.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
