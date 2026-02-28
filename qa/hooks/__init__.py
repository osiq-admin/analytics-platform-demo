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
