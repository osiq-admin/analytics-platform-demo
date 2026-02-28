"""Detection model definition schemas."""
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class Strictness(StrEnum):
    MUST_PASS = "MUST_PASS"  # nosec B105 — detection model strictness level, not a password
    OPTIONAL = "OPTIONAL"


class RegulatoryCoverage(BaseModel):
    regulation: str
    article: str
    description: str = ""


class ModelCalculation(BaseModel):
    calc_id: str
    strictness: Strictness = Strictness.OPTIONAL
    threshold_setting: str | None = None
    score_steps_setting: str | None = None
    value_field: str | None = None


class DetectionModelDefinition(BaseModel):
    model_id: str
    name: str
    description: str = ""
    time_window: str = Field(description="business_date, trend_window, market_event_window, cancellation_pattern")
    granularity: list[str] = Field(description="Grouping dimensions, e.g. ['product_id', 'account_id']")
    calculations: list[ModelCalculation] = Field(default_factory=list)
    score_threshold_setting: str = Field(description="Reference to score threshold setting_id")
    context_fields: list[str] = Field(
        default_factory=lambda: ["product_id", "account_id", "trader_id", "business_date", "asset_class", "instrument_type"],
        description="Fields from query results to use as entity context for settings resolution",
    )
    query: str = Field(default="", description="SQL template for detection")
    alert_template: dict[str, Any] = Field(default_factory=dict)
    regulatory_coverage: list[RegulatoryCoverage] = Field(default_factory=list)
    alert_detail_layout: dict[str, Any] | None = Field(default=None, description="Model-specific alert detail panel configuration")
    market_data_config: dict[str, Any] | None = Field(default=None, description="Chart configuration for market data visualization (chart_type, time_field, price_fields, volume_field, overlay_trades)")
    metadata_layer: str = Field(default="oob", exclude=True)
