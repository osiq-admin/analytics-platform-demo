"""Pydantic models for observability: events, lineage, metrics, coverage, impact analysis."""

from typing import Literal

from pydantic import BaseModel, Field


# ─── Event types ───

EventType = Literal[
    "pipeline_execution", "quality_check", "data_access",
    "alert_action", "metadata_change", "masking_unmask",
]


class EventRecord(BaseModel):
    event_id: str
    event_type: EventType
    timestamp: str  # ISO 8601
    actor: str = "system"
    entity: str = ""
    tier: str = ""
    details: dict = Field(default_factory=dict)
    prev_hash: str = ""
    event_hash: str = ""


# ─── OpenLineage-compatible lineage ───

class LineageDataset(BaseModel):
    namespace: str
    name: str
    fields: list[str] = Field(default_factory=list)
    quality_assertions: list[dict] = Field(default_factory=list)


class ColumnLineage(BaseModel):
    output_field: str
    input_fields: list[str] = Field(default_factory=list)
    transformation: Literal[
        "passthrough", "cast", "normalize", "derive", "aggregate",
        "lookup", "concat", "conditional", "validate",
    ] = "passthrough"
    expression: str = ""
    confidence: float = 1.0


class LineageRun(BaseModel):
    run_id: str
    job_name: str
    job_namespace: str = "analytics-platform"
    event_type: Literal["START", "COMPLETE", "FAIL"]
    event_time: str
    duration_ms: int = 0
    record_count: int = 0
    inputs: list[LineageDataset] = Field(default_factory=list)
    outputs: list[LineageDataset] = Field(default_factory=list)
    column_lineage: list[ColumnLineage] = Field(default_factory=list)
    quality_scores: dict[str, float] = Field(default_factory=dict)
    parent_run_id: str = ""


# ─── Lineage graph models (for React Flow rendering) ───

class QualityOverlayData(BaseModel):
    """ISO 8000-61 quality score at every lineage node."""
    overall_score: float = 0.0
    dimensions: dict[str, float] = Field(default_factory=dict)
    sla_status: Literal["met", "warning", "breach"] = "met"
    sla_actual: str = ""
    record_count: int = 0
    last_updated: str = ""


class LineageNode(BaseModel):
    id: str  # Composite: "{layer}:{type}:{name}:{tier}"
    label: str
    node_type: Literal[
        "tier", "entity", "field", "calculation", "detection_model",
        "alert", "setting", "regulation",
    ]
    tier: str = ""
    entity: str = ""
    quality: QualityOverlayData | None = None
    data_steward: str = ""
    data_owner: str = ""
    version_hash: str = ""
    regulatory_tags: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class LineageEdge(BaseModel):
    source: str
    target: str
    edge_type: Literal[
        "tier_flow", "field_mapping", "calculation_dep", "model_input",
        "alert_output", "entity_fk", "quality_gate", "setting_override",
        "regulatory_req",
    ]
    weight: Literal["hard", "soft"] = "hard"
    label: str = ""
    metadata: dict = Field(default_factory=dict)


class LineageGraph(BaseModel):
    nodes: list[LineageNode] = Field(default_factory=list)
    edges: list[LineageEdge] = Field(default_factory=list)
    layers: list[str] = Field(default_factory=list)
    total_nodes: int = 0
    total_edges: int = 0


class ImpactAnalysis(BaseModel):
    origin: LineageNode
    direction: Literal["upstream", "downstream", "both"]
    affected_nodes: list[LineageNode] = Field(default_factory=list)
    affected_edges: list[LineageEdge] = Field(default_factory=list)
    impact_summary: dict = Field(default_factory=dict)
    hard_impact_count: int = 0
    soft_impact_count: int = 0
    regulatory_impact: list[str] = Field(default_factory=list)


class FieldTrace(BaseModel):
    entity: str
    field: str
    chain: list[dict] = Field(default_factory=list)
    regulatory_tags: list[str] = Field(default_factory=list)


# ─── Surveillance coverage matrix ───

class CoverageCell(BaseModel):
    product_id: str
    abuse_type: str
    covered: bool = False
    model_ids: list[str] = Field(default_factory=list)
    alert_count: int = 0
    regulations: list[str] = Field(default_factory=list)


class SurveillanceCoverage(BaseModel):
    products: list[dict] = Field(default_factory=list)
    abuse_types: list[str] = Field(default_factory=list)
    cells: list[CoverageCell] = Field(default_factory=list)
    coverage_pct: float = 0.0
    regulatory_gaps: list[dict] = Field(default_factory=list)


# ─── Settings impact preview (what-if) ───

class SettingsImpactPreview(BaseModel):
    setting_id: str
    parameter: str
    current_value: float = 0.0
    proposed_value: float = 0.0
    current_alert_count: int = 0
    projected_alert_count: int = 0
    delta: int = 0
    affected_models: list[str] = Field(default_factory=list)
    affected_products: list[str] = Field(default_factory=list)


# ─── Metrics ───

MetricType = Literal[
    "execution_time", "throughput", "quality_score",
    "sla_compliance", "record_count", "error_rate",
]


class MetricPoint(BaseModel):
    metric_id: str
    metric_type: MetricType
    value: float
    unit: str = ""
    timestamp: str
    tags: dict[str, str] = Field(default_factory=dict)


class MetricSeries(BaseModel):
    metric_id: str
    metric_type: MetricType
    entity: str = ""
    tier: str = ""
    points: list[MetricPoint] = Field(default_factory=list)
