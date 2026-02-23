from backend.db import DuckDBManager


def test_connect_and_query():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    cursor = mgr.cursor()
    result = cursor.execute("SELECT 42 AS answer").fetchone()
    assert result[0] == 42
    cursor.close()
    mgr.close()


def test_cursor_without_connect_raises():
    mgr = DuckDBManager()
    import pytest

    with pytest.raises(RuntimeError):
        mgr.cursor()


def test_close_idempotent():
    mgr = DuckDBManager()
    mgr.connect(":memory:")
    mgr.close()
    mgr.close()  # Should not raise
