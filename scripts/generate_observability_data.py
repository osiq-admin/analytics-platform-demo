"""Generate demo data for the 3 observability subsystems: events, lineage runs, metrics.

Creates realistic time-series data across 30 days for the analytics platform:
- Events:  ~200 records across 6 event types with valid SHA-256 hash chains
- Lineage: ~40 pipeline runs across 8 pipeline stages
- Metrics: 6 metric series with 30 daily data points each

Uses the EventService, LineageService, and MetricsService directly
so all generated data is fully compatible with the API layer.

Usage:
    uv run python -m scripts.generate_observability_data [--workspace workspace/]
"""
from __future__ import annotations

import argparse
import json
import random
import shutil
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from backend.models.observability import ColumnLineage, LineageDataset, LineageRun
from backend.services.event_service import EventService
from backend.services.metrics_service import MetricsService

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SEED = 42
DATE_START = date(2026, 2, 1)
DATE_END = date(2026, 3, 2)

ENTITIES = ["execution", "order", "product", "md_eod", "md_intraday"]
TIERS = ["bronze", "silver", "gold"]
ACTORS = ["system", "pipeline", "analyst_1", "supervisor_1", "compliance_officer"]

PIPELINE_STAGES = [
    "ingest_landing",
    "landing_to_bronze",
    "bronze_to_silver",
    "silver_to_gold",
    "gold_to_platinum",
    "silver_to_reference",
    "gold_to_sandbox",
    "gold_to_archive",
]

QUALITY_DIMENSIONS = [
    "completeness", "validity", "consistency", "accuracy", "timeliness", "uniqueness",
]

# Mapping metadata (field name samples) derived from actual mapping files
MAPPING_COLUMNS: dict[str, list[dict]] = {
    "execution_bronze_silver": [
        {"output": "execution_id", "inputs": ["execution_id"], "transform": "passthrough"},
        {"output": "order_id", "inputs": ["order_id"], "transform": "passthrough"},
        {"output": "price", "inputs": ["price"], "transform": "cast"},
        {"output": "quantity", "inputs": ["quantity"], "transform": "cast"},
        {"output": "side", "inputs": ["side"], "transform": "normalize"},
        {"output": "venue_mic", "inputs": ["venue_mic"], "transform": "normalize"},
        {"output": "execution_timestamp", "inputs": ["execution_date", "execution_time"], "transform": "derive"},
        {"output": "notional_value", "inputs": ["price", "quantity"], "transform": "derive"},
    ],
    "order_bronze_silver": [
        {"output": "order_id", "inputs": ["order_id"], "transform": "passthrough"},
        {"output": "product_id", "inputs": ["product_id"], "transform": "passthrough"},
        {"output": "side", "inputs": ["side"], "transform": "normalize"},
        {"output": "order_type", "inputs": ["order_type"], "transform": "normalize"},
        {"output": "limit_price", "inputs": ["limit_price"], "transform": "cast"},
        {"output": "order_timestamp", "inputs": ["order_date", "order_time"], "transform": "derive"},
        {"output": "fill_ratio", "inputs": ["filled_quantity", "quantity"], "transform": "derive"},
    ],
    "product_bronze_silver": [
        {"output": "product_id", "inputs": ["product_id"], "transform": "passthrough"},
        {"output": "isin", "inputs": ["isin"], "transform": "validate"},
        {"output": "ticker", "inputs": ["ticker"], "transform": "normalize"},
        {"output": "asset_class", "inputs": ["asset_class"], "transform": "normalize"},
        {"output": "cfi_code", "inputs": ["cfi_code"], "transform": "validate"},
        {"output": "currency", "inputs": ["currency"], "transform": "validate"},
        {"output": "is_derivative", "inputs": ["instrument_type"], "transform": "conditional"},
    ],
    "silver_to_gold_calcs": [
        {"output": "execution_id", "inputs": ["execution_id"], "transform": "passthrough"},
        {"output": "product_id", "inputs": ["product_id"], "transform": "passthrough"},
        {"output": "price", "inputs": ["price"], "transform": "passthrough"},
        {"output": "quantity", "inputs": ["quantity"], "transform": "passthrough"},
        {"output": "asset_class", "inputs": ["asset_class"], "transform": "passthrough"},
    ],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _random_time(rng: random.Random) -> str:
    """Return a random time string HH:MM:SS within business hours."""
    hour = rng.randint(8, 17)
    minute = rng.randint(0, 59)
    second = rng.randint(0, 59)
    return f"{hour:02d}:{minute:02d}:{second:02d}"


def _iso_ts(d: date, time_str: str) -> str:
    """Combine a date and time string into ISO 8601 timestamp with +00:00."""
    return f"{d.isoformat()}T{time_str}+00:00"


def _all_dates() -> list[date]:
    """Return all dates from DATE_START to DATE_END inclusive."""
    days = []
    current = DATE_START
    while current <= DATE_END:
        days.append(current)
        current += timedelta(days=1)
    return days


# ---------------------------------------------------------------------------
# Event generation
# ---------------------------------------------------------------------------

def generate_events(workspace: Path, rng: random.Random) -> int:
    """Generate ~200 events across 6 types over 30 days with valid hash chains."""
    svc = EventService(workspace)
    days = _all_dates()
    total = 0

    # --- pipeline_execution: ~80 events ---
    for d in days:
        # 2-3 pipeline runs per day
        n_runs = rng.randint(2, 3)
        for _ in range(n_runs):
            stage = rng.choice(PIPELINE_STAGES)
            entity = rng.choice(ENTITIES)
            tier = rng.choice(TIERS)
            time_str = _random_time(rng)
            ts = _iso_ts(d, time_str)

            # Start event
            svc.emit(
                event_type="pipeline_execution",
                actor="pipeline",
                entity=entity,
                tier=tier,
                details={
                    "stage": stage,
                    "status": "started",
                    "record_count": rng.randint(50, 2000),
                },
                timestamp=ts,
            )
            total += 1

            # Complete or fail (95% complete, 5% fail)
            elapsed_ms = rng.randint(200, 5000)
            h, m, s = map(int, time_str.split(":"))
            end_seconds = h * 3600 + m * 60 + s + max(1, elapsed_ms // 1000)
            end_h = min(23, end_seconds // 3600)
            end_m = (end_seconds % 3600) // 60
            end_s = end_seconds % 60
            end_time = f"{end_h:02d}:{end_m:02d}:{end_s:02d}"
            end_ts = _iso_ts(d, end_time)

            status = "failed" if rng.random() < 0.05 else "completed"
            details: dict = {
                "stage": stage,
                "status": status,
                "duration_ms": elapsed_ms,
            }
            if status == "failed":
                details["error"] = rng.choice([
                    "Connection timeout to DuckDB",
                    "Schema validation failed",
                    "Null constraint violation",
                ])

            svc.emit(
                event_type="pipeline_execution",
                actor="pipeline",
                entity=entity,
                tier=tier,
                details=details,
                timestamp=end_ts,
            )
            total += 1

    # --- quality_check: ~50 events ---
    check_days = rng.sample(days, min(25, len(days)))
    check_days.sort()
    for d in check_days:
        n_checks = rng.randint(1, 3)
        for _ in range(n_checks):
            entity = rng.choice(ENTITIES)
            tier = rng.choice(TIERS)
            dimension = rng.choice(QUALITY_DIMENSIONS)
            score = round(rng.uniform(85.0, 100.0), 1)
            passed = score >= 90.0
            time_str = _random_time(rng)
            ts = _iso_ts(d, time_str)

            svc.emit(
                event_type="quality_check",
                actor="system",
                entity=entity,
                tier=tier,
                details={
                    "dimension": dimension,
                    "score": score,
                    "threshold": 90.0,
                    "passed": passed,
                    "record_count": rng.randint(100, 5000),
                },
                timestamp=ts,
            )
            total += 1

    # --- data_access: ~30 events ---
    access_days = rng.sample(days, min(20, len(days)))
    access_days.sort()
    for d in access_days:
        n_access = rng.randint(1, 2)
        for _ in range(n_access):
            entity = rng.choice(ENTITIES)
            tier = rng.choice(TIERS)
            actor = rng.choice(["analyst_1", "supervisor_1", "compliance_officer"])
            action = rng.choice(["read", "export", "query"])
            time_str = _random_time(rng)
            ts = _iso_ts(d, time_str)

            svc.emit(
                event_type="data_access",
                actor=actor,
                entity=entity,
                tier=tier,
                details={
                    "action": action,
                    "row_count": rng.randint(10, 500),
                    "purpose": rng.choice([
                        "Investigation review",
                        "Regulatory report",
                        "Ad-hoc analysis",
                        "Compliance audit",
                    ]),
                },
                timestamp=ts,
            )
            total += 1

    # --- alert_action: ~20 events ---
    alert_days = rng.sample(days, min(15, len(days)))
    alert_days.sort()
    alert_counter = 1
    for d in alert_days:
        n_alerts = rng.randint(1, 2)
        for _ in range(n_alerts):
            alert_id = f"ALT-2026-{alert_counter:04d}"
            alert_counter += 1
            model = rng.choice([
                "market_price_reasonability",
                "wash_trading",
                "insider_trading",
                "spoofing_layering",
            ])
            action = rng.choice(["generated", "escalated", "resolved", "dismissed"])
            actor = "system" if action == "generated" else rng.choice([
                "analyst_1", "supervisor_1", "compliance_officer",
            ])
            time_str = _random_time(rng)
            ts = _iso_ts(d, time_str)

            svc.emit(
                event_type="alert_action",
                actor=actor,
                entity="execution",
                tier="gold",
                details={
                    "alert_id": alert_id,
                    "model": model,
                    "action": action,
                    "severity": rng.choice(["low", "medium", "high", "critical"]),
                },
                timestamp=ts,
            )
            total += 1

    # --- metadata_change: ~15 events ---
    change_days = rng.sample(days, min(12, len(days)))
    change_days.sort()
    for d in change_days:
        n_changes = rng.randint(1, 2)
        for _ in range(n_changes):
            target = rng.choice([
                "calculation/vwap", "calculation/price_deviation",
                "setting/wash_trading_threshold", "setting/mpr_lookback_window",
                "detection_model/market_price_reasonability",
                "mapping/execution_bronze_silver",
            ])
            time_str = _random_time(rng)
            ts = _iso_ts(d, time_str)

            svc.emit(
                event_type="metadata_change",
                actor=rng.choice(["analyst_1", "supervisor_1"]),
                entity=target.split("/")[0],
                tier="",
                details={
                    "target": target,
                    "operation": rng.choice(["update", "create"]),
                    "fields_changed": rng.randint(1, 5),
                    "previous_version": f"v{rng.randint(1, 10)}",
                },
                timestamp=ts,
            )
            total += 1

    # --- masking_unmask: ~5 events ---
    unmask_days = rng.sample(days, min(5, len(days)))
    unmask_days.sort()
    for d in unmask_days:
        entity = rng.choice(["account", "trader"])
        field = rng.choice(["account_holder_name", "email", "phone", "trader_name"])
        actor = rng.choice(["compliance_officer", "supervisor_1"])
        time_str = _random_time(rng)
        ts = _iso_ts(d, time_str)

        svc.emit(
            event_type="masking_unmask",
            actor=actor,
            entity=entity,
            tier="silver",
            details={
                "field": field,
                "reason": rng.choice([
                    "Regulatory investigation",
                    "Compliance review",
                    "Authorized audit",
                ]),
                "authorization_ref": f"AUTH-{rng.randint(1000, 9999)}",
                "duration_minutes": rng.choice([15, 30, 60]),
            },
            timestamp=ts,
        )
        total += 1

    return total


# ---------------------------------------------------------------------------
# Lineage run generation
# ---------------------------------------------------------------------------

def generate_lineage_runs(workspace: Path, rng: random.Random) -> int:
    """Generate ~40 lineage runs across pipeline stages over 30 days."""
    runs_dir = workspace / "lineage" / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)

    days = _all_dates()
    # Pick 8 days spread across the range for daily pipeline runs
    run_days = sorted(rng.sample(days, min(8, len(days))))
    total = 0

    # Stage-to-mapping lookup for column lineage
    stage_mapping: dict[str, str] = {
        "bronze_to_silver": "execution_bronze_silver",
        "silver_to_gold": "silver_to_gold_calcs",
    }

    # Alternate mapping sets for variety
    extra_mappings: dict[str, str] = {
        "landing_to_bronze": "execution_bronze_silver",
        "silver_to_reference": "product_bronze_silver",
    }
    stage_mapping.update(extra_mappings)

    # Pre-compute total run count to pick deterministic FAIL indices
    # We want ~5% FAIL and ~10% warning, guaranteed minimums
    run_plan: list[tuple[date, str]] = []
    for d in run_days:
        n_runs = rng.randint(4, 6)
        selected_stages = rng.sample(
            PIPELINE_STAGES, min(n_runs, len(PIPELINE_STAGES)),
        )
        for stage in selected_stages:
            run_plan.append((d, stage))

    # Pick 2 runs to FAIL and 4 to have warnings (deterministic)
    fail_indices = set(rng.sample(range(len(run_plan)), min(2, len(run_plan))))
    remaining = [i for i in range(len(run_plan)) if i not in fail_indices]
    warn_indices = set(rng.sample(remaining, min(4, len(remaining))))

    for run_idx, (d, stage) in enumerate(run_plan):
            run_id = str(uuid.uuid4())
            time_str = _random_time(rng)
            ts = _iso_ts(d, time_str)

            # Determine status from pre-computed plan
            if run_idx in fail_indices:
                status = "FAIL"
                has_warnings = False
            elif run_idx in warn_indices:
                status = "COMPLETE"
                has_warnings = True
            else:
                status = "COMPLETE"
                has_warnings = False

            duration_ms = rng.randint(200, 5000)
            record_count = rng.randint(50, 5000)

            # Build input/output datasets
            # Derive tiers from stage name
            parts = stage.split("_to_")
            if len(parts) == 2:
                src_tier = parts[0]
                tgt_tier = parts[1]
            else:
                src_tier = "landing"
                tgt_tier = stage.split("_")[-1] if "_" in stage else "bronze"

            entity = rng.choice(ENTITIES[:4])  # execution, order, product, md_eod
            inputs = [
                LineageDataset(
                    namespace="analytics-platform",
                    name=f"{entity}@{src_tier}",
                    fields=[f"{entity}_id", "product_id", "price"],
                ),
            ]
            outputs = [
                LineageDataset(
                    namespace="analytics-platform",
                    name=f"{entity}@{tgt_tier}",
                    fields=[f"{entity}_id", "product_id", "price"],
                ),
            ]

            # Build column lineage from mapping metadata if available
            col_lineage: list[ColumnLineage] = []
            mapping_key = stage_mapping.get(stage)
            if mapping_key and mapping_key in MAPPING_COLUMNS:
                cols = MAPPING_COLUMNS[mapping_key]
                # Pick a subset of columns for this run
                selected_cols = rng.sample(cols, min(rng.randint(3, len(cols)), len(cols)))
                for col in selected_cols:
                    col_lineage.append(ColumnLineage(
                        output_field=col["output"],
                        input_fields=col["inputs"],
                        transformation=col["transform"],
                        confidence=round(rng.uniform(0.9, 1.0), 2),
                    ))

            # Quality scores
            quality_scores: dict[str, float] = {}
            if status != "FAIL":
                quality_scores = {
                    "completeness": round(rng.uniform(92.0, 100.0), 1),
                    "validity": round(rng.uniform(88.0, 100.0), 1),
                    "consistency": round(rng.uniform(90.0, 100.0), 1),
                }
                if has_warnings:
                    # Lower one dimension to trigger warning
                    dim = rng.choice(list(quality_scores.keys()))
                    quality_scores[dim] = round(rng.uniform(70.0, 89.9), 1)

            run = LineageRun(
                run_id=run_id,
                job_name=stage,
                job_namespace="analytics-platform",
                event_type=status,
                event_time=ts,
                duration_ms=duration_ms if status != "FAIL" else rng.randint(50, 500),
                record_count=record_count if status != "FAIL" else 0,
                inputs=inputs,
                outputs=outputs,
                column_lineage=col_lineage,
                quality_scores=quality_scores,
            )

            # Persist to disk
            run_file = runs_dir / f"{run_id}.json"
            run_file.write_text(run.model_dump_json(indent=2), encoding="utf-8")
            total += 1

    # Build index.json summary
    _build_lineage_index(runs_dir, workspace / "lineage" / "index.json")

    return total


def _build_lineage_index(runs_dir: Path, index_path: Path) -> None:
    """Build a lineage index.json summarizing all recorded runs."""
    entries = []
    for run_file in sorted(runs_dir.glob("*.json")):
        data = json.loads(run_file.read_text(encoding="utf-8"))
        entries.append({
            "run_id": data["run_id"],
            "job_name": data["job_name"],
            "event_type": data["event_type"],
            "event_time": data["event_time"],
            "duration_ms": data["duration_ms"],
            "record_count": data["record_count"],
        })

    # Sort by event_time
    entries.sort(key=lambda e: e["event_time"])

    index = {
        "version": "1.0",
        "total_runs": len(entries),
        "runs": entries,
    }
    index_path.write_text(json.dumps(index, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Metrics generation
# ---------------------------------------------------------------------------

def generate_metrics(workspace: Path, rng: random.Random) -> tuple[int, int]:
    """Generate 6 metric series with 30 daily data points each.

    Returns (series_count, total_points).
    """
    svc = MetricsService(workspace)
    days = _all_dates()
    total_points = 0

    # --- pipeline_execution_time: avg ms, 200-5000ms, trending stable ---
    base_exec = 1200.0
    for d in days:
        drift = rng.uniform(-100, 100)
        base_exec = max(200, min(5000, base_exec + drift))
        noise = rng.gauss(0, 150)
        value = max(200, min(5000, base_exec + noise))
        ts = _iso_ts(d, "12:00:00")
        svc.record(
            metric_id="pipeline_execution_time",
            metric_type="execution_time",
            value=round(value, 1),
            unit="ms",
            entity="pipeline",
            tier="",
            tags={"aggregation": "daily_avg"},
            timestamp=ts,
        )
        total_points += 1

    # --- quality_score_completeness: 94-100% with occasional dips ---
    for i, d in enumerate(days):
        base = rng.uniform(96.0, 99.5)
        # Introduce 2-3 dips
        if i in (7, 18, 25):
            base = rng.uniform(91.0, 94.5)
        value = max(90.0, min(100.0, base + rng.gauss(0, 0.5)))
        ts = _iso_ts(d, "12:00:00")
        svc.record(
            metric_id="quality_score_completeness",
            metric_type="quality_score",
            value=round(value, 2),
            unit="percent",
            entity="",
            tier="silver",
            tags={"dimension": "completeness"},
            timestamp=ts,
        )
        total_points += 1

    # --- quality_score_validity: 90-99% ---
    for i, d in enumerate(days):
        base = rng.uniform(93.0, 98.0)
        if i in (5, 20):
            base = rng.uniform(88.0, 92.0)
        value = max(85.0, min(100.0, base + rng.gauss(0, 0.8)))
        ts = _iso_ts(d, "12:00:00")
        svc.record(
            metric_id="quality_score_validity",
            metric_type="quality_score",
            value=round(value, 2),
            unit="percent",
            entity="",
            tier="silver",
            tags={"dimension": "validity"},
            timestamp=ts,
        )
        total_points += 1

    # --- throughput_records_per_second: 50-200 rps ---
    base_rps = 120.0
    for d in days:
        drift = rng.uniform(-10, 10)
        base_rps = max(50, min(200, base_rps + drift))
        noise = rng.gauss(0, 15)
        value = max(50, min(200, base_rps + noise))
        ts = _iso_ts(d, "12:00:00")
        svc.record(
            metric_id="throughput_records_per_second",
            metric_type="throughput",
            value=round(value, 1),
            unit="rps",
            entity="pipeline",
            tier="",
            tags={"aggregation": "daily_avg"},
            timestamp=ts,
        )
        total_points += 1

    # --- sla_compliance: 90-100% with 2-3 breach events ---
    breach_days_indices = rng.sample(range(len(days)), 3)
    for i, d in enumerate(days):
        if i in breach_days_indices:
            value = rng.uniform(82.0, 89.9)
        else:
            value = rng.uniform(95.0, 100.0)
        value = max(0, min(100.0, value))
        ts = _iso_ts(d, "12:00:00")
        svc.record(
            metric_id="sla_compliance",
            metric_type="sla_compliance",
            value=round(value, 1),
            unit="percent",
            entity="pipeline",
            tier="",
            tags={"aggregation": "daily"},
            timestamp=ts,
        )
        total_points += 1

    # --- error_rate: 0-5% with spikes ---
    spike_days_indices = rng.sample(range(len(days)), 4)
    for i, d in enumerate(days):
        if i in spike_days_indices:
            value = rng.uniform(3.0, 8.0)
        else:
            value = rng.uniform(0.0, 2.0)
        value = max(0, min(10.0, value))
        ts = _iso_ts(d, "12:00:00")
        svc.record(
            metric_id="error_rate",
            metric_type="error_rate",
            value=round(value, 2),
            unit="percent",
            entity="pipeline",
            tier="",
            tags={"aggregation": "daily"},
            timestamp=ts,
        )
        total_points += 1

    return 6, total_points


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

def cleanup(workspace: Path) -> None:
    """Remove previously generated observability data."""
    dirs_to_clean = [
        workspace / "logging" / "events",
        workspace / "lineage" / "runs",
        workspace / "metrics",
    ]
    for d in dirs_to_clean:
        if d.exists():
            shutil.rmtree(d)
            print(f"  Cleaned: {d}")

    # Also remove lineage index if present
    index = workspace / "lineage" / "index.json"
    if index.exists():
        index.unlink()
        print(f"  Cleaned: {index}")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Generate demo observability data (events, lineage, metrics)",
    )
    parser.add_argument(
        "--workspace", type=Path, default=Path("workspace"),
        help="Workspace directory (default: workspace/)",
    )
    args = parser.parse_args()

    rng = random.Random(SEED)

    print("Generating observability data...")
    print(f"  Date range: {DATE_START} to {DATE_END}")
    print(f"  Seed: {SEED}")
    print()

    # Clean up old data
    print("Cleaning old data...")
    cleanup(args.workspace)
    print()

    # Generate events
    print("Generating events...")
    event_count = generate_events(args.workspace, rng)
    print(f"  -> {event_count} events")
    print()

    # Generate lineage runs
    print("Generating lineage runs...")
    run_count = generate_lineage_runs(args.workspace, rng)
    print(f"  -> {run_count} lineage runs")
    print()

    # Generate metrics
    print("Generating metrics...")
    series_count, point_count = generate_metrics(args.workspace, rng)
    print(f"  -> {series_count} metric series with {point_count} points total")
    print()

    # Summary
    print("=" * 60)
    print("Summary:")
    print(f"  Events:  {event_count}")
    print(f"  Runs:    {run_count}")
    print(f"  Metrics: {series_count} series x {point_count // series_count} points each")
    print()
    print("Output directories:")
    print(f"  Events:  {args.workspace / 'logging' / 'events'}/")
    print(f"  Lineage: {args.workspace / 'lineage' / 'runs'}/")
    print(f"  Index:   {args.workspace / 'lineage' / 'index.json'}")
    print(f"  Metrics: {args.workspace / 'metrics'}/")


if __name__ == "__main__":
    main()
