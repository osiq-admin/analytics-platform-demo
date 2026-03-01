"""Tests for ISO 11179 Business Glossary and Semantic Layer Pydantic models."""

import pytest
from pydantic import ValidationError

from backend.models.glossary import (
    DimensionRegistry,
    FIBOAlignment,
    GlossaryCategory,
    GlossaryCategoryRegistry,
    GlossaryRegistry,
    GlossaryTerm,
    ISO11179Element,
    SemanticDimension,
    SemanticMetric,
    SemanticRegistry,
    TechnicalMapping,
)


# --- Glossary model tests (Task 23.1) ---


def test_glossary_term_model_valid():
    term = GlossaryTerm(
        term_id="wash_trade",
        business_name="Wash Trade",
        definition="A transaction where the same beneficial owner is on both sides.",
        category="market_abuse",
        domain="surveillance",
        status="approved",
        owner="compliance",
        steward="surveillance_team",
        synonyms=["self-dealing", "wash trading"],
        related_terms=["spoofing"],
        regulatory_references=["MAR Art. 12(1)(a)"],
        technical_mappings=[
            TechnicalMapping(
                entity="execution",
                field="trader_id",
                relationship="key_field",
                description="Trader identity",
            )
        ],
        iso_11179=ISO11179Element(
            object_class="Trade",
            property="Wash Indicator",
            representation="Score",
            data_element_concept="Trade.WashIndicator",
        ),
        fibo_alignment=FIBOAlignment(
            fibo_class="fibo-fnd-trn:Trade",
            fibo_namespace="https://spec.edmcouncil.org/fibo/ontology/FND/TransactionsExt/",
            fibo_description="A transaction",
        ),
        bcbs239_principle="accuracy",
        created_date="2026-03-01",
        last_updated="2026-03-01",
    )
    assert term.term_id == "wash_trade"
    assert term.status == "approved"
    assert len(term.synonyms) == 2
    assert len(term.technical_mappings) == 1
    assert term.iso_11179.object_class == "Trade"
    assert term.fibo_alignment.fibo_class == "fibo-fnd-trn:Trade"


def test_glossary_term_default_values():
    term = GlossaryTerm(
        term_id="test_term",
        business_name="Test",
        definition="A test term.",
    )
    assert term.status == "approved"
    assert term.synonyms == []
    assert term.related_terms == []
    assert term.regulatory_references == []
    assert term.technical_mappings == []
    assert term.iso_11179.object_class == ""
    assert term.fibo_alignment.fibo_class == ""
    assert term.bcbs239_principle == ""


def test_iso_11179_element_model():
    elem = ISO11179Element(
        object_class="Trade",
        property="Wash Indicator",
        representation="Score",
        data_element_concept="Trade.WashIndicator",
        naming_convention="ObjectClass.Property.Representation",
    )
    assert elem.object_class == "Trade"
    assert elem.data_element_concept == "Trade.WashIndicator"
    assert elem.naming_convention == "ObjectClass.Property.Representation"


def test_fibo_alignment_model():
    fibo = FIBOAlignment(
        fibo_class="fibo-fnd-trn:Trade",
        fibo_namespace="https://spec.edmcouncil.org/fibo/ontology/FND/TransactionsExt/",
        fibo_description="A transaction involving the exchange of a financial instrument",
    )
    assert fibo.fibo_class == "fibo-fnd-trn:Trade"
    assert "edmcouncil.org" in fibo.fibo_namespace


def test_technical_mapping_model():
    for rel in [
        "key_field",
        "computed_indicator",
        "detected_by",
        "source_data",
        "aggregated_from",
        "derived_from",
        "dimension",
        "measure",
    ]:
        mapping = TechnicalMapping(
            entity="execution", field="trader_id", relationship=rel
        )
        assert mapping.relationship == rel


def test_glossary_registry_model():
    registry = GlossaryRegistry(
        glossary_id="test_glossary",
        version="1.0",
        description="Test glossary",
        terms=[
            GlossaryTerm(
                term_id="t1", business_name="Term 1", definition="First"
            ),
            GlossaryTerm(
                term_id="t2", business_name="Term 2", definition="Second"
            ),
        ],
    )
    assert registry.glossary_id == "test_glossary"
    assert len(registry.terms) == 2


def test_category_model():
    cat = GlossaryCategory(
        category_id="market_abuse",
        display_name="Market Abuse",
        description="Terms related to market abuse",
        icon="AlertTriangle",
        order=1,
    )
    assert cat.category_id == "market_abuse"
    assert cat.order == 1


def test_glossary_term_status_literals():
    for status in ["draft", "approved", "deprecated", "under_review", "planned"]:
        term = GlossaryTerm(
            term_id="test",
            business_name="Test",
            definition="Test",
            status=status,
        )
        assert term.status == status

    with pytest.raises(ValidationError):
        GlossaryTerm(
            term_id="test",
            business_name="Test",
            definition="Test",
            status="invalid_status",
        )


# --- Semantic model tests (Task 23.2) ---


def test_semantic_metric_model_valid():
    metric = SemanticMetric(
        metric_id="daily_alert_rate",
        business_name="Daily Alert Rate",
        definition="Alerts per day",
        formula="COUNT(alerts) / COUNT(trades)",
        source_tier="platinum",
        source_entities=["execution", "alert"],
        unit="ratio",
        format="percentage",
        dimensions=["business_date", "model"],
    )
    assert metric.metric_id == "daily_alert_rate"
    assert metric.source_tier == "platinum"
    assert len(metric.dimensions) == 2


def test_semantic_metric_defaults():
    metric = SemanticMetric(
        metric_id="test", business_name="Test", definition="Test"
    )
    assert metric.source_tier == "gold"
    assert metric.source_entities == []
    assert metric.dimensions == []


def test_semantic_dimension_model():
    dim = SemanticDimension(
        dimension_id="asset_class",
        business_name="Asset Class",
        definition="Product asset class",
        source_entity="product",
        source_field="asset_class",
        values=["equity", "fx"],
    )
    assert dim.dimension_id == "asset_class"
    assert len(dim.values) == 2


def test_semantic_registry_model():
    registry = SemanticRegistry(
        metrics=[
            SemanticMetric(
                metric_id="m1", business_name="M1", definition="Test"
            ),
        ]
    )
    assert registry.semantic_id == "business_metrics"
    assert len(registry.metrics) == 1


def test_dimension_registry_model():
    registry = DimensionRegistry(
        dimensions=[
            SemanticDimension(dimension_id="d1", business_name="D1"),
        ]
    )
    assert len(registry.dimensions) == 1


def test_semantic_metric_tier_literals():
    for tier in ["bronze", "silver", "gold", "platinum"]:
        metric = SemanticMetric(
            metric_id="t",
            business_name="T",
            definition="T",
            source_tier=tier,
        )
        assert metric.source_tier == tier
