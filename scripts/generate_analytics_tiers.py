"""Generate pre-built datasets for Extended Analytical Tiers (Platinum, Sandbox, Archive).

Platinum: 4 KPI datasets (alert_summary, model_effectiveness, score_distribution, regulatory_report)
Sandbox:  Empty registry ready for what-if testing
Archive:  Manifest pre-populated with sample entries per entity x non-GDPR policy

Usage:
    python -m scripts.generate_analytics_tiers [--workspace workspace/]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate analytics tier datasets")
    parser.add_argument(
        "--workspace",
        type=Path,
        default=Path("workspace"),
        help="Workspace root directory (default: workspace/)",
    )
    args = parser.parse_args()
    workspace: Path = args.workspace

    # ------------------------------------------------------------------
    # Imports (deferred so the module can be imported without side-effects)
    # ------------------------------------------------------------------
    from backend.services.archive_service import ArchiveService
    from backend.services.metadata_service import MetadataService
    from backend.services.platinum_service import PlatinumService

    metadata = MetadataService(workspace)

    # ------------------------------------------------------------------
    # 1. Generate Platinum KPI datasets
    # ------------------------------------------------------------------
    print("Generating Platinum KPI datasets...")
    platinum = PlatinumService(workspace, metadata)
    datasets = platinum.generate_all()
    for ds in datasets:
        print(f"  {ds.kpi_id}: {ds.record_count} data points")

    # ------------------------------------------------------------------
    # 2. Create empty sandbox registry
    # ------------------------------------------------------------------
    print("Creating empty sandbox registry...")
    sandbox_dir = workspace / "sandbox"
    sandbox_dir.mkdir(parents=True, exist_ok=True)
    registry = {"tier_id": "sandbox", "sandboxes": []}
    (sandbox_dir / "registry.json").write_text(json.dumps(registry, indent=2))
    print("  workspace/sandbox/registry.json created")

    # ------------------------------------------------------------------
    # 3. Create archive manifest with sample entries
    # ------------------------------------------------------------------
    print("Generating archive manifest...")
    archive = ArchiveService(workspace, metadata)
    config = metadata.load_archive_config()
    if config:
        for policy in config.policies:
            if not policy.gdpr_relevant:  # Skip GDPR for demo
                for entity in policy.data_types:
                    entry = archive.export_entity(entity, policy.policy_id)
                    if entry:
                        print(f"  {entry.entry_id}: {entity} ({policy.regulation})")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    manifest = metadata.load_archive_manifest()
    print(f"\nDone! Generated:")
    print(f"  - {len(datasets)} KPI datasets in workspace/platinum/")
    print(f"  - Empty sandbox registry in workspace/sandbox/")
    print(f"  - {manifest.total_entries} archive entries in workspace/archive/")


if __name__ == "__main__":
    main()
