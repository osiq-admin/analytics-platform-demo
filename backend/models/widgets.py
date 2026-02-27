"""Widget configuration metadata models."""
from pydantic import BaseModel, Field


class WidgetGridConfig(BaseModel):
    col_span: int = 1
    order: int = 0


class ChartConfig(BaseModel):
    x_field: str = ""
    y_field: str = ""
    default_chart_type: str = "bar"
    available_chart_types: list[str] = Field(default_factory=lambda: ["bar", "pie", "line", "table"])
    color_palette: str = "categorical"


class FormatConfig(BaseModel):
    type: str = "string"
    precision: int = 0
    suffix: str = ""
    prefix: str = ""


class WidgetDefinition(BaseModel):
    widget_id: str
    widget_type: str  # "kpi_card" or "chart"
    title: str
    data_field: str = ""
    format: FormatConfig | None = None
    chart_config: ChartConfig | None = None
    grid: WidgetGridConfig = Field(default_factory=WidgetGridConfig)


class ViewWidgetConfig(BaseModel):
    view_id: str
    widgets: list[WidgetDefinition] = Field(default_factory=list)
