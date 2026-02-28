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
        try:
            from qa.runners.test_runner import run_tests
            return run_tests(args)
        except ImportError:
            print("[qa] Test runner not yet implemented.")
            return 1
    elif args.command == "quality":
        try:
            from qa.runners.quality_runner import run_quality
            return run_quality(args)
        except ImportError:
            print("[qa] Quality runner not yet implemented.")
            return 1
    elif args.command == "watch":
        try:
            from qa.runners.watch_runner import run_watch
            return run_watch()
        except ImportError:
            print("[qa] Watch runner not yet implemented.")
            return 1
    elif args.command == "report":
        try:
            from qa.reporters.summary import show_report
            return show_report(args)
        except ImportError:
            print("[qa] Reporter not yet implemented.")
            return 1
    elif args.command == "gate":
        try:
            from qa.reporters.summary import evaluate_gate
            return evaluate_gate()
        except ImportError:
            print("[qa] Gate evaluator not yet implemented.")
            return 1
    elif args.command == "hooks":
        try:
            from qa.hooks import manage_hooks
            return manage_hooks(args.action)
        except ImportError:
            print("[qa] Hook manager not yet implemented.")
            return 1
    elif args.command == "baseline":
        try:
            from qa.reporters.summary import update_baseline
            return update_baseline()
        except ImportError:
            print("[qa] Baseline manager not yet implemented.")
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
