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


# -- Standards Compliance Matrix --


class EvidenceLink(BaseModel):
    type: str  # "metadata", "service", "api", "entity", "test"
    path: str
    description: str


class ComplianceControl(BaseModel):
    control_id: str
    control_name: str
    description: str
    platform_capability: str
    compliance_level: str  # "full", "partial", "gap"
    evidence_links: list[EvidenceLink] = Field(default_factory=list)
    gap_notes: str | None = None


class ComplianceStandard(BaseModel):
    standard_id: str
    name: str
    category: str
    compliance_level: str
    controls: list[ComplianceControl] = Field(default_factory=list)


class ComplianceMatrixSummary(BaseModel):
    total_standards: int = 0
    total_controls: int = 0
    full_count: int = 0
    partial_count: int = 0
    gap_count: int = 0
    compliance_percentage: int = 0


class ComplianceMatrix(BaseModel):
    matrix_id: str = "standards_compliance_matrix"
    version: str = "1.0"
    description: str = ""
    last_assessed: str = ""
    summary: ComplianceMatrixSummary = Field(default_factory=ComplianceMatrixSummary)
    standards: list[ComplianceStandard] = Field(default_factory=list)


# -- BCBS 239 Principle Mapping --


class BCBS239Principle(BaseModel):
    principle_number: int
    principle_name: str
    description: str
    compliance_level: str  # "full", "partial", "gap"
    platform_capabilities: list[str] = Field(default_factory=list)
    evidence_links: list[EvidenceLink] = Field(default_factory=list)
    gap_notes: str | None = None


class BCBS239OverallCompliance(BaseModel):
    total_principles: int = 11
    full_count: int = 0
    partial_count: int = 0
    gap_count: int = 0
    compliance_score: int = 0


class BCBS239Mapping(BaseModel):
    mapping_id: str = "bcbs239_principles"
    version: str = "1.0"
    description: str = ""
    last_assessed: str = ""
    overall_compliance: BCBS239OverallCompliance = Field(default_factory=BCBS239OverallCompliance)
    principles: list[BCBS239Principle] = Field(default_factory=list)
