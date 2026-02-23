"""Tests for Layer 3 — Aggregation Calculations (trading_activity, vwap)."""
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
    """Create workspace with L1 + L2 + L3 metadata and test data."""
    for layer in ["transaction", "time_windows", "aggregations"]:
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

    # Execution data: ACC001 buys and sells AAPL (wash-like pattern)
    (tmp_path / "data" / "csv" / "execution.csv").write_text(
        "execution_id,order_id,product_id,account_id,trader_id,side,price,quantity,"
        "instrument_type,asset_class,execution_date,execution_time,option_type,contract_size\n"
        "E001,O001,AAPL,ACC001,T001,BUY,150.00,100,stock,equity,2026-01-15,10:30:00,,\n"
        "E002,O002,AAPL,ACC001,T001,SELL,151.00,80,stock,equity,2026-01-15,14:00:00,,\n"
        "E003,O003,AAPL,ACC001,T001,BUY,150.50,50,stock,equity,2026-01-15,11:00:00,,\n"
        "E004,O004,MSFT,ACC002,T002,BUY,400.00,30,stock,equity,2026-01-15,10:00:00,,\n"
    )

    # Need intraday/eod/order data for L2 calcs (they run too)
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


class TestTradingActivity:
    def test_aggregates_buy_sell_values(self, db, engine):
        """Should separate buy and sell values for AAPL/ACC001."""
        engine.run_one("trading_activity_aggregation")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT buy_value, sell_value, net_value FROM calc_trading_activity "
            "WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        # BUY: 150*100 + 150.50*50 = 15000 + 7525 = 22525
        # SELL: 151*80 = 12080
        assert row[0] == 22525.0
        assert row[1] == 12080.0
        # NET: 22525 - 12080 = 10445
        assert row[2] == 10445.0

    def test_aggregates_quantities(self, db, engine):
        """Should sum buy and sell quantities."""
        engine.run_one("trading_activity_aggregation")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT buy_qty, sell_qty, total_trades FROM calc_trading_activity "
            "WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        assert row[0] == 150.0  # 100 + 50
        assert row[1] == 80.0
        assert row[2] == 3  # 3 executions

    def test_same_side_pct(self, db, engine):
        """same_side_pct = max(buy_count, sell_count) / total_count."""
        engine.run_one("trading_activity_aggregation")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT same_side_pct FROM calc_trading_activity "
            "WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        # 2 buys, 1 sell → max=2, total=3 → 0.6667
        assert abs(row[0] - 0.6667) < 0.001

    def test_single_side_account(self, db, engine):
        """ACC002 only buys MSFT — sell_value should be 0."""
        engine.run_one("trading_activity_aggregation")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT buy_value, sell_value, total_trades FROM calc_trading_activity "
            "WHERE product_id='MSFT' AND account_id='ACC002'"
        ).fetchone()
        cursor.close()
        assert row[0] == 12000.0  # 400 * 30
        assert row[1] == 0
        assert row[2] == 1

    def test_groups_by_business_date(self, db, engine):
        """All trades on 2026-01-15 before cutoff should be same business date."""
        engine.run_one("trading_activity_aggregation")
        cursor = db.cursor()
        rows = cursor.execute(
            "SELECT DISTINCT business_date FROM calc_trading_activity WHERE product_id='AAPL'"
        ).fetchall()
        cursor.close()
        assert len(rows) == 1


class TestVWAP:
    def test_vwap_buy(self, db, engine):
        """VWAP buy for ACC001/AAPL: (150*100 + 150.50*50) / (100+50) = 22525/150 = 150.1667."""
        engine.run_one("vwap_calc")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT vwap_buy FROM calc_vwap WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        assert abs(row[0] - 150.1667) < 0.01

    def test_vwap_sell(self, db, engine):
        """VWAP sell for ACC001/AAPL: (151*80) / 80 = 151.0."""
        engine.run_one("vwap_calc")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT vwap_sell FROM calc_vwap WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        assert row[0] == 151.0

    def test_vwap_spread(self, db, engine):
        """Spread = |vwap_buy - vwap_sell| = |150.1667 - 151.0| ≈ 0.8333."""
        engine.run_one("vwap_calc")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT vwap_spread FROM calc_vwap WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        assert abs(row[0] - 0.8333) < 0.01

    def test_vwap_proximity(self, db, engine):
        """VWAP proximity = spread / avg(vwap_buy, vwap_sell) — should be small for wash-like trades."""
        engine.run_one("vwap_calc")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT vwap_proximity FROM calc_vwap WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchone()
        cursor.close()
        # proximity = 0.8333 / ((150.1667 + 151) / 2) ≈ 0.0055
        assert row[0] is not None
        assert row[0] < 0.01

    def test_vwap_null_when_single_side(self, db, engine):
        """When only buys exist, vwap_proximity should be NULL."""
        engine.run_one("vwap_calc")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT vwap_sell, vwap_proximity FROM calc_vwap WHERE product_id='MSFT' AND account_id='ACC002'"
        ).fetchone()
        cursor.close()
        assert row[0] is None  # no sells → null vwap_sell
        assert row[1] is None  # can't compute proximity
