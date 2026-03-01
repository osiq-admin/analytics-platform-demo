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
