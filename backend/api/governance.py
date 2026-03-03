"""Governance REST API — masking preview, RBAC role switching, audit log."""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.services.audit_service import AuditService
from backend.services.masking_service import MaskingService
from backend.services.rbac_service import RBACService

router = APIRouter(prefix="/api/governance", tags=["governance"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _masking(request: Request) -> MaskingService:
    return request.app.state.masking_service


def _rbac(request: Request) -> RBACService:
    return request.app.state.rbac_service


def _audit(request: Request) -> AuditService:
    return request.app.state.audit


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class SwitchRoleRequest(BaseModel):
    role_id: str


# ---------------------------------------------------------------------------
# 1. Roles
# ---------------------------------------------------------------------------


@router.get("/roles")
def list_roles(request: Request):
    """List all available roles and the current active role."""
    rbac = _rbac(request)
    roles = rbac.list_roles()
    return {
        "roles": [r.model_dump() for r in roles],
        "current_role": rbac.current_role_id,
    }


@router.get("/current-role")
def get_current_role(request: Request):
    """Return the full definition of the currently active role."""
    return _rbac(request).get_current_role().model_dump()


@router.post("/switch-role")
def switch_role(body: SwitchRoleRequest, request: Request):
    """Switch the active RBAC role."""
    rbac = _rbac(request)
    try:
        rbac.switch_role(body.role_id)
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    return rbac.get_current_role().model_dump()


# ---------------------------------------------------------------------------
# 2. Masking policies
# ---------------------------------------------------------------------------


@router.get("/masking-policies")
def list_masking_policies(request: Request):
    """Return all masking policies."""
    policies = _masking(request).policies
    return {"policies": [p.model_dump() for p in policies.policies]}


# ---------------------------------------------------------------------------
# 3. Masked preview
# ---------------------------------------------------------------------------


def _load_entity_records(request: Request, entity: str, limit: int = 20) -> list[dict] | None:
    """Load rows from DuckDB for *entity*. Returns None if table not found."""
    db = request.app.state.db
    cursor = db.cursor()
    try:
        cursor.execute(f'SELECT * FROM "{entity}" LIMIT {limit}')
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    except Exception:
        return None
    finally:
        cursor.close()


@router.get("/masked-preview/{entity}")
def masked_preview(entity: str, request: Request):
    """Load entity data, apply masking for the current role, return masked records + metadata."""
    records = _load_entity_records(request, entity, limit=20)
    if records is None:
        return JSONResponse({"error": f"Entity table not found: {entity}"}, status_code=404)

    masking = _masking(request)
    role_id = _rbac(request).current_role_id

    # Get masking metadata from first record (if any)
    masking_metadata: dict = {}
    if records:
        _, masking_metadata = masking.mask_record_with_metadata(entity, records[0], role_id)

    masked_records = masking.mask_records(entity, records, role_id)

    return {
        "entity": entity,
        "role": role_id,
        "records": masked_records,
        "masking_metadata": masking_metadata,
    }


# ---------------------------------------------------------------------------
# 4. Role comparison
# ---------------------------------------------------------------------------


@router.get("/role-comparison/{entity}")
def role_comparison(entity: str, request: Request):
    """For each role, mask first 5 rows — returns field-level comparison for side-by-side display.

    Response format matches frontend RoleComparisonResponse:
    { entity, fields: [{ field, values: { role_id: { value, masked, masking_type } } }] }
    """
    records = _load_entity_records(request, entity, limit=5)
    if records is None:
        return JSONResponse({"error": f"Entity table not found: {entity}"}, status_code=404)
    if not records:
        return {"entity": entity, "fields": []}

    masking = _masking(request)
    rbac = _rbac(request)

    # Build per-role masked records and metadata
    role_masked: dict[str, list[dict]] = {}
    role_meta: dict[str, dict] = {}
    for role_def in rbac.list_roles():
        rid = role_def.role_id
        role_masked[rid] = masking.mask_records(entity, records, rid)
        _, role_meta[rid] = masking.mask_record_with_metadata(entity, records[0], rid)

    # Transform to field-level comparison using first record
    field_names = list(records[0].keys())
    role_ids = [r.role_id for r in rbac.list_roles()]

    fields = []
    for fname in field_names:
        values: dict = {}
        for rid in role_ids:
            masked_val = role_masked[rid][0].get(fname, "")
            meta = role_meta[rid].get(fname, {})
            values[rid] = {
                "value": str(masked_val) if masked_val is not None else "",
                "masked": meta.get("masked", False),
                "masking_type": meta.get("masking_type") if meta.get("masked") else None,
            }
        fields.append({"field": fname, "values": values})

    return {"entity": entity, "fields": fields}


# ---------------------------------------------------------------------------
# 5. Audit log (with PII masking)
# ---------------------------------------------------------------------------

# Fields in audit new_value / previous_value dicts that may contain PII
_PII_FIELDS = {"trader_name", "account_name", "trader_id", "account_id", "registration_country"}


@router.get("/audit-log")
def audit_log(request: Request):
    """Return audit history, masking PII values based on current role."""
    rbac = _rbac(request)
    if not rbac.can_view_audit():
        return {"entries": [], "message": "Access denied for current role"}

    audit = _audit(request)
    entries = audit.get_history()
    masking = _masking(request)
    role_id = rbac.current_role_id

    masked_entries = []
    for entry in entries:
        entry = dict(entry)  # shallow copy
        for key in ("new_value", "previous_value"):
            val = entry.get(key)
            if not isinstance(val, dict):
                continue
            masked_val = dict(val)
            for field in _PII_FIELDS:
                if field in masked_val:
                    # Find matching policy for any entity
                    policies = masking.policies.policies
                    for policy in policies:
                        if policy.target_field == field and role_id not in policy.unmask_roles:
                            masked_val[field] = masking.apply_mask(
                                masked_val[field], policy.masking_type, policy.params
                            )
                            break
            entry[key] = masked_val
        masked_entries.append(entry)

    return {"entries": masked_entries}


# ---------------------------------------------------------------------------
# 6. PII Registry — GDPR Art. 30 records of processing activities
# ---------------------------------------------------------------------------


@router.get("/pii-registry")
def pii_registry(request: Request):
    """Return PII field registry with per-field masking status for the active role.

    Implements GDPR Art. 30 — records of processing activities.
    Each field includes currently_masked and masking_type based on the active RBAC role.
    """
    import json as _json
    from backend.config import settings

    registry_path = settings.workspace_dir / "metadata" / "governance" / "pii_registry.json"
    if not registry_path.exists():
        return {"entities": {}, "total_pii_fields": 0, "masked_count": 0}

    raw = _json.loads(registry_path.read_text())
    entities = raw.get("entities", {})

    masking = _masking(request)
    role_id = _rbac(request).current_role_id

    total_pii = 0
    masked_count = 0

    # Build a policy lookup: (entity, field) -> policy
    policy_map: dict[tuple[str, str], object] = {}
    for p in masking.policies.policies:
        policy_map[(p.target_entity, p.target_field)] = p

    result_entities: dict = {}
    for entity_id, entity_info in entities.items():
        fields = []
        for field_info in entity_info.get("pii_fields", []):
            field_name = field_info["field"]
            total_pii += 1

            policy = policy_map.get((entity_id, field_name))
            is_masked = True
            masking_type = None
            if policy:
                is_masked = role_id not in policy.unmask_roles
                masking_type = policy.masking_type
            else:
                is_masked = False

            if is_masked:
                masked_count += 1

            fields.append({
                **field_info,
                "currently_masked": is_masked,
                "masking_type": masking_type,
            })

        result_entities[entity_id] = {"pii_fields": fields}

    return {
        "entities": result_entities,
        "total_pii_fields": total_pii,
        "masked_count": masked_count,
        "current_role": role_id,
    }
