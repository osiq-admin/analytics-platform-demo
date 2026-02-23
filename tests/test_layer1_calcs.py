"""Tests for Layer 1 — Transaction Calculations (value_calc, adjusted_direction)."""
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
    """Create workspace with real metadata and test CSV data."""
    # Copy real calculation metadata
    src_calcs = WORKSPACE_ROOT / "metadata" / "calculations" / "transaction"
    dst_calcs = tmp_path / "metadata" / "calculations" / "transaction"
    dst_calcs.mkdir(parents=True)
    for f in src_calcs.glob("*.json"):
        shutil.copy(f, dst_calcs / f.name)

    # Create results directories
    (tmp_path / "results" / "transaction").mkdir(parents=True)
    (tmp_path / "data" / "csv").mkdir(parents=True)
    (tmp_path / "data" / "parquet").mkdir(parents=True)

    # Create stock execution data
    csv_path = tmp_path / "data" / "csv" / "execution.csv"
    csv_path.write_text(
        "execution_id,order_id,product_id,account_id,trader_id,side,price,quantity,"
        "instrument_type,asset_class,execution_date,execution_time,option_type,contract_size\n"
        "E001,O001,AAPL,ACC001,T001,BUY,150.00,100,stock,equity,2026-01-15,10:30:00,,\n"
        "E002,O002,AAPL,ACC001,T001,SELL,151.00,80,stock,equity,2026-01-15,14:00:00,,\n"
        "E003,O003,MSFT,ACC002,T002,BUY,400.00,50,stock,equity,2026-01-15,11:00:00,,\n"
        "E004,O004,AAPL_C150,ACC001,T001,BUY,3.50,10,option,equity,2026-01-15,10:35:00,call,100\n"
        "E005,O005,AAPL_P150,ACC001,T001,BUY,2.10,5,option,equity,2026-01-15,11:00:00,put,100\n"
        "E006,O006,AAPL_C150,ACC002,T002,SELL,3.80,20,option,equity,2026-01-15,13:00:00,call,100\n"
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


class TestValueCalc:
    def test_stock_value(self, db, engine):
        """Stock value = price × quantity."""
        engine.run_one("value_calc")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT calculated_value FROM calc_value WHERE execution_id='E001'"
        ).fetchone()
        cursor.close()
        assert row[0] == 15000.0  # 150 * 100

    def test_option_value(self, db, engine):
        """Option value = price × contract_size × quantity."""
        engine.run_one("value_calc")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT calculated_value FROM calc_value WHERE execution_id='E004'"
        ).fetchone()
        cursor.close()
        assert row[0] == 3500.0  # 3.50 * 100 * 10

    def test_all_executions_have_values(self, db, engine):
        """Every execution should get a calculated_value."""
        engine.run_one("value_calc")
        cursor = db.cursor()
        count = cursor.execute("SELECT COUNT(*) FROM calc_value").fetchone()[0]
        cursor.close()
        assert count == 6

    def test_value_preserves_context_fields(self, db, engine):
        """Result should include product_id, account_id, side, etc."""
        engine.run_one("value_calc")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT product_id, account_id, side, instrument_type FROM calc_value WHERE execution_id='E001'"
        ).fetchone()
        cursor.close()
        assert row == ("AAPL", "ACC001", "BUY", "stock")


class TestAdjustedDirection:
    def test_stock_direction_unchanged(self, db, engine):
        """Stock BUY stays BUY."""
        engine.run_one("adjusted_direction")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT original_side, adjusted_side FROM calc_adjusted_direction WHERE execution_id='E001'"
        ).fetchone()
        cursor.close()
        assert row == ("BUY", "BUY")

    def test_buy_put_becomes_sell(self, db, engine):
        """Buying a put option = effectively selling."""
        engine.run_one("adjusted_direction")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT original_side, adjusted_side FROM calc_adjusted_direction WHERE execution_id='E005'"
        ).fetchone()
        cursor.close()
        assert row == ("BUY", "SELL")

    def test_sell_call_becomes_sell(self, db, engine):
        """Selling a call option = effectively selling."""
        engine.run_one("adjusted_direction")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT original_side, adjusted_side FROM calc_adjusted_direction WHERE execution_id='E006'"
        ).fetchone()
        cursor.close()
        assert row == ("SELL", "SELL")

    def test_buy_call_stays_buy(self, db, engine):
        """Buying a call option = effectively buying."""
        engine.run_one("adjusted_direction")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT original_side, adjusted_side FROM calc_adjusted_direction WHERE execution_id='E004'"
        ).fetchone()
        cursor.close()
        assert row == ("BUY", "BUY")

    def test_adjusted_includes_value(self, db, engine):
        """Adjusted direction result should include the calculated_value from value_calc."""
        engine.run_one("adjusted_direction")
        cursor = db.cursor()
        row = cursor.execute(
            "SELECT calculated_value FROM calc_adjusted_direction WHERE execution_id='E001'"
        ).fetchone()
        cursor.close()
        assert row[0] == 15000.0
