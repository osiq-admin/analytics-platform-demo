"""Cross-view masking wrapper — GDPR Art. 25, MAR Art. 16, BCBS 239 P1.

Enforces PII masking across all data-serving API endpoints, not just the
DataGovernance view.  Uses the existing MaskingService + RBACService for
actual masking logic and the AuditService for PII access audit events.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from backend.services.masking_service import MaskingService
from backend.services.rbac_service import RBACService

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PII field registry — loaded from workspace metadata on first call
# ---------------------------------------------------------------------------

_WORKSPACE = Path("workspace")

# Entity signature fields used for auto-detection from query column names
_ENTITY_SIGNATURES: dict[str, set[str]] = {
    "trader": {"trader_name"},
    "account": {"account_name", "registration_country"},
    "execution": {"execution_id", "exec_type"},
    "order": {"order_type", "limit_price", "time_in_force"},
}

# All known PII fields per entity (derived from pii_registry.json)
_PII_FIELDS: dict[str, set[str]] = {
    "trader": {"trader_name", "trader_id"},
    "account": {"account_name", "registration_country"},
    "execution": {"trader_id", "account_id"},
    "order": {"trader_id"},
}

# Flat set of all PII field names across all entities
_ALL_PII_FIELDS: set[str] = set()
for _fields in _PII_FIELDS.values():
    _ALL_PII_FIELDS |= _fields

# PII metadata cache (loaded lazily from pii_registry.json)
_pii_registry_cache: dict | None = None


def _load_pii_registry() -> dict:
    """Load pii_registry.json and return the entities dict."""
    global _pii_registry_cache
    if _pii_registry_cache is not None:
        return _pii_registry_cache
    path = _WORKSPACE / "metadata" / "governance" / "pii_registry.json"
    if path.exists():
        with open(path) as f:
            data = json.load(f)
        _pii_registry_cache = data.get("entities", {})
    else:
        _pii_registry_cache = {}
    return _pii_registry_cache


# ---------------------------------------------------------------------------
# Public helpers — entity inference + PII detection
# ---------------------------------------------------------------------------


def infer_entity_from_columns(columns: list[str]) -> str | None:
    """Detect entity type from column names using signature fields.

    Returns the entity_id (e.g. "trader") or None if no match.
    """
    col_set = set(columns)
    for entity_id, sig_fields in _ENTITY_SIGNATURES.items():
        if sig_fields & col_set:
            return entity_id
    return None


def has_pii_fields(columns: list[str]) -> bool:
    """Fast check: do any column names overlap with known PII fields?"""
    return bool(set(columns) & _ALL_PII_FIELDS)


def get_pii_columns(columns: list[str]) -> dict:
    """Return PII metadata for columns that are known PII fields.

    Returns a dict mapping field_name -> {classification, regulation, masking_strategy}.
    """
    registry = _load_pii_registry()
    result: dict[str, dict] = {}
    for col in columns:
        if col not in _ALL_PII_FIELDS:
            continue
        # Find the field metadata from the registry
        for entity_info in registry.values():
            for field_info in entity_info.get("pii_fields", []):
                if field_info["field"] == col and col not in result:
                    result[col] = {
                        "classification": field_info["classification"],
                        "regulation": field_info.get("regulation", []),
                        "masking_strategy": field_info.get("masking_strategy", "unknown"),
                    }
    return result


# ---------------------------------------------------------------------------
# Masking functions — for use by API endpoints
# ---------------------------------------------------------------------------


def mask_entity_rows(
    entity_id: str,
    rows: list[dict],
    role_id: str | None = None,
    rbac: RBACService | None = None,
    masking_service: MaskingService | None = None,
) -> list[dict]:
    """Mask PII fields in rows for a known entity.

    If role_id is not provided, uses rbac.current_role_id.
    If masking_service is not provided, creates one from _WORKSPACE.
    """
    if not rows:
        return rows
    svc = masking_service or MaskingService(_WORKSPACE)
    if role_id is None and rbac is not None:
        role_id = rbac.current_role_id
    if role_id is None:
        role_id = "analyst"
    return svc.mask_records(entity_id, rows, role_id)


def mask_query_rows(
    rows: list[dict],
    role_id: str | None = None,
    rbac: RBACService | None = None,
    masking_service: MaskingService | None = None,
) -> list[dict]:
    """Auto-detect entity from column names and mask PII fields.

    If the columns don't match any known entity, returns rows unchanged.
    """
    if not rows:
        return rows
    columns = list(rows[0].keys())
    entity_id = infer_entity_from_columns(columns)
    if entity_id is None:
        return rows
    return mask_entity_rows(entity_id, rows, role_id=role_id, rbac=rbac, masking_service=masking_service)


def log_pii_access(
    audit_service,
    entity_id: str,
    row_count: int,
    role_id: str,
    endpoint: str = "unknown",
) -> None:
    """Log a PII access event to the audit trail (MAR Art. 16).

    Fire-and-forget — never blocks data access on audit failure.
    """
    try:
        audit_service.record(
            metadata_type="pii_access",
            item_id=entity_id,
            action="data_access",
            new_value={
                "entity": entity_id,
                "row_count": row_count,
                "role": role_id,
                "endpoint": endpoint,
            },
        )
    except Exception:
        log.warning("Failed to log PII access event", exc_info=True)
