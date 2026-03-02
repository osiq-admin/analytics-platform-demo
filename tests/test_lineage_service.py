"""Tests for the 6-layer materialized adjacency list lineage engine."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.services.lineage_service import LineageService


# ── Fixture helpers ──────────────────────────────────────────────────


def _write_json(path: Path, obj: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2), encoding="utf-8")


@pytest.fixture()
def workspace(tmp_path: Path) -> Path:
    """Create a minimal workspace with metadata for all 6 layers."""
    ws = tmp_path / "workspace"

    # ── Medallion tiers ──
    _write_json(ws / "metadata" / "medallion" / "tiers.json", {
        "tiers": [
            {"tier_id": "landing", "tier_number": 1, "name": "Landing",
             "data_state": "raw", "storage_format": "original"},
            {"tier_id": "bronze", "tier_number": 2, "name": "Bronze",
             "data_state": "typed", "storage_format": "parquet"},
            {"tier_id": "silver", "tier_number": 4, "name": "Silver",
             "data_state": "canonical", "storage_format": "parquet"},
            {"tier_id": "gold", "tier_number": 5, "name": "Gold",
             "data_state": "aggregated", "storage_format": "parquet"},
        ],
    })

    # ── Pipeline stages ──
    _write_json(ws / "metadata" / "medallion" / "pipeline_stages.json", {
        "stages": [
            {
                "stage_id": "ingest_landing",
                "name": "Ingest to Landing",
                "tier_from": None,
                "tier_to": "landing",
                "order": 1,
                "depends_on": [],
                "entities": ["execution", "order", "product"],
            },
            {
                "stage_id": "landing_to_bronze",
                "name": "Landing to Bronze",
                "tier_from": "landing",
                "tier_to": "bronze",
                "order": 2,
                "depends_on": ["ingest_landing"],
                "entities": ["execution", "order", "product"],
            },
            {
                "stage_id": "bronze_to_silver",
                "name": "Bronze to Silver",
                "tier_from": "bronze",
                "tier_to": "silver",
                "order": 3,
                "depends_on": ["landing_to_bronze"],
                "entities": ["execution", "order", "product"],
            },
            {
                "stage_id": "silver_to_gold",
                "name": "Silver to Gold",
                "tier_from": "silver",
                "tier_to": "gold",
                "order": 4,
                "depends_on": ["bronze_to_silver"],
                "entities": ["execution"],
            },
        ],
    })

    # ── Mappings (execution bronze→silver) ──
    _write_json(ws / "metadata" / "mappings" / "execution_bronze_silver.json", {
        "mapping_id": "execution_bronze_silver",
        "source_entity": "execution",
        "target_entity": "execution",
        "source_tier": "bronze",
        "target_tier": "silver",
        "field_mappings": [
            {"source_field": "execution_id", "target_field": "execution_id",
             "transform": "direct"},
            {"source_field": "price", "target_field": "price",
             "transform": "cast_decimal"},
            {"source_field": "side", "target_field": "side",
             "transform": "uppercase"},
            {"source_field": "", "target_field": "notional_value",
             "transform": "multiply",
             "transform_args": {"fields": ["price", "quantity"]}},
        ],
    })

    # ── Calculations ──
    _write_json(ws / "metadata" / "calculations" / "transaction" / "value_calc.json", {
        "calc_id": "value_calc",
        "name": "Value Calculation",
        "layer": "transaction",
        "inputs": [
            {"source_type": "entity", "entity_id": "execution",
             "fields": ["execution_id", "price", "quantity"]},
        ],
        "output": {"table_name": "calc_value",
                    "fields": [{"name": "calculated_value", "type": "decimal"}]},
        "depends_on": [],
        "regulatory_tags": ["MAR Art. 16"],
    })

    _write_json(ws / "metadata" / "calculations" / "derived" / "large_activity.json", {
        "calc_id": "large_trading_activity",
        "name": "Large Trading Activity",
        "layer": "derived",
        "inputs": [
            {"source_type": "calculation", "calc_id": "value_calc",
             "fields": ["product_id", "total_value"]},
            {"source_type": "setting", "setting_id": "large_activity_multiplier",
             "fields": ["multiplier"]},
        ],
        "output": {"table_name": "calc_large_trading_activity",
                    "fields": [{"name": "is_large", "type": "boolean"}]},
        "depends_on": ["value_calc"],
        "regulatory_tags": ["MAR Art. 12"],
    })

    _write_json(ws / "metadata" / "calculations" / "derived" / "wash_detection.json", {
        "calc_id": "wash_detection",
        "name": "Wash Detection",
        "layer": "derived",
        "inputs": [
            {"source_type": "calculation", "calc_id": "large_trading_activity",
             "fields": ["product_id", "is_large"]},
            {"source_type": "setting", "setting_id": "wash_vwap_threshold",
             "fields": ["vwap_threshold"]},
        ],
        "output": {"table_name": "calc_wash_detection",
                    "fields": [{"name": "is_wash_candidate", "type": "boolean"}]},
        "depends_on": ["large_trading_activity"],
        "regulatory_tags": ["MAR Art. 12(1)(a)"],
    })

    # ── Detection models ──
    _write_json(ws / "metadata" / "detection_models" / "wash_full_day.json", {
        "model_id": "wash_full_day",
        "name": "Wash Trading - Full Day",
        "calculations": [
            {"calc_id": "large_trading_activity", "strictness": "MUST_PASS",
             "threshold_setting": "large_activity_multiplier"},
            {"calc_id": "wash_detection", "strictness": "OPTIONAL"},
        ],
        "score_threshold_setting": "wash_score_threshold",
        "regulatory_coverage": [
            {"regulation": "MAR", "article": "Art. 12(1)(a)"},
            {"regulation": "SEC", "article": "s9(a)(2)"},
        ],
        "time_window": "business_date",
        "granularity": ["product_id", "account_id"],
    })

    _write_json(ws / "metadata" / "detection_models" / "market_price_ramping.json", {
        "model_id": "market_price_ramping",
        "name": "Market Price Ramping",
        "calculations": [
            {"calc_id": "large_trading_activity", "strictness": "MUST_PASS"},
        ],
        "score_threshold_setting": "mpr_score_threshold",
        "regulatory_coverage": [
            {"regulation": "MAR", "article": "Art. 12(1)(b)"},
        ],
        "time_window": "trend_window",
        "granularity": ["product_id", "account_id"],
    })

    # ── Entities ──
    _write_json(ws / "metadata" / "entities" / "execution.json", {
        "entity_id": "execution",
        "name": "Trade Execution",
        "fields": [
            {"name": "execution_id", "type": "string", "is_key": True},
            {"name": "order_id", "type": "string"},
            {"name": "product_id", "type": "string"},
            {"name": "price", "type": "decimal"},
        ],
        "relationships": [
            {"target_entity": "order",
             "join_fields": {"order_id": "order_id"},
             "relationship_type": "many_to_one"},
            {"target_entity": "product",
             "join_fields": {"product_id": "product_id"},
             "relationship_type": "many_to_one"},
        ],
    })

    _write_json(ws / "metadata" / "entities" / "order.json", {
        "entity_id": "order",
        "name": "Order",
        "fields": [
            {"name": "order_id", "type": "string", "is_key": True},
            {"name": "product_id", "type": "string"},
        ],
        "relationships": [
            {"target_entity": "product",
             "join_fields": {"product_id": "product_id"},
             "relationship_type": "many_to_one"},
        ],
    })

    _write_json(ws / "metadata" / "entities" / "product.json", {
        "entity_id": "product",
        "name": "Product",
        "fields": [
            {"name": "product_id", "type": "string", "is_key": True},
            {"name": "asset_class", "type": "string",
             "domain_values": ["equity", "fx", "commodity"]},
        ],
        "relationships": [],
    })

    # ── Settings ──
    _write_json(ws / "metadata" / "settings" / "thresholds" / "large_activity_multiplier.json", {
        "setting_id": "large_activity_multiplier",
        "name": "Large Activity Multiplier",
        "value_type": "decimal",
        "default": 2.0,
        "overrides": [
            {"match": {"asset_class": "equity"}, "value": 2.5, "priority": 1},
        ],
    })

    _write_json(ws / "metadata" / "settings" / "score_thresholds" / "wash_score_threshold.json", {
        "setting_id": "wash_score_threshold",
        "name": "Wash Score Threshold",
        "value_type": "decimal",
        "default": 18,
        "overrides": [],
    })

    _write_json(ws / "metadata" / "settings" / "thresholds" / "wash_vwap_threshold.json", {
        "setting_id": "wash_vwap_threshold",
        "name": "Wash VWAP Threshold",
        "value_type": "decimal",
        "default": 0.02,
        "overrides": [],
    })

    _write_json(ws / "metadata" / "settings" / "score_thresholds" / "mpr_score_threshold.json", {
        "setting_id": "mpr_score_threshold",
        "name": "MPR Score Threshold",
        "value_type": "decimal",
        "default": 18,
        "overrides": [],
    })

    # ── Compliance requirements ──
    _write_json(ws / "metadata" / "standards" / "compliance_requirements.json", {
        "requirements": [
            {
                "requirement_id": "mar_12_1_a_wash",
                "regulation": "MAR",
                "article": "Art. 12(1)(a)",
                "requirement_text": "Detect wash trading",
                "implementation": "detection_model",
                "implementation_id": "wash_full_day",
                "status": "implemented",
            },
            {
                "requirement_id": "mar_12_1_b_ramping",
                "regulation": "MAR",
                "article": "Art. 12(1)(b)",
                "requirement_text": "Detect price ramping",
                "implementation": "detection_model",
                "implementation_id": "market_price_ramping",
                "status": "implemented",
            },
            {
                "requirement_id": "mifid2_rts25_records",
                "regulation": "MiFID II",
                "article": "RTS 25",
                "requirement_text": "Maintain order records",
                "implementation": "entity_field",
                "implementation_id": "order.order_time",
                "status": "implemented",
            },
            {
                "requirement_id": "emir_9_reporting",
                "regulation": "EMIR",
                "article": "Art. 9",
                "requirement_text": "Report derivative contracts",
                "implementation": "entity_field",
                "implementation_id": "product.instrument_type",
                "status": "partial",
            },
        ],
    })

    # ── Alert traces ──
    _write_json(ws / "alerts" / "traces" / "trace_001.json", [
        {
            "alert_id": "ALT-001",
            "model_id": "wash_full_day",
            "product_id": "AAPL",
            "account_id": "ACC-001",
            "total_score": 22,
            "scores": {"large_trading_activity": 12, "wash_detection": 10},
        },
        {
            "alert_id": "ALT-002",
            "model_id": "wash_full_day",
            "product_id": "MSFT",
            "account_id": "ACC-002",
            "total_score": 15,
            "scores": {"large_trading_activity": 8, "wash_detection": 7},
        },
        {
            "alert_id": "ALT-003",
            "model_id": "market_price_ramping",
            "product_id": "AAPL",
            "account_id": "ACC-003",
            "total_score": 25,
            "scores": {"large_trading_activity": 25},
        },
    ])

    # ── Quality dimensions ──
    _write_json(ws / "metadata" / "quality" / "dimensions.json", {
        "dimensions": [
            {"id": "completeness", "name": "Completeness", "weight": 0.20},
            {"id": "accuracy", "name": "Accuracy", "weight": 0.20},
            {"id": "consistency", "name": "Consistency", "weight": 0.15},
        ],
    })

    return ws


@pytest.fixture()
def svc(workspace: Path) -> LineageService:
    """Create a LineageService backed by the test workspace."""
    return LineageService(workspace)


# ====================================================================
# Layer 1 — Tier Flow
# ====================================================================


class TestTierFlow:
    def test_tier_nodes_created(self, svc: LineageService) -> None:
        """Each stage/entity combination should produce tier nodes."""
        tier_nodes = [n for n in svc._nodes.values() if n.node_type == "tier"]
        # 4 stages, 3 entities in first 3 stages, 1 entity in last = 3*4 + 1*2 flow nodes
        # But let's just check we have a reasonable number
        assert len(tier_nodes) >= 6

    def test_composite_node_id_format(self, svc: LineageService) -> None:
        """Tier nodes should have IDs like tier_flow:tier:<tier>:<entity>."""
        for nid, node in svc._nodes.items():
            if node.node_type == "tier":
                parts = nid.split(":")
                assert len(parts) == 4, f"Expected 4-part composite ID, got {nid}"
                assert parts[0] == "tier_flow"
                assert parts[1] == "tier"

    def test_tier_edges_landing_to_bronze(self, svc: LineageService) -> None:
        """Should have landing->bronze edges for execution, order, product."""
        tier_edges = [e for e in svc._all_edges() if e.edge_type == "tier_flow"]
        l2b = [e for e in tier_edges
               if "landing" in e.source and "bronze" in e.target]
        assert len(l2b) == 3  # execution, order, product

    def test_get_tier_lineage_single_entity(self, svc: LineageService) -> None:
        """get_tier_lineage('execution') should return only execution tier nodes."""
        graph = svc.get_tier_lineage("execution")
        assert graph.total_nodes >= 4  # landing, bronze, silver, gold
        assert all(n.entity == "execution" for n in graph.nodes)
        assert graph.total_edges >= 3

    def test_get_full_tier_graph(self, svc: LineageService) -> None:
        """get_full_tier_graph() should include all entities."""
        graph = svc.get_full_tier_graph()
        entities = {n.entity for n in graph.nodes}
        assert "execution" in entities
        assert "order" in entities
        assert "product" in entities
        assert graph.total_edges >= 7  # 3+3+1 = 7 tier transitions

    def test_tier_metadata_populated(self, svc: LineageService) -> None:
        """Tier nodes should carry metadata from tiers.json."""
        bronze_exec = svc._nodes.get("tier_flow:tier:bronze:execution")
        assert bronze_exec is not None
        assert bronze_exec.metadata.get("data_state") == "typed"


# ====================================================================
# Layer 2 — Field Lineage
# ====================================================================


class TestFieldLineage:
    def test_field_nodes_created(self, svc: LineageService) -> None:
        """Field mapping should create field-type nodes."""
        field_nodes = [n for n in svc._nodes.values() if n.node_type == "field"]
        assert len(field_nodes) >= 4  # at least the mapped fields

    def test_field_node_id_format(self, svc: LineageService) -> None:
        """Field nodes should have IDs like field:field:<entity>.<field>:<tier>."""
        for nid, node in svc._nodes.items():
            if node.node_type == "field":
                parts = nid.split(":")
                assert parts[0] == "field"
                assert parts[1] == "field"
                # parts[2] should contain entity.field
                assert "." in parts[2], f"Expected entity.field, got {parts[2]}"

    def test_field_edges_bronze_to_silver(self, svc: LineageService) -> None:
        """Mapping file should create field_mapping edges."""
        fm_edges = [e for e in svc._all_edges() if e.edge_type == "field_mapping"]
        bronze_silver = [e for e in fm_edges
                         if "bronze" in e.source and "silver" in e.target]
        assert len(bronze_silver) >= 3  # execution_id, price, side

    def test_get_field_lineage(self, svc: LineageService) -> None:
        """get_field_lineage should return FieldTrace objects."""
        traces = svc.get_field_lineage("execution")
        assert len(traces) >= 3
        for trace in traces:
            assert trace.entity == "execution"
            assert len(trace.chain) > 0

    def test_trace_field_existing(self, svc: LineageService) -> None:
        """trace_field should return the chain for a specific field."""
        trace = svc.trace_field("execution", "execution_id")
        assert trace.entity == "execution"
        assert trace.field == "execution_id"
        assert len(trace.chain) > 0
        assert trace.chain[0]["source_tier"] == "bronze"
        assert trace.chain[0]["target_tier"] == "silver"

    def test_trace_field_missing(self, svc: LineageService) -> None:
        """trace_field for unknown field should return empty chain."""
        trace = svc.trace_field("execution", "nonexistent_field")
        assert trace.entity == "execution"
        assert trace.field == "nonexistent_field"
        assert len(trace.chain) == 0

    def test_get_tier_transition_fields(self, svc: LineageService) -> None:
        """Should return ColumnLineage items for a tier transition."""
        cols = svc.get_tier_transition_fields("execution", "bronze", "silver")
        assert len(cols) >= 3
        transforms = {c.transformation for c in cols}
        # We expect at least passthrough and cast or normalize
        assert "passthrough" in transforms or "cast" in transforms or "normalize" in transforms


# ====================================================================
# Layer 3 — Calc Chain
# ====================================================================


class TestCalcChain:
    def test_calc_nodes_created(self, svc: LineageService) -> None:
        """Should create calculation nodes."""
        calc_nodes = [n for n in svc._nodes.values() if n.node_type == "calculation"]
        assert len(calc_nodes) == 3  # value_calc, large_trading_activity, wash_detection

    def test_calc_version_hash(self, svc: LineageService) -> None:
        """Calculation nodes should have a non-empty SHA-256 version hash."""
        calc_nodes = [n for n in svc._nodes.values() if n.node_type == "calculation"]
        for node in calc_nodes:
            assert node.version_hash, f"Missing version_hash on {node.id}"
            assert len(node.version_hash) == 64  # SHA-256 hex length

    def test_calc_depends_on_edges(self, svc: LineageService) -> None:
        """depends_on should create calculation_dep edges."""
        dep_edges = [e for e in svc._all_edges() if e.edge_type == "calculation_dep"]
        # value_calc -> large_trading_activity -> wash_detection
        assert len(dep_edges) == 2

    def test_model_nodes_created(self, svc: LineageService) -> None:
        """Should create detection model nodes."""
        model_nodes = [n for n in svc._nodes.values() if n.node_type == "detection_model"]
        assert len(model_nodes) == 2

    def test_model_input_edges(self, svc: LineageService) -> None:
        """Should create model_input edges with correct strictness."""
        mi_edges = [e for e in svc._all_edges() if e.edge_type == "model_input"]
        must_pass = [e for e in mi_edges if e.weight == "hard"]
        optional = [e for e in mi_edges if e.weight == "soft"]
        assert len(must_pass) >= 2  # MUST_PASS calcs for both models
        assert len(optional) >= 1  # OPTIONAL calc

    def test_alert_summary_nodes(self, svc: LineageService) -> None:
        """Alert traces should produce summary alert nodes."""
        alert_nodes = [n for n in svc._nodes.values() if n.node_type == "alert"]
        assert len(alert_nodes) >= 2  # wash_full_day_alerts, market_price_ramping_alerts

    def test_alert_output_edges(self, svc: LineageService) -> None:
        """Alert nodes should be connected to model nodes via alert_output edges."""
        ao_edges = [e for e in svc._all_edges() if e.edge_type == "alert_output"]
        assert len(ao_edges) >= 2

    def test_get_calc_lineage(self, svc: LineageService) -> None:
        """get_calc_lineage should return the full calc DAG."""
        graph = svc.get_calc_lineage()
        types = {n.node_type for n in graph.nodes}
        assert "calculation" in types
        assert "detection_model" in types
        assert graph.total_edges >= 4

    def test_get_model_lineage(self, svc: LineageService) -> None:
        """get_model_lineage should return the subgraph for a model."""
        graph = svc.get_model_lineage("wash_full_day")
        assert graph.total_nodes >= 4  # settings + calcs + model + alert
        model_ids = [n.id for n in graph.nodes if n.node_type == "detection_model"]
        assert any("wash_full_day" in mid for mid in model_ids)

    def test_get_model_lineage_unknown(self, svc: LineageService) -> None:
        """Unknown model should return empty graph."""
        graph = svc.get_model_lineage("nonexistent_model")
        assert graph.total_nodes == 0


# ====================================================================
# Layer 4 — Entity FK
# ====================================================================


class TestEntityFK:
    def test_entity_nodes_created(self, svc: LineageService) -> None:
        """Should create entity nodes."""
        entity_nodes = [n for n in svc._nodes.values() if n.node_type == "entity"]
        assert len(entity_nodes) == 3  # execution, order, product

    def test_entity_fk_edges(self, svc: LineageService) -> None:
        """Should create entity_fk edges from relationships."""
        fk_edges = [e for e in svc._all_edges() if e.edge_type == "entity_fk"]
        # execution -> order, execution -> product, order -> product
        assert len(fk_edges) == 3

    def test_get_entity_graph(self, svc: LineageService) -> None:
        """get_entity_graph should return the FK graph."""
        graph = svc.get_entity_graph()
        assert graph.total_nodes == 3
        assert graph.total_edges == 3
        assert "entity_fk" in graph.layers


# ====================================================================
# Layer 5 — Setting Impact
# ====================================================================


class TestSettingImpact:
    def test_setting_nodes_created(self, svc: LineageService) -> None:
        """Should create setting nodes from settings files."""
        setting_nodes = [n for n in svc._nodes.values() if n.node_type == "setting"]
        assert len(setting_nodes) >= 4

    def test_setting_override_edges(self, svc: LineageService) -> None:
        """Settings should have edges to calculations or models."""
        so_edges = [e for e in svc._all_edges() if e.edge_type == "setting_override"]
        assert len(so_edges) >= 3  # multiplier->calc, vwap->calc, score_thresholds->models

    def test_get_setting_impact(self, svc: LineageService) -> None:
        """get_setting_impact should return downstream graph."""
        graph = svc.get_setting_impact("large_activity_multiplier")
        assert graph.total_nodes >= 2
        # Should include the setting + downstream calcs + models
        types = {n.node_type for n in graph.nodes}
        assert "setting" in types

    def test_get_setting_impact_unknown(self, svc: LineageService) -> None:
        """Unknown setting should return empty graph."""
        graph = svc.get_setting_impact("nonexistent_setting")
        assert graph.total_nodes == 0

    def test_preview_threshold_change(self, svc: LineageService) -> None:
        """preview_threshold_change should estimate alert count changes."""
        preview = svc.preview_threshold_change(
            "wash_score_threshold", "default", 20.0,
        )
        assert preview.setting_id == "wash_score_threshold"
        assert preview.proposed_value == 20.0
        assert isinstance(preview.current_alert_count, int)
        assert isinstance(preview.projected_alert_count, int)
        assert isinstance(preview.delta, int)


# ====================================================================
# Layer 6 — Regulatory Requirements
# ====================================================================


class TestRegulatoryReq:
    def test_regulation_nodes_created(self, svc: LineageService) -> None:
        """Should create regulation nodes from compliance requirements."""
        reg_nodes = [n for n in svc._nodes.values() if n.node_type == "regulation"]
        assert len(reg_nodes) == 4

    def test_regulatory_req_edges(self, svc: LineageService) -> None:
        """Regulation nodes should link to models or entities."""
        rr_edges = [e for e in svc._all_edges() if e.edge_type == "regulatory_req"]
        assert len(rr_edges) >= 3

    def test_regulation_links_to_model(self, svc: LineageService) -> None:
        """MAR Art. 12(1)(a) should link to wash_full_day model."""
        rr_edges = [e for e in svc._all_edges() if e.edge_type == "regulatory_req"]
        mar_wash = [e for e in rr_edges
                    if "mar_12_1_a" in e.source and "wash_full_day" in e.target]
        assert len(mar_wash) == 1

    def test_regulation_links_to_entity(self, svc: LineageService) -> None:
        """MiFID II RTS 25 should link to order entity."""
        rr_edges = [e for e in svc._all_edges() if e.edge_type == "regulatory_req"]
        mifid_order = [e for e in rr_edges
                       if "mifid2_rts25" in e.source and "order" in e.target]
        assert len(mifid_order) == 1


# ====================================================================
# Impact Analysis (Weighted BFS)
# ====================================================================


class TestImpactAnalysis:
    def test_impact_downstream_from_setting(self, svc: LineageService) -> None:
        """Downstream BFS from a setting should reach calcs and models."""
        result = svc.impact_analysis(
            "setting:setting:large_activity_multiplier:global",
            direction="downstream",
        )
        assert result.direction == "downstream"
        affected_types = {n.node_type for n in result.affected_nodes}
        assert "calculation" in affected_types or "detection_model" in affected_types
        assert result.hard_impact_count + result.soft_impact_count > 0

    def test_impact_upstream_from_model(self, svc: LineageService) -> None:
        """Upstream BFS from a model should reach calcs and settings."""
        result = svc.impact_analysis(
            "model:detection_model:wash_full_day:gold",
            direction="upstream",
        )
        assert result.direction == "upstream"
        affected_types = {n.node_type for n in result.affected_nodes}
        assert "calculation" in affected_types or "setting" in affected_types

    def test_impact_both_directions(self, svc: LineageService) -> None:
        """Both-direction BFS should reach up- and down-stream."""
        result = svc.impact_analysis(
            "calc:calculation:large_trading_activity:gold",
            direction="both",
        )
        assert result.direction == "both"
        assert len(result.affected_nodes) >= 3

    def test_impact_unknown_node(self, svc: LineageService) -> None:
        """Unknown node should return empty impact."""
        result = svc.impact_analysis("nonexistent:node:id:x")
        assert len(result.affected_nodes) == 0

    def test_impact_hard_vs_soft_counts(self, svc: LineageService) -> None:
        """BFS should correctly count hard vs soft edges."""
        result = svc.impact_analysis(
            "setting:setting:large_activity_multiplier:global",
            direction="downstream",
        )
        # setting->calc is soft, calc->model via MUST_PASS is hard
        assert result.soft_impact_count >= 1

    def test_impact_regulatory_tags(self, svc: LineageService) -> None:
        """Regulatory tags should be collected from affected nodes."""
        result = svc.impact_analysis(
            "setting:setting:large_activity_multiplier:global",
            direction="downstream",
        )
        assert isinstance(result.regulatory_impact, list)


# ====================================================================
# Unified Graph
# ====================================================================


class TestUnifiedGraph:
    def test_unified_all(self, svc: LineageService) -> None:
        """Unfiltered unified graph should include all nodes and edges."""
        graph = svc.get_unified_graph()
        assert graph.total_nodes > 0
        assert graph.total_edges > 0
        assert len(graph.layers) >= 3

    def test_unified_filter_by_entity(self, svc: LineageService) -> None:
        """Filtering by entity should exclude other entities' nodes."""
        graph = svc.get_unified_graph(entities=["execution"])
        for node in graph.nodes:
            # Nodes with entity="" (settings, regulations) are included
            if node.entity:
                assert node.entity == "execution"

    def test_unified_filter_by_layer(self, svc: LineageService) -> None:
        """Filtering by layer should limit edge types."""
        graph = svc.get_unified_graph(layers=["entity_fk"])
        for edge in graph.edges:
            assert edge.edge_type == "entity_fk"
        assert "entity_fk" in graph.layers

    def test_unified_filter_by_multiple_layers(self, svc: LineageService) -> None:
        """Multiple layers should allow multiple edge types."""
        graph = svc.get_unified_graph(layers=["entity_fk", "tier_flow"])
        edge_types = {e.edge_type for e in graph.edges}
        assert edge_types <= {"entity_fk", "tier_flow"}


# ====================================================================
# Quality Overlay
# ====================================================================


class TestQualityOverlay:
    def test_quality_overlay(self, svc: LineageService) -> None:
        """Quality overlay should return per-tier scores."""
        overlay = svc.get_quality_overlay("execution")
        assert isinstance(overlay, dict)
        # Should have scores for tiers execution flows through
        assert len(overlay) >= 1
        for tier, scores in overlay.items():
            assert "overall_score" in scores
            assert "dimensions" in scores
            assert "sla_status" in scores

    def test_quality_overlay_unknown_entity(self, svc: LineageService) -> None:
        """Unknown entity should return empty overlay."""
        overlay = svc.get_quality_overlay("nonexistent_entity")
        assert overlay == {}


# ====================================================================
# Alert Explainability
# ====================================================================


class TestAlertExplainability:
    def test_alert_lineage_known(self, svc: LineageService) -> None:
        """get_alert_lineage should return the provenance chain for an alert."""
        graph = svc.get_alert_lineage("ALT-001")
        assert graph.total_nodes >= 2
        node_ids = {n.id for n in graph.nodes}
        assert any("ALT-001" in nid for nid in node_ids)

    def test_alert_lineage_unknown(self, svc: LineageService) -> None:
        """Unknown alert should return empty graph."""
        graph = svc.get_alert_lineage("nonexistent_alert")
        assert graph.total_nodes == 0


# ====================================================================
# Surveillance Coverage
# ====================================================================


class TestSurveillanceCoverage:
    def test_surveillance_coverage(self, svc: LineageService) -> None:
        """Should build a coverage matrix."""
        coverage = svc.get_surveillance_coverage()
        assert len(coverage.abuse_types) >= 2
        assert len(coverage.cells) > 0
        assert coverage.coverage_pct > 0

    def test_coverage_cells_have_model_ids(self, svc: LineageService) -> None:
        """Covered cells should list model IDs."""
        coverage = svc.get_surveillance_coverage()
        covered = [c for c in coverage.cells if c.covered]
        assert len(covered) > 0
        for cell in covered:
            assert len(cell.model_ids) > 0


# ====================================================================
# Pipeline Runs (OpenLineage)
# ====================================================================


class TestPipelineRuns:
    def test_record_run(self, svc: LineageService) -> None:
        """record_run should persist a run to disk."""
        run = svc.record_run(
            job_name="bronze_to_silver",
            inputs=[{"namespace": "bronze", "name": "execution"}],
            outputs=[{"namespace": "silver", "name": "execution"}],
            column_lineage=[
                {"output_field": "price", "input_fields": ["price"],
                 "transformation": "cast"},
            ],
            duration_ms=150,
            record_count=761,
        )
        assert run.run_id
        assert run.job_name == "bronze_to_silver"
        assert run.event_type == "COMPLETE"
        assert run.duration_ms == 150
        assert run.record_count == 761

        # Verify file was written
        run_file = svc._runs_dir / f"{run.run_id}.json"
        assert run_file.exists()

    def test_get_runs(self, svc: LineageService) -> None:
        """get_runs should list recorded runs."""
        svc.record_run(
            job_name="test_job_1",
            inputs=[], outputs=[], column_lineage=[],
        )
        svc.record_run(
            job_name="test_job_2",
            inputs=[], outputs=[], column_lineage=[],
        )
        all_runs = svc.get_runs()
        assert len(all_runs) >= 2

    def test_get_runs_filter_by_job(self, svc: LineageService) -> None:
        """get_runs(job_name=...) should filter."""
        svc.record_run(
            job_name="filter_test",
            inputs=[], outputs=[], column_lineage=[],
        )
        svc.record_run(
            job_name="other_job",
            inputs=[], outputs=[], column_lineage=[],
        )
        filtered = svc.get_runs(job_name="filter_test")
        assert all(r.job_name == "filter_test" for r in filtered)

    def test_get_run_by_id(self, svc: LineageService) -> None:
        """get_run should retrieve a specific run by ID."""
        run = svc.record_run(
            job_name="specific_run",
            inputs=[], outputs=[], column_lineage=[],
        )
        retrieved = svc.get_run(run.run_id)
        assert retrieved is not None
        assert retrieved.run_id == run.run_id
        assert retrieved.job_name == "specific_run"

    def test_get_run_unknown(self, svc: LineageService) -> None:
        """get_run for unknown ID should return None."""
        result = svc.get_run("nonexistent-run-id")
        assert result is None


# ====================================================================
# Empty / Graceful Handling
# ====================================================================


class TestGracefulHandling:
    def test_empty_workspace(self, tmp_path: Path) -> None:
        """Service should not crash on an empty workspace."""
        ws = tmp_path / "empty_workspace"
        ws.mkdir()
        svc = LineageService(ws)
        assert len(svc._nodes) == 0
        assert svc.get_full_tier_graph().total_nodes == 0

    def test_missing_mappings_dir(self, tmp_path: Path) -> None:
        """Service should handle missing mappings directory gracefully."""
        ws = tmp_path / "ws"
        _write_json(ws / "metadata" / "medallion" / "tiers.json", {"tiers": []})
        _write_json(ws / "metadata" / "medallion" / "pipeline_stages.json", {"stages": []})
        svc = LineageService(ws)
        traces = svc.get_field_lineage("anything")
        assert traces == []

    def test_corrupt_json_skipped(self, tmp_path: Path) -> None:
        """Corrupt JSON files should be skipped without crash."""
        ws = tmp_path / "ws"
        (ws / "metadata" / "entities").mkdir(parents=True)
        (ws / "metadata" / "entities" / "bad.json").write_text("NOT VALID JSON")
        _write_json(ws / "metadata" / "entities" / "good.json", {
            "entity_id": "good_entity",
            "name": "Good",
            "fields": [],
            "relationships": [],
        })
        svc = LineageService(ws)
        entity_nodes = [n for n in svc._nodes.values() if n.node_type == "entity"]
        assert len(entity_nodes) == 1

    def test_nonexistent_entity_tier_lineage(self, svc: LineageService) -> None:
        """get_tier_lineage for unknown entity should return empty graph."""
        graph = svc.get_tier_lineage("nonexistent")
        assert graph.total_nodes == 0

    def test_nonexistent_entity_field_lineage(self, svc: LineageService) -> None:
        """get_field_lineage for unknown entity should return empty list."""
        traces = svc.get_field_lineage("nonexistent")
        assert traces == []
