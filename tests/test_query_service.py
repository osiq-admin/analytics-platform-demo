import pytest
from backend.db import DuckDBManager
from backend.services.query_service import QueryService


@pytest.fixture
def db():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    cursor = mgr.cursor()
    cursor.execute("CREATE TABLE test_orders (order_id VARCHAR, price DOUBLE, qty INTEGER)")
    cursor.execute("INSERT INTO test_orders VALUES ('O1', 100.5, 10), ('O2', 200.0, 20)")
    cursor.close()
    yield mgr
    mgr.close()


@pytest.fixture
def svc(db):
    return QueryService(db)


def test_execute_query(svc):
    result = svc.execute("SELECT * FROM test_orders ORDER BY order_id")
    assert result["columns"] == ["order_id", "price", "qty"]
    assert len(result["rows"]) == 2
    assert result["rows"][0]["order_id"] == "O1"
    assert result["row_count"] == 2


def test_execute_with_limit(svc):
    result = svc.execute("SELECT * FROM test_orders", limit=1)
    assert len(result["rows"]) == 1


def test_list_tables(svc):
    tables = svc.list_tables()
    names = [t["name"] for t in tables]
    assert "test_orders" in names


def test_get_table_schema(svc):
    schema = svc.get_table_schema("test_orders")
    assert schema["table_name"] == "test_orders"
    col_names = [c["name"] for c in schema["columns"]]
    assert "order_id" in col_names
    assert "price" in col_names
    assert "qty" in col_names


def test_execute_bad_sql(svc):
    result = svc.execute("SELECT * FROM nonexistent_table")
    assert "error" in result
