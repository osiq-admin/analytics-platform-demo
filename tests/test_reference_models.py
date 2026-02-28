"""Tests for reference data / MDM Pydantic models."""
from backend.models.reference import (
    FieldProvenance,
    GoldenRecord,
    GoldenRecordSet,
    MatchRule,
    MergeRule,
    ExternalSource,
    ReferenceConfig,
    ReconciliationResult,
    CrossReference,
)


class TestGoldenRecord:
    def test_defaults(self):
        gr = GoldenRecord(golden_id="G001", entity="product", natural_key="ISIN")
        assert gr.data == {}
        assert gr.provenance == {}
        assert gr.source_records == []
        assert gr.confidence_score == 1.0
        assert gr.status == "active"
        assert gr.version == 1
        assert gr.notes == ""

    def test_with_all_fields(self):
        gr = GoldenRecord(
            golden_id="G002",
            entity="product",
            natural_key="US0378331005",
            data={"name": "Apple Inc", "cfi": "ESXXXX", "mic": "XNAS"},
            provenance={
                "name": FieldProvenance(
                    value="Apple Inc",
                    source="bloomberg",
                    confidence=0.99,
                    last_updated="2026-02-28T10:00:00Z",
                ),
            },
            source_records=["src_bloomberg_001", "src_reuters_001"],
            confidence_score=0.98,
            last_reconciled="2026-02-28T10:05:00Z",
            status="active",
            version=3,
            notes="Reconciled from 2 sources",
        )
        assert gr.data["cfi"] == "ESXXXX"
        assert gr.provenance["name"].source == "bloomberg"
        assert gr.provenance["name"].confidence == 0.99
        assert len(gr.source_records) == 2
        assert gr.version == 3

    def test_status_literals(self):
        for status in ("active", "pending_review", "superseded", "manual_override"):
            gr = GoldenRecord(
                golden_id="G003", entity="product", natural_key="ISIN", status=status
            )
            assert gr.status == status

    def test_provenance_tracking(self):
        prov = FieldProvenance(
            value=42.5, source="internal_feed", confidence=0.85, last_updated="2026-02-28"
        )
        assert prov.value == 42.5
        assert prov.confidence == 0.85

        gr = GoldenRecord(
            golden_id="G004",
            entity="execution",
            natural_key="exec_id",
            provenance={"price": prov},
        )
        assert gr.provenance["price"].source == "internal_feed"


class TestMatchRule:
    def test_exact_defaults(self):
        mr = MatchRule()
        assert mr.strategy == "exact"
        assert mr.fields == []
        assert mr.threshold == 1.0
        assert mr.weight == 1.0

    def test_fuzzy_with_threshold(self):
        mr = MatchRule(
            strategy="fuzzy",
            fields=["name", "address"],
            threshold=0.85,
            weight=0.6,
        )
        assert mr.strategy == "fuzzy"
        assert mr.threshold == 0.85
        assert len(mr.fields) == 2

    def test_composite_fields(self):
        mr = MatchRule(
            strategy="composite",
            fields=["isin", "mic", "currency"],
            threshold=0.9,
        )
        assert mr.strategy == "composite"
        assert len(mr.fields) == 3


class TestMergeRule:
    def test_default_strategy(self):
        mr = MergeRule(field="name")
        assert mr.strategy == "most_recent"
        assert mr.source_priority == []

    def test_source_priority_list(self):
        mr = MergeRule(
            field="price",
            strategy="source_priority",
            source_priority=["bloomberg", "reuters", "internal"],
        )
        assert mr.strategy == "source_priority"
        assert mr.source_priority[0] == "bloomberg"
        assert len(mr.source_priority) == 3


class TestReferenceConfig:
    def test_full_config_roundtrip(self):
        cfg = ReferenceConfig(
            entity="product",
            golden_key="isin",
            display_name="Product Master",
            description="Golden record config for products",
            match_rules=[
                MatchRule(strategy="exact", fields=["isin"]),
                MatchRule(strategy="fuzzy", fields=["name"], threshold=0.9),
            ],
            merge_rules=[
                MergeRule(field="name", strategy="source_priority",
                          source_priority=["bloomberg", "reuters"]),
                MergeRule(field="price", strategy="most_recent"),
            ],
            external_sources=[
                ExternalSource(
                    source_id="gleif",
                    field="lei",
                    validation_type="lookup",
                    description="LEI lookup via GLEIF API",
                ),
            ],
            auto_reconcile=False,
            reconciliation_schedule="daily",
        )
        # Roundtrip via dict
        data = cfg.model_dump()
        cfg2 = ReferenceConfig.model_validate(data)
        assert cfg2.entity == "product"
        assert len(cfg2.match_rules) == 2
        assert len(cfg2.merge_rules) == 2
        assert cfg2.external_sources[0].source_id == "gleif"
        assert cfg2.auto_reconcile is False
        assert cfg2.reconciliation_schedule == "daily"

    def test_external_sources(self):
        es = ExternalSource(
            source_id="iso_10383",
            field="mic",
            validation_type="cross_reference",
            description="MIC validation against ISO 10383",
        )
        assert es.validation_type == "cross_reference"
        cfg = ReferenceConfig(
            entity="venue",
            golden_key="mic",
            external_sources=[es],
        )
        assert len(cfg.external_sources) == 1
        assert cfg.external_sources[0].field == "mic"


class TestReconciliationResult:
    def test_defaults(self):
        rr = ReconciliationResult(entity="product")
        assert rr.total_source_records == 0
        assert rr.total_golden_records == 0
        assert rr.new_records == 0
        assert rr.updated_records == 0
        assert rr.conflicts == 0
        assert rr.unmatched == 0
        assert rr.confidence_distribution == {}
        assert rr.duration_ms == 0

    def test_confidence_distribution(self):
        rr = ReconciliationResult(
            entity="product",
            total_source_records=150,
            total_golden_records=50,
            new_records=5,
            updated_records=10,
            conflicts=3,
            unmatched=2,
            confidence_distribution={"high": 40, "medium": 8, "low": 2},
            timestamp="2026-02-28T12:00:00Z",
            duration_ms=450,
        )
        assert rr.total_source_records == 150
        assert rr.confidence_distribution["high"] == 40
        assert sum(rr.confidence_distribution.values()) == 50
        assert rr.duration_ms == 450
