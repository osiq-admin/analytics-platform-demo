"""Lakehouse REST API — Iceberg tables, governance, calc audit, runs, MVs."""
from __future__ import annotations

import logging
from typing import Any

import yaml
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from backend import config

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lakehouse", tags=["lakehouse"])


# ---------------------------------------------------------------------------
# Helpers — lazy service access with graceful fallbacks
# ---------------------------------------------------------------------------

def _lakehouse(request: Request):
    return getattr(request.app.state, "lakehouse", None)


def _governance(request: Request):
    return getattr(request.app.state, "governance", None)


def _calc_results(request: Request):
    return getattr(request.app.state, "calc_results", None)


def _run_versioning(request: Request):
    return getattr(request.app.state, "run_versioning", None)


def _mvs(request: Request):
    return getattr(request.app.state, "mvs", None)


def _schema_evolution(request: Request):
    return getattr(request.app.state, "schema_evolution", None)


def _metadata_replicator(request: Request):
    return getattr(request.app.state, "metadata_replicator", None)


def _not_available(service_name: str):
    return JSONResponse(
        {"error": f"{service_name} not initialized — lakehouse services require Iceberg configuration"},
        status_code=503,
    )


# ---------------------------------------------------------------------------
# 1. Config
# ---------------------------------------------------------------------------

@router.get("/config")
def get_lakehouse_config(request: Request):
    """Lakehouse config + tier mapping."""
    lakehouse = _lakehouse(request)

    # Load config from YAML
    yaml_path = config.settings.workspace_dir / "config" / "lakehouse.yaml"
    env = config.settings.lakehouse_env
    yaml_config: dict[str, Any] = {}
    if yaml_path.exists():
        with open(yaml_path) as f:
            all_configs = yaml.safe_load(f) or {}
        yaml_config = all_configs.get(env, {})

    # Load tier config
    tier_config: dict[str, Any] = {}
    iceberg_config_path = config.settings.workspace_dir / "metadata" / "medallion" / "iceberg_config.json"
    if iceberg_config_path.exists():
        import json
        with open(iceberg_config_path) as f:
            tier_config = json.load(f)

    return {
        "environment": env,
        "catalog": yaml_config.get("catalog", {}),
        "storage": yaml_config.get("storage", {}),
        "compute": yaml_config.get("compute", {}),
        "tier_config": tier_config,
        "lakehouse_available": lakehouse is not None,
    }


# ---------------------------------------------------------------------------
# 2. Iceberg Tables
# ---------------------------------------------------------------------------

@router.get("/tables")
def list_all_tables(request: Request):
    """All Iceberg tables across tiers."""
    lakehouse = _lakehouse(request)
    if not lakehouse:
        return _not_available("LakehouseService")

    result: dict[str, list[str]] = {}
    for tier in lakehouse._tier_config.iceberg_tiers:
        try:
            tables = lakehouse.list_tables(tier)
            if tables:
                result[tier] = tables
        except Exception:
            pass
    return result


@router.get("/tables/{tier}/{table}")
def get_table_info(tier: str, table: str, request: Request):
    """Table info (schema, snapshots, size)."""
    lakehouse = _lakehouse(request)
    if not lakehouse:
        return _not_available("LakehouseService")

    if not lakehouse.table_exists(tier, table):
        return JSONResponse({"error": f"Table {tier}.{table} not found"}, status_code=404)

    info = lakehouse.get_table_info(tier, table)
    return info.model_dump()


@router.get("/tables/{tier}/{table}/snapshots")
def get_table_snapshots(tier: str, table: str, request: Request):
    """Snapshot history for a table."""
    lakehouse = _lakehouse(request)
    if not lakehouse:
        return _not_available("LakehouseService")

    if not lakehouse.table_exists(tier, table):
        return JSONResponse({"error": f"Table {tier}.{table} not found"}, status_code=404)

    snapshots = lakehouse.list_snapshots(tier, table)
    return [s.model_dump() for s in snapshots]


@router.get("/tables/{tier}/{table}/schema-history")
def get_schema_history(tier: str, table: str, request: Request):
    """Schema evolution log for a table."""
    svc = _schema_evolution(request)
    if not svc:
        return _not_available("SchemaEvolutionService")

    history = svc.get_schema_history(tier, table)
    return [h.model_dump() for h in history]


# ---------------------------------------------------------------------------
# 3. Governance
# ---------------------------------------------------------------------------

@router.get("/governance/pii-registry")
def get_pii_registry(request: Request):
    """PII registry."""
    svc = _governance(request)
    if not svc:
        return _not_available("GovernanceService")

    registry = svc.load_pii_registry()
    return registry.model_dump()


@router.get("/governance/classification")
def get_data_classification(request: Request):
    """Data classification per table."""
    svc = _governance(request)
    lakehouse = _lakehouse(request)
    if not svc or not lakehouse:
        return _not_available("GovernanceService")

    classifications = []
    for tier in lakehouse._tier_config.iceberg_tiers:
        try:
            for table_name in lakehouse.list_tables(tier):
                cls = svc.get_table_classification(tier, table_name)
                classifications.append(cls.model_dump())
        except Exception:
            pass
    return classifications


# ---------------------------------------------------------------------------
# 4. Calculation Audit
# ---------------------------------------------------------------------------

@router.get("/calc/result-log")
def get_calc_result_log(request: Request):
    """Calculation result log."""
    svc = _calc_results(request)
    if not svc:
        return _not_available("CalcResultService")

    return [r.model_dump() for r in svc.get_result_log()]


@router.get("/calc/stats")
def get_calc_stats(request: Request):
    """Execution stats (skip rate, duration)."""
    svc = _calc_results(request)
    if not svc:
        return _not_available("CalcResultService")

    return svc.get_execution_stats()


@router.get("/calc/lineage/{run_id}")
def get_calc_lineage(run_id: str, request: Request):
    """Trace lineage chain for a run."""
    svc = _calc_results(request)
    if not svc:
        return _not_available("CalcResultService")

    chain = svc.get_lineage_chain(run_id)
    return [r.model_dump() for r in chain]


# ---------------------------------------------------------------------------
# 5. Pipeline Runs
# ---------------------------------------------------------------------------

@router.get("/runs")
def get_pipeline_runs(request: Request):
    """Pipeline run history."""
    svc = _run_versioning(request)
    if not svc:
        return _not_available("RunVersioningService")

    runs = svc.get_run_history()
    return [r.model_dump(mode="json") for r in runs]


@router.get("/runs/{run_id}")
def get_pipeline_run(run_id: str, request: Request):
    """Single run details."""
    svc = _run_versioning(request)
    if not svc:
        return _not_available("RunVersioningService")

    run = svc.get_run(run_id)
    if not run:
        return JSONResponse({"error": f"Run {run_id} not found"}, status_code=404)
    return run.model_dump(mode="json")


# ---------------------------------------------------------------------------
# 6. Materialized Views
# ---------------------------------------------------------------------------

@router.get("/materialized-views")
def get_materialized_views(request: Request):
    """MV status."""
    svc = _mvs(request)
    if not svc:
        return _not_available("MaterializedViewService")

    return svc.get_mv_status()


@router.post("/materialized-views/refresh")
def refresh_materialized_views(request: Request):
    """Trigger MV refresh."""
    svc = _mvs(request)
    if not svc:
        return _not_available("MaterializedViewService")

    results = svc.refresh_all()
    return results
