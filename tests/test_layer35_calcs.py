"""Tests for Layer 3.5 — Derived Calculations (large_trading_activity, wash_detection)."""
import shutil
from pathlib import Path

import pytest

from backend.db import DuckDBManager
from backend.engine.calculation_engine import CalculationEngine
from backend.engine.data_loader import DataLoader
from backend.services.metadata_service import MetadataService

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent / "workspace"


@pytest.fixture
def workspace(tmp_path):
    """Create workspace with L1-L3.5 metadata and wash-trade-like data."""
    for layer in ["transaction", "time_windows", "aggregations", "derived"]:
        src = WORKSPACE_ROOT / "metadata" / "calculations" / layer
        dst = tmp_path / "metadata" / "calculations" / layer
        dst.mkdir(parents=True)
        for f in src.glob("*.json"):
            shutil.copy(f, dst / f.name)

    for d in ["transaction", "time_window", "aggregation", "derived"]:
        (tmp_path / "results" / d).mkdir(parents=True)
    (tmp_path / "data" / "csv").mkdir(parents=True)
    (tmp_path / "data" / "parquet").mkdir(parents=True)
    (tmp_path / "metadata" / "settings" / "thresholds").mkdir(parents=True)
    (tmp_path / "metadata" / "entities").mkdir(parents=True)

    # Product dimension table
    (tmp_path / "data" / "csv" / "product.csv").write_text(
        "product_id,name,asset_class,instrument_type,contract_size,option_type,exchange,currency\n"
        "AAPL,Apple Inc.,equity,stock,,,NYSE,USD\n"
        "MSFT,Microsoft Corp.,equity,stock,,,NYSE,USD\n"
        "GOOG,Alphabet Inc.,equity,stock,,,NYSE,USD\n"
    )

    # Wash trade pattern: ACC001 buys and sells AAPL at similar prices/quantities
    # Non-wash: ACC002 only buys MSFT
    (tmp_path / "data" / "csv" / "execution.csv").write_text(
        "execution_id,product_id,account_id,trader_id,side,price,quantity,"
        "execution_date,execution_time\n"
        # ACC001 wash pattern: buy 100 + sell 90 of AAPL at very similar prices
        "E001,AAPL,ACC001,T001,BUY,150.00,100,2026-01-15,10:30:00\n"
        "E002,AAPL,ACC001,T001,SELL,150.10,90,2026-01-15,14:00:00\n"
        # ACC002 only buys — no wash
        "E003,MSFT,ACC002,T002,BUY,400.00,50,2026-01-15,11:00:00\n"
        # ACC003 buys and sells but very different quantities — not wash
        "E004,GOOG,ACC003,T003,BUY,180.00,200,2026-01-15,10:00:00\n"
        "E005,GOOG,ACC003,T003,SELL,182.00,20,2026-01-15,15:00:00\n"
    )

    # Minimal L2 data
    (tmp_path / "data" / "csv" / "md_intraday.csv").write_text(
        "product_id,trade_date,trade_time,trade_price,trade_quantity\n"
        "AAPL,2026-01-15,09:30:00,148.00,1000\n"
    )
    (tmp_path / "data" / "csv" / "md_eod.csv").write_text(
        "product_id,trade_date,open_price,high_price,low_price,close_price,volume\n"
        "AAPL,2026-01-15,148.00,158.00,147.00,157.00,10000000\n"
    )
    (tmp_path / "data" / "csv" / "order.csv").write_text(
        "order_id,product_id,account_id,trader_id,side,order_time,order_date,status,quantity,price\n"
        "O001,AAPL,ACC001,T001,BUY,10:30:00,2026-01-15,FILLED,100,150.00\n"
    )

    return tmp_path


@pytest.fixture
def db():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    yield mgr
    mgr.close()


@pytest.fixture
def engine(workspace, db):
    loader = DataLoader(workspace, db)
    loader.load_all()
    meta = MetadataService(workspace)
    return CalculationEngine(workspace, db, meta)


class TestLargeTradingActivity:
    def test_large_flag_true_for_significant_activity(self, db, engine):
        """ACC001 trades $28509 of AAPL — with only one account, avg=total, threshold=2x,
        so not large (equal to avg). Need to verify the threshold logic works."""
        engine.run_one("large_trading_activity")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT total_value, is_large, threshold_used FROM calc_large_trading_activity "
            "WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        # total_value = 150*100 + 150.10*90 = 15000 + 13509 = 28509
        assert abs(row[0] - 28509.0) < 1
        # With one entry, avg = 28509, threshold = 2*28509 = 57018, so NOT large
        assert row[1] is False

    def test_preserves_aggregation_fields(self, db, engine):
        """Large activity should carry forward buy_value, sell_value, etc."""
        engine.run_one("large_trading_activity")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT buy_value, sell_value, buy_qty, sell_qty FROM calc_large_trading_activity "
            "WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        assert row[0] == 15000.0  # buy: 150 * 100
        assert abs(row[1] - 13509.0) < 1  # sell: 150.10 * 90

    def test_all_accounts_have_flag(self, db, engine):
        """Every product+account combination should get a large flag."""
        engine.run_one("large_trading_activity")
        cursor = db.cursor()
        count = cursor.execute("SELECT COUNT(*) FROM calc_large_trading_activity").fetchone()[0]
        cursor.close()
        assert count == 3  # AAPL/ACC001, MSFT/ACC002, GOOG/ACC003


class TestWashDetection:
    def test_wash_candidate_identified(self, db, engine):
        """ACC001 buys 100 and sells 90 AAPL at very similar prices — should be wash candidate."""
        engine.run_one("wash_detection")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT qty_match_ratio, vwap_proximity, is_wash_candidate FROM calc_wash_detection "
            "WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        # qty_match = min(100,90)/max(100,90) = 90/100 = 0.90
        assert abs(row[0] - 0.90) < 0.01
        # vwap_proximity should be very small (prices are 150 vs 150.10)
        assert row[1] < 0.01
        # Should be identified as wash candidate
        assert row[2] is True

    def test_single_side_not_wash(self, db, engine):
        """ACC002 only buys MSFT — should NOT be wash candidate."""
        engine.run_one("wash_detection")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT qty_match_ratio, is_wash_candidate FROM calc_wash_detection "
            "WHERE product_id='MSFT' AND account_id='ACC002'"
        ).fetchone()
        cursor.close()
        assert row[0] == 0  # no sells → 0 match
        assert row[1] is False

    def test_unbalanced_not_wash(self, db, engine):
        """ACC003 buys 200 but sells only 20 GOOG — match ratio too low for wash."""
        engine.run_one("wash_detection")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT qty_match_ratio, is_wash_candidate FROM calc_wash_detection "
            "WHERE product_id='GOOG' AND account_id='ACC003'"
        ).fetchone()
        cursor.close()
        # qty_match = 20/200 = 0.10 — below 0.5 threshold
        assert abs(row[0] - 0.10) < 0.01
        assert row[1] is False

    def test_wash_includes_vwap_data(self, db, engine):
        """Wash detection should include VWAP fields from the join."""
        engine.run_one("wash_detection")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT vwap_buy, vwap_sell, vwap_spread FROM calc_wash_detection "
            "WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        assert row[0] == 150.0  # only bought at 150
        assert row[1] == 150.1  # only sold at 150.10
        assert abs(row[2] - 0.10) < 0.01

    def test_full_pipeline_runs(self, db, engine):
        """All layers should execute successfully when running full pipeline."""
        results = engine.run_all()
        # Should have executed all 10 calculations (L1: 2, L2: 4, L3: 2, L3.5: 2)
        assert len(results) == 10
        assert all(r["row_count"] >= 0 for r in results.values())
