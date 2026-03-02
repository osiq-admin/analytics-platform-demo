"""Sandbox tier service — what-if testing with threshold overrides."""
from __future__ import annotations

import random
from datetime import datetime, timezone
from pathlib import Path

from backend.models.analytics_tiers import (
    SandboxComparison,
    SandboxConfig,
    SandboxOverride,
    SandboxRegistry,
)


class SandboxService:
    """Manage sandbox instances for what-if threshold testing."""

    def __init__(self, workspace: Path, metadata_service):
        self._workspace = workspace
        self._metadata = metadata_service

    def create_sandbox(self, name: str, description: str = "") -> SandboxConfig:
        """Create a new sandbox with unique sequential ID."""
        registry = self._metadata.load_sandbox_registry()
        next_num = len(registry.sandboxes) + 1
        sandbox_id = f"SBX-{next_num:04d}"
        now = datetime.now(timezone.utc).isoformat()
        config = SandboxConfig(
            sandbox_id=sandbox_id,
            name=name,
            description=description,
            status="created",
            created_at=now,
            updated_at=now,
        )
        registry.sandboxes.append(config)
        self._metadata.save_sandbox_registry(registry)
        return config

    def configure_sandbox(
        self, sandbox_id: str, overrides: list[SandboxOverride]
    ) -> SandboxConfig | None:
        """Apply setting overrides to a sandbox."""
        registry = self._metadata.load_sandbox_registry()
        sandbox = next(
            (s for s in registry.sandboxes if s.sandbox_id == sandbox_id), None
        )
        if not sandbox:
            return None
        sandbox.overrides = overrides
        sandbox.status = "configured"
        sandbox.updated_at = datetime.now(timezone.utc).isoformat()
        self._metadata.save_sandbox_registry(registry)
        return sandbox

    def run_sandbox(self, sandbox_id: str) -> SandboxConfig | None:
        """Simulate detection run with sandbox overrides.

        For demo: generate a synthetic results_summary comparing
        original vs overridden thresholds.
        """
        registry = self._metadata.load_sandbox_registry()
        sandbox = next(
            (s for s in registry.sandboxes if s.sandbox_id == sandbox_id), None
        )
        if not sandbox:
            return None

        # Simulate: for each override, estimate impact
        rng = random.Random(hash(sandbox_id))
        total_production = rng.randint(60, 100)
        delta = sum(
            1 for o in sandbox.overrides if o.sandbox_value != o.original_value
        ) * rng.randint(-5, 10)
        sandbox.results_summary = {
            "production_alerts": total_production,
            "sandbox_alerts": max(0, total_production + delta),
            "score_shift_avg": round(rng.uniform(-5.0, 5.0), 2),
            "overrides_applied": len(sandbox.overrides),
        }
        sandbox.status = "completed"
        sandbox.updated_at = datetime.now(timezone.utc).isoformat()
        self._metadata.save_sandbox_registry(registry)
        return sandbox

    def compare_sandbox(self, sandbox_id: str) -> SandboxComparison | None:
        """Build comparison of sandbox vs production."""
        registry = self._metadata.load_sandbox_registry()
        sandbox = next(
            (s for s in registry.sandboxes if s.sandbox_id == sandbox_id), None
        )
        if not sandbox or not sandbox.results_summary:
            return None

        prod = sandbox.results_summary.get("production_alerts", 0)
        sbx = sandbox.results_summary.get("sandbox_alerts", 0)
        return SandboxComparison(
            sandbox_id=sandbox_id,
            production_alerts=prod,
            sandbox_alerts=sbx,
            alerts_added=max(0, sbx - prod),
            alerts_removed=max(0, prod - sbx),
            score_shift_avg=sandbox.results_summary.get("score_shift_avg", 0.0),
        )

    def discard_sandbox(self, sandbox_id: str) -> bool:
        """Mark sandbox as discarded."""
        registry = self._metadata.load_sandbox_registry()
        sandbox = next(
            (s for s in registry.sandboxes if s.sandbox_id == sandbox_id), None
        )
        if not sandbox:
            return False
        sandbox.status = "discarded"
        sandbox.updated_at = datetime.now(timezone.utc).isoformat()
        self._metadata.save_sandbox_registry(registry)
        return True

    def list_sandboxes(self) -> list[SandboxConfig]:
        """List all sandboxes."""
        registry = self._metadata.load_sandbox_registry()
        return registry.sandboxes
