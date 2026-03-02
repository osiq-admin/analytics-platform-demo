"""Tests for GlossaryService — search, reverse lookup, CRUD, ownership matrix."""

import json

import pytest

from backend.services.glossary_service import GlossaryService


@pytest.fixture()
def workspace(tmp_path):
    """Create a minimal workspace with glossary metadata for testing."""
    glossary_dir = tmp_path / "metadata" / "glossary"
    glossary_dir.mkdir(parents=True)

    terms = {
        "glossary_id": "test",
        "version": "1.0",
        "description": "Test glossary",
        "terms": [
            {
                "term_id": "wash_trade",
                "business_name": "Wash Trade",
                "definition": "A transaction where the same owner is on both sides.",
                "category": "market_abuse",
                "domain": "surveillance",
                "status": "approved",
                "owner": "compliance",
                "steward": "surveillance_team",
                "synonyms": ["self-dealing", "wash trading"],
                "related_terms": ["spoofing"],
                "regulatory_references": ["MAR Art. 12"],
                "technical_mappings": [
                    {
                        "entity": "execution",
                        "field": "trader_id",
                        "relationship": "key_field",
                        "description": "Trader identity",
                    }
                ],
            },
            {
                "term_id": "spoofing",
                "business_name": "Spoofing",
                "definition": "Placing orders with intent to cancel.",
                "category": "market_abuse",
                "domain": "surveillance",
                "status": "approved",
                "owner": "compliance",
                "steward": "surveillance_team",
                "synonyms": ["phantom orders"],
                "technical_mappings": [
                    {
                        "entity": "order",
                        "field": "status",
                        "relationship": "key_field",
                    }
                ],
            },
            {
                "term_id": "financial_product",
                "business_name": "Financial Product",
                "definition": "A tradeable financial instrument.",
                "category": "data_entities",
                "domain": "reference_data",
                "status": "approved",
                "owner": "data_management",
                "steward": "reference_data_team",
                "synonyms": ["instrument"],
                "technical_mappings": [
                    {
                        "entity": "product",
                        "field": "product_id",
                        "relationship": "key_field",
                    }
                ],
            },
            {
                "term_id": "legal_entity_identifier",
                "business_name": "Legal Entity Identifier (LEI)",
                "definition": "ISO 17442 identifier for legal entities.",
                "category": "regulatory",
                "domain": "reference_data",
                "status": "planned",
                "owner": "compliance",
                "steward": "reference_data_team",
                "synonyms": ["LEI"],
                "technical_mappings": [],
            },
        ],
    }

    categories = {
        "categories": [
            {"category_id": "market_abuse", "display_name": "Market Abuse", "icon": "AlertTriangle", "order": 1},
            {"category_id": "data_entities", "display_name": "Data Entities", "icon": "Database", "order": 2},
            {"category_id": "regulatory", "display_name": "Regulatory", "icon": "Shield", "order": 3},
        ]
    }

    (glossary_dir / "terms.json").write_text(json.dumps(terms, indent=2))
    (glossary_dir / "categories.json").write_text(json.dumps(categories, indent=2))
    return tmp_path


def test_list_terms_returns_all(workspace):
    svc = GlossaryService(workspace)
    terms = svc.list_terms()
    assert len(terms) == 4


def test_list_terms_filter_by_category(workspace):
    svc = GlossaryService(workspace)
    terms = svc.list_terms(category="market_abuse")
    assert len(terms) == 2
    assert all(t.category == "market_abuse" for t in terms)


def test_list_terms_search_by_name(workspace):
    svc = GlossaryService(workspace)
    terms = svc.list_terms(search="wash")
    assert len(terms) == 1
    assert terms[0].term_id == "wash_trade"


def test_list_terms_search_by_synonym(workspace):
    svc = GlossaryService(workspace)
    terms = svc.list_terms(search="phantom")
    assert len(terms) == 1
    assert terms[0].term_id == "spoofing"


def test_list_terms_combined_filter(workspace):
    svc = GlossaryService(workspace)
    terms = svc.list_terms(category="market_abuse", search="spoof")
    assert len(terms) == 1
    assert terms[0].term_id == "spoofing"


def test_get_term_found(workspace):
    svc = GlossaryService(workspace)
    term = svc.get_term("wash_trade")
    assert term is not None
    assert term.business_name == "Wash Trade"


def test_get_term_not_found(workspace):
    svc = GlossaryService(workspace)
    term = svc.get_term("nonexistent")
    assert term is None


def test_reverse_lookup_found(workspace):
    svc = GlossaryService(workspace)
    terms = svc.reverse_lookup("execution", "trader_id")
    assert len(terms) == 1
    assert terms[0].term_id == "wash_trade"


def test_reverse_lookup_not_found(workspace):
    svc = GlossaryService(workspace)
    terms = svc.reverse_lookup("venue", "mic")
    assert len(terms) == 0


def test_update_term_success(workspace):
    svc = GlossaryService(workspace)
    updated = svc.update_term("wash_trade", {"definition": "Updated definition."})
    assert updated is not None
    assert updated.definition == "Updated definition."
    # Verify persisted
    svc2 = GlossaryService(workspace)
    reloaded = svc2.get_term("wash_trade")
    assert reloaded is not None
    assert reloaded.definition == "Updated definition."


def test_update_term_not_found(workspace):
    svc = GlossaryService(workspace)
    result = svc.update_term("nonexistent", {"definition": "Nope"})
    assert result is None


def test_get_summary(workspace):
    svc = GlossaryService(workspace)
    summary = svc.get_summary()
    assert summary["total_terms"] == 4
    assert summary["by_status"]["approved"] == 3
    assert summary["by_status"]["planned"] == 1
    assert summary["by_category"]["market_abuse"] == 2
    assert summary["category_count"] == 3
