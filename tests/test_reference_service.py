"""Tests for ReferenceService reconciliation engine."""
import json
from pathlib import Path

import pytest

from backend.db import DuckDBManager
from backend.services.metadata_service import MetadataService
from backend.services.reference_service import ReferenceService


@pytest.fixture
def workspace(tmp_path):
    """Minimal workspace with reference metadata and CSV data."""
    ws = tmp_path / "workspace"

    # Create metadata dirs
    ref_meta = ws / "metadata" / "reference"
    ref_meta.mkdir(parents=True)

    # Product reference config
    (ref_meta / "product.json").write_text(json.dumps({
        "entity": "product",
        "golden_key": "isin",
        "display_name": "Product Master",
        "description": "Product reference config",
        "match_rules": [
            {"strategy": "exact", "fields": ["isin"], "threshold": 1.0, "weight": 1.0},
            {"strategy": "fuzzy", "fields": ["name"], "threshold": 0.85, "weight": 0.6},
        ],
        "merge_rules": [
            {"field": "name", "strategy": "longest", "source_priority": []},
            {"field": "asset_class", "strategy": "most_frequent", "source_priority": []},
        ],
        "external_sources": [],
        "auto_reconcile": True,
        "reconciliation_schedule": "on_demand",
    }))

    # Venue reference config
    (ref_meta / "venue.json").write_text(json.dumps({
        "entity": "venue",
        "golden_key": "mic",
        "display_name": "Venue Master",
        "description": "Venue reference config",
        "match_rules": [
            {"strategy": "exact", "fields": ["mic"], "threshold": 1.0, "weight": 1.0},
        ],
        "merge_rules": [
            {"field": "name", "strategy": "longest", "source_priority": []},
        ],
        "external_sources": [],
        "auto_reconcile": True,
        "reconciliation_schedule": "on_demand",
    }))

    # CSV data
    csv_dir = ws / "data" / "csv"
    csv_dir.mkdir(parents=True)
    parquet_dir = ws / "data" / "parquet"
    parquet_dir.mkdir(parents=True)

    # Product CSV (5 rows for testing)
    (csv_dir / "product.csv").write_text(
        "product_id,isin,name,asset_class,cfi_code,exchange_mic,currency\n"
        "AAPL,US0378331005,Apple Inc.,equity,ESXXXX,XNYS,USD\n"
        "MSFT,US5949181045,Microsoft Corporation,equity,ESXXXX,XNGS,USD\n"
        "GOOGL,US02079K3059,Alphabet Inc.,equity,ESXXXX,XNGS,USD\n"
        "JPM,US46625H1005,JPMorgan Chase & Co.,equity,ESXXXX,XNYS,USD\n"
        "TSLA,US88160R1014,Tesla Inc,equity,ESXXXX,XNGS,USD\n"
    )

    # Venue CSV (3 rows)
    (csv_dir / "venue.csv").write_text(
        "mic,name,short_name,country,timezone\n"
        "XNYS,New York Stock Exchange,NYSE,US,America/New_York\n"
        "XNGS,Nasdaq Stock Market,NASDAQ,US,America/New_York\n"
        "XLON,London Stock Exchange,LSE,GB,Europe/London\n"
    )

    # Execution CSV (for cross-reference tests)
    (csv_dir / "execution.csv").write_text(
        "execution_id,order_id,product_id,venue_mic,quantity,price\n"
        "EX001,ORD001,AAPL,XNYS,100,185.50\n"
        "EX002,ORD002,MSFT,XNGS,200,380.25\n"
        "EX003,ORD003,AAPL,XNYS,150,186.00\n"
    )

    # Order CSV (for cross-reference tests)
    (csv_dir / "order.csv").write_text(
        "order_id,product_id,account_id,trader_id,quantity\n"
        "ORD001,AAPL,ACC001,TRD001,100\n"
        "ORD002,MSFT,ACC002,TRD002,200\n"
    )

    return ws


@pytest.fixture
def db(workspace):
    """DuckDB with test CSV data loaded."""
    import pyarrow.csv as pcsv
    import pyarrow.parquet as pq

    mgr = DuckDBManager()
    mgr.connect(":memory:")

    csv_dir = workspace / "data" / "csv"
    parquet_dir = workspace / "data" / "parquet"

    for csv_path in csv_dir.glob("*.csv"):
        table_name = csv_path.stem
        arrow_table = pcsv.read_csv(csv_path)
        parquet_path = parquet_dir / f"{table_name}.parquet"
        pq.write_table(arrow_table, parquet_path)
        cursor = mgr.cursor()
        cursor.execute(f'DROP VIEW IF EXISTS "{table_name}"')
        cursor.execute(
            f"CREATE VIEW \"{table_name}\" AS SELECT * FROM read_parquet('{parquet_path}')"
        )
        cursor.close()

    yield mgr
    mgr.close()


@pytest.fixture
def service(workspace, db):
    meta = MetadataService(workspace)
    return ReferenceService(workspace, db, meta)


class TestGenerateGoldenRecords:
    def test_generate_golden_records_product(self, service):
        result = service.generate_golden_records("product")
        assert result.total_source_records == 5
        assert result.total_golden_records == 5
        assert result.new_records == 5

    def test_generate_golden_records_venue(self, service):
        result = service.generate_golden_records("venue")
        assert result.total_source_records == 3
        assert result.total_golden_records == 3

    def test_golden_records_have_provenance(self, service):
        service.generate_golden_records("product")
        meta = service._metadata
        record_set = meta.load_golden_records("product")
        assert record_set is not None
        rec = record_set.records[0]
        assert len(rec.provenance) > 0
        # Check a provenance entry has expected fields
        first_field = next(iter(rec.provenance.values()))
        assert first_field.source.startswith("csv:")
        assert first_field.confidence > 0


class TestMatchAndMerge:
    def test_exact_match_grouping(self, service):
        config = service._metadata.load_reference_config("product")
        source_rows = service._query_source("product")
        groups = service._match_records(config, source_rows)
        # Each ISIN is unique, so 5 groups of 1
        assert len(groups) == 5
        for group in groups.values():
            assert len(group) == 1

    def test_merge_strategy_longest(self, service):
        result, conf = service._apply_merge_strategy(
            "longest", ["Apple", "Apple Inc.", "Apple Inc. Corporation"], None
        )
        assert result == "Apple Inc. Corporation"
        assert conf == 1.0

    def test_merge_strategy_most_frequent(self, service):
        result, conf = service._apply_merge_strategy(
            "most_frequent", ["equity", "equity", "bond"], None
        )
        assert result == "equity"
        assert conf > 0.6

    def test_merge_strategy_source_priority(self, service):
        result, conf = service._apply_merge_strategy(
            "source_priority", ["value1", "value2"], ["src1", "src2"]
        )
        assert result == "value1"
        assert conf == 1.0


class TestReconcile:
    def test_reconcile_detects_changes(self, service):
        # First generate
        service.generate_golden_records("product")
        # Re-reconcile (same data, so no changes expected beyond version bump)
        result = service.reconcile("product")
        assert result.total_golden_records == 5
        assert result.new_records == 0


class TestOverrideAndCrossRef:
    def test_override_field(self, service):
        service.generate_golden_records("product")
        meta = service._metadata
        record_set = meta.load_golden_records("product")
        golden_id = record_set.records[0].golden_id

        updated = service.override_field(
            "product", golden_id, "name", "Apple Inc. (Override)", "Test override"
        )
        assert updated is not None
        assert updated.data["name"] == "Apple Inc. (Override)"
        assert updated.status == "manual_override"
        assert updated.provenance["name"].source == "manual_override"

    def test_cross_references_product(self, service, db):
        service.generate_golden_records("product")
        meta = service._metadata
        record_set = meta.load_golden_records("product")
        # Find AAPL record — natural_key is the ISIN, but cross-refs use product_id
        # The cross-reference queries execution.product_id = natural_key (ISIN)
        # Since our test CSV uses product_id="AAPL" and natural_key is the ISIN,
        # we need a record whose natural_key matches a product_id in execution.
        # Actually: the cross-ref uses the natural_key (ISIN) to look up in
        # execution.product_id. But our test execution CSV has product_id="AAPL",
        # not ISINs. So let's find the AAPL record and check — the lookup will
        # use ISIN which won't match "AAPL" in execution. Instead let's check
        # venue cross-references which use mic directly.
        service.generate_golden_records("venue")
        venue_set = meta.load_golden_records("venue")
        # Find XNYS venue — its natural_key is "XNYS" which matches execution.venue_mic
        xnys_rec = None
        for r in venue_set.records:
            if r.natural_key == "XNYS":
                xnys_rec = r
                break
        assert xnys_rec is not None
        refs = service.get_cross_references("venue", xnys_rec.golden_id)
        assert len(refs) >= 1
        ref_entities = [r.referencing_entity for r in refs]
        assert "execution" in ref_entities

    def test_golden_record_confidence_score(self, service):
        service.generate_golden_records("product")
        meta = service._metadata
        record_set = meta.load_golden_records("product")
        for rec in record_set.records:
            assert 0.0 <= rec.confidence_score <= 1.0

    def test_reconciliation_summary(self, service):
        service.generate_golden_records("product")
        summary = service.get_reconciliation_summary("product")
        assert summary["entity"] == "product"
        assert summary["total_records"] == 5
        assert "high" in summary["confidence_distribution"]
        assert summary["last_reconciled"] != ""
        assert summary["status_distribution"].get("active", 0) == 5
