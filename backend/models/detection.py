"""Detection model definition schemas."""
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class Strictness(StrEnum):
    MUST_PASS = "MUST_PASS"
    OPTIONAL = "OPTIONAL"


class ModelCalculation(BaseModel):
    calc_id: str
    strictness: Strictness = Strictness.OPTIONAL
    threshold_setting: str | None = None
    score_steps_setting: str | None = None


class DetectionModelDefinition(BaseModel):
    model_id: str
    name: str
    description: str = ""
    time_window: str = Field(description="business_date, trend_window, market_event_window, cancellation_pattern")
    granularity: list[str] = Field(description="Grouping dimensions, e.g. ['product_id', 'account_id']")
    calculations: list[ModelCalculation] = Field(default_factory=list)
    score_threshold_setting: str = Field(description="Reference to score threshold setting_id")
    query: str = Field(default="", description="SQL template for detection")
    alert_template: dict[str, Any] = Field(default_factory=dict)
