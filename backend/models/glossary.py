"""Pydantic models for ISO 11179 Business Glossary and Semantic Layer."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ISO11179Element(BaseModel):
    """ISO/IEC 11179:2023 Data Element Concept decomposition."""

    object_class: str = ""
    property: str = ""
    representation: str = ""
    data_element_concept: str = ""
    naming_convention: str = "ObjectClass.Property.Representation"


class FIBOAlignment(BaseModel):
    """FIBO (Financial Industry Business Ontology) reference."""

    fibo_class: str = ""
    fibo_namespace: str = ""
    fibo_description: str = ""


class TechnicalMapping(BaseModel):
    """Maps a glossary term to a technical entity.field."""

    entity: str
    field: str
    relationship: Literal[
        "key_field",
        "computed_indicator",
        "detected_by",
        "source_data",
        "aggregated_from",
        "derived_from",
        "dimension",
        "measure",
    ] = "source_data"
    description: str = ""


class GlossaryTerm(BaseModel):
    """A single business glossary term following ISO 11179 structure."""

    term_id: str
    business_name: str
    definition: str
    category: str = ""
    domain: str = ""
    status: Literal["draft", "approved", "deprecated", "under_review", "planned"] = "approved"
    owner: str = ""
    steward: str = ""
    synonyms: list[str] = Field(default_factory=list)
    related_terms: list[str] = Field(default_factory=list)
    regulatory_references: list[str] = Field(default_factory=list)
    technical_mappings: list[TechnicalMapping] = Field(default_factory=list)
    iso_11179: ISO11179Element = Field(default_factory=ISO11179Element)
    fibo_alignment: FIBOAlignment = Field(default_factory=FIBOAlignment)
    bcbs239_principle: str = ""
    created_date: str = ""
    last_updated: str = ""


class GlossaryCategory(BaseModel):
    category_id: str
    display_name: str
    description: str = ""
    icon: str = ""
    order: int = 0


class GlossaryRegistry(BaseModel):
    glossary_id: str = "business_glossary"
    version: str = "1.0"
    description: str = ""
    terms: list[GlossaryTerm] = Field(default_factory=list)


class GlossaryCategoryRegistry(BaseModel):
    categories: list[GlossaryCategory] = Field(default_factory=list)


# --- Semantic Layer models ---


class SemanticMetric(BaseModel):
    """A business-friendly metric definition for the semantic layer."""

    metric_id: str
    business_name: str
    definition: str
    formula: str = ""
    source_tier: Literal["bronze", "silver", "gold", "platinum"] = "gold"
    source_entities: list[str] = Field(default_factory=list)
    unit: str = ""
    format: str = ""
    dimensions: list[str] = Field(default_factory=list)
    owner: str = ""
    glossary_term_id: str = ""
    bcbs239_principle: str = ""


class SemanticDimension(BaseModel):
    """A reusable dimension for slicing semantic metrics."""

    dimension_id: str
    business_name: str
    definition: str = ""
    source_entity: str = ""
    source_field: str = ""
    values: list[str] = Field(default_factory=list)
    glossary_term_id: str = ""


class SemanticRegistry(BaseModel):
    semantic_id: str = "business_metrics"
    version: str = "1.0"
    description: str = ""
    metrics: list[SemanticMetric] = Field(default_factory=list)


class DimensionRegistry(BaseModel):
    dimensions: list[SemanticDimension] = Field(default_factory=list)
