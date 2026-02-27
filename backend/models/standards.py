"""Pydantic models for ISO standards, FIX protocol, and compliance requirement registries."""
from pydantic import BaseModel, Field


# -- ISO Standards Registry --

class ValidationRules(BaseModel):
    length: int | None = None
    format: str | None = None
    date_format: str | None = None
    time_format: str | None = None


class ISOMapping(BaseModel):
    iso_standard: str
    standard_name: str
    field_path: str
    description: str
    entities_using: list[str] = Field(default_factory=list)
    fields_using: list[str] = Field(default_factory=list)
    validation_rules: ValidationRules = Field(default_factory=ValidationRules)
    regulatory_relevance: list[str] = Field(default_factory=list)
    detection_models_using: list[str] = Field(default_factory=list)


class ISORegistry(BaseModel):
    registry_id: str = "iso_standards"
    description: str = ""
    iso_mappings: list[ISOMapping] = Field(default_factory=list)


# -- FIX Protocol Registry --

class FIXField(BaseModel):
    field_number: int
    field_name: str
    description: str
    domain_values: list[str] = Field(default_factory=list)
    entities_using: list[str] = Field(default_factory=list)
    fields_using: list[str] = Field(default_factory=list)
    regulatory_relevance: str = ""


class FIXRegistry(BaseModel):
    registry_id: str = "fix_protocol"
    description: str = ""
    fix_fields: list[FIXField] = Field(default_factory=list)


# -- Compliance Requirements Registry --

class ComplianceRequirement(BaseModel):
    requirement_id: str
    regulation: str
    article: str
    requirement_text: str
    implementation: str  # e.g., "detection_model", "entity_field", "audit_trail"
    implementation_id: str
    evidence_type: str  # e.g., "alert_with_score", "field_value", "audit_log"
    validation_frequency: str = "real-time"
    status: str = "implemented"


class ComplianceRegistry(BaseModel):
    registry_id: str = "compliance_requirements"
    description: str = ""
    requirements: list[ComplianceRequirement] = Field(default_factory=list)
