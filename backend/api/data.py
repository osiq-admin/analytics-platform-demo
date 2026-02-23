"""Data file management endpoints."""
from fastapi import APIRouter

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/files")
def list_data_files():
    return []


@router.get("/files/{filename}/preview")
def preview_data_file(filename: str, limit: int = 100):
    return {"filename": filename, "columns": [], "rows": [], "total_rows": 0}


@router.post("/reload")
def reload_data():
    return {"status": "reloaded", "tables": []}
