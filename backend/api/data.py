"""Data file management endpoints."""
from fastapi import APIRouter, Request

from backend.config import settings
from backend.services.query_service import QueryService

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/files")
def list_data_files():
    """List CSV and Parquet data files in the workspace."""
    files = []
    csv_dir = settings.workspace_dir / "data" / "csv"
    if csv_dir.exists():
        for f in sorted(csv_dir.glob("*.csv")):
            files.append({"name": f.stem, "type": "csv", "path": str(f.name)})
    return files


@router.get("/files/{filename}/preview")
def preview_data_file(filename: str, request: Request, limit: int = 100):
    """Preview data for a table by querying DuckDB."""
    svc = QueryService(request.app.state.db)
    try:
        result = svc.execute(f'SELECT * FROM "{filename}" LIMIT {limit}', limit=limit)
        return {
            "filename": filename,
            "columns": result.get("columns", []),
            "rows": result.get("rows", []),
            "total_rows": len(result.get("rows", [])),
        }
    except Exception:
        return {"filename": filename, "columns": [], "rows": [], "total_rows": 0}


@router.post("/reload")
def reload_data(request: Request):
    """Reload all CSV data into DuckDB."""
    from backend.engine.data_loader import DataLoader

    loader = DataLoader(settings.workspace_dir, request.app.state.db)
    loaded = loader.load_all()
    return {"status": "reloaded", "tables": loaded}


@router.get("/market/{product_id}")
def get_market_data(
    product_id: str,
    request: Request,
    days: int = 60,
    start_date: str | None = None,
    end_date: str | None = None,
):
    """Get EOD and intraday market data for a product."""
    svc = QueryService(request.app.state.db)

    date_filter = f"product_id = '{product_id}'"
    if start_date:
        date_filter += f" AND trade_date >= '{start_date}'"
    if end_date:
        date_filter += f" AND trade_date <= '{end_date}'"

    if start_date or end_date:
        eod_result = svc.execute(
            f"SELECT product_id, trade_date, close_price, volume"
            f" FROM md_eod"
            f" WHERE {date_filter}"
            f" ORDER BY trade_date DESC",
            limit=1000,
        )
    else:
        eod_result = svc.execute(
            f"SELECT product_id, trade_date, close_price, volume"
            f" FROM md_eod"
            f" WHERE product_id = '{product_id}'"
            f" ORDER BY trade_date DESC"
            f" LIMIT {days}",
            limit=days,
        )

    intraday_result = svc.execute(
        f"SELECT product_id, trade_date, trade_time, trade_price, trade_quantity"
        f" FROM md_intraday"
        f" WHERE {date_filter}"
        f" ORDER BY trade_date DESC, trade_time DESC"
        f" LIMIT 500",
        limit=500,
    )

    return {
        "product_id": product_id,
        "eod": eod_result.get("rows", []),
        "intraday": intraday_result.get("rows", []),
    }


@router.get("/orders")
def get_related_orders(
    request: Request,
    product_id: str | None = None,
    account_id: str | None = None,
    trade_date: str | None = None,
    limit: int = 100,
):
    """Get orders and executions filtered by product, account, and/or date."""
    svc = QueryService(request.app.state.db)

    where_parts: list[str] = []
    if product_id:
        where_parts.append(f"product_id = '{product_id}'")
    if account_id:
        where_parts.append(f"account_id = '{account_id}'")
    where_clause = " AND ".join(where_parts) if where_parts else "1=1"

    order_where = where_clause
    if trade_date:
        order_where += f" AND order_date = '{trade_date}'"

    exec_where = where_clause
    if trade_date:
        exec_where += f" AND execution_date = '{trade_date}'"

    orders = svc.execute(
        f'SELECT * FROM "order" WHERE {order_where}'
        f" ORDER BY order_date DESC, order_time DESC LIMIT {limit}",
        limit=limit,
    )
    executions = svc.execute(
        f"SELECT * FROM execution WHERE {exec_where}"
        f" ORDER BY execution_date DESC, execution_time DESC LIMIT {limit}",
        limit=limit,
    )

    return {
        "orders": orders.get("rows", []),
        "executions": executions.get("rows", []),
    }
