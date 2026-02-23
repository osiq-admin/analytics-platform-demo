"""Tests for Layer 2 — Time Window Calculations."""
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
    """Create workspace with L1 + L2 metadata and test data."""
    # Copy calculation metadata (L1 + L2)
    for layer in ["transaction", "time_windows"]:
        src = WORKSPACE_ROOT / "metadata" / "calculations" / layer
        dst = tmp_path / "metadata" / "calculations" / layer
        dst.mkdir(parents=True)
        for f in src.glob("*.json"):
            shutil.copy(f, dst / f.name)

    # Create results directories
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
    )

    # Execution data (product fields now in product.csv)
    (tmp_path / "data" / "csv" / "execution.csv").write_text(
        "execution_id,product_id,account_id,trader_id,side,price,quantity,"
        "execution_date,execution_time\n"
        "E001,AAPL,ACC001,T001,BUY,150.00,100,2026-01-15,10:30:00\n"
        "E002,AAPL,ACC001,T001,SELL,151.00,80,2026-01-15,14:00:00\n"
        "E003,AAPL,ACC001,T001,BUY,152.00,50,2026-01-15,18:00:00\n"
    )

    # Intraday market data (for trend window)
    (tmp_path / "data" / "csv" / "md_intraday.csv").write_text(
        "product_id,trade_date,trade_time,trade_price,trade_quantity\n"
        "AAPL,2026-01-15,09:30:00,148.00,1000\n"
        "AAPL,2026-01-15,10:00:00,149.50,800\n"
        "AAPL,2026-01-15,11:00:00,151.00,1200\n"
        "AAPL,2026-01-15,12:00:00,153.00,600\n"
        "AAPL,2026-01-15,13:00:00,155.50,900\n"
        "AAPL,2026-01-15,14:00:00,157.00,1100\n"
        "AAPL,2026-01-15,15:00:00,158.00,700\n"
        "MSFT,2026-01-15,09:30:00,400.00,500\n"
        "MSFT,2026-01-15,12:00:00,400.50,400\n"
        "MSFT,2026-01-15,15:00:00,400.20,300\n"
    )

    # EOD market data (for market event window)
    (tmp_path / "data" / "csv" / "md_eod.csv").write_text(
        "product_id,trade_date,open_price,high_price,low_price,close_price,volume\n"
        "AAPL,2026-01-10,140.00,141.00,139.50,140.50,5000000\n"
        "AAPL,2026-01-11,140.50,141.50,140.00,141.00,5200000\n"
        "AAPL,2026-01-12,141.00,142.00,140.50,141.50,4800000\n"
        "AAPL,2026-01-13,141.50,142.50,141.00,142.00,5100000\n"
        "AAPL,2026-01-14,142.00,143.00,141.50,142.50,5000000\n"
        "AAPL,2026-01-15,142.50,160.00,142.00,158.00,15000000\n"
    )

    # Order data (for cancellation pattern)
    (tmp_path / "data" / "csv" / "order.csv").write_text(
        "order_id,product_id,account_id,trader_id,side,order_time,order_date,status,quantity,price\n"
        "O010,AAPL,ACC003,T003,BUY,10:00:00,2026-01-15,CANCELLED,100,150.00\n"
        "O011,AAPL,ACC003,T003,BUY,10:00:05,2026-01-15,CANCELLED,200,150.10\n"
        "O012,AAPL,ACC003,T003,BUY,10:00:10,2026-01-15,CANCELLED,150,150.05\n"
        "O013,AAPL,ACC003,T003,BUY,10:00:15,2026-01-15,CANCELLED,100,150.15\n"
        "O014,AAPL,ACC003,T003,SELL,10:00:20,2026-01-15,FILLED,500,150.20\n"
        "O020,MSFT,ACC004,T004,SELL,11:00:00,2026-01-15,CANCELLED,50,400.00\n"
        "O021,MSFT,ACC004,T004,BUY,11:00:10,2026-01-15,FILLED,100,399.50\n"
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


class TestBusinessDateWindow:
    def test_normal_hours_same_business_date(self, db, engine):
        """Executions before 17:00 get same-day business date."""
        engine.run_one("business_date_window")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT business_date FROM calc_business_date_window WHERE execution_id='E001'"
        ).fetchone()
        cursor.close()
        assert str(row[0]) == "2026-01-15"

    def test_after_cutoff_rolls_to_next_day(self, db, engine):
        """Executions after 17:00 roll to next business date."""
        engine.run_one("business_date_window")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT business_date FROM calc_business_date_window WHERE execution_id='E003'"
        ).fetchone()
        cursor.close()
        assert str(row[0]) == "2026-01-16"

    def test_preserves_adjusted_direction(self, db, engine):
        """Business date window result should carry forward adjusted_side from L1."""
        engine.run_one("business_date_window")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT adjusted_side FROM calc_business_date_window WHERE execution_id='E001'"
        ).fetchone()
        cursor.close()
        assert row[0] == "BUY"

    def test_all_executions_have_business_dates(self, db, engine):
        engine.run_one("business_date_window")
        cursor = db.cursor()
        count = cursor.execute("SELECT COUNT(*) FROM calc_business_date_window").fetchone()[0]
        cursor.close()
        assert count == 3


class TestTrendWindow:
    def test_detects_uptrend(self, db, engine):
        """AAPL has a clear uptrend (148→158), should be detected."""
        engine.run_one("trend_window")
        cursor = db.cursor()
        rows = cursor.execute(
            "SELECT trend_type, price_change_pct FROM calc_trend_window WHERE product_id='AAPL'"
        ).fetchall()
        cursor.close()
        assert len(rows) >= 1
        assert rows[0][0] == "up"
        assert rows[0][1] > 0

    def test_no_trend_for_flat_stock(self, db, engine):
        """MSFT is flat (400→400.20), should NOT detect a trend."""
        engine.run_one("trend_window")
        cursor = db.cursor()
        rows = cursor.execute(
            "SELECT * FROM calc_trend_window WHERE product_id='MSFT'"
        ).fetchall()
        cursor.close()
        assert len(rows) == 0

    def test_trend_has_window_bounds(self, db, engine):
        """Detected trends should have window_start and window_end."""
        engine.run_one("trend_window")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT window_start, window_end FROM calc_trend_window WHERE product_id='AAPL'"
        ).fetchone()
        cursor.close()
        assert row[0] is not None
        assert row[1] is not None


class TestMarketEventWindow:
    def test_detects_price_surge(self, db, engine):
        """AAPL jumps from 142.50 to 158.00 (~10.9%), should detect a price surge."""
        engine.run_one("market_event_window")
        cursor = db.cursor()
        rows = cursor.execute(
            "SELECT event_type, price_change_pct FROM calc_market_event_window WHERE product_id='AAPL'"
        ).fetchall()
        cursor.close()
        assert len(rows) >= 1
        # Should be a price_surge
        event_types = [r[0] for r in rows]
        assert "price_surge" in event_types

    def test_event_has_lookback_window(self, db, engine):
        """Market events should have lookback_start and lookforward_end."""
        engine.run_one("market_event_window")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT lookback_start, lookforward_end FROM calc_market_event_window LIMIT 1"
        ).fetchone()
        cursor.close()
        assert row[0] is not None
        assert row[1] is not None


class TestCancellationPattern:
    def test_detects_cancellation_cluster(self, db, engine):
        """ACC003 has 4 cancellations for AAPL on same side, should detect a pattern."""
        engine.run_one("cancellation_pattern")
        cursor = db.cursor()
        rows = cursor.execute(
            "SELECT cancel_count, pattern_side FROM calc_cancellation_pattern "
            "WHERE product_id='AAPL' AND account_id='ACC003'"
        ).fetchall()
        cursor.close()
        assert len(rows) == 1
        assert rows[0][0] == 4  # 4 cancelled orders
        assert rows[0][1] == "BUY"

    def test_no_pattern_below_threshold(self, db, engine):
        """ACC004 has only 1 cancellation, should NOT trigger a pattern."""
        engine.run_one("cancellation_pattern")
        cursor = db.cursor()
        rows = cursor.execute(
            "SELECT * FROM calc_cancellation_pattern WHERE account_id='ACC004'"
        ).fetchall()
        cursor.close()
        assert len(rows) == 0

    def test_pattern_has_window(self, db, engine):
        """Cancellation patterns should have time window bounds."""
        engine.run_one("cancellation_pattern")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT window_start, window_end FROM calc_cancellation_pattern LIMIT 1"
        ).fetchone()
        cursor.close()
        assert row[0] is not None
        assert row[1] is not None
