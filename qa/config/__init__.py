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
