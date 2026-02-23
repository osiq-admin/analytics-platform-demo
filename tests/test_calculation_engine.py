"""Tests for the calculation DAG executor."""
import json
from pathlib import Path

import pytest

from backend.db import DuckDBManager
from backend.engine.calculation_engine import CalculationEngine
from backend.engine.data_loader import DataLoader
from backend.services.metadata_service import MetadataService


@pytest.fixture
def workspace(tmp_path):
    """Create a minimal workspace with test data and calculations."""
    # Create directory structure
    (tmp_path / "data" / "csv").mkdir(parents=True)
    (tmp_path / "data" / "parquet").mkdir(parents=True)
    (tmp_path / "results" / "transaction").mkdir(parents=True)
    (tmp_path / "results" / "time_window").mkdir(parents=True)
    (tmp_path / "results" / "aggregation").mkdir(parents=True)
    (tmp_path / "results" / "derived").mkdir(parents=True)
    (tmp_path / "metadata" / "calculations" / "transaction").mkdir(parents=True)
    (tmp_path / "metadata" / "calculations" / "time_window").mkdir(parents=True)
    (tmp_path / "metadata" / "calculations" / "aggregation").mkdir(parents=True)
    (tmp_path / "metadata" / "calculations" / "derived").mkdir(parents=True)
    (tmp_path / "metadata" / "settings" / "thresholds").mkdir(parents=True)
    (tmp_path / "metadata" / "entities").mkdir(parents=True)

    # Product dimension table
    (tmp_path / "data" / "csv" / "product.csv").write_text(
        "product_id,name,asset_class,instrument_type,contract_size,option_type,exchange,currency\n"
        "AAPL,Apple Inc.,equity,stock,,,NYSE,USD\n"
        "MSFT,Microsoft Corp.,equity,stock,,,NYSE,USD\n"
    )

    # Create sample execution data (product fields now in product.csv)
    csv_path = tmp_path / "data" / "csv" / "execution.csv"
    csv_path.write_text(
        "execution_id,product_id,account_id,trader_id,side,price,quantity,"
        "execution_date,execution_time\n"
        "E001,AAPL,ACC001,T001,BUY,150.00,100,2026-01-15,10:30:00\n"
        "E002,AAPL,ACC001,T001,SELL,151.00,80,2026-01-15,14:00:00\n"
        "E003,MSFT,ACC002,T002,BUY,400.00,50,2026-01-15,11:00:00\n"
        "E004,AAPL,ACC002,T002,BUY,150.50,200,2026-01-15,09:30:00\n"
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


class TestDAGBuilding:
    def test_build_dag_empty(self, engine):
        dag = engine.build_dag()
        assert dag == []

    def test_build_dag_with_calculations(self, workspace, engine):
        """Calculations should be sorted by layer order."""
        # Create two calculations in different layers
        calc1 = {
            "calc_id": "value_calc",
            "name": "Value Calculation",
            "layer": "transaction",
            "description": "Calculates transaction value",
            "inputs": [],
            "output": {"table_name": "calc_value", "fields": [{"name": "calculated_value", "type": "decimal"}]},
            "logic": "SELECT execution_id, price * quantity AS calculated_value FROM execution",
            "depends_on": [],
        }
        calc2 = {
            "calc_id": "trading_agg",
            "name": "Trading Aggregation",
            "layer": "aggregation",
            "description": "Aggregates trading",
            "inputs": [],
            "output": {"table_name": "calc_trading_agg", "fields": []},
            "logic": "SELECT product_id, SUM(price * quantity) AS total_value FROM execution GROUP BY product_id",
            "depends_on": ["value_calc"],
        }

        meta_dir = workspace / "metadata" / "calculations"
        (meta_dir / "transaction" / "value_calc.json").write_text(json.dumps(calc1))
        (meta_dir / "aggregation" / "trading_agg.json").write_text(json.dumps(calc2))

        dag = engine.build_dag()
        calc_ids = [c.calc_id for c in dag]
        assert calc_ids.index("value_calc") < calc_ids.index("trading_agg")

    def test_build_dag_detects_cycle(self, workspace, engine):
        """Cycles in depends_on should raise an error."""
        calc_a = {
            "calc_id": "calc_a",
            "name": "A",
            "layer": "transaction",
            "description": "",
            "inputs": [],
            "output": {"table_name": "calc_a_out", "fields": []},
            "logic": "SELECT 1",
            "depends_on": ["calc_b"],
        }
        calc_b = {
            "calc_id": "calc_b",
            "name": "B",
            "layer": "transaction",
            "description": "",
            "inputs": [],
            "output": {"table_name": "calc_b_out", "fields": []},
            "logic": "SELECT 1",
            "depends_on": ["calc_a"],
        }

        meta_dir = workspace / "metadata" / "calculations"
        (meta_dir / "transaction" / "calc_a.json").write_text(json.dumps(calc_a))
        (meta_dir / "transaction" / "calc_b.json").write_text(json.dumps(calc_b))

        with pytest.raises(ValueError, match="cycle"):
            engine.build_dag()


class TestExecution:
    def test_execute_single_calculation(self, workspace, db, engine):
        """A single calculation should execute and produce results."""
        calc = {
            "calc_id": "value_calc",
            "name": "Value Calculation",
            "layer": "transaction",
            "description": "Calculates value",
            "inputs": [],
            "output": {"table_name": "calc_value", "fields": [{"name": "calculated_value", "type": "decimal"}]},
            "logic": "SELECT execution_id, price * quantity AS calculated_value FROM execution",
            "depends_on": [],
        }
        meta_dir = workspace / "metadata" / "calculations" / "transaction"
        (meta_dir / "value_calc.json").write_text(json.dumps(calc))

        results = engine.run_all()

        assert "value_calc" in results
        assert results["value_calc"]["row_count"] > 0

        # Result should be queryable in DuckDB
        cursor = db.cursor()
        rows = cursor.execute("SELECT * FROM calc_value").fetchall()
        cursor.close()
        assert len(rows) == 4
        # E001: 150.00 * 100 = 15000.00
        assert any(r[1] == 15000.0 for r in rows)

    def test_execute_chained_calculations(self, workspace, db, engine):
        """Dependent calculations should use results from prior ones."""
        calc1 = {
            "calc_id": "value_calc",
            "name": "Value Calculation",
            "layer": "transaction",
            "description": "",
            "inputs": [],
            "output": {"table_name": "calc_value", "fields": []},
            "logic": "SELECT execution_id, product_id, account_id, side, price * quantity AS calculated_value FROM execution",
            "depends_on": [],
        }
        calc2 = {
            "calc_id": "value_agg",
            "name": "Value Aggregation",
            "layer": "aggregation",
            "description": "",
            "inputs": [],
            "output": {"table_name": "calc_value_agg", "fields": []},
            "logic": "SELECT product_id, account_id, SUM(calculated_value) AS total_value FROM calc_value GROUP BY product_id, account_id",
            "depends_on": ["value_calc"],
        }

        meta_dir = workspace / "metadata" / "calculations"
        (meta_dir / "transaction" / "value_calc.json").write_text(json.dumps(calc1))
        (meta_dir / "aggregation" / "value_agg.json").write_text(json.dumps(calc2))

        results = engine.run_all()

        assert "value_calc" in results
        assert "value_agg" in results

        cursor = db.cursor()
        rows = cursor.execute(
            "SELECT * FROM calc_value_agg WHERE product_id='AAPL' AND account_id='ACC001'"
        ).fetchall()
        cursor.close()
        assert len(rows) == 1
        # ACC001: BUY 150*100=15000 + SELL 151*80=12080 = 27080
        assert rows[0][2] == 27080.0

    def test_results_written_to_parquet(self, workspace, db, engine):
        """Calculation results should be persisted as Parquet files."""
        calc = {
            "calc_id": "value_calc",
            "name": "Value Calculation",
            "layer": "transaction",
            "description": "",
            "inputs": [],
            "output": {"table_name": "calc_value", "fields": []},
            "logic": "SELECT execution_id, price * quantity AS calculated_value FROM execution",
            "depends_on": [],
        }
        meta_dir = workspace / "metadata" / "calculations" / "transaction"
        (meta_dir / "value_calc.json").write_text(json.dumps(calc))

        engine.run_all()

        parquet_path = workspace / "results" / "transaction" / "calc_value.parquet"
        assert parquet_path.exists()

    def test_run_specific_calculation(self, workspace, db, engine):
        """Engine should support running a specific calculation by ID."""
        calc = {
            "calc_id": "value_calc",
            "name": "Value Calculation",
            "layer": "transaction",
            "description": "",
            "inputs": [],
            "output": {"table_name": "calc_value", "fields": []},
            "logic": "SELECT execution_id, price * quantity AS calculated_value FROM execution",
            "depends_on": [],
        }
        meta_dir = workspace / "metadata" / "calculations" / "transaction"
        (meta_dir / "value_calc.json").write_text(json.dumps(calc))

        result = engine.run_one("value_calc")
        assert result["row_count"] == 4
