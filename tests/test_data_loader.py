import csv
import pytest
from backend.engine.data_loader import DataLoader
from backend.db import DuckDBManager


@pytest.fixture
def workspace(tmp_path):
    (tmp_path / "data" / "csv").mkdir(parents=True)
    (tmp_path / "data" / "parquet").mkdir(parents=True)
    return tmp_path


@pytest.fixture
def db():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    yield mgr
    mgr.close()


@pytest.fixture
def sample_csv(workspace):
    path = workspace / "data" / "csv" / "executions.csv"
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["execution_id", "price", "quantity", "side"])
        writer.writerow(["E001", "150.50", "100", "BUY"])
        writer.writerow(["E002", "151.00", "200", "SELL"])
        writer.writerow(["E003", "149.75", "50", "BUY"])
    return path


def test_load_csv_creates_parquet(workspace, db, sample_csv):
    loader = DataLoader(workspace, db)
    loader.load_all()

    parquet_path = workspace / "data" / "parquet" / "executions.parquet"
    assert parquet_path.exists()


def test_load_csv_registers_duckdb_view(workspace, db, sample_csv):
    loader = DataLoader(workspace, db)
    loader.load_all()

    cursor = db.cursor()
    result = cursor.execute("SELECT COUNT(*) FROM executions").fetchone()
    cursor.close()
    assert result[0] == 3


def test_query_loaded_data(workspace, db, sample_csv):
    loader = DataLoader(workspace, db)
    loader.load_all()

    cursor = db.cursor()
    result = cursor.execute("SELECT execution_id, side FROM executions ORDER BY execution_id").fetchall()
    cursor.close()
    assert len(result) == 3
    assert result[0][0] == "E001"
    assert result[0][1] == "BUY"


def test_reload_detects_changes(workspace, db, sample_csv):
    loader = DataLoader(workspace, db)
    loader.load_all()

    # Modify CSV
    with open(sample_csv, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["E004", "152.00", "300", "BUY"])

    loader.load_all()

    cursor = db.cursor()
    result = cursor.execute("SELECT COUNT(*) FROM executions").fetchone()
    cursor.close()
    assert result[0] == 4


def test_product_csv_loads(workspace, db):
    """Verify product.csv auto-discovers and loads into DuckDB."""
    path = workspace / "data" / "csv" / "product.csv"
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["product_id", "isin", "sedol", "ticker", "name", "asset_class",
                         "instrument_type", "cfi_code", "underlying_product_id",
                         "contract_size", "strike_price", "expiry_date", "exchange_mic",
                         "currency", "tick_size", "lot_size", "base_price"])
        writer.writerow(["AAPL", "US0378331005", "", "AAPL", "Apple Inc.", "equity",
                         "common_stock", "ESXXXX", "", "", "", "", "XNYS",
                         "USD", "0.01", "100", "185.0"])
        writer.writerow(["MSFT", "US5949181045", "", "MSFT", "Microsoft Corp.", "equity",
                         "common_stock", "ESXXXX", "", "", "", "", "XNYS",
                         "USD", "0.01", "100", "380.0"])

    loader = DataLoader(workspace, db)
    loader.load_all()

    cursor = db.cursor()
    result = cursor.execute("SELECT COUNT(*) FROM product").fetchone()
    cursor.close()
    assert result[0] == 2


def test_empty_csv_dir(workspace, db):
    loader = DataLoader(workspace, db)
    loader.load_all()  # Should not raise


def test_multiple_csv_files(workspace, db, sample_csv):
    # Add a second CSV
    orders_path = workspace / "data" / "csv" / "orders.csv"
    with open(orders_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["order_id", "type", "status"])
        writer.writerow(["O001", "LIMIT", "FILLED"])
        writer.writerow(["O002", "MARKET", "CANCELLED"])

    loader = DataLoader(workspace, db)
    loader.load_all()

    cursor = db.cursor()
    exec_count = cursor.execute("SELECT COUNT(*) FROM executions").fetchone()[0]
    order_count = cursor.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    cursor.close()
    assert exec_count == 3
    assert order_count == 2
