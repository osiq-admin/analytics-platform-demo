"""Calculation definition models."""
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field, model_validator


class CalculationLayer(StrEnum):
    TRANSACTION = "transaction"
    TIME_WINDOW = "time_window"
    AGGREGATION = "aggregation"
    DERIVED = "derived"


class OutputField(BaseModel):
    name: str
    type: str


class CalculationOutput(BaseModel):
    table_name: str
    fields: list[OutputField] = Field(default_factory=list)


class CalculationInput(BaseModel):
    source_type: str = Field(description="entity, calculation, or setting")
    entity_id: str | None = None
    calc_id: str | None = None
    setting_id: str | None = None
    fields: list[str] = Field(default_factory=list)


class CalculationDefinition(BaseModel):
    calc_id: str
    name: str
    layer: CalculationLayer
    description: str = ""
    inputs: list[dict[str, Any]] = Field(default_factory=list)
    output: dict[str, Any] = Field(default_factory=dict)
    logic: str = Field(default="", description="SQL template or description")
    parameters: dict[str, Any] = Field(default_factory=dict)
    display: dict[str, Any] = Field(default_factory=dict)
    storage: str = Field(default="", description="Result table name")
    value_field: str = Field(default="", description="Primary value column name for scoring")
    depends_on: list[str] = Field(default_factory=list)
    # e.g. ["MAR Art. 12(1)(a)", "MiFID II Art. 16(2)"]
    regulatory_tags: list[str] = Field(default_factory=list)
    metadata_layer: str = Field(default="oob", exclude=True)

    @model_validator(mode="after")
    def no_self_dependency(self):
        if self.calc_id in self.depends_on:
            raise ValueError(f"Calculation '{self.calc_id}' cannot depend on itself")
        return self
