"""SQL query execution endpoints."""
from fastapi import APIRouter, Request
from pydantic import BaseModel

from backend.services.query_service import QueryService

router = APIRouter(prefix="/api/query", tags=["query"])


def _query_svc(request: Request) -> QueryService:
    return QueryService(request.app.state.db)


class QueryRequest(BaseModel):
    sql: str
    limit: int = 1000


@router.post("/execute")
def execute_query(req: QueryRequest, request: Request):
    return _query_svc(request).execute(req.sql, req.limit)


@router.get("/tables")
def list_tables(request: Request):
    return _query_svc(request).list_tables()


@router.get("/tables/{table_name}/schema")
def get_table_schema(table_name: str, request: Request):
    return _query_svc(request).get_table_schema(table_name)


@router.get("/presets")
def list_preset_queries(request: Request):
    return request.app.state.metadata.list_query_presets()
