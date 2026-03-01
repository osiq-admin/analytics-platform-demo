"""Pydantic models for calculation fingerprinting, result logging, and skip detection."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CalcFingerprint(BaseModel):
    calc_id: str
    input_hash: str
    param_hash: str
    combined_hash: str


class CalcResultLog(BaseModel):
    run_id: str
    calc_id: str
    layer: str
    input_fingerprint: str
    param_fingerprint: str
    output_hash: str = ""
    record_count: int = 0
    executed_at: datetime = Field(default_factory=datetime.now)
    duration_ms: int = 0
    status: Literal["success", "skipped", "error"] = "success"
    skip_reason: str = ""
    output_table: str = ""
    parameters_snapshot: dict = Field(default_factory=dict)
