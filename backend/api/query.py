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
    """Execute SQL query with GDPR Art. 25 PII masking applied to results."""
    from backend.services.masking_wrapper import get_pii_columns, has_pii_fields, mask_query_rows

    result = _query_svc(request).execute(req.sql, req.limit)
    rows = result.get("rows", [])
    columns = result.get("columns", [])
    pii_cols: dict = {}
    if rows and columns and has_pii_fields(columns):
        role_id = request.app.state.rbac_service.current_role_id
        result["rows"] = mask_query_rows(rows, role_id=role_id, masking_service=request.app.state.masking_service)
        pii_cols = get_pii_columns(columns)
    result["pii_columns"] = pii_cols
    return result


@router.get("/tables")
def list_tables(request: Request):
    return _query_svc(request).list_tables()


@router.get("/tables/{table_name}/schema")
def get_table_schema(table_name: str, request: Request):
    return _query_svc(request).get_table_schema(table_name)


@router.get("/presets")
def list_preset_queries(request: Request):
    return request.app.state.metadata.list_query_presets()
