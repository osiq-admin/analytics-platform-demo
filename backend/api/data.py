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
