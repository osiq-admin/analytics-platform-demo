"""Tests for ISO, FIX Protocol, and Compliance Requirements standards metadata — endpoints and validation."""
import json

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend import config


VALID_ENTITIES = {"product", "execution", "order", "md_eod", "md_intraday", "venue", "account", "trader"}

# Detection model IDs used in compliance requirements
DETECTION_MODEL_IDS = [
    "wash_full_day", "wash_intraday", "market_price_ramping",
    "spoofing_layering", "insider_dealing",
]


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "workspace"
    (ws / "metadata" / "standards").mkdir(parents=True)
    # Minimal required dirs for app startup
    for d in ["entities", "calculations", "settings", "detection_models", "query_presets"]:
        (ws / "metadata" / d).mkdir(parents=True)
    (ws / "data" / "csv").mkdir(parents=True)

    # Write ISO mapping registry
    iso_registry = {
        "registry_id": "iso_standards",
        "description": "ISO standards registry for trade surveillance.",
        "iso_mappings": [
            {
                "iso_standard": "ISO 6166",
                "standard_name": "International Securities Identification Number (ISIN)",
                "field_path": "product.isin",
                "description": "12-character alphanumeric ISIN code.",
                "entities_using": ["product"],
                "fields_using": ["isin"],
                "validation_rules": {"length": 12, "format": "^[A-Z]{2}[A-Z0-9]{9}[0-9]$"},
                "regulatory_relevance": ["MiFID II RTS 25", "MAR Art. 16"],
                "detection_models_using": ["wash_full_day", "wash_intraday"]
            },
            {
                "iso_standard": "ISO 10383",
                "standard_name": "Market Identifier Code (MIC)",
                "field_path": "venue.mic",
                "description": "4-character MIC code.",
                "entities_using": ["venue", "product", "execution", "order"],
                "fields_using": ["mic", "exchange_mic", "venue_mic"],
                "validation_rules": {"length": 4, "format": "^[A-Z0-9]{4}$"},
                "regulatory_relevance": ["MiFID II RTS 25"],
                "detection_models_using": ["wash_full_day"]
            },
            {
                "iso_standard": "ISO 10962",
                "standard_name": "Classification of Financial Instruments (CFI)",
                "field_path": "product.cfi_code",
                "description": "6-character CFI code.",
                "entities_using": ["product"],
                "fields_using": ["cfi_code"],
                "validation_rules": {"length": 6, "format": "^[A-Z]{6}$"},
                "regulatory_relevance": ["MiFID II RTS 25"],
                "detection_models_using": []
            },
            {
                "iso_standard": "ISO 4217",
                "standard_name": "Currency Codes",
                "field_path": "product.currency",
                "description": "3-letter currency code.",
                "entities_using": ["product"],
                "fields_using": ["currency"],
                "validation_rules": {"length": 3, "format": "^[A-Z]{3}$"},
                "regulatory_relevance": ["MiFID II RTS 25"],
                "detection_models_using": []
            },
            {
                "iso_standard": "ISO 3166-1",
                "standard_name": "Country Codes",
                "field_path": "venue.country",
                "description": "2-letter country code.",
                "entities_using": ["venue", "account"],
                "fields_using": ["country", "registration_country"],
                "validation_rules": {"length": 2, "format": "^[A-Z]{2}$"},
                "regulatory_relevance": ["MiFID II Art. 16(2)"],
                "detection_models_using": []
            },
            {
                "iso_standard": "ISO 8601",
                "standard_name": "Date and Time Format",
                "field_path": "execution.exec_time",
                "description": "ISO date/time format.",
                "entities_using": ["execution", "order", "md_eod", "md_intraday"],
                "fields_using": ["exec_time", "exec_date", "order_time", "order_date"],
                "validation_rules": {"date_format": "YYYY-MM-DD", "time_format": "HH:MM:SS.fff"},
                "regulatory_relevance": ["MiFID II RTS 25"],
                "detection_models_using": ["wash_full_day", "wash_intraday"]
            }
        ]
    }
    (ws / "metadata" / "standards" / "iso_mapping.json").write_text(
        json.dumps(iso_registry, indent=2)
    )

    # Write FIX protocol registry
    fix_registry = {
        "registry_id": "fix_protocol",
        "description": "FIX Protocol field mappings used in order and execution entities",
        "fix_fields": [
            {
                "field_number": 40,
                "field_name": "OrdType",
                "description": "Type of order placed",
                "domain_values": ["MARKET", "LIMIT"],
                "entities_using": ["order"],
                "fields_using": ["order_type"],
                "regulatory_relevance": "MiFID II RTS 25 order classification",
            },
            {
                "field_number": 150,
                "field_name": "ExecType",
                "description": "Type of execution report",
                "domain_values": ["FILL", "PARTIAL_FILL"],
                "entities_using": ["execution"],
                "fields_using": ["exec_type"],
                "regulatory_relevance": "MAR Art. 16 transaction reporting",
            },
            {
                "field_number": 39,
                "field_name": "OrdStatus",
                "description": "Current status of an order",
                "domain_values": ["NEW", "PARTIALLY_FILLED", "FILLED", "CANCELLED"],
                "entities_using": ["order"],
                "fields_using": ["status"],
                "regulatory_relevance": "MiFID II RTS 25 order record keeping",
            },
            {
                "field_number": 59,
                "field_name": "TimeInForce",
                "description": "How long the order remains active",
                "domain_values": ["DAY", "GTC", "IOC", "FOK"],
                "entities_using": ["order"],
                "fields_using": ["time_in_force"],
                "regulatory_relevance": "MiFID II RTS 25 order attributes",
            },
            {
                "field_number": 1057,
                "field_name": "AggressorIndicator",
                "description": "Whether the order was the aggressor in the trade",
                "domain_values": ["AGENCY", "PRINCIPAL"],
                "entities_using": ["execution"],
                "fields_using": ["capacity"],
                "regulatory_relevance": "MiFID II RTS 25 aggressor/passive classification",
            },
            {
                "field_number": 54,
                "field_name": "Side",
                "description": "Side of order — buy or sell",
                "domain_values": ["BUY", "SELL"],
                "entities_using": ["order", "execution"],
                "fields_using": ["side"],
                "regulatory_relevance": "MAR Art. 12 wash trading detection, MiFID II RTS 25",
            },
        ],
    }
    (ws / "metadata" / "standards" / "fix_protocol.json").write_text(
        json.dumps(fix_registry, indent=2)
    )

    # Write compliance requirements registry
    compliance_registry = {
        "registry_id": "compliance_requirements",
        "description": "Granular compliance requirements mapped to implementations",
        "requirements": [
            {
                "requirement_id": "mar_12_1_a_wash",
                "regulation": "MAR",
                "article": "Art. 12(1)(a)",
                "requirement_text": "Detect transactions giving false or misleading signals",
                "implementation": "detection_model",
                "implementation_id": "wash_full_day",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "mar_12_1_a_wash_intraday",
                "regulation": "MAR",
                "article": "Art. 12(1)(a)",
                "requirement_text": "Detect intraday wash patterns with short time windows",
                "implementation": "detection_model",
                "implementation_id": "wash_intraday",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "mar_12_1_b_ramping",
                "regulation": "MAR",
                "article": "Art. 12(1)(b)",
                "requirement_text": "Detect price ramping",
                "implementation": "detection_model",
                "implementation_id": "market_price_ramping",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "mar_12_1_c_spoofing",
                "regulation": "MAR",
                "article": "Art. 12(1)(c)",
                "requirement_text": "Detect spoofing/layering",
                "implementation": "detection_model",
                "implementation_id": "spoofing_layering",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "mar_14_insider",
                "regulation": "MAR",
                "article": "Art. 14",
                "requirement_text": "Detect insider dealing",
                "implementation": "detection_model",
                "implementation_id": "insider_dealing",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "mar_16_surveillance",
                "regulation": "MAR",
                "article": "Art. 16",
                "requirement_text": "Maintain surveillance systems",
                "implementation": "audit_trail",
                "implementation_id": "audit_service",
                "evidence_type": "audit_log",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "mifid2_16_2_org",
                "regulation": "MiFID II",
                "article": "Art. 16(2)",
                "requirement_text": "Establish compliance surveillance systems",
                "implementation": "detection_model",
                "implementation_id": "wash_full_day",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "mifid2_rts25_records",
                "regulation": "MiFID II",
                "article": "RTS 25",
                "requirement_text": "Maintain order records with timestamps",
                "implementation": "entity_field",
                "implementation_id": "order.order_time",
                "evidence_type": "field_value",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "dodd_frank_747_spoofing",
                "regulation": "Dodd-Frank",
                "article": "§747",
                "requirement_text": "Prohibition of spoofing",
                "implementation": "detection_model",
                "implementation_id": "spoofing_layering",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "finra_5210_marking_close",
                "regulation": "FINRA",
                "article": "Rule 5210",
                "requirement_text": "Prohibit marking the close",
                "implementation": "detection_model",
                "implementation_id": "market_price_ramping",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "emir_9_reporting",
                "regulation": "EMIR",
                "article": "Art. 9",
                "requirement_text": "Report derivative contract details to trade repositories",
                "implementation": "entity_field",
                "implementation_id": "product.instrument_type",
                "evidence_type": "field_value",
                "validation_frequency": "daily",
                "status": "partial",
            },
            {
                "requirement_id": "sec_10b5_insider",
                "regulation": "SEC",
                "article": "Rule 10b-5",
                "requirement_text": "Detect fraudulent trading based on material non-public information",
                "implementation": "detection_model",
                "implementation_id": "insider_dealing",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
            {
                "requirement_id": "sec_9a2_wash",
                "regulation": "SEC",
                "article": "\u00a79(a)(2)",
                "requirement_text": "Detect transactions creating apparent active trading to manipulate price",
                "implementation": "detection_model",
                "implementation_id": "wash_full_day",
                "evidence_type": "alert_with_score",
                "validation_frequency": "real-time",
                "status": "implemented",
            },
        ],
    }
    (ws / "metadata" / "standards" / "compliance_requirements.json").write_text(
        json.dumps(compliance_registry, indent=2)
    )

    # Write regulation registry
    (ws / "metadata" / "regulations").mkdir(parents=True)
    regulation_registry = {
        "regulations": [
            {
                "id": "mar",
                "name": "MAR",
                "full_name": "EU Regulation 596/2014 (MAR)",
                "jurisdiction": "EU",
                "source_url": "https://eur-lex.europa.eu/eli/reg/2014/596/oj",
                "articles": [
                    {"id": "mar_12_1_a", "article": "Art. 12(1)(a)", "title": "Wash Trading", "description": "Wash trading", "detection_pattern": "wash_trading"},
                    {"id": "mar_12_1_b", "article": "Art. 12(1)(b)", "title": "Price Manipulation", "description": "Price manipulation", "detection_pattern": "price_manipulation"},
                    {"id": "mar_12_1_c", "article": "Art. 12(1)(c)", "title": "Spoofing / Layering", "description": "Spoofing", "detection_pattern": "spoofing"},
                    {"id": "mar_14", "article": "Art. 14", "title": "Insider Dealing", "description": "Insider dealing", "detection_pattern": "insider_dealing"},
                    {"id": "mar_16", "article": "Art. 16", "title": "Surveillance Obligation", "description": "Surveillance", "detection_pattern": "general_surveillance"},
                ],
            },
            {
                "id": "mifid2",
                "name": "MiFID II",
                "full_name": "EU Directive 2014/65/EU (MiFID II)",
                "jurisdiction": "EU",
                "source_url": "https://eur-lex.europa.eu/eli/dir/2014/65/oj",
                "articles": [
                    {"id": "mifid2_16_2", "article": "Art. 16(2)", "title": "Organisational Requirements", "description": "Org requirements", "detection_pattern": "general_surveillance"},
                    {"id": "mifid2_rts25", "article": "RTS 25", "title": "Order Record Keeping", "description": "Record keeping", "detection_pattern": "record_keeping"},
                ],
            },
            {
                "id": "dodd_frank",
                "name": "Dodd-Frank",
                "full_name": "Dodd-Frank Wall Street Reform and Consumer Protection Act",
                "jurisdiction": "US",
                "source_url": "https://www.congress.gov/bill/111th-congress/house-bill/4173",
                "articles": [
                    {"id": "df_747", "article": "\u00a7747", "title": "Anti-Manipulation", "description": "Anti-manipulation", "detection_pattern": "spoofing"},
                ],
            },
            {
                "id": "finra",
                "name": "FINRA",
                "full_name": "Financial Industry Regulatory Authority Rules",
                "jurisdiction": "US",
                "source_url": "https://www.finra.org/rules-guidance/rulebooks/finra-rules",
                "articles": [
                    {"id": "finra_5210", "article": "Rule 5210", "title": "Marking the Close", "description": "Marking the close", "detection_pattern": "price_manipulation"},
                ],
            },
            {
                "id": "emir",
                "name": "EMIR",
                "full_name": "EU Regulation 648/2012 (EMIR)",
                "jurisdiction": "EU",
                "source_url": "https://eur-lex.europa.eu/eli/reg/2012/648/oj",
                "articles": [
                    {"id": "emir_9", "article": "Art. 9", "title": "Reporting Obligation", "description": "Derivative reporting", "detection_pattern": "derivative_reporting"},
                    {"id": "emir_11", "article": "Art. 11", "title": "Risk Mitigation Techniques", "description": "Risk mitigation", "detection_pattern": "risk_mitigation"},
                ],
            },
            {
                "id": "sec",
                "name": "SEC",
                "full_name": "U.S. Securities and Exchange Commission Rules",
                "jurisdiction": "US",
                "source_url": "https://www.sec.gov/about/laws/securities-laws",
                "articles": [
                    {"id": "sec_10b5", "article": "Rule 10b-5", "title": "Insider Trading", "description": "Insider trading", "detection_pattern": "insider_dealing"},
                    {"id": "sec_9a2", "article": "\u00a79(a)(2)", "title": "Market Manipulation", "description": "Market manipulation", "detection_pattern": "wash_trading"},
                ],
            },
        ]
    }
    (ws / "metadata" / "regulations" / "registry.json").write_text(
        json.dumps(regulation_registry, indent=2)
    )

    # Write minimal detection model stubs (needed for cross-reference validation tests)
    for model_id in DETECTION_MODEL_IDS:
        model_stub = {
            "model_id": model_id,
            "name": model_id.replace("_", " ").title(),
            "description": f"Stub for {model_id}",
            "time_window": "business_date",
            "granularity": ["product_id", "account_id"],
            "calculations": [],
            "score_threshold_setting": f"{model_id}_score_threshold",
            "regulatory_coverage": [],
        }
        (ws / "metadata" / "detection_models" / f"{model_id}.json").write_text(
            json.dumps(model_stub, indent=2)
        )

    return ws


@pytest.fixture
def client(workspace, monkeypatch):
    monkeypatch.setattr(config.settings, "workspace_dir", workspace)
    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


class TestISOStandardsRegistry:
    def test_iso_standards_endpoint_returns_mappings(self, client):
        """GET /api/metadata/standards/iso returns 6+ mappings."""
        resp = client.get("/api/metadata/standards/iso")
        assert resp.status_code == 200
        data = resp.json()
        assert data["registry_id"] == "iso_standards"
        assert len(data["iso_mappings"]) >= 6

    def test_iso_mapping_has_required_fields(self, client):
        """Each ISO mapping contains iso_standard, field_path, description, entities_using."""
        resp = client.get("/api/metadata/standards/iso")
        for mapping in resp.json()["iso_mappings"]:
            assert "iso_standard" in mapping, f"Missing iso_standard in {mapping}"
            assert "field_path" in mapping, f"Missing field_path in {mapping}"
            assert "description" in mapping, f"Missing description in {mapping}"
            assert "entities_using" in mapping, f"Missing entities_using in {mapping}"
            assert len(mapping["entities_using"]) > 0, f"Empty entities_using in {mapping['iso_standard']}"

    def test_iso_mapping_references_valid_entities(self, client):
        """All entity references in ISO mappings are valid platform entities."""
        resp = client.get("/api/metadata/standards/iso")
        for mapping in resp.json()["iso_mappings"]:
            for entity in mapping["entities_using"]:
                assert entity in VALID_ENTITIES, (
                    f"Invalid entity '{entity}' in {mapping['iso_standard']}"
                )

    def test_iso_mapping_includes_validation_rules(self, client):
        """ISIN mapping has a format regex in its validation_rules."""
        resp = client.get("/api/metadata/standards/iso")
        isin_mappings = [
            m for m in resp.json()["iso_mappings"]
            if m["iso_standard"] == "ISO 6166"
        ]
        assert len(isin_mappings) == 1, "Expected exactly one ISO 6166 mapping"
        rules = isin_mappings[0]["validation_rules"]
        assert "format" in rules, "ISIN mapping missing format validation rule"
        assert rules["format"].startswith("^"), "Format should be a regex pattern"
        assert rules["length"] == 12, "ISIN length should be 12"


class TestFIXProtocol:
    def test_fix_registry_returns_fields(self, client):
        """GET /api/metadata/standards/fix returns 5+ FIX fields."""
        resp = client.get("/api/metadata/standards/fix")
        assert resp.status_code == 200
        data = resp.json()
        assert "fix_fields" in data
        assert len(data["fix_fields"]) >= 5

    def test_fix_field_has_required_attributes(self, client):
        """Each FIX field contains field_number, field_name, entities_using, domain_values."""
        resp = client.get("/api/metadata/standards/fix")
        for f in resp.json()["fix_fields"]:
            assert "field_number" in f
            assert "field_name" in f
            assert "entities_using" in f
            assert "domain_values" in f

    def test_fix_field_domain_values_match_entity_metadata(self, client):
        """OrdType (FIX tag 40) includes MARKET and LIMIT domain values."""
        resp = client.get("/api/metadata/standards/fix")
        ord_type = next(
            (f for f in resp.json()["fix_fields"] if f["field_number"] == 40), None
        )
        assert ord_type is not None
        assert "MARKET" in ord_type["domain_values"]
        assert "LIMIT" in ord_type["domain_values"]


class TestComplianceRequirements:
    def test_compliance_endpoint_returns_requirements(self, client):
        """GET /api/metadata/standards/compliance returns 8+ requirements."""
        resp = client.get("/api/metadata/standards/compliance")
        assert resp.status_code == 200
        data = resp.json()
        assert "requirements" in data
        assert len(data["requirements"]) >= 8

    def test_requirement_has_implementation_reference(self, client):
        """Each requirement has valid implementation type and required fields."""
        resp = client.get("/api/metadata/standards/compliance")
        for r in resp.json()["requirements"]:
            assert "requirement_id" in r
            assert "regulation" in r
            assert "implementation" in r
            assert r["implementation"] in (
                "detection_model", "calculation", "setting", "entity_field", "audit_trail"
            )
            assert "implementation_id" in r
            assert "evidence_type" in r

    def test_all_model_references_exist(self, client):
        """All compliance requirements referencing detection_model have valid model IDs."""
        comp_resp = client.get("/api/metadata/standards/compliance")
        models_resp = client.get("/api/metadata/detection-models")
        model_ids = {m["model_id"] for m in models_resp.json()}
        for r in comp_resp.json()["requirements"]:
            if r["implementation"] == "detection_model":
                assert r["implementation_id"] in model_ids, \
                    f"Requirement {r['requirement_id']} references unknown model {r['implementation_id']}"


class TestEnhancedRegulations:
    def test_registry_has_six_regulations(self, client):
        resp = client.get("/api/metadata/regulatory/registry")
        assert resp.status_code == 200
        reg_ids = [r["id"] for r in resp.json()["regulations"]]
        assert "mar" in reg_ids
        assert "mifid2" in reg_ids
        assert "emir" in reg_ids
        assert "sec" in reg_ids
        assert len(reg_ids) >= 6

    def test_regulation_has_source_url(self, client):
        resp = client.get("/api/metadata/regulatory/registry")
        for reg in resp.json()["regulations"]:
            assert "source_url" in reg, f"Regulation {reg['id']} missing source_url"

    def test_emir_has_derivative_articles(self, client):
        resp = client.get("/api/metadata/regulatory/registry")
        emir = next((r for r in resp.json()["regulations"] if r["id"] == "emir"), None)
        assert emir is not None
        assert len(emir["articles"]) >= 2

    def test_sec_has_insider_trading_article(self, client):
        resp = client.get("/api/metadata/regulatory/registry")
        sec = next((r for r in resp.json()["regulations"] if r["id"] == "sec"), None)
        assert sec is not None
        articles = [a["id"] for a in sec["articles"]]
        assert "sec_10b5" in articles
