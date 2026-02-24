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


class CalculationTraceEntry(BaseModel):
    """Per-calculation execution trace for explainability drill-down."""
    calc_id: str
    layer: str = ""
    value_field: str = ""
    computed_value: float = 0.0
    threshold_setting_id: str | None = None
    threshold_value: float | None = None
    score_steps_setting_id: str | None = None
    score_awarded: float = 0.0
    score_step_matched: dict[str, Any] | None = None
    passed: bool = False
    strictness: str = "OPTIONAL"


class AlertTrace(BaseModel):
    alert_id: str
    model_id: str
    model_name: str = ""
    timestamp: datetime = Field(default_factory=datetime.now)
    entity_context: dict[str, str] = Field(default_factory=dict)
    calculation_scores: list[CalculationScore] = Field(default_factory=list)
    accumulated_score: float = 0.0
    score_threshold: float = 0.0
    trigger_path: str = Field(description="all_passed or score_based")
    alert_fired: bool = False
    # Explainability fields
    executed_sql: str = Field(default="", description="Actual SQL query that was run")
    sql_row_count: int = Field(default=0, description="Number of rows the query returned")
    resolved_settings: dict[str, Any] = Field(default_factory=dict, description="Setting ID → resolved value + reason")
    calculation_traces: list[CalculationTraceEntry] = Field(default_factory=list, description="Per-calc execution details")
    scoring_breakdown: list[dict[str, Any]] = Field(default_factory=list, description="Score step matching details")
    entity_context_source: dict[str, str] = Field(default_factory=dict, description="Which query column provided each context field")
    # Legacy fields (kept for backward compatibility)
    calculation_trace: dict[str, Any] = Field(default_factory=dict)
    settings_trace: list[SettingsTraceEntry] = Field(default_factory=list)
    related_data: dict[str, Any] = Field(default_factory=dict)
