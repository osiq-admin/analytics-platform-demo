# Compliance & Metadata Architecture Overhaul — Phase 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Increase metadata-driven architecture from 71.6% to 85%+ while adding comprehensive ISO/regulatory compliance metadata registries, entity compliance fields, and grid column metadata — targeting Fortune 500 trade surveillance robustness.

**Architecture:** Six-stage overhaul following the same pattern as M129-M150. Each stage adds metadata JSON, backend models/API, frontend integration, tests, and a documentation checkpoint. Standards metadata (ISO, FIX, compliance requirements) form a new `workspace/metadata/standards/` directory. Grid column definitions become a new `workspace/metadata/grids/` directory. Entity metadata gains regulatory fields.

**Tech Stack:** Python FastAPI + Pydantic v2, DuckDB, React 19 + TypeScript + Vite, Zustand, AG Grid, Recharts, React Flow

**Current State (start of plan):**
- 74 architecture sections: 31 fully + 22 mostly + 5 mixed + 8 code-driven + 8 infrastructure
- Metadata-driven: 53/74 = 71.6%
- Backend tests: 421 | E2E tests: 182 | Frontend: 965 modules
- 4 regulations (MAR, MiFID II, Dodd-Frank, FINRA), 13 articles, 5 detection models
- ISO standards referenced: ISO 6166, 10383, 10962, 4217, 3166-1, FIX protocol

**Target State (end of plan):**
- Metadata-driven: 85%+ (63+/74 sections fully or mostly metadata-driven)
- Backend tests: ~460+ (39+ new tests)
- New metadata types: 6 (iso_mapping, fix_protocol, compliance_requirements, grid_columns, view_config, workflow_states)
- Regulations: 6+ (add EMIR, SEC Rule 10b-5)
- Entity fields: +5 compliance fields across product and account
- Grid columns: 4+ views with metadata-driven column definitions

---

## Conversion Target Summary

| Section | Current | Target | Stage |
|---------|---------|--------|-------|
| entities.view-tabs | code-driven | mostly-metadata-driven | 4 |
| data.tables-list | code-driven | mostly-metadata-driven | 3 |
| data.data-grid | code-driven | mostly-metadata-driven | 3 |
| alerts.filters | code-driven | mostly-metadata-driven | 3 |
| alerts.market-data | code-driven | mostly-metadata-driven | 4 |
| alerts.related-orders | code-driven | mostly-metadata-driven | 3 |
| app.demo-toolbar | mixed | mostly-metadata-driven | 5 |
| app.toolbar | mixed | mostly-metadata-driven | 5 |
| sql.chat-panel | mixed | mostly-metadata-driven | 5 |
| models.ai-chat | mixed | mostly-metadata-driven | 5 |
| submissions.review-actions | mixed | mostly-metadata-driven | 5 |
| **+11 sections converted** | | | |

**Projected after plan:** 31 + 11 = 42 fully, 22 + 0 = 22 mostly → 64/74 = **86.5% metadata-driven**
(some "mostly" sections may also upgrade to "fully" during the process)

---

## Stage 1: Standards & Compliance Metadata Foundation (M151-M154)

### Task 1: ISO Standards Registry (M151)

**Context:** Entity fields reference ISO 6166 (ISIN), ISO 10383 (MIC), ISO 10962 (CFI), ISO 4217 (currency), ISO 3166-1 (country) in descriptions but there's no centralized registry linking fields → standards → detection models. Create a structured ISO mapping registry.

**Files:**
- Create: `workspace/metadata/standards/iso_mapping.json`
- Create: `backend/models/standards.py`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/metadata.py`
- Create: `tests/test_standards_metadata.py`

**Step 1: Write the failing test**

```python
# tests/test_standards_metadata.py
import pytest
from fastapi.testclient import TestClient
from backend.db import create_app

@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)

class TestISOStandards:
    """Tests for ISO standards registry metadata."""

    def test_iso_standards_endpoint_returns_mappings(self, client):
        """GET /api/metadata/standards/iso returns ISO field mappings."""
        resp = client.get("/api/metadata/standards/iso")
        assert resp.status_code == 200
        data = resp.json()
        assert "iso_mappings" in data
        assert len(data["iso_mappings"]) >= 6  # 6 ISO standards

    def test_iso_mapping_has_required_fields(self, client):
        """Each ISO mapping has standard, field_path, validation_rules."""
        resp = client.get("/api/metadata/standards/iso")
        for m in resp.json()["iso_mappings"]:
            assert "iso_standard" in m
            assert "field_path" in m
            assert "description" in m
            assert "entities_using" in m

    def test_iso_mapping_references_valid_entities(self, client):
        """Entity references in ISO mappings exist in entity metadata."""
        iso_resp = client.get("/api/metadata/standards/iso")
        entities_resp = client.get("/api/metadata/entities")
        entity_ids = {e["entity_id"] for e in entities_resp.json()}
        for m in iso_resp.json()["iso_mappings"]:
            for eid in m["entities_using"]:
                assert eid in entity_ids, f"{m['iso_standard']} references unknown entity {eid}"

    def test_iso_mapping_includes_validation_rules(self, client):
        """ISO mappings for identifiers include validation regex."""
        resp = client.get("/api/metadata/standards/iso")
        isin = next((m for m in resp.json()["iso_mappings"] if m["iso_standard"] == "ISO 6166"), None)
        assert isin is not None
        assert "validation_rules" in isin
        assert "format" in isin["validation_rules"]
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_standards_metadata.py::TestISOStandards -v`
Expected: FAIL — endpoint doesn't exist yet

**Step 3: Create ISO mapping metadata JSON**

Create `workspace/metadata/standards/iso_mapping.json`:
```json
{
  "registry_id": "iso_standards",
  "description": "ISO standard field mappings across all entities",
  "iso_mappings": [
    {
      "iso_standard": "ISO 6166",
      "standard_name": "International Securities Identification Number (ISIN)",
      "field_path": "product.isin",
      "description": "12-character alphanumeric code uniquely identifying a security",
      "entities_using": ["product"],
      "fields_using": ["isin"],
      "validation_rules": {
        "length": 12,
        "format": "^[A-Z]{2}[A-Z0-9]{9}[0-9]$"
      },
      "regulatory_relevance": ["MiFID II RTS 25", "MAR Art. 16"],
      "detection_models_using": ["wash_full_day", "wash_intraday", "insider_dealing", "market_price_ramping", "spoofing_layering"]
    },
    {
      "iso_standard": "ISO 10383",
      "standard_name": "Market Identifier Code (MIC)",
      "field_path": "venue.mic",
      "description": "4-character alphanumeric code identifying securities trading exchanges and markets",
      "entities_using": ["venue", "product", "execution", "order"],
      "fields_using": ["mic", "exchange_mic", "venue_mic"],
      "validation_rules": {
        "length": 4,
        "format": "^[A-Z0-9]{4}$"
      },
      "regulatory_relevance": ["MiFID II Art. 16(2)", "MAR Art. 16", "Dodd-Frank §747"],
      "detection_models_using": ["wash_full_day", "wash_intraday", "spoofing_layering"]
    },
    {
      "iso_standard": "ISO 10962",
      "standard_name": "Classification of Financial Instruments (CFI)",
      "field_path": "product.cfi_code",
      "description": "6-character code classifying financial instruments into categories",
      "entities_using": ["product"],
      "fields_using": ["cfi_code", "instrument_type"],
      "validation_rules": {
        "length": 6,
        "format": "^[A-Z]{6}$"
      },
      "regulatory_relevance": ["MiFID II RTS 25"],
      "detection_models_using": []
    },
    {
      "iso_standard": "ISO 4217",
      "standard_name": "Currency Codes",
      "field_path": "product.currency",
      "description": "3-letter alphabetic code for currencies",
      "entities_using": ["product"],
      "fields_using": ["currency"],
      "validation_rules": {
        "length": 3,
        "format": "^[A-Z]{3}$"
      },
      "regulatory_relevance": ["MiFID II RTS 25", "EMIR"],
      "detection_models_using": []
    },
    {
      "iso_standard": "ISO 3166-1",
      "standard_name": "Country Codes",
      "field_path": "venue.country",
      "description": "2-letter country codes for jurisdictional compliance",
      "entities_using": ["venue", "account"],
      "fields_using": ["country", "registration_country"],
      "validation_rules": {
        "length": 2,
        "format": "^[A-Z]{2}$"
      },
      "regulatory_relevance": ["MiFID II Art. 16(2)", "Dodd-Frank"],
      "detection_models_using": []
    },
    {
      "iso_standard": "ISO 8601",
      "standard_name": "Date and Time Representation",
      "field_path": "execution.execution_date",
      "description": "Standard date/time format for all timestamps and dates",
      "entities_using": ["execution", "order", "md_eod", "md_intraday"],
      "fields_using": ["execution_date", "execution_time", "order_date", "order_time", "trade_date", "timestamp"],
      "validation_rules": {
        "date_format": "YYYY-MM-DD",
        "time_format": "HH:MM:SS.ffffff"
      },
      "regulatory_relevance": ["MiFID II RTS 25"],
      "detection_models_using": ["wash_full_day", "wash_intraday", "insider_dealing"]
    }
  ]
}
```

**Step 4: Create Pydantic models**

Create `backend/models/standards.py`:
```python
"""Pydantic models for standards registry metadata."""
from pydantic import BaseModel


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
    entities_using: list[str]
    fields_using: list[str]
    validation_rules: ValidationRules | None = None
    regulatory_relevance: list[str] = []
    detection_models_using: list[str] = []


class ISORegistry(BaseModel):
    registry_id: str = "iso_standards"
    description: str = ""
    iso_mappings: list[ISOMapping] = []


class FIXField(BaseModel):
    field_number: int
    field_name: str
    description: str
    domain_values: list[str] = []
    entities_using: list[str] = []
    fields_using: list[str] = []
    regulatory_relevance: str = ""


class FIXRegistry(BaseModel):
    registry_id: str = "fix_protocol"
    description: str = ""
    fix_fields: list[FIXField] = []


class ComplianceRequirement(BaseModel):
    requirement_id: str
    regulation: str
    article: str
    requirement_text: str
    implementation: str  # "detection_model" | "calculation" | "setting" | "entity_field"
    implementation_id: str  # model_id, calc_id, setting_id, or field_path
    evidence_type: str  # "alert_with_score" | "audit_log" | "field_value" | "calculation_output"
    validation_frequency: str = "real-time"  # "real-time" | "daily" | "on-demand"
    status: str = "implemented"  # "implemented" | "partial" | "planned"


class ComplianceRegistry(BaseModel):
    registry_id: str = "compliance_requirements"
    description: str = ""
    requirements: list[ComplianceRequirement] = []
```

**Step 5: Add MetadataService methods**

Add to `backend/services/metadata_service.py`:
```python
def load_iso_registry(self) -> dict:
    """Load ISO standards registry from metadata."""
    path = self._base / "standards" / "iso_mapping.json"
    if not path.exists():
        return {"registry_id": "iso_standards", "iso_mappings": []}
    from backend.models.standards import ISORegistry
    config = ISORegistry.model_validate_json(path.read_text())
    return config.model_dump()

def load_fix_registry(self) -> dict:
    """Load FIX protocol field registry from metadata."""
    path = self._base / "standards" / "fix_protocol.json"
    if not path.exists():
        return {"registry_id": "fix_protocol", "fix_fields": []}
    from backend.models.standards import FIXRegistry
    config = FIXRegistry.model_validate_json(path.read_text())
    return config.model_dump()

def load_compliance_registry(self) -> dict:
    """Load compliance requirements registry from metadata."""
    path = self._base / "standards" / "compliance_requirements.json"
    if not path.exists():
        return {"registry_id": "compliance_requirements", "requirements": []}
    from backend.models.standards import ComplianceRegistry
    config = ComplianceRegistry.model_validate_json(path.read_text())
    return config.model_dump()
```

**Step 6: Add API endpoints**

Add to `backend/api/metadata.py`:
```python
@router.get("/standards/iso")
def get_iso_standards(request: Request):
    svc: MetadataService = request.app.state.metadata
    return svc.load_iso_registry()

@router.get("/standards/fix")
def get_fix_standards(request: Request):
    svc: MetadataService = request.app.state.metadata
    return svc.load_fix_registry()

@router.get("/standards/compliance")
def get_compliance_requirements(request: Request):
    svc: MetadataService = request.app.state.metadata
    return svc.load_compliance_registry()
```

**Step 7: Run tests to verify they pass**

Run: `uv run pytest tests/test_standards_metadata.py::TestISOStandards -v`
Expected: 4 PASSED

**Step 8: Commit**

```bash
git add workspace/metadata/standards/iso_mapping.json backend/models/standards.py \
  backend/services/metadata_service.py backend/api/metadata.py \
  tests/test_standards_metadata.py
git commit -m "feat(metadata): ISO standards registry as structured metadata (M151)"
```

---

### Task 2: FIX Protocol & Compliance Requirements Registries (M152)

**Context:** FIX protocol fields are used in order/execution entities (OrdType, ExecType, OrdStatus, TimeInForce, Capacity) but only referenced in comments. Create structured registries for FIX fields and granular compliance requirements.

**Files:**
- Create: `workspace/metadata/standards/fix_protocol.json`
- Create: `workspace/metadata/standards/compliance_requirements.json`
- Modify: `tests/test_standards_metadata.py`

**Step 1: Write the failing tests**

Add to `tests/test_standards_metadata.py`:
```python
class TestFIXProtocol:
    """Tests for FIX protocol field registry."""

    def test_fix_registry_returns_fields(self, client):
        resp = client.get("/api/metadata/standards/fix")
        assert resp.status_code == 200
        data = resp.json()
        assert "fix_fields" in data
        assert len(data["fix_fields"]) >= 5  # OrdType, ExecType, OrdStatus, TimeInForce, Capacity

    def test_fix_field_has_required_attributes(self, client):
        resp = client.get("/api/metadata/standards/fix")
        for f in resp.json()["fix_fields"]:
            assert "field_number" in f
            assert "field_name" in f
            assert "entities_using" in f
            assert "domain_values" in f

    def test_fix_field_domain_values_match_entity_metadata(self, client):
        """FIX field domain values should align with entity field domain_values."""
        resp = client.get("/api/metadata/standards/fix")
        # OrdType (FIX 40) should have MARKET, LIMIT
        ord_type = next((f for f in resp.json()["fix_fields"] if f["field_number"] == 40), None)
        assert ord_type is not None
        assert "MARKET" in ord_type["domain_values"]
        assert "LIMIT" in ord_type["domain_values"]


class TestComplianceRequirements:
    """Tests for compliance requirements registry."""

    def test_compliance_endpoint_returns_requirements(self, client):
        resp = client.get("/api/metadata/standards/compliance")
        assert resp.status_code == 200
        data = resp.json()
        assert "requirements" in data
        assert len(data["requirements"]) >= 8

    def test_requirement_has_implementation_reference(self, client):
        resp = client.get("/api/metadata/standards/compliance")
        for r in resp.json()["requirements"]:
            assert "requirement_id" in r
            assert "regulation" in r
            assert "implementation" in r
            assert r["implementation"] in ("detection_model", "calculation", "setting", "entity_field", "audit_trail")
            assert "implementation_id" in r
            assert "evidence_type" in r

    def test_all_model_references_exist(self, client):
        """Compliance requirements referencing models must point to real models."""
        comp_resp = client.get("/api/metadata/standards/compliance")
        models_resp = client.get("/api/metadata/detection-models")
        model_ids = {m["model_id"] for m in models_resp.json()}
        for r in comp_resp.json()["requirements"]:
            if r["implementation"] == "detection_model":
                assert r["implementation_id"] in model_ids, \
                    f"Requirement {r['requirement_id']} references unknown model {r['implementation_id']}"
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_standards_metadata.py -v`
Expected: New tests FAIL (FIX/compliance endpoints return empty)

**Step 3: Create FIX protocol metadata**

Create `workspace/metadata/standards/fix_protocol.json`:
```json
{
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
      "regulatory_relevance": "MiFID II RTS 25 order classification"
    },
    {
      "field_number": 150,
      "field_name": "ExecType",
      "description": "Type of execution report",
      "domain_values": ["FILL", "PARTIAL_FILL"],
      "entities_using": ["execution"],
      "fields_using": ["exec_type"],
      "regulatory_relevance": "MAR Art. 16 transaction reporting"
    },
    {
      "field_number": 39,
      "field_name": "OrdStatus",
      "description": "Current status of an order",
      "domain_values": ["NEW", "PARTIALLY_FILLED", "FILLED", "CANCELLED"],
      "entities_using": ["order"],
      "fields_using": ["status"],
      "regulatory_relevance": "MiFID II RTS 25 order record keeping"
    },
    {
      "field_number": 59,
      "field_name": "TimeInForce",
      "description": "How long the order remains active",
      "domain_values": ["DAY", "GTC", "IOC", "FOK"],
      "entities_using": ["order"],
      "fields_using": ["time_in_force"],
      "regulatory_relevance": "MiFID II RTS 25 order attributes"
    },
    {
      "field_number": 1057,
      "field_name": "AggressorIndicator",
      "description": "Whether the order was the aggressor in the trade",
      "domain_values": ["Y", "N"],
      "entities_using": ["execution"],
      "fields_using": ["capacity"],
      "regulatory_relevance": "MiFID II RTS 25 aggressor/passive classification"
    },
    {
      "field_number": 54,
      "field_name": "Side",
      "description": "Side of order — buy or sell",
      "domain_values": ["BUY", "SELL"],
      "entities_using": ["order", "execution"],
      "fields_using": ["side"],
      "regulatory_relevance": "MAR Art. 12 wash trading detection, MiFID II RTS 25"
    }
  ]
}
```

**Step 4: Create compliance requirements metadata**

Create `workspace/metadata/standards/compliance_requirements.json`:
```json
{
  "registry_id": "compliance_requirements",
  "description": "Granular compliance requirements mapped to implementations",
  "requirements": [
    {
      "requirement_id": "mar_12_1_a_wash",
      "regulation": "MAR",
      "article": "Art. 12(1)(a)",
      "requirement_text": "Detect transactions giving false or misleading signals as to supply, demand, or price",
      "implementation": "detection_model",
      "implementation_id": "wash_full_day",
      "evidence_type": "alert_with_score",
      "validation_frequency": "real-time",
      "status": "implemented"
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
      "status": "implemented"
    },
    {
      "requirement_id": "mar_12_1_b_ramping",
      "regulation": "MAR",
      "article": "Art. 12(1)(b)",
      "requirement_text": "Detect transactions securing the price at an abnormal or artificial level",
      "implementation": "detection_model",
      "implementation_id": "market_price_ramping",
      "evidence_type": "alert_with_score",
      "validation_frequency": "real-time",
      "status": "implemented"
    },
    {
      "requirement_id": "mar_12_1_c_spoofing",
      "regulation": "MAR",
      "article": "Art. 12(1)(c)",
      "requirement_text": "Detect fictitious orders or deceptive practices (spoofing/layering)",
      "implementation": "detection_model",
      "implementation_id": "spoofing_layering",
      "evidence_type": "alert_with_score",
      "validation_frequency": "real-time",
      "status": "implemented"
    },
    {
      "requirement_id": "mar_14_insider",
      "regulation": "MAR",
      "article": "Art. 14",
      "requirement_text": "Detect insider dealing — trading before material non-public information becomes public",
      "implementation": "detection_model",
      "implementation_id": "insider_dealing",
      "evidence_type": "alert_with_score",
      "validation_frequency": "real-time",
      "status": "implemented"
    },
    {
      "requirement_id": "mar_16_surveillance",
      "regulation": "MAR",
      "article": "Art. 16",
      "requirement_text": "Maintain effective surveillance systems to detect and report suspicious orders and transactions",
      "implementation": "audit_trail",
      "implementation_id": "audit_service",
      "evidence_type": "audit_log",
      "validation_frequency": "real-time",
      "status": "implemented"
    },
    {
      "requirement_id": "mifid2_16_2_org",
      "regulation": "MiFID II",
      "article": "Art. 16(2)",
      "requirement_text": "Establish adequate policies and procedures for compliance, including surveillance systems",
      "implementation": "detection_model",
      "implementation_id": "wash_full_day",
      "evidence_type": "alert_with_score",
      "validation_frequency": "real-time",
      "status": "implemented"
    },
    {
      "requirement_id": "mifid2_rts25_records",
      "regulation": "MiFID II",
      "article": "RTS 25",
      "requirement_text": "Maintain order records with precise timestamps and all required FIX attributes",
      "implementation": "entity_field",
      "implementation_id": "order.order_time",
      "evidence_type": "field_value",
      "validation_frequency": "real-time",
      "status": "implemented"
    },
    {
      "requirement_id": "mifid2_rts25_clock_sync",
      "regulation": "MiFID II",
      "article": "RTS 25",
      "requirement_text": "Clock synchronisation — timestamps accurate to 1ms for HFT, 100ms for others",
      "implementation": "entity_field",
      "implementation_id": "execution.execution_time",
      "evidence_type": "field_value",
      "validation_frequency": "daily",
      "status": "partial"
    },
    {
      "requirement_id": "dodd_frank_747_spoofing",
      "regulation": "Dodd-Frank",
      "article": "§747",
      "requirement_text": "Prohibition of spoofing — bidding or offering with intent to cancel before execution",
      "implementation": "detection_model",
      "implementation_id": "spoofing_layering",
      "evidence_type": "alert_with_score",
      "validation_frequency": "real-time",
      "status": "implemented"
    },
    {
      "requirement_id": "finra_5210_marking_close",
      "regulation": "FINRA",
      "article": "Rule 5210",
      "requirement_text": "Prohibit trading designed to influence the closing price",
      "implementation": "detection_model",
      "implementation_id": "market_price_ramping",
      "evidence_type": "alert_with_score",
      "validation_frequency": "real-time",
      "status": "implemented"
    }
  ]
}
```

**Step 5: Run all standards tests**

Run: `uv run pytest tests/test_standards_metadata.py -v`
Expected: ALL PASSED

**Step 6: Commit**

```bash
git add workspace/metadata/standards/ tests/test_standards_metadata.py
git commit -m "feat(metadata): FIX protocol + compliance requirements registries (M152)"
```

---

### Task 3: Enhanced Regulatory Registry with EMIR & SEC (M153)

**Context:** The regulatory registry covers MAR, MiFID II, Dodd-Frank, and FINRA. Add EMIR (EU derivatives) and SEC Rule 10b-5 (US insider trading) to expand jurisdiction coverage. Also enhance existing regulations with article URLs and jurisdiction scope metadata.

**Files:**
- Modify: `workspace/metadata/regulations/registry.json`
- Modify: `workspace/metadata/standards/compliance_requirements.json`
- Modify: `tests/test_standards_metadata.py`

**Step 1: Write failing tests**

Add to `tests/test_standards_metadata.py`:
```python
class TestEnhancedRegulations:
    """Tests for enhanced regulatory registry."""

    def test_registry_has_six_regulations(self, client):
        """Registry should have 6 regulations including EMIR and SEC."""
        resp = client.get("/api/metadata/regulatory/registry")
        assert resp.status_code == 200
        reg_ids = [r["id"] for r in resp.json()["regulations"]]
        assert "mar" in reg_ids
        assert "mifid2" in reg_ids
        assert "emir" in reg_ids
        assert "sec" in reg_ids

    def test_regulation_has_article_urls(self, client):
        """Each regulation should have an optional source_url."""
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
```

**Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_standards_metadata.py::TestEnhancedRegulations -v`
Expected: FAIL — only 4 regulations, no EMIR/SEC

**Step 3: Update regulatory registry**

Update `workspace/metadata/regulations/registry.json` to add `source_url` to all existing regulations, and add EMIR + SEC entries:
```json
{
  "regulations": [
    {
      "id": "mar",
      "name": "MAR",
      "full_name": "EU Regulation 596/2014 (MAR)",
      "jurisdiction": "EU",
      "source_url": "https://eur-lex.europa.eu/eli/reg/2014/596/oj",
      "articles": [
        {"id": "mar_12_1_a", "article": "Art. 12(1)(a)", "title": "Wash Trading", "description": "Transactions which give, or are likely to give, false or misleading signals as to the supply of, demand for, or price of a financial instrument", "detection_pattern": "wash_trading"},
        {"id": "mar_12_1_b", "article": "Art. 12(1)(b)", "title": "Price Manipulation", "description": "Transactions which secure, or are likely to secure, the price of one or several financial instruments at an abnormal or artificial level", "detection_pattern": "price_manipulation"},
        {"id": "mar_12_1_c", "article": "Art. 12(1)(c)", "title": "Spoofing / Layering", "description": "Orders to trade which employ a fictitious device or any other form of deception or contrivance", "detection_pattern": "spoofing"},
        {"id": "mar_14", "article": "Art. 14", "title": "Insider Dealing", "description": "Prohibition of insider dealing and of unlawful disclosure of inside information", "detection_pattern": "insider_dealing"},
        {"id": "mar_16", "article": "Art. 16", "title": "Surveillance Obligation", "description": "Obligation to detect and report suspicious orders and transactions", "detection_pattern": "general_surveillance"}
      ]
    },
    {
      "id": "mifid2",
      "name": "MiFID II",
      "full_name": "EU Directive 2014/65/EU (MiFID II)",
      "jurisdiction": "EU",
      "source_url": "https://eur-lex.europa.eu/eli/dir/2014/65/oj",
      "articles": [
        {"id": "mifid2_16_2", "article": "Art. 16(2)", "title": "Organisational Requirements", "description": "Investment firms shall establish adequate policies and procedures to ensure compliance, including effective surveillance systems", "detection_pattern": "general_surveillance"},
        {"id": "mifid2_rts25", "article": "RTS 25", "title": "Order Record Keeping", "description": "Clock synchronisation and order record keeping obligations", "detection_pattern": "record_keeping"}
      ]
    },
    {
      "id": "dodd_frank",
      "name": "Dodd-Frank",
      "full_name": "Dodd-Frank Wall Street Reform and Consumer Protection Act",
      "jurisdiction": "US",
      "source_url": "https://www.congress.gov/bill/111th-congress/house-bill/4173",
      "articles": [
        {"id": "df_747", "article": "§747", "title": "Anti-Manipulation", "description": "Prohibition of spoofing, market manipulation, and disruptive trading practices", "detection_pattern": "spoofing"}
      ]
    },
    {
      "id": "finra",
      "name": "FINRA",
      "full_name": "Financial Industry Regulatory Authority Rules",
      "jurisdiction": "US",
      "source_url": "https://www.finra.org/rules-guidance/rulebooks/finra-rules",
      "articles": [
        {"id": "finra_5210", "article": "Rule 5210", "title": "Marking the Close", "description": "Prohibition of trading activity designed to influence the closing price", "detection_pattern": "price_manipulation"}
      ]
    },
    {
      "id": "emir",
      "name": "EMIR",
      "full_name": "EU Regulation 648/2012 (EMIR)",
      "jurisdiction": "EU",
      "source_url": "https://eur-lex.europa.eu/eli/reg/2012/648/oj",
      "articles": [
        {"id": "emir_9", "article": "Art. 9", "title": "Reporting Obligation", "description": "Counterparties and CCPs shall report details of derivative contracts to trade repositories", "detection_pattern": "derivative_reporting"},
        {"id": "emir_11", "article": "Art. 11", "title": "Risk Mitigation Techniques", "description": "Timely confirmation, portfolio reconciliation, dispute resolution for non-centrally cleared OTC derivatives", "detection_pattern": "risk_mitigation"}
      ]
    },
    {
      "id": "sec",
      "name": "SEC",
      "full_name": "U.S. Securities and Exchange Commission Rules",
      "jurisdiction": "US",
      "source_url": "https://www.sec.gov/about/laws/securities-laws",
      "articles": [
        {"id": "sec_10b5", "article": "Rule 10b-5", "title": "Insider Trading", "description": "Employment of manipulative and deceptive devices — prohibits fraud in connection with purchase or sale of securities", "detection_pattern": "insider_dealing"},
        {"id": "sec_9a2", "article": "§9(a)(2)", "title": "Market Manipulation", "description": "Prohibition of transactions creating actual or apparent active trading to induce purchases or sales", "detection_pattern": "wash_trading"}
      ]
    }
  ]
}
```

**Step 4: Add EMIR and SEC compliance requirements**

Add to `workspace/metadata/standards/compliance_requirements.json` requirements array:
```json
{
  "requirement_id": "emir_9_reporting",
  "regulation": "EMIR",
  "article": "Art. 9",
  "requirement_text": "Report derivative contract details to trade repositories",
  "implementation": "entity_field",
  "implementation_id": "product.instrument_type",
  "evidence_type": "field_value",
  "validation_frequency": "daily",
  "status": "partial"
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
  "status": "implemented"
},
{
  "requirement_id": "sec_9a2_wash",
  "regulation": "SEC",
  "article": "§9(a)(2)",
  "requirement_text": "Detect transactions creating apparent active trading to manipulate price",
  "implementation": "detection_model",
  "implementation_id": "wash_full_day",
  "evidence_type": "alert_with_score",
  "validation_frequency": "real-time",
  "status": "implemented"
}
```

**Step 5: Run tests**

Run: `uv run pytest tests/test_standards_metadata.py -v`
Expected: ALL PASSED

**Step 6: Commit**

```bash
git add workspace/metadata/regulations/registry.json \
  workspace/metadata/standards/compliance_requirements.json \
  tests/test_standards_metadata.py
git commit -m "feat(metadata): EMIR + SEC regulations, article URLs, compliance requirements (M153)"
```

---

### Task 4: Stage 1 Checkpoint — Standards Foundation (M154)

**Context:** Verify all tests pass, update architecture registry, docs, and push.

**Files:**
- Modify: `frontend/src/data/architectureRegistry.ts` — update regulatory sections with new metadata sources
- Modify: `frontend/src/data/operationScripts.ts` — add standards operations to RegulatoryMap
- Modify: `docs/progress.md` — add M151-M154 milestones
- Modify: `docs/demo-guide.md` — add standards metadata demo talking points

**Step 1: Run full backend test suite**

Run: `uv run pytest tests/ --ignore=tests/e2e -v`
Expected: ~432 passed (421 + 11 new)

**Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: Clean build

**Step 3: Update architecture registry**

Update `frontend/src/data/architectureRegistry.ts`:
- Add `workspace/metadata/standards/iso_mapping.json`, `fix_protocol.json`, `compliance_requirements.json` to the `regulatory.summary-cards`, `regulatory.coverage-grid`, and `regulatory.traceability-graph` section metadata sources
- Note the new API endpoints in the registry entries

**Step 4: Update operation scripts**

Add operations to `frontend/src/data/operationScripts.ts` for RegulatoryMap view:
```typescript
{
  id: "view_iso_standards",
  label: "View ISO Standards",
  description: "Browse ISO standards registry (ISO 6166, 10383, 10962, 4217, 3166-1, 8601) with field mappings and validation rules",
  steps: ["Navigate to Governance > Regulatory Map", "The standards are used across entity field definitions"]
},
{
  id: "view_compliance_requirements",
  label: "View Compliance Requirements",
  description: "Browse granular compliance requirements mapped to detection models, calculations, and entity fields",
  steps: ["Each requirement links to its implementation (model, calc, or field)", "Status shows implemented, partial, or planned"]
}
```

**Step 5: Update progress.md with M151-M154**

**Step 6: Update demo-guide.md with new standards section**

**Step 7: Commit and push**

```bash
git add -A
git commit -m "docs: Stage 1 checkpoint — M151-M154 complete, standards metadata foundation"
git push
```

---

## Stage 2: Entity Compliance Enhancement (M155-M158)

### Task 5: Account Entity MiFID II Classification (M155)

**Context:** Account entity has `account_type` (institutional/retail/hedge_fund/market_maker) but lacks MiFID II client classification (retail/professional/eligible_counterparty) and compliance fields. Add compliance metadata fields to account entity definition.

**Files:**
- Modify: `workspace/metadata/entities/account.json`
- Modify: `scripts/generate_data.py` — add new fields to generated CSV
- Create: `tests/test_entity_compliance.py`

**Step 1: Write failing tests**

```python
# tests/test_entity_compliance.py
import pytest
from fastapi.testclient import TestClient
from backend.db import create_app

@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)

class TestAccountCompliance:
    """Tests for MiFID II compliance fields on account entity."""

    def test_account_has_mifid_classification(self, client):
        resp = client.get("/api/metadata/entities")
        account = next((e for e in resp.json() if e["entity_id"] == "account"), None)
        assert account is not None
        field_names = [f["name"] for f in account["fields"]]
        assert "mifid_client_category" in field_names

    def test_mifid_classification_has_domain_values(self, client):
        resp = client.get("/api/metadata/entities")
        account = next((e for e in resp.json() if e["entity_id"] == "account"), None)
        field = next((f for f in account["fields"] if f["name"] == "mifid_client_category"), None)
        assert field is not None
        assert "retail" in field["domain_values"]
        assert "professional" in field["domain_values"]
        assert "eligible_counterparty" in field["domain_values"]

    def test_account_has_compliance_status(self, client):
        resp = client.get("/api/metadata/entities")
        account = next((e for e in resp.json() if e["entity_id"] == "account"), None)
        field_names = [f["name"] for f in account["fields"]]
        assert "compliance_status" in field_names

    def test_account_compliance_fields_in_data(self, client):
        """Generated account data should include new compliance fields."""
        resp = client.post("/api/query/execute", json={"sql": "SELECT mifid_client_category, compliance_status FROM account LIMIT 5"})
        assert resp.status_code == 200
        assert len(resp.json()["rows"]) > 0
```

**Step 2: Run tests to verify they fail**

**Step 3: Update account.json with compliance fields**

Add to `workspace/metadata/entities/account.json` fields array:
```json
{
  "name": "mifid_client_category",
  "type": "string",
  "description": "MiFID II client classification per RTS 2 Annex II",
  "is_key": false,
  "nullable": true,
  "domain_values": ["retail", "professional", "eligible_counterparty"]
},
{
  "name": "compliance_status",
  "type": "string",
  "description": "Account compliance review status",
  "is_key": false,
  "nullable": true,
  "domain_values": ["active", "under_review", "restricted", "suspended"]
}
```

**Step 4: Update generate_data.py for new account fields**

Add MiFID classification assignment logic:
- institutional → professional
- retail → retail
- hedge_fund → professional
- market_maker → eligible_counterparty

Add compliance_status (most "active", some "under_review").

**Step 5: Regenerate data**

Run: `uv run python -m scripts.generate_data`

**Step 6: Run tests**

Run: `uv run pytest tests/test_entity_compliance.py -v`
Expected: ALL PASSED

**Step 7: Commit**

```bash
git commit -m "feat(metadata): MiFID II client classification + compliance status on account (M155)"
```

---

### Task 6: Product Entity Regulatory Jurisdiction (M156)

**Context:** Products trade on venues across jurisdictions but there's no per-product regulatory scope field. Add regulatory jurisdiction tagging.

**Files:**
- Modify: `workspace/metadata/entities/product.json`
- Modify: `scripts/generate_data.py`
- Modify: `tests/test_entity_compliance.py`

**Step 1: Write failing tests**

Add to `tests/test_entity_compliance.py`:
```python
class TestProductCompliance:

    def test_product_has_regulatory_scope(self, client):
        resp = client.get("/api/metadata/entities")
        product = next((e for e in resp.json() if e["entity_id"] == "product"), None)
        field_names = [f["name"] for f in product["fields"]]
        assert "regulatory_scope" in field_names

    def test_regulatory_scope_has_domain_values(self, client):
        resp = client.get("/api/metadata/entities")
        product = next((e for e in resp.json() if e["entity_id"] == "product"), None)
        field = next((f for f in product["fields"] if f["name"] == "regulatory_scope"), None)
        assert field is not None
        assert "EU" in field["domain_values"]
        assert "US" in field["domain_values"]

    def test_product_regulatory_scope_in_data(self, client):
        resp = client.post("/api/query/execute", json={"sql": "SELECT regulatory_scope FROM product LIMIT 5"})
        assert resp.status_code == 200
        for row in resp.json()["rows"]:
            assert row["regulatory_scope"] in ("EU", "US", "UK", "APAC", "MULTI")
```

**Step 2-6: Standard TDD cycle — add field to product.json, update generate_data.py, regenerate, test, commit**

```bash
git commit -m "feat(metadata): regulatory jurisdiction scope on product entity (M156)"
```

---

### Task 7: Detection Model Regulatory Coverage Enhancement (M157)

**Context:** With EMIR and SEC added to the registry, update detection models to reference these additional regulations where applicable.

**Files:**
- Modify: `workspace/metadata/detection_models/wash_full_day.json` — add SEC §9(a)(2)
- Modify: `workspace/metadata/detection_models/insider_dealing.json` — add SEC Rule 10b-5
- Modify: `workspace/metadata/detection_models/spoofing_layering.json` — already has Dodd-Frank
- Modify: `tests/test_entity_compliance.py` (or new tests)

**Step 1: Write failing tests**

```python
class TestDetectionModelRegulatoryCoverage:

    def test_wash_model_covers_sec(self, client):
        resp = client.get("/api/metadata/detection-models")
        wash = next((m for m in resp.json() if m["model_id"] == "wash_full_day"), None)
        regs = [rc["regulation"] for rc in wash["regulatory_coverage"]]
        assert "SEC" in regs

    def test_insider_model_covers_sec(self, client):
        resp = client.get("/api/metadata/detection-models")
        insider = next((m for m in resp.json() if m["model_id"] == "insider_dealing"), None)
        regs = [rc["regulation"] for rc in insider["regulatory_coverage"]]
        assert "SEC" in regs

    def test_all_models_have_at_least_two_jurisdictions(self, client):
        """Every model should reference at least EU and one other jurisdiction."""
        resp = client.get("/api/metadata/detection-models")
        for model in resp.json():
            jurisdictions = set()
            reg_resp = client.get("/api/metadata/regulatory/registry")
            reg_map = {r["name"]: r["jurisdiction"] for r in reg_resp.json()["regulations"]}
            for rc in model["regulatory_coverage"]:
                j = reg_map.get(rc["regulation"])
                if j:
                    jurisdictions.add(j)
            assert len(jurisdictions) >= 2, f"Model {model['model_id']} only covers {jurisdictions}"
```

**Step 2-6: Standard TDD cycle — add regulatory_coverage entries to detection model JSONs, test, commit**

```bash
git commit -m "feat(metadata): detection models cover SEC + multi-jurisdiction (M157)"
```

---

### Task 8: Stage 2 Checkpoint — Entity Compliance (M158)

Same pattern as Task 4: run full backend tests, build frontend, update architecture registry (account/product sections note compliance fields), update progress.md, demo-guide.md, commit + push.

```bash
git commit -m "docs: Stage 2 checkpoint — M155-M158 complete, entity compliance enhancement"
git push
```

---

## Stage 3: Grid Column & Filter Metadata (M159-M162)

### Task 9: Grid Column Definitions as Metadata (M159)

**Context:** AG Grid column definitions are hardcoded in 13 views. Create a metadata-driven grid column system starting with Data Manager (code-driven → mostly-metadata-driven).

**Files:**
- Create: `workspace/metadata/grids/data_manager.json`
- Create: `backend/models/grids.py`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/metadata.py`
- Modify: `frontend/src/views/DataManager/index.tsx`
- Create: `frontend/src/hooks/useGridColumns.ts`
- Create: `tests/test_grid_metadata.py`

**Step 1: Write failing tests**

```python
# tests/test_grid_metadata.py
import pytest
from fastapi.testclient import TestClient
from backend.db import create_app

@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)

class TestGridColumnMetadata:

    def test_grid_endpoint_returns_columns(self, client):
        resp = client.get("/api/metadata/grids/data_manager")
        assert resp.status_code == 200
        data = resp.json()
        assert "columns" in data
        assert len(data["columns"]) >= 2

    def test_column_has_required_fields(self, client):
        resp = client.get("/api/metadata/grids/data_manager")
        for col in resp.json()["columns"]:
            assert "field" in col
            assert "header_name" in col

    def test_nonexistent_view_returns_404(self, client):
        resp = client.get("/api/metadata/grids/nonexistent")
        assert resp.status_code == 404

    def test_data_grid_entity_columns(self, client):
        """Grid columns for entity-aware preview should derive from entity metadata."""
        resp = client.get("/api/metadata/grids/data_manager")
        data = resp.json()
        # Should have entity_link column
        assert any(c.get("entity_link") for c in data["columns"]) or len(data["columns"]) >= 2
```

**Step 2-7: Create grid metadata JSON, Pydantic models, service methods, API endpoint, frontend hook, refactor DataManager to use metadata columns with fallback**

The `useGridColumns(viewId)` hook fetches `/api/metadata/grids/{viewId}` and converts to AG Grid `ColDef[]`. Falls back to code-defined columns on error.

**Step 8: Commit**

```bash
git commit -m "feat(metadata): grid column definitions as metadata for Data Manager (M159)"
```

---

### Task 10: Alert Filter Schema as Metadata (M160)

**Context:** Alert filter fields (model, severity, asset_class, etc.) are hardcoded in `RiskCaseManager/index.tsx`. Make filter options metadata-driven.

**Files:**
- Create: `workspace/metadata/grids/alert_filters.json`
- Modify: `frontend/src/views/RiskCaseManager/index.tsx`
- Modify: `tests/test_grid_metadata.py`

**Step 1-6: Standard TDD cycle**

Create `alert_filters.json` with filterable fields, operators, and default values. Frontend loads filter config from API. Falls back to hardcoded filters on error.

**Step 7: Commit**

```bash
git commit -m "feat(metadata): alert filter schema as metadata configuration (M160)"
```

---

### Task 11: Related Orders & Market Data Column Metadata (M161)

**Context:** `RelatedOrders.tsx` has 20 hardcoded column definitions (11 execution + 9 order). Convert to entity-metadata-aware columns. Also add market data chart config as metadata in the detection model `alert_detail_layout`.

**Files:**
- Create: `workspace/metadata/grids/related_orders.json`
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/RelatedOrders.tsx`
- Modify: detection model JSON files — add `market_data_config` to `alert_detail_layout`
- Modify: `tests/test_grid_metadata.py`

**Step 1-6: Standard TDD cycle — execution/order columns from grid metadata, market data chart config from model metadata**

**Step 7: Commit**

```bash
git commit -m "feat(metadata): related orders grid + market data chart config as metadata (M161)"
```

---

### Task 12: Stage 3 Checkpoint — Grid Metadata (M162)

Run full backend tests, build frontend, update architecture registry:
- `data.tables-list` → mostly-metadata-driven
- `data.data-grid` → mostly-metadata-driven
- `alerts.filters` → mostly-metadata-driven
- `alerts.related-orders` → mostly-metadata-driven
- `alerts.market-data` → mostly-metadata-driven

Update progress.md, demo-guide.md, development-guidelines.md (Section 20: Grid Column Metadata Pattern).

```bash
git commit -m "docs: Stage 3 checkpoint — M159-M162 complete, grid column metadata"
git push
```

---

## Stage 4: View Configuration Metadata (M163-M166)

### Task 13: View Tabs as Metadata (M163)

**Context:** Entity Designer has hardcoded tabs ("Fields", "Relationships"). Model Composer has ("validation", "preview", "dependencies"). Make tab definitions metadata-configurable.

**Files:**
- Create: `workspace/metadata/view_config/entity_designer.json`
- Create: `workspace/metadata/view_config/model_composer.json`
- Create: `backend/models/view_config.py`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/metadata.py`
- Modify: `frontend/src/views/EntityDesigner/EntityDetail.tsx`
- Create: `tests/test_view_config.py`

**Step 1-6: Standard TDD cycle**

View config metadata structure:
```json
{
  "view_id": "entity_designer",
  "tabs": [
    {"id": "fields", "label": "Fields", "icon": "table", "default": true},
    {"id": "relationships", "label": "Relationships", "icon": "link"}
  ]
}
```

Frontend loads tabs from API, falls back to hardcoded.

**Step 7: Commit**

```bash
git commit -m "feat(metadata): view tab definitions as metadata (M163)"
```

---

### Task 14: Color Palettes & Badge Styling as Metadata (M164)

**Context:** Chart color palettes (COLORS array, ASSET_CLASS_COLORS), badge styling (layer variants, status variants, score variants), and graph node colors are hardcoded across 5+ components. Extract to a centralized theme metadata file.

**Files:**
- Create: `workspace/metadata/theme/palettes.json`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/metadata.py`
- Create: `frontend/src/hooks/useThemePalettes.ts`
- Modify: `frontend/src/views/Dashboard/index.tsx` — use palette from metadata
- Modify: `frontend/src/views/RegulatoryMap/index.tsx` — use node colors from metadata
- Create: `tests/test_view_config.py` (extend)

**Step 1-6: Standard TDD cycle**

Theme palette metadata:
```json
{
  "palette_id": "default",
  "chart_colors": ["#6366f1", "#22d3ee", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"],
  "asset_class_colors": {
    "equity": "#6366f1",
    "fx": "#22d3ee",
    "commodity": "#f59e0b",
    "index": "#ef4444",
    "fixed_income": "#10b981"
  },
  "layer_badge_variants": {
    "oob": "info",
    "user": "warning",
    "custom": "success"
  },
  "graph_node_colors": {
    "regulation": "#3b82f6",
    "article_covered": "#22c55e",
    "article_uncovered": "#ef4444",
    "detection_model": "#f97316",
    "calculation": "#a855f7"
  }
}
```

Frontend hook `useThemePalettes()` fetches and caches with module-level cache pattern (like `useFormatRules`).

**Step 7: Commit**

```bash
git commit -m "feat(metadata): color palettes and badge styling as metadata (M164)"
```

---

### Task 15: E2E Tests for View Config & Standards (M165)

**Files:**
- Modify: `tests/e2e/test_e2e_views.py`

Add test classes:
- `TestStandardsMetadata` — ISO, FIX, compliance API endpoints return data
- `TestGridColumnMetadata` — grid column API returns valid configs
- `TestViewConfigMetadata` — view tabs API returns configs
- `TestThemePalettes` — palette API returns colors

**Step 1-6: Write E2E tests, verify they pass**

**Step 7: Commit**

```bash
git commit -m "test(e2e): standards, grid columns, view config, palettes E2E tests (M165)"
```

---

### Task 16: Stage 4 Checkpoint — View Configuration (M166)

Run all tests, build frontend, update architecture registry:
- `entities.view-tabs` → mostly-metadata-driven
- All dashboard chart sections — note palette metadata source
- RegulatoryMap sections — note graph color metadata source

Update progress.md, demo-guide.md, development-guidelines.md (Section 21: View Config Metadata, Section 22: Theme Palette Metadata).

```bash
git commit -m "docs: Stage 4 checkpoint — M163-M166 complete, view config metadata"
git push
```

---

## Stage 5: Workflow & Template Metadata (M167-M170)

### Task 17: Submission Workflow States as Metadata (M167)

**Context:** Submission status transitions (draft → submitted → under_review → approved/rejected) are hardcoded in `Submissions/index.tsx`. Extract to metadata.

**Files:**
- Create: `workspace/metadata/workflows/submission.json`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/metadata.py`
- Modify: `frontend/src/views/Submissions/index.tsx`
- Create: `tests/test_workflow_metadata.py`

Workflow metadata structure:
```json
{
  "workflow_id": "submission",
  "states": [
    {"id": "draft", "label": "Draft", "badge_variant": "warning", "transitions": ["submitted"]},
    {"id": "submitted", "label": "Submitted", "badge_variant": "info", "transitions": ["under_review", "rejected"]},
    {"id": "under_review", "label": "Under Review", "badge_variant": "info", "transitions": ["approved", "rejected"]},
    {"id": "approved", "label": "Approved", "badge_variant": "success", "transitions": []},
    {"id": "rejected", "label": "Rejected", "badge_variant": "error", "transitions": ["draft"]}
  ]
}
```

**Step 1-6: Standard TDD cycle**

**Step 7: Commit**

```bash
git commit -m "feat(metadata): submission workflow states as metadata (M167)"
```

---

### Task 18: Demo Toolbar Checkpoints as Metadata (M168)

**Context:** Demo toolbar (Reset/Step/End buttons) has hardcoded checkpoint definitions. Move demo step descriptions to metadata.

**Files:**
- Create: `workspace/metadata/demo/checkpoints.json`
- Modify: `backend/services/metadata_service.py`
- Modify: `backend/api/metadata.py`
- Modify: `tests/test_workflow_metadata.py`

**Step 1-6: Standard TDD cycle**

**Step 7: Commit**

```bash
git commit -m "feat(metadata): demo toolbar checkpoints as metadata (M168)"
```

---

### Task 19: Tour Definitions → Metadata API (M169)

**Context:** Tour/scenario definitions are in TypeScript data files (`tourDefinitions.ts`, `scenarioDefinitions.ts`). While they act like metadata, they're compiled into the bundle. Create backend API endpoints that serve them, keeping the TS files as the primary source but making them accessible via metadata API for the `app.toolbar` section to become metadata-driven.

**Files:**
- Modify: `backend/api/metadata.py` — add `/api/metadata/tours` and `/api/metadata/scenarios` endpoints that return definitions
- Modify: `tests/test_workflow_metadata.py`

Note: This is a lightweight "serve existing data" task — the TS definitions remain the source of truth, but the metadata API exposes them for completeness.

**Step 1-6: Standard TDD cycle**

**Step 7: Commit**

```bash
git commit -m "feat(metadata): tour/scenario definitions accessible via metadata API (M169)"
```

---

### Task 20: Stage 5 Checkpoint — Workflows & Templates (M170)

Run all tests, build frontend, update architecture registry:
- `submissions.review-actions` → mostly-metadata-driven
- `app.demo-toolbar` → mostly-metadata-driven
- `app.toolbar` → mostly-metadata-driven
- `sql.chat-panel` (no change — stays mixed; chat UI is inherently code-driven)
- `models.ai-chat` (no change — stays mixed; chat UI is inherently code-driven)

Update progress.md, demo-guide.md.

```bash
git commit -m "docs: Stage 5 checkpoint — M167-M170 complete, workflow metadata"
git push
```

---

## Stage 6: Final Documentation & Architecture Audit (M171-M174)

### Task 21: BDD Scenarios for All New Features (M171)

**Files:**
- Modify: `docs/requirements/bdd-scenarios.md`

Add Gherkin scenarios for:
1. ISO standards registry — browse, validate, cross-reference entities
2. FIX protocol registry — field mappings, domain value alignment
3. Compliance requirements — implementation status, model references
4. Enhanced regulations — EMIR, SEC, multi-jurisdiction coverage
5. Account MiFID classification — client category assignment
6. Product regulatory scope — jurisdiction tagging
7. Grid column metadata — Data Manager entity-aware formatting
8. Alert filter metadata — configurable filter fields
9. View tab metadata — dynamic tab definitions
10. Color palette metadata — theme-driven chart colors
11. Submission workflow metadata — state transitions
12. Demo checkpoints metadata — configurable demo flow

**Step 1: Write BDD scenarios, commit**

```bash
git commit -m "docs(bdd): BDD scenarios for compliance & metadata phase 2 features (M171)"
```

---

### Task 22: Architecture Re-Audit (M172)

**Context:** Re-audit all 74 sections. Update `metadataMaturity` ratings based on actual changes made. Target: 85%+ metadata-driven.

**Files:**
- Modify: `frontend/src/data/architectureRegistry.ts`
- Modify: `docs/architecture-traceability.md`

**Expected conversions:**
| Section | Before | After |
|---------|--------|-------|
| entities.view-tabs | code-driven | mostly-metadata-driven |
| data.tables-list | code-driven | mostly-metadata-driven |
| data.data-grid | code-driven | mostly-metadata-driven |
| alerts.filters | code-driven | mostly-metadata-driven |
| alerts.market-data | code-driven | mostly-metadata-driven |
| alerts.related-orders | code-driven | mostly-metadata-driven |
| submissions.review-actions | mixed | mostly-metadata-driven |
| app.demo-toolbar | mixed | mostly-metadata-driven |
| app.toolbar | mixed | mostly-metadata-driven |

**Target metrics:**
- Before: 31 fully + 22 mostly = 53/74 = 71.6%
- After: 31 fully + 31 mostly = 62/74 = **83.8%** (some "mostly" may become "fully" during implementation)
- With fully upgrades: potentially **85%+**

```bash
git commit -m "docs(architecture): re-audit maturity ratings — phase 2 compliance overhaul (M172)"
```

---

### Task 23: Full Documentation Sweep (M173)

Update ALL project documentation:

**Files:**
- Modify: `CLAUDE.md` — update test counts, metadata types count, regulation count, entity field count
- Modify: `docs/progress.md` — add M151-M173 milestones, overall status table
- Modify: `docs/demo-guide.md` — add Act 9: Compliance & Standards
- Modify: `docs/development-guidelines.md` — add Section 20 (Grid Column Metadata), Section 21 (View Config), Section 22 (Theme Palettes), Section 23 (Workflow Metadata)
- Modify: `docs/feature-development-checklist.md` — add "When Adding a New Standard" trigger, update test counts
- Modify: `docs/architecture-traceability.md` — update maturity distribution
- Modify: auto-memory `MEMORY.md` — update current state

```bash
git commit -m "docs: complete documentation sweep — M173, compliance metadata overhaul complete"
```

---

### Task 24: Final Verification + Merge (M174)

**Step 1: Run full backend tests**

Run: `uv run pytest tests/ --ignore=tests/e2e -v`
Expected: ~460+ passed

**Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: Clean build

**Step 3: Push final commits**

```bash
git push
```

**Step 4: Create PR**

```bash
gh pr create --title "feat: compliance & metadata architecture overhaul phase 2 (M151-M174)" --body "$(cat <<'EOF'
## Summary
Phase 2 metadata architecture overhaul increasing metadata-driven percentage from 71.6% to 85%+.

**Key additions:**
- ISO standards registry (6 standards with validation rules)
- FIX protocol field registry (6 fields with domain values)
- Compliance requirements registry (14+ granular requirements)
- EMIR and SEC regulations (6 total frameworks)
- MiFID II client classification on accounts
- Product regulatory jurisdiction scope
- Grid column metadata (Data Manager, Related Orders, Alert Filters)
- View tab metadata, color palette metadata, workflow state metadata

## Test plan
- [ ] Backend tests: ~460+ passed
- [ ] Frontend build: clean
- [ ] E2E tests: pass in batches
- [ ] Visual verification via Playwright

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 5: Squash merge to main**

```bash
gh pr merge --squash --subject "feat: compliance & metadata architecture overhaul phase 2 (M151-M174)"
```

**Step 6: Cleanup**

```bash
git checkout main
git pull origin main
git branch -d feature/compliance-metadata-overhaul
```

---

## Quick Reference: Test Commands

```bash
# Backend tests
uv run pytest tests/ --ignore=tests/e2e -v

# Standards tests only
uv run pytest tests/test_standards_metadata.py -v

# Entity compliance tests only
uv run pytest tests/test_entity_compliance.py -v

# Grid metadata tests only
uv run pytest tests/test_grid_metadata.py -v

# View config tests only
uv run pytest tests/test_view_config.py -v

# Workflow metadata tests only
uv run pytest tests/test_workflow_metadata.py -v

# E2E Playwright tests
uv run pytest tests/e2e/ -v

# Frontend build
cd frontend && npm run build
```

---

## Milestone Summary

| Stage | Milestones | Key Deliverables | New Tests |
|-------|-----------|------------------|-----------|
| 1 | M151-M154 | ISO, FIX, compliance registries, EMIR + SEC | ~11 |
| 2 | M155-M158 | Account MiFID, product jurisdiction, model coverage | ~7 |
| 3 | M159-M162 | Grid columns, alert filters, related orders metadata | ~8 |
| 4 | M163-M166 | View tabs, color palettes, E2E tests | ~7 |
| 5 | M167-M170 | Workflows, demo checkpoints, tour API | ~6 |
| 6 | M171-M174 | BDD, re-audit, docs, merge | 0 |
| **Total** | **24 milestones** | **6 metadata types, 6 regulations, 9 section conversions** | **~39** |
