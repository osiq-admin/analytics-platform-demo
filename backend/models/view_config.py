"""Pydantic models for view configuration metadata."""
from pydantic import BaseModel


class TabDefinition(BaseModel):
    id: str
    label: str
    icon: str | None = None
    default: bool = False


class ViewConfig(BaseModel):
    view_id: str
    description: str = ""
    tabs: list[TabDefinition] = []
