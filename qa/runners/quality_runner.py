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
