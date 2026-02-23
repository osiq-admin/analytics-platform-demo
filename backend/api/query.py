"""SQL query execution endpoints."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/query", tags=["query"])


class QueryRequest(BaseModel):
    sql: str
    limit: int = 1000


@router.post("/execute")
def execute_query(req: QueryRequest):
    return {"columns": [], "rows": [], "row_count": 0}


@router.get("/tables")
def list_tables():
    return []


@router.get("/tables/{table_name}/schema")
def get_table_schema(table_name: str):
    return {"table_name": table_name, "columns": []}


@router.get("/presets")
def list_preset_queries():
    return []
