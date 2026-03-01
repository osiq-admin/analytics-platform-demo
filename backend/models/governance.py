"""Pydantic models for PII/IPP governance, data classification, and compliance."""

from typing import Literal

from pydantic import BaseModel, Field


class PIIField(BaseModel):
    field: str
    classification: Literal["HIGH", "MEDIUM", "LOW"]
    regulation: list[str] = Field(default_factory=list)
    crypto_shred: bool = False
    retention_years: int = 7
    masking_strategy: Literal["hash", "pseudonymize", "generalize", "redact", "none"] = "none"


class EntityGovernance(BaseModel):
    pii_fields: list[PIIField] = Field(default_factory=list)


class PIIRegistry(BaseModel):
    registry_version: str = "1.0"
    entities: dict[str, EntityGovernance] = Field(default_factory=dict)


class DataClassification(BaseModel):
    table_name: str
    tier: str
    classification: Literal["public", "internal", "confidential", "restricted"] = "internal"
    pii_fields: list[str] = Field(default_factory=list)
    regulations: list[str] = Field(default_factory=list)
    crypto_shred_fields: list[str] = Field(default_factory=list)


class GovernanceTag(BaseModel):
    tag_type: Literal["pii", "classification", "retention", "regulation"]
    key: str
    value: str


# --- Phase 22: Masking & RBAC models ---


class MaskingPolicy(BaseModel):
    policy_id: str
    target_entity: str
    target_field: str
    classification: Literal["HIGH", "MEDIUM", "LOW"]
    masking_type: Literal["redact", "partial", "tokenize", "hash", "generalize", "none"]
    algorithm: str = ""
    params: dict = Field(default_factory=dict)
    unmask_roles: list[str] = Field(default_factory=list)
    audit_unmask: bool = False


class MaskingPolicies(BaseModel):
    version: str = "1.0"
    policies: list[MaskingPolicy] = Field(default_factory=list)


class RoleDefinition(BaseModel):
    role_id: str
    display_name: str = ""
    description: str = ""
    icon: str = "User"
    tier_access: list[str] = Field(default_factory=list)
    classification_access: list[str] = Field(default_factory=list)
    can_export: bool = False
    can_view_audit: bool = False


class RoleRegistry(BaseModel):
    version: str = "1.0"
    default_role: str = "analyst"
    roles: list[RoleDefinition] = Field(default_factory=list)
