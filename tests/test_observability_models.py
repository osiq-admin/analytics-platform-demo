"""Tests for observability Pydantic models — events, lineage, metrics, coverage, impact."""

import hashlib
import json

import pytest
from pydantic import ValidationError

from backend.models.observability import (
    ColumnLineage,
    CoverageCell,
    EventRecord,
    FieldTrace,
    ImpactAnalysis,
    LineageDataset,
    LineageEdge,
    LineageGraph,
    LineageNode,
    LineageRun,
    MetricPoint,
    MetricSeries,
    QualityOverlayData,
    SettingsImpactPreview,
    SurveillanceCoverage,
)


# ─── EventRecord ───

class TestEventRecord:
    def test_basic_event(self):
        e = EventRecord(event_id="e1", event_type="pipeline_execution", timestamp="2026-03-01T10:00:00Z")
        assert e.event_id == "e1"
        assert e.actor == "system"
        assert e.details == {}

    def test_event_with_details(self):
        e = EventRecord(
            event_id="e2", event_type="quality_check", timestamp="2026-03-01T10:00:00Z",
            actor="pipeline", entity="execution", tier="silver",
            details={"dimension": "completeness", "score": 98.5},
        )
        assert e.entity == "execution"
        assert e.details["score"] == 98.5

    def test_event_hash_chain(self):
        prev = "0" * 64
        payload = "pipeline_execution" + "2026-03-01T10:00:00Z" + json.dumps({})
        expected_hash = hashlib.sha256((prev + payload).encode()).hexdigest()
        e = EventRecord(
            event_id="e3", event_type="pipeline_execution", timestamp="2026-03-01T10:00:00Z",
            prev_hash=prev, event_hash=expected_hash,
        )
        assert len(e.event_hash) == 64
        assert e.prev_hash == prev

    def test_invalid_event_type(self):
        with pytest.raises(ValidationError):
            EventRecord(event_id="e", event_type="invalid_type", timestamp="2026-03-01T10:00:00Z")

    def test_all_event_types(self):
        for t in ["pipeline_execution", "quality_check", "data_access",
                   "alert_action", "metadata_change", "masking_unmask"]:
            e = EventRecord(event_id=f"e_{t}", event_type=t, timestamp="2026-03-01T10:00:00Z")
            assert e.event_type == t


# ─── LineageDataset + ColumnLineage + LineageRun ───

class TestLineageRun:
    def test_basic_run(self):
        r = LineageRun(
            run_id="r1", job_name="landing_to_bronze_execution",
            event_type="COMPLETE", event_time="2026-03-01T10:05:00Z",
            duration_ms=450, record_count=761,
            inputs=[LineageDataset(namespace="landing", name="execution")],
            outputs=[LineageDataset(namespace="bronze", name="execution", fields=["exec_id", "price"])],
        )
        assert r.duration_ms == 450
        assert len(r.inputs) == 1
        assert r.outputs[0].fields == ["exec_id", "price"]

    def test_column_lineage(self):
        cl = ColumnLineage(
            output_field="exec_price",
            input_fields=["price"],
            transformation="cast",
            expression="CAST(price AS DECIMAL(18,6))",
            confidence=1.0,
        )
        assert cl.transformation == "cast"
        assert cl.confidence == 1.0

    def test_run_with_quality_scores(self):
        r = LineageRun(
            run_id="r2", job_name="bronze_to_silver_execution",
            event_type="COMPLETE", event_time="2026-03-01T10:10:00Z",
            quality_scores={"completeness": 99.0, "validity": 94.5},
        )
        assert r.quality_scores["completeness"] == 99.0

    def test_parent_run(self):
        r = LineageRun(
            run_id="r3", job_name="stage_1",
            event_type="START", event_time="2026-03-01T10:00:00Z",
            parent_run_id="parent_pipeline_001",
        )
        assert r.parent_run_id == "parent_pipeline_001"

    def test_all_transformation_types(self):
        for t in ["passthrough", "cast", "normalize", "derive", "aggregate",
                   "lookup", "concat", "conditional", "validate"]:
            cl = ColumnLineage(output_field="f", transformation=t)
            assert cl.transformation == t


# ─── LineageGraph models ───

class TestLineageGraph:
    def test_quality_overlay(self):
        q = QualityOverlayData(
            overall_score=92.5,
            dimensions={"completeness": 99.0, "validity": 94.0, "consistency": 88.0,
                        "timeliness": 95.0, "uniqueness": 100.0, "accuracy": 90.0},
            sla_status="met", sla_actual="12min", record_count=509,
        )
        assert q.overall_score == 92.5
        assert len(q.dimensions) == 6
        assert q.sla_status == "met"

    def test_composite_node_id(self):
        n = LineageNode(
            id="tier_flow:tier:silver:execution",
            label="Silver - Execution",
            node_type="tier",
            tier="silver",
            entity="execution",
        )
        parts = n.id.split(":")
        assert len(parts) == 4
        assert parts[0] == "tier_flow"
        assert parts[1] == "tier"

    def test_node_with_quality_and_regulatory(self):
        n = LineageNode(
            id="tier_flow:tier:gold:execution",
            label="Gold - Execution",
            node_type="tier",
            tier="gold",
            entity="execution",
            quality=QualityOverlayData(overall_score=96.0),
            data_steward="Surveillance Ops",
            regulatory_tags=["MAR_Art16", "MiFID_RTS25"],
        )
        assert n.quality.overall_score == 96.0
        assert "MAR_Art16" in n.regulatory_tags

    def test_version_hash(self):
        definition = {"id": "value_calculation", "layer": "transaction", "inputs": ["price", "quantity"]}
        version_hash = hashlib.sha256(json.dumps(definition, sort_keys=True).encode()).hexdigest()
        n = LineageNode(
            id="calc_chain:calculation:value_calculation:all",
            label="Value Calculation",
            node_type="calculation",
            version_hash=version_hash,
        )
        assert len(n.version_hash) == 64

    def test_weighted_edges(self):
        hard = LineageEdge(
            source="a", target="b", edge_type="calculation_dep", weight="hard",
        )
        soft = LineageEdge(
            source="b", target="c", edge_type="calculation_dep", weight="soft",
        )
        assert hard.weight == "hard"
        assert soft.weight == "soft"

    def test_all_edge_types(self):
        for t in ["tier_flow", "field_mapping", "calculation_dep", "model_input",
                   "alert_output", "entity_fk", "quality_gate", "setting_override",
                   "regulatory_req"]:
            e = LineageEdge(source="a", target="b", edge_type=t)
            assert e.edge_type == t

    def test_graph_construction(self):
        g = LineageGraph(
            nodes=[
                LineageNode(id="n1", label="Bronze", node_type="tier"),
                LineageNode(id="n2", label="Silver", node_type="tier"),
            ],
            edges=[
                LineageEdge(source="n1", target="n2", edge_type="tier_flow"),
            ],
            layers=["tier_flow"],
            total_nodes=2,
            total_edges=1,
        )
        assert g.total_nodes == 2
        assert g.total_edges == 1
        assert g.layers == ["tier_flow"]


# ─── ImpactAnalysis + FieldTrace ───

class TestImpactAnalysis:
    def test_basic_impact(self):
        origin = LineageNode(id="n1", label="Silver Execution", node_type="tier")
        ia = ImpactAnalysis(
            origin=origin,
            direction="downstream",
            affected_nodes=[
                LineageNode(id="n2", label="Gold Execution", node_type="tier"),
                LineageNode(id="n3", label="Value Calc", node_type="calculation"),
            ],
            affected_edges=[
                LineageEdge(source="n1", target="n2", edge_type="tier_flow"),
            ],
            impact_summary={"tier": 1, "calculation": 1},
            hard_impact_count=2,
            soft_impact_count=0,
            regulatory_impact=["MAR_Art16"],
        )
        assert ia.hard_impact_count == 2
        assert ia.soft_impact_count == 0
        assert len(ia.affected_nodes) == 2

    def test_field_trace(self):
        ft = FieldTrace(
            entity="execution",
            field="price",
            chain=[
                {"tier": "landing", "field_name": "price", "transform": "ingest", "data_type": "string", "quality_score": 100.0},
                {"tier": "bronze", "field_name": "price", "transform": "cast", "data_type": "decimal", "quality_score": 99.0},
                {"tier": "silver", "field_name": "exec_price", "transform": "normalize", "data_type": "decimal", "quality_score": 94.0},
                {"tier": "gold", "field_name": "exec_price", "transform": "validate", "data_type": "decimal", "quality_score": 96.0},
            ],
            regulatory_tags=["MAR_Art16", "MiFID_RTS25"],
        )
        assert len(ft.chain) == 4
        assert ft.chain[0]["tier"] == "landing"
        assert ft.chain[-1]["tier"] == "gold"


# ─── SurveillanceCoverage ───

class TestSurveillanceCoverage:
    def test_coverage_matrix(self):
        sc = SurveillanceCoverage(
            products=[{"id": "p1", "name": "ACME Corp", "asset_class": "equity"}],
            abuse_types=["wash_trading", "spoofing", "insider_dealing"],
            cells=[
                CoverageCell(product_id="p1", abuse_type="wash_trading", covered=True,
                             model_ids=["wash_full_day"], alert_count=3),
                CoverageCell(product_id="p1", abuse_type="spoofing", covered=False),
            ],
            coverage_pct=50.0,
            regulatory_gaps=[{"regulation": "MAR_Art16", "gap": "No spoofing coverage for equity products"}],
        )
        assert sc.coverage_pct == 50.0
        assert len(sc.cells) == 2
        assert sc.cells[0].covered is True
        assert sc.cells[1].covered is False

    def test_coverage_cell_with_regulations(self):
        c = CoverageCell(
            product_id="p1", abuse_type="wash_trading", covered=True,
            model_ids=["wash_full_day", "wash_intraday"],
            regulations=["MAR_Art16", "FINRA_Rule3110"],
        )
        assert len(c.regulations) == 2


# ─── SettingsImpactPreview ───

class TestSettingsImpactPreview:
    def test_what_if(self):
        sip = SettingsImpactPreview(
            setting_id="wash_trading_default",
            parameter="score_threshold",
            current_value=65.0,
            proposed_value=80.0,
            current_alert_count=14,
            projected_alert_count=6,
            delta=-8,
            affected_models=["wash_trading_full_day", "wash_trading_intraday"],
            affected_products=["p1", "p2", "p3"],
        )
        assert sip.delta == -8
        assert sip.projected_alert_count == 6


# ─── MetricSeries ───

class TestMetricSeries:
    def test_basic_metric(self):
        mp = MetricPoint(
            metric_id="m1", metric_type="execution_time",
            value=450.0, unit="ms", timestamp="2026-03-01T10:00:00Z",
        )
        assert mp.value == 450.0

    def test_metric_series(self):
        ms = MetricSeries(
            metric_id="pipeline_execution_time",
            metric_type="execution_time",
            entity="execution",
            tier="bronze",
            points=[
                MetricPoint(metric_id="p1", metric_type="execution_time", value=450.0, unit="ms", timestamp="2026-03-01T10:00:00Z"),
                MetricPoint(metric_id="p2", metric_type="execution_time", value=520.0, unit="ms", timestamp="2026-03-02T10:00:00Z"),
            ],
        )
        assert len(ms.points) == 2

    def test_all_metric_types(self):
        for t in ["execution_time", "throughput", "quality_score",
                   "sla_compliance", "record_count", "error_rate"]:
            mp = MetricPoint(metric_id="m", metric_type=t, value=1.0, timestamp="2026-03-01T10:00:00Z")
            assert mp.metric_type == t
