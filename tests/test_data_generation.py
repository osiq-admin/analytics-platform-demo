"""Tests for synthetic data generation."""
import csv
import json
from datetime import date
from pathlib import Path

import pytest

from scripts.generate_data import SyntheticDataGenerator, _get_trading_days


@pytest.fixture
def workspace(tmp_path):
    """Create a temporary workspace for data generation."""
    ws = tmp_path / "workspace"
    ws.mkdir()
    (ws / "data" / "csv").mkdir(parents=True)
    (ws / "metadata" / "entities").mkdir(parents=True)
    return ws


@pytest.fixture
def generator(workspace):
    """Create a generator with default seed."""
    return SyntheticDataGenerator(workspace, seed=42)


@pytest.fixture
def generated_data(generator):
    """Generate data and return counts."""
    return generator.generate_all()


class TestTradingDays:
    def test_weekdays_only(self):
        days = _get_trading_days(date(2024, 1, 1), date(2024, 1, 7))
        for d in days:
            assert d.weekday() < 5, f"{d} is a weekend"

    def test_date_range(self):
        days = _get_trading_days(date(2024, 1, 2), date(2024, 2, 29))
        assert days[0] == date(2024, 1, 2)
        assert days[-1] == date(2024, 2, 29)
        assert len(days) >= 40  # ~42 trading days in Jan-Feb 2024


class TestDataGeneration:
    def test_generates_all_csv_files(self, workspace, generated_data):
        csv_dir = workspace / "data" / "csv"
        assert (csv_dir / "execution.csv").exists()
        assert (csv_dir / "order.csv").exists()
        assert (csv_dir / "md_intraday.csv").exists()
        assert (csv_dir / "md_eod.csv").exists()

    def test_generates_entity_definitions(self, workspace, generated_data):
        ent_dir = workspace / "metadata" / "entities"
        assert (ent_dir / "execution.json").exists()
        assert (ent_dir / "order.json").exists()
        assert (ent_dir / "md_intraday.json").exists()
        assert (ent_dir / "md_eod.json").exists()

    def test_execution_row_counts(self, generated_data):
        assert generated_data["execution"] > 400, "Should have hundreds of executions"

    def test_order_row_counts(self, generated_data):
        assert generated_data["order"] > 400, "Should have hundreds of orders"

    def test_eod_data_covers_all_products(self, workspace, generator, generated_data):
        # Read back the CSV
        rows = _read_csv(workspace / "data" / "csv" / "md_eod.csv")
        product_ids = {r["product_id"] for r in rows}
        assert len(product_ids) == 50, f"Expected 50 products in EOD, got {len(product_ids)}"

    def test_intraday_data_exists(self, generated_data):
        assert generated_data["md_intraday"] > 1000, "Should have thousands of intraday rows"

    def test_deterministic_output(self, workspace):
        """Same seed produces same output."""
        gen1 = SyntheticDataGenerator(workspace, seed=42)
        counts1 = gen1.generate_all()

        gen2 = SyntheticDataGenerator(workspace, seed=42)
        counts2 = gen2.generate_all()

        assert counts1 == counts2


class TestProductSchema:
    def test_product_csv_generated(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "product.csv")
        assert len(rows) == 50  # 25 equities + 6 FX + 8 commodities + 6 options + 5 futures

    def test_product_columns(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "product.csv")
        expected_cols = {
            "product_id", "isin", "sedol", "ticker", "name", "asset_class",
            "instrument_type", "cfi_code", "underlying_product_id",
            "contract_size", "strike_price", "expiry_date", "exchange_mic",
            "currency", "tick_size", "lot_size", "base_price",
        }
        assert set(rows[0].keys()) == expected_cols

    def test_product_instrument_types(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "product.csv")
        types = {r["instrument_type"] for r in rows}
        assert "common_stock" in types
        assert "call_option" in types
        assert "put_option" in types
        assert "future" in types
        assert "spot" in types

    def test_product_asset_classes(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "product.csv")
        classes = {r["asset_class"] for r in rows}
        assert "equity" in classes
        assert "fx" in classes
        assert "commodity" in classes
        assert "index" in classes
        assert "fixed_income" in classes

    def test_product_exchanges(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "product.csv")
        exchanges = {r["exchange_mic"] for r in rows}
        assert "XNYS" in exchanges
        assert "XNAS" in exchanges
        assert "XXXX" in exchanges
        assert "XCME" in exchanges
        assert "XCBO" in exchanges


class TestExecutionSchema:
    def test_execution_columns(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")
        assert len(rows) > 0
        expected_cols = {
            "execution_id", "product_id", "account_id", "trader_id", "side",
            "price", "quantity", "execution_date", "execution_time",
        }
        assert set(rows[0].keys()) == expected_cols

    def test_execution_no_product_fields(self, workspace, generated_data):
        """Execution CSV should NOT have product-level fields (normalized to product table)."""
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")
        for col in ["instrument_type", "asset_class", "contract_size", "option_type"]:
            assert col not in rows[0].keys(), f"{col} should not be in execution.csv"

    def test_execution_sides(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")
        sides = {r["side"] for r in rows}
        assert sides == {"BUY", "SELL"}

    def test_unique_execution_ids(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")
        ids = [r["execution_id"] for r in rows]
        assert len(ids) == len(set(ids)), "Duplicate execution IDs found"


class TestOrderSchema:
    def test_order_columns(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "order.csv")
        expected_cols = {"order_id", "product_id", "account_id", "side",
                         "order_time", "status", "quantity", "order_date"}
        assert set(rows[0].keys()) == expected_cols

    def test_order_statuses(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "order.csv")
        statuses = {r["status"] for r in rows}
        assert "FILLED" in statuses
        assert "CANCELLED" in statuses, "Spoofing patterns should create CANCELLED orders"


class TestWashPatterns:
    def test_wash_trading_accounts_exist(self, workspace, generated_data):
        """Verify wash trading pattern accounts have both buy and sell."""
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")

        # ACC-101 should have both BUY and SELL for AAPL on Jan 15
        acc101_aapl = [r for r in rows
                       if r["account_id"] == "ACC-101"
                       and r["product_id"] == "AAPL"
                       and r["execution_date"] == "2024-01-15"]
        sides = {r["side"] for r in acc101_aapl}
        assert sides == {"BUY", "SELL"}, "Wash pattern ACC-101/AAPL should have both sides"

    def test_wash_quantity_match(self, workspace, generated_data):
        """Verify wash pattern has high quantity match ratio."""
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")

        acc101_aapl = [r for r in rows
                       if r["account_id"] == "ACC-101"
                       and r["product_id"] == "AAPL"
                       and r["execution_date"] == "2024-01-15"]

        buy_qty = sum(float(r["quantity"]) for r in acc101_aapl if r["side"] == "BUY")
        sell_qty = sum(float(r["quantity"]) for r in acc101_aapl if r["side"] == "SELL")
        ratio = min(buy_qty, sell_qty) / max(buy_qty, sell_qty)
        assert ratio > 0.95, f"Wash pattern qty match ratio {ratio} should be > 0.95"

    def test_wash_vwap_proximity(self, workspace, generated_data):
        """Verify wash pattern has close buy/sell VWAPs."""
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")

        acc101_aapl = [r for r in rows
                       if r["account_id"] == "ACC-101"
                       and r["product_id"] == "AAPL"
                       and r["execution_date"] == "2024-01-15"]

        buy_total = sum(float(r["price"]) * float(r["quantity"]) for r in acc101_aapl if r["side"] == "BUY")
        buy_qty = sum(float(r["quantity"]) for r in acc101_aapl if r["side"] == "BUY")
        sell_total = sum(float(r["price"]) * float(r["quantity"]) for r in acc101_aapl if r["side"] == "SELL")
        sell_qty = sum(float(r["quantity"]) for r in acc101_aapl if r["side"] == "SELL")

        vwap_buy = buy_total / buy_qty
        vwap_sell = sell_total / sell_qty
        avg_vwap = (vwap_buy + vwap_sell) / 2
        proximity = abs(vwap_buy - vwap_sell) / avg_vwap
        assert proximity < 0.005, f"VWAP proximity {proximity} should be < 0.005"


class TestMPRPatterns:
    def test_mpr_trend_day_exists(self, workspace, generated_data):
        """Verify trend data exists for MPR pattern dates."""
        rows = _read_csv(workspace / "data" / "csv" / "md_intraday.csv")

        googl_jan18 = [r for r in rows
                       if r["product_id"] == "GOOGL"
                       and r["trade_date"] == "2024-01-18"]
        assert len(googl_jan18) >= 20, "Trend day should have sufficient intraday data"

        prices = [float(r["trade_price"]) for r in googl_jan18]
        # Prices should trend up
        assert prices[-1] > prices[0], "GOOGL Jan 18 should show uptrend"

    def test_mpr_trading_exists(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")
        acc111_googl = [r for r in rows
                        if r["account_id"] == "ACC-111"
                        and r["product_id"] == "GOOGL"
                        and r["execution_date"] == "2024-01-18"]
        assert len(acc111_googl) >= 8, "MPR pattern should have 8+ trades"

        buy_count = sum(1 for r in acc111_googl if r["side"] == "BUY")
        assert buy_count >= 7, "MPR pattern should be mostly same-side"


class TestInsiderPatterns:
    def test_insider_market_event(self, workspace, generated_data):
        """Verify market event exists on the event date."""
        rows = _read_csv(workspace / "data" / "csv" / "md_eod.csv")

        # AMZN should have >5% price change on Jan 25
        amzn_rows = {r["trade_date"]: float(r["close_price"])
                     for r in rows if r["product_id"] == "AMZN"}
        assert "2024-01-25" in amzn_rows
        assert "2024-01-24" in amzn_rows
        change = (amzn_rows["2024-01-25"] - amzn_rows["2024-01-24"]) / amzn_rows["2024-01-24"]
        assert change > 0.05, f"AMZN should have >5% surge, got {change:.2%}"

    def test_insider_pre_event_trading(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")
        acc121_amzn = [r for r in rows
                       if r["account_id"] == "ACC-121"
                       and r["product_id"] == "AMZN"
                       and r["execution_date"] == "2024-01-22"]
        assert len(acc121_amzn) >= 3, "Insider pattern should have pre-event trades"
        total_qty = sum(float(r["quantity"]) for r in acc121_amzn)
        assert total_qty >= 500, "Insider pattern should have significant quantity"


class TestSpoofingPatterns:
    def test_spoofing_cancelled_orders(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "order.csv")

        # ACC-131 should have 4+ cancelled BUY orders for JPM on Jan 10
        cancelled = [r for r in rows
                     if r["account_id"] == "ACC-131"
                     and r["product_id"] == "JPM"
                     and r["order_date"] == "2024-01-10"
                     and r["status"] == "CANCELLED"]
        assert len(cancelled) >= 4, f"Expected 4+ cancelled orders, got {len(cancelled)}"

    def test_spoofing_opposite_execution(self, workspace, generated_data):
        rows = _read_csv(workspace / "data" / "csv" / "execution.csv")

        # ACC-131 should have SELL execution for JPM on Jan 10
        sells = [r for r in rows
                 if r["account_id"] == "ACC-131"
                 and r["product_id"] == "JPM"
                 and r["execution_date"] == "2024-01-10"
                 and r["side"] == "SELL"]
        assert len(sells) >= 1, "Spoofing pattern should have opposite-side execution"


class TestEntityDefinitions:
    def test_execution_entity_valid(self, workspace, generated_data):
        path = workspace / "metadata" / "entities" / "execution.json"
        entity = json.loads(path.read_text())
        assert entity["entity_id"] == "execution"
        field_names = {f["name"] for f in entity["fields"]}
        assert "execution_id" in field_names
        assert "product_id" in field_names
        assert "price" in field_names

    def test_order_entity_valid(self, workspace, generated_data):
        path = workspace / "metadata" / "entities" / "order.json"
        entity = json.loads(path.read_text())
        assert entity["entity_id"] == "order"
        field_names = {f["name"] for f in entity["fields"]}
        assert "order_id" in field_names
        assert "status" in field_names

    def test_entity_definitions_loadable(self, workspace, generated_data):
        """Verify entity definitions are valid JSON matching EntityDefinition schema."""
        for name in ["execution", "order", "md_intraday", "md_eod"]:
            path = workspace / "metadata" / "entities" / f"{name}.json"
            entity = json.loads(path.read_text())
            assert "entity_id" in entity
            assert "fields" in entity
            assert len(entity["fields"]) > 0


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _read_csv(path: Path) -> list[dict]:
    with open(path) as f:
        return list(csv.DictReader(f))
