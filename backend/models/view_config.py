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


class ThemePalette(BaseModel):
    palette_id: str
    description: str = ""
    chart_colors: list[str] = []
    asset_class_colors: dict[str, str] = {}
    layer_badge_variants: dict[str, str] = {}
    graph_node_colors: dict[str, str] = {}
