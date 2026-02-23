"""Alert and trace models."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from backend.models.detection import Strictness


class CalculationScore(BaseModel):
    calc_id: str
    computed_value: float
    threshold: float | None = None
    threshold_passed: bool = False
    score: float = 0.0
    score_step_matched: dict[str, Any] | None = None
    strictness: Strictness = Strictness.OPTIONAL


class SettingsTraceEntry(BaseModel):
    setting_id: str
    setting_name: str = ""
    matched_override: dict[str, Any] | None = None
    resolved_value: Any = None
    why: str = ""


class AlertTrace(BaseModel):
    alert_id: str
    model_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    entity_context: dict[str, str] = Field(default_factory=dict)
    calculation_scores: list[CalculationScore] = Field(default_factory=list)
    accumulated_score: float = 0.0
    score_threshold: float = 0.0
    trigger_path: str = Field(description="all_passed or score_based")
    alert_fired: bool = False
    calculation_trace: dict[str, Any] = Field(default_factory=dict)
    settings_trace: list[SettingsTraceEntry] = Field(default_factory=list)
    related_data: dict[str, Any] = Field(default_factory=dict)
