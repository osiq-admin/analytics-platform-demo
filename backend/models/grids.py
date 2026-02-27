"""Pydantic models for grid column metadata."""
from pydantic import BaseModel


class GridColumn(BaseModel):
    field: str
    header_name: str
    width: int | None = None
    flex: int | None = None
    min_width: int | None = None
    column_type: str | None = None  # "numericColumn", "dateColumn"
    filter_type: str | None = None  # "agTextColumnFilter", "agNumberColumnFilter", "agDateColumnFilter"
    sortable: bool = True
    resizable: bool = True
    cell_style: dict | None = None
    value_format: str | None = None  # "currency", "percentage", "integer" — links to format rules
    entity_link: str | None = None  # entity_id if this column links to an entity


class GridConfig(BaseModel):
    grid_id: str
    view_id: str
    description: str = ""
    columns: list[GridColumn] = []
    default_sort_field: str | None = None
    default_sort_direction: str = "asc"
