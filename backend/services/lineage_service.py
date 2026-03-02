"""6-layer materialized adjacency list lineage engine.

Builds an in-memory graph on startup from workspace metadata, then serves
graph queries with zero I/O.  Every node carries a composite ID
``{layer}:{type}:{name}:{tier}`` to avoid collisions across the six layers:

1. Tier flow       (pipeline_stages + tiers)
2. Field lineage   (mappings + calculation I/O)
3. Calc chain      (calculations + detection_models + alert traces)
4. Entity FK       (entity relationships)
5. Setting impact  (settings -> calculations -> models)
6. Regulatory req  (compliance requirements -> entities / models)

All public methods return Pydantic models from ``backend.models.observability``.
"""

from __future__ import annotations

import hashlib
import json
import logging
import uuid
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path

from backend.models.observability import (
    ColumnLineage,
    CoverageCell,
    FieldTrace,
    ImpactAnalysis,
    LineageDataset,
    LineageEdge,
    LineageGraph,
    LineageNode,
    LineageRun,
    QualityOverlayData,
    SettingsImpactPreview,
    SurveillanceCoverage,
)

log = logging.getLogger(__name__)


def _safe_load(path: Path) -> dict | list | None:
    """Load a JSON file, returning *None* on any error."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _version_hash(definition: dict) -> str:
    return hashlib.sha256(
        json.dumps(definition, sort_keys=True).encode()
    ).hexdigest()


class LineageService:
    """6-layer materialized adjacency list lineage engine."""

    def __init__(self, workspace_dir: str | Path):
        self._workspace = Path(workspace_dir)
        self._nodes: dict[str, LineageNode] = {}
        self._forward: dict[str, list[LineageEdge]] = defaultdict(list)
        self._reverse: dict[str, list[LineageEdge]] = defaultdict(list)
        self._field_traces: dict[str, dict[str, FieldTrace]] = defaultdict(dict)
        self._runs_dir = self._workspace / "lineage" / "runs"
        self._runs_dir.mkdir(parents=True, exist_ok=True)
        self._rebuild()

    # ── graph helpers ─────────────────────────────────────────────────

    def _add_node(self, node: LineageNode) -> None:
        if node.id not in self._nodes:
            self._nodes[node.id] = node

    def _add_edge(self, edge: LineageEdge) -> None:
        # Deduplicate by (source, target, edge_type)
        key = (edge.source, edge.target, edge.edge_type)
        for existing in self._forward.get(edge.source, []):
            if (existing.source, existing.target, existing.edge_type) == key:
                return
        self._forward[edge.source].append(edge)
        self._reverse[edge.target].append(edge)

    def _rebuild(self) -> None:
        """Build all six layers from disk metadata."""
        self._build_tier_flow()
        self._build_field_lineage()
        self._build_calc_chain()
        self._build_entity_fk()
        self._build_setting_impact()
        self._build_regulatory_req()

    # ================================================================
    # Layer 1 — Tier Flow
    # ================================================================

    def _build_tier_flow(self) -> None:
        stages_path = self._workspace / "metadata" / "medallion" / "pipeline_stages.json"
        tiers_path = self._workspace / "metadata" / "medallion" / "tiers.json"

        stages_data = _safe_load(stages_path)
        tiers_data = _safe_load(tiers_path)

        tier_info: dict[str, dict] = {}
        if tiers_data and isinstance(tiers_data, dict):
            for t in tiers_data.get("tiers", []):
                tier_info[t["tier_id"]] = t

        if not stages_data or not isinstance(stages_data, dict):
            return

        for stage in stages_data.get("stages", []):
            tier_from = stage.get("tier_from")
            tier_to = stage.get("tier_to")
            entities = stage.get("entities", [])

            for entity in entities:
                # Create target-tier node (always exists)
                if tier_to:
                    target_id = f"tier_flow:tier:{tier_to}:{entity}"
                    ti = tier_info.get(tier_to, {})
                    self._add_node(LineageNode(
                        id=target_id,
                        label=f"{entity} @ {tier_to}",
                        node_type="tier",
                        tier=tier_to,
                        entity=entity,
                        metadata={
                            "stage_id": stage.get("stage_id", ""),
                            "data_state": ti.get("data_state", ""),
                            "storage_format": ti.get("storage_format", ""),
                        },
                    ))

                # Create source-tier node (if exists)
                if tier_from:
                    source_id = f"tier_flow:tier:{tier_from}:{entity}"
                    si = tier_info.get(tier_from, {})
                    self._add_node(LineageNode(
                        id=source_id,
                        label=f"{entity} @ {tier_from}",
                        node_type="tier",
                        tier=tier_from,
                        entity=entity,
                        metadata={
                            "data_state": si.get("data_state", ""),
                            "storage_format": si.get("storage_format", ""),
                        },
                    ))

                # Edge: source → target
                if tier_from and tier_to:
                    self._add_edge(LineageEdge(
                        source=f"tier_flow:tier:{tier_from}:{entity}",
                        target=f"tier_flow:tier:{tier_to}:{entity}",
                        edge_type="tier_flow",
                        weight="hard",
                        label=stage.get("name", ""),
                        metadata={"stage_id": stage.get("stage_id", "")},
                    ))

    # ================================================================
    # Layer 2 — Field Lineage
    # ================================================================

    def _build_field_lineage(self) -> None:
        mappings_dir = self._workspace / "metadata" / "mappings"
        if not mappings_dir.is_dir():
            return

        for mp in sorted(mappings_dir.glob("*.json")):
            data = _safe_load(mp)
            if not data:
                continue
            source_entity = data.get("source_entity", "")
            target_entity = data.get("target_entity", "")
            source_tier = data.get("source_tier", "")
            target_tier = data.get("target_tier", "")

            for fm in data.get("field_mappings", []):
                src_field = fm.get("source_field", "")
                tgt_field = fm.get("target_field", "")
                transform = fm.get("transform", "direct")

                if tgt_field:
                    # Source node
                    if src_field:
                        src_id = f"field:field:{source_entity}.{src_field}:{source_tier}"
                        self._add_node(LineageNode(
                            id=src_id,
                            label=f"{source_entity}.{src_field}",
                            node_type="field",
                            tier=source_tier,
                            entity=source_entity,
                        ))
                    # Target node
                    tgt_id = f"field:field:{target_entity}.{tgt_field}:{target_tier}"
                    self._add_node(LineageNode(
                        id=tgt_id,
                        label=f"{target_entity}.{tgt_field}",
                        node_type="field",
                        tier=target_tier,
                        entity=target_entity,
                    ))

                    if src_field:
                        self._add_edge(LineageEdge(
                            source=src_id,
                            target=tgt_id,
                            edge_type="field_mapping",
                            weight="hard",
                            label=transform,
                            metadata={"transform": transform},
                        ))

                    # Build field trace
                    self._field_traces[target_entity][tgt_field] = FieldTrace(
                        entity=target_entity,
                        field=tgt_field,
                        chain=[{
                            "source_entity": source_entity,
                            "source_field": src_field,
                            "source_tier": source_tier,
                            "target_tier": target_tier,
                            "transform": transform,
                        }],
                    )

        # Also build field traces from calculation inputs/outputs
        calcs_dir = self._workspace / "metadata" / "calculations"
        if not calcs_dir.is_dir():
            return

        for cp in sorted(calcs_dir.rglob("*.json")):
            data = _safe_load(cp)
            if not data:
                continue
            calc_id = data.get("calc_id", "")
            output = data.get("output", {})
            output_table = output.get("table_name", "")

            for inp in data.get("inputs", []):
                if inp.get("source_type") == "entity":
                    entity_id = inp.get("entity_id", "")
                    for field_name in inp.get("fields", []):
                        src_id = f"field:field:{entity_id}.{field_name}:silver"
                        tgt_id = f"field:field:{output_table}.{field_name}:gold"
                        self._add_node(LineageNode(
                            id=src_id,
                            label=f"{entity_id}.{field_name}",
                            node_type="field",
                            tier="silver",
                            entity=entity_id,
                        ))
                        self._add_node(LineageNode(
                            id=tgt_id,
                            label=f"{output_table}.{field_name}",
                            node_type="field",
                            tier="gold",
                            entity=output_table,
                        ))
                        self._add_edge(LineageEdge(
                            source=src_id,
                            target=tgt_id,
                            edge_type="field_mapping",
                            weight="hard",
                            label=f"calc:{calc_id}",
                        ))

    # ================================================================
    # Layer 3 — Calc Chain
    # ================================================================

    def _build_calc_chain(self) -> None:
        calcs_dir = self._workspace / "metadata" / "calculations"
        models_dir = self._workspace / "metadata" / "detection_models"
        traces_dir = self._workspace / "alerts" / "traces"

        # ── Calculations ──
        calc_defs: dict[str, dict] = {}
        if calcs_dir.is_dir():
            for cp in sorted(calcs_dir.rglob("*.json")):
                data = _safe_load(cp)
                if not data or "calc_id" not in data:
                    continue
                calc_id = data["calc_id"]
                calc_defs[calc_id] = data

                self._add_node(LineageNode(
                    id=f"calc:calculation:{calc_id}:gold",
                    label=data.get("name", calc_id),
                    node_type="calculation",
                    tier="gold",
                    version_hash=_version_hash(data),
                    regulatory_tags=data.get("regulatory_tags", []),
                    metadata={
                        "layer": data.get("layer", ""),
                        "output_table": data.get("output", {}).get("table_name", ""),
                    },
                ))

        # Wire calc depends_on
        for calc_id, data in calc_defs.items():
            for dep in data.get("depends_on", []):
                if dep in calc_defs:
                    self._add_edge(LineageEdge(
                        source=f"calc:calculation:{dep}:gold",
                        target=f"calc:calculation:{calc_id}:gold",
                        edge_type="calculation_dep",
                        weight="hard",
                        label="depends_on",
                    ))

            # Setting inputs create soft edges
            for inp in data.get("inputs", []):
                if inp.get("source_type") == "setting":
                    sid = inp.get("setting_id", "")
                    if sid:
                        setting_nid = f"setting:setting:{sid}:global"
                        self._add_node(LineageNode(
                            id=setting_nid,
                            label=sid,
                            node_type="setting",
                        ))
                        self._add_edge(LineageEdge(
                            source=setting_nid,
                            target=f"calc:calculation:{calc_id}:gold",
                            edge_type="setting_override",
                            weight="soft",
                            label="parameterises",
                        ))

        # ── Detection models ──
        model_defs: dict[str, dict] = {}
        if models_dir.is_dir():
            for mp in sorted(models_dir.glob("*.json")):
                data = _safe_load(mp)
                if not data or "model_id" not in data:
                    continue
                model_id = data["model_id"]
                model_defs[model_id] = data

                reg_tags = []
                for rc in data.get("regulatory_coverage", []):
                    reg_tags.append(f"{rc.get('regulation', '')} {rc.get('article', '')}")

                self._add_node(LineageNode(
                    id=f"model:detection_model:{model_id}:gold",
                    label=data.get("name", model_id),
                    node_type="detection_model",
                    tier="gold",
                    version_hash=_version_hash(data),
                    regulatory_tags=reg_tags,
                    metadata={
                        "time_window": data.get("time_window", ""),
                        "granularity": data.get("granularity", []),
                    },
                ))

                # Model → calculation edges
                for calc_ref in data.get("calculations", []):
                    cid = calc_ref.get("calc_id", "")
                    strictness = calc_ref.get("strictness", "OPTIONAL")
                    if cid:
                        self._add_edge(LineageEdge(
                            source=f"calc:calculation:{cid}:gold",
                            target=f"model:detection_model:{model_id}:gold",
                            edge_type="model_input",
                            weight="hard" if strictness == "MUST_PASS" else "soft",
                            label=f"{cid} ({strictness})",
                            metadata={"strictness": strictness},
                        ))

                # Model → score threshold setting edge
                score_setting = data.get("score_threshold_setting", "")
                if score_setting:
                    s_nid = f"setting:setting:{score_setting}:global"
                    self._add_node(LineageNode(
                        id=s_nid, label=score_setting, node_type="setting",
                    ))
                    self._add_edge(LineageEdge(
                        source=s_nid,
                        target=f"model:detection_model:{model_id}:gold",
                        edge_type="setting_override",
                        weight="soft",
                        label="score_threshold",
                    ))

        # ── Alert traces ──
        alert_counts: dict[str, int] = defaultdict(int)
        self._alert_traces: list[dict] = []
        if traces_dir.is_dir():
            for tp in sorted(traces_dir.glob("*.json")):
                data = _safe_load(tp)
                if not data:
                    continue
                traces = data if isinstance(data, list) else [data]
                for trace in traces:
                    mid = trace.get("model_id", "")
                    if mid:
                        alert_counts[mid] += 1
                        self._alert_traces.append(trace)

        for mid, count in alert_counts.items():
            alert_nid = f"alert:alert:{mid}_alerts:gold"
            self._add_node(LineageNode(
                id=alert_nid,
                label=f"{mid} alerts ({count})",
                node_type="alert",
                tier="gold",
                metadata={"alert_count": count, "model_id": mid},
            ))
            self._add_edge(LineageEdge(
                source=f"model:detection_model:{mid}:gold",
                target=alert_nid,
                edge_type="alert_output",
                weight="hard",
                label=f"{count} alerts",
            ))

    # ================================================================
    # Layer 4 — Entity FK
    # ================================================================

    def _build_entity_fk(self) -> None:
        entities_dir = self._workspace / "metadata" / "entities"
        if not entities_dir.is_dir():
            return

        for ep in sorted(entities_dir.glob("*.json")):
            data = _safe_load(ep)
            if not data or "entity_id" not in data:
                continue
            eid = data["entity_id"]
            self._add_node(LineageNode(
                id=f"entity:entity:{eid}:silver",
                label=data.get("name", eid),
                node_type="entity",
                tier="silver",
                entity=eid,
                metadata={
                    "field_count": len(data.get("fields", [])),
                    "relationship_count": len(data.get("relationships", [])),
                },
            ))

            for rel in data.get("relationships", []):
                target = rel.get("target_entity", "")
                if not target:
                    continue
                rel_type = rel.get("relationship_type", "many_to_one")
                self._add_edge(LineageEdge(
                    source=f"entity:entity:{eid}:silver",
                    target=f"entity:entity:{target}:silver",
                    edge_type="entity_fk",
                    weight="hard",
                    label=rel_type,
                    metadata={
                        "join_fields": rel.get("join_fields", {}),
                        "relationship_type": rel_type,
                    },
                ))

    # ================================================================
    # Layer 5 — Setting Impact
    # ================================================================

    def _build_setting_impact(self) -> None:
        settings_dir = self._workspace / "metadata" / "settings"
        if not settings_dir.is_dir():
            return

        for sp in sorted(settings_dir.rglob("*.json")):
            data = _safe_load(sp)
            if not data or "setting_id" not in data:
                continue
            sid = data["setting_id"]
            setting_nid = f"setting:setting:{sid}:global"
            self._add_node(LineageNode(
                id=setting_nid,
                label=data.get("name", sid),
                node_type="setting",
                metadata={
                    "value_type": data.get("value_type", ""),
                    "default": data.get("default"),
                    "override_count": len(data.get("overrides", [])),
                },
            ))

    # ================================================================
    # Layer 6 — Regulatory Requirements
    # ================================================================

    def _build_regulatory_req(self) -> None:
        # Check both flat file and subdirectory patterns
        req_paths = [
            self._workspace / "metadata" / "standards" / "compliance_requirements.json",
        ]
        # Also check subdirectory pattern (compliance/*.json)
        compliance_dir = self._workspace / "metadata" / "standards" / "compliance"
        if compliance_dir.is_dir():
            req_paths.extend(sorted(compliance_dir.glob("*.json")))

        for rp in req_paths:
            data = _safe_load(rp)
            if not data:
                continue

            requirements = data.get("requirements", [])
            for req in requirements:
                reg = req.get("regulation", "")
                article = req.get("article", "")
                impl_type = req.get("implementation", "")
                impl_id = req.get("implementation_id", "")
                req_id = req.get("requirement_id", f"{reg}_{article}".replace(" ", "_"))

                reg_nid = f"regulatory:regulation:{req_id}:global"
                self._add_node(LineageNode(
                    id=reg_nid,
                    label=f"{reg} {article}",
                    node_type="regulation",
                    regulatory_tags=[f"{reg} {article}"],
                    metadata={
                        "requirement_text": req.get("requirement_text", ""),
                        "implementation": impl_type,
                        "status": req.get("status", ""),
                    },
                ))

                # Link to implementation
                if impl_type == "detection_model" and impl_id:
                    target_nid = f"model:detection_model:{impl_id}:gold"
                    self._add_edge(LineageEdge(
                        source=reg_nid,
                        target=target_nid,
                        edge_type="regulatory_req",
                        weight="hard",
                        label=f"{reg} {article}",
                    ))
                elif impl_type == "entity_field" and impl_id:
                    # e.g. "order.order_time" or "execution.execution_time"
                    parts = impl_id.split(".", 1)
                    if len(parts) == 2:
                        entity, field = parts
                        target_nid = f"entity:entity:{entity}:silver"
                        self._add_edge(LineageEdge(
                            source=reg_nid,
                            target=target_nid,
                            edge_type="regulatory_req",
                            weight="soft",
                            label=f"{reg} {article} -> {entity}.{field}",
                        ))

    # ================================================================
    # Public API — Tier Lineage
    # ================================================================

    def get_tier_lineage(self, entity: str) -> LineageGraph:
        """Return tier flow graph for a single entity."""
        nodes = [n for n in self._nodes.values()
                 if n.node_type == "tier" and n.entity == entity]
        node_ids = {n.id for n in nodes}
        edges = [e for e in self._all_edges()
                 if e.edge_type == "tier_flow"
                 and e.source in node_ids and e.target in node_ids]
        return LineageGraph(
            nodes=nodes, edges=edges, layers=["tier_flow"],
            total_nodes=len(nodes), total_edges=len(edges),
        )

    def get_full_tier_graph(self) -> LineageGraph:
        """Return the complete tier flow graph for all entities."""
        nodes = [n for n in self._nodes.values() if n.node_type == "tier"]
        node_ids = {n.id for n in nodes}
        edges = [e for e in self._all_edges()
                 if e.edge_type == "tier_flow"
                 and e.source in node_ids and e.target in node_ids]
        return LineageGraph(
            nodes=nodes, edges=edges, layers=["tier_flow"],
            total_nodes=len(nodes), total_edges=len(edges),
        )

    # ================================================================
    # Public API — Field Lineage
    # ================================================================

    def get_field_lineage(self, entity: str) -> list[FieldTrace]:
        """Return all field traces for an entity."""
        return list(self._field_traces.get(entity, {}).values())

    def trace_field(self, entity: str, field: str) -> FieldTrace:
        """Return the trace for a single field."""
        traces = self._field_traces.get(entity, {})
        if field in traces:
            return traces[field]
        return FieldTrace(entity=entity, field=field, chain=[])

    def get_tier_transition_fields(
        self, entity: str, source_tier: str, target_tier: str,
    ) -> list[ColumnLineage]:
        """Return column lineage for a tier transition."""
        results: list[ColumnLineage] = []
        prefix_src = f"field:field:{entity}."
        for eid, edges in self._forward.items():
            if not eid.startswith(prefix_src):
                continue
            src_node = self._nodes.get(eid)
            if not src_node or src_node.tier != source_tier:
                continue
            for edge in edges:
                if edge.edge_type != "field_mapping":
                    continue
                tgt_node = self._nodes.get(edge.target)
                if not tgt_node or tgt_node.tier != target_tier:
                    continue
                # Extract field name from node label
                src_field = src_node.label.split(".")[-1] if "." in src_node.label else src_node.label
                tgt_field = tgt_node.label.split(".")[-1] if "." in tgt_node.label else tgt_node.label
                transform = edge.metadata.get("transform", edge.label or "passthrough")
                # Map to valid ColumnLineage transformation
                valid_transforms = {
                    "direct": "passthrough", "passthrough": "passthrough",
                    "cast_decimal": "cast", "cast_date": "cast", "cast_time": "cast",
                    "uppercase": "normalize", "lowercase": "normalize",
                    "concat": "concat", "multiply": "derive",
                    "aggregate": "aggregate", "lookup": "lookup",
                    "conditional": "conditional", "validate": "validate",
                }
                mapped = valid_transforms.get(transform, "passthrough")
                results.append(ColumnLineage(
                    output_field=tgt_field,
                    input_fields=[src_field] if src_field else [],
                    transformation=mapped,
                ))
        return results

    # ================================================================
    # Public API — Calc Chain
    # ================================================================

    def get_calc_lineage(self) -> LineageGraph:
        """Return the full calculation dependency graph."""
        nodes = [n for n in self._nodes.values()
                 if n.node_type in ("calculation", "detection_model", "alert")]
        node_ids = {n.id for n in nodes}
        edges = [e for e in self._all_edges()
                 if e.edge_type in ("calculation_dep", "model_input", "alert_output")
                 and e.source in node_ids and e.target in node_ids]
        return LineageGraph(
            nodes=nodes, edges=edges,
            layers=["calc_chain"],
            total_nodes=len(nodes), total_edges=len(edges),
        )

    def get_model_lineage(self, model_id: str) -> LineageGraph:
        """Return the lineage subgraph for a single detection model."""
        root_id = f"model:detection_model:{model_id}:gold"
        if root_id not in self._nodes:
            return LineageGraph()

        # BFS upstream
        visited: set[str] = set()
        queue: deque[str] = deque([root_id])
        while queue:
            nid = queue.popleft()
            if nid in visited:
                continue
            visited.add(nid)
            for edge in self._reverse.get(nid, []):
                queue.append(edge.source)

        # BFS downstream (alerts)
        queue = deque([root_id])
        downstream_visited: set[str] = set()
        while queue:
            nid = queue.popleft()
            if nid in downstream_visited:
                continue
            downstream_visited.add(nid)
            visited.add(nid)
            for edge in self._forward.get(nid, []):
                queue.append(edge.target)

        nodes = [self._nodes[nid] for nid in visited if nid in self._nodes]
        node_ids = visited
        edges = [e for e in self._all_edges()
                 if e.source in node_ids and e.target in node_ids]
        return LineageGraph(
            nodes=nodes, edges=edges,
            layers=["calc_chain"],
            total_nodes=len(nodes), total_edges=len(edges),
        )

    # ================================================================
    # Public API — Entity FK
    # ================================================================

    def get_entity_graph(self) -> LineageGraph:
        """Return the entity foreign-key graph."""
        nodes = [n for n in self._nodes.values() if n.node_type == "entity"]
        node_ids = {n.id for n in nodes}
        edges = [e for e in self._all_edges()
                 if e.edge_type == "entity_fk"
                 and e.source in node_ids and e.target in node_ids]
        return LineageGraph(
            nodes=nodes, edges=edges,
            layers=["entity_fk"],
            total_nodes=len(nodes), total_edges=len(edges),
        )

    # ================================================================
    # Public API — Setting Impact
    # ================================================================

    def get_setting_impact(self, setting_id: str) -> LineageGraph:
        """Return downstream impact graph from a setting."""
        root_id = f"setting:setting:{setting_id}:global"
        if root_id not in self._nodes:
            return LineageGraph()

        visited: set[str] = set()
        queue: deque[str] = deque([root_id])
        while queue:
            nid = queue.popleft()
            if nid in visited:
                continue
            visited.add(nid)
            for edge in self._forward.get(nid, []):
                queue.append(edge.target)

        nodes = [self._nodes[nid] for nid in visited if nid in self._nodes]
        edges = [e for e in self._all_edges()
                 if e.source in visited and e.target in visited]
        return LineageGraph(
            nodes=nodes, edges=edges,
            layers=["setting_impact"],
            total_nodes=len(nodes), total_edges=len(edges),
        )

    def preview_threshold_change(
        self, setting_id: str, parameter: str, proposed_value: float,
    ) -> SettingsImpactPreview:
        """Estimate alert count change if a threshold is modified."""
        # Find current default value from the setting node metadata
        setting_nid = f"setting:setting:{setting_id}:global"
        setting_node = self._nodes.get(setting_nid)
        current_value = 0.0
        if setting_node and setting_node.metadata.get("default") is not None:
            current_value = float(setting_node.metadata["default"])

        # Find affected models via downstream traversal
        affected_models: list[str] = []
        for edge in self._forward.get(setting_nid, []):
            tgt = self._nodes.get(edge.target)
            if tgt and tgt.node_type == "detection_model":
                affected_models.append(tgt.label)
            elif tgt and tgt.node_type == "calculation":
                # Follow from calc to models
                for e2 in self._forward.get(edge.target, []):
                    tgt2 = self._nodes.get(e2.target)
                    if tgt2 and tgt2.node_type == "detection_model":
                        affected_models.append(tgt2.label)

        # Estimate alert impact from stored traces
        current_count = 0
        projected_count = 0
        affected_products: set[str] = set()

        for trace in getattr(self, "_alert_traces", []):
            scores = trace.get("scores", {})
            model_id = trace.get("model_id", "")
            total_score = trace.get("total_score", 0)

            # Check if this alert is influenced by the setting
            is_related = False
            for edge in self._forward.get(setting_nid, []):
                tgt = self._nodes.get(edge.target)
                if tgt:
                    # Direct model link
                    if tgt.node_type == "detection_model" and model_id in tgt.id:
                        is_related = True
                    # Calc link → model link
                    elif tgt.node_type == "calculation":
                        for e2 in self._forward.get(edge.target, []):
                            tgt2 = self._nodes.get(e2.target)
                            if tgt2 and tgt2.node_type == "detection_model" and model_id in tgt2.id:
                                is_related = True

            if is_related:
                current_count += 1
                if total_score >= proposed_value:
                    projected_count += 1
                pid = trace.get("product_id", "")
                if pid:
                    affected_products.add(pid)

        return SettingsImpactPreview(
            setting_id=setting_id,
            parameter=parameter,
            current_value=current_value,
            proposed_value=proposed_value,
            current_alert_count=current_count,
            projected_alert_count=projected_count,
            delta=projected_count - current_count,
            affected_models=list(set(affected_models)),
            affected_products=sorted(affected_products),
        )

    # ================================================================
    # Public API — Regulatory
    # ================================================================

    def get_surveillance_coverage(self) -> SurveillanceCoverage:
        """Build the surveillance coverage matrix (products x abuse types)."""
        # Gather product info from entity nodes or entity files
        products: list[dict] = []
        entities_dir = self._workspace / "metadata" / "entities"
        products_file = entities_dir / "product.json" if entities_dir.is_dir() else None
        if products_file and products_file.exists():
            pdata = _safe_load(products_file)
            if pdata:
                # Enumerate asset classes as product proxies
                domain_vals = []
                for f in pdata.get("fields", []):
                    if f.get("name") == "asset_class":
                        domain_vals = f.get("domain_values", [])
                for ac in domain_vals:
                    products.append({"product_id": ac, "asset_class": ac})

        if not products:
            products = [{"product_id": "unknown", "asset_class": "unknown"}]

        # Gather abuse types from detection models
        abuse_types: list[str] = []
        model_nodes = [n for n in self._nodes.values() if n.node_type == "detection_model"]
        for mn in model_nodes:
            mid = mn.id.split(":")[2] if len(mn.id.split(":")) > 2 else mn.label
            abuse_types.append(mid)

        abuse_types = sorted(set(abuse_types))

        # Build cells
        cells: list[CoverageCell] = []
        covered_count = 0
        total_cells = len(products) * max(len(abuse_types), 1)

        for prod in products:
            pid = prod["product_id"]
            for atype in abuse_types:
                model_nid = f"model:detection_model:{atype}:gold"
                model_exists = model_nid in self._nodes
                regs: list[str] = []
                if model_exists:
                    mn = self._nodes[model_nid]
                    regs = mn.regulatory_tags

                cell = CoverageCell(
                    product_id=pid,
                    abuse_type=atype,
                    covered=model_exists,
                    model_ids=[atype] if model_exists else [],
                    regulations=regs,
                )
                cells.append(cell)
                if model_exists:
                    covered_count += 1

        coverage_pct = (covered_count / total_cells * 100) if total_cells > 0 else 0.0

        # Regulatory gaps
        reg_gaps: list[dict] = []
        for n in self._nodes.values():
            if n.node_type == "regulation":
                status = n.metadata.get("status", "")
                if status in ("partial", "not_implemented"):
                    reg_gaps.append({
                        "regulation": n.label,
                        "status": status,
                        "requirement": n.metadata.get("requirement_text", ""),
                    })

        return SurveillanceCoverage(
            products=products,
            abuse_types=abuse_types,
            cells=cells,
            coverage_pct=round(coverage_pct, 1),
            regulatory_gaps=reg_gaps,
        )

    # ================================================================
    # Public API — Impact Analysis (weighted BFS)
    # ================================================================

    def impact_analysis(
        self, node_id: str, direction: str = "both",
    ) -> ImpactAnalysis:
        """Weighted BFS from *node_id*.  'hard' edges propagate full impact,
        'soft' edges propagate reduced impact."""
        origin = self._nodes.get(node_id)
        if not origin:
            return ImpactAnalysis(
                origin=LineageNode(id=node_id, label=node_id, node_type="entity"),
                direction=direction if direction in ("upstream", "downstream", "both") else "both",
            )

        visited: set[str] = set()
        affected_nodes: list[LineageNode] = []
        affected_edges: list[LineageEdge] = []
        hard_count = 0
        soft_count = 0
        reg_impact: set[str] = set()

        queue: deque[str] = deque([node_id])
        while queue:
            nid = queue.popleft()
            if nid in visited:
                continue
            visited.add(nid)

            node = self._nodes.get(nid)
            if node and nid != node_id:
                affected_nodes.append(node)
                for tag in node.regulatory_tags:
                    reg_impact.add(tag)

            # Downstream
            if direction in ("downstream", "both"):
                for edge in self._forward.get(nid, []):
                    if edge.target not in visited:
                        affected_edges.append(edge)
                        if edge.weight == "hard":
                            hard_count += 1
                        else:
                            soft_count += 1
                        queue.append(edge.target)

            # Upstream
            if direction in ("upstream", "both"):
                for edge in self._reverse.get(nid, []):
                    if edge.source not in visited:
                        affected_edges.append(edge)
                        if edge.weight == "hard":
                            hard_count += 1
                        else:
                            soft_count += 1
                        queue.append(edge.source)

        direction_literal = direction if direction in ("upstream", "downstream", "both") else "both"

        impact_summary: dict = {
            "total_affected": len(affected_nodes),
            "by_type": {},
        }
        for n in affected_nodes:
            impact_summary["by_type"][n.node_type] = (
                impact_summary["by_type"].get(n.node_type, 0) + 1
            )

        return ImpactAnalysis(
            origin=origin,
            direction=direction_literal,
            affected_nodes=affected_nodes,
            affected_edges=affected_edges,
            impact_summary=impact_summary,
            hard_impact_count=hard_count,
            soft_impact_count=soft_count,
            regulatory_impact=sorted(reg_impact),
        )

    # ================================================================
    # Public API — Unified Graph
    # ================================================================

    def get_unified_graph(
        self,
        entities: list[str] | None = None,
        layers: list[str] | None = None,
    ) -> LineageGraph:
        """Return a combined graph, optionally filtered by entity and/or layer."""
        layer_to_edge_types: dict[str, set[str]] = {
            "tier_flow": {"tier_flow"},
            "field_lineage": {"field_mapping"},
            "calc_chain": {"calculation_dep", "model_input", "alert_output"},
            "entity_fk": {"entity_fk"},
            "setting_impact": {"setting_override"},
            "regulatory_req": {"regulatory_req"},
        }

        allowed_edge_types: set[str] | None = None
        if layers:
            allowed_edge_types = set()
            for lyr in layers:
                allowed_edge_types.update(layer_to_edge_types.get(lyr, set()))

        # Filter nodes
        filtered_nodes: list[LineageNode] = []
        for n in self._nodes.values():
            if entities and n.entity and n.entity not in entities:
                continue
            filtered_nodes.append(n)

        node_ids = {n.id for n in filtered_nodes}

        # Filter edges
        filtered_edges: list[LineageEdge] = []
        for edge in self._all_edges():
            if edge.source not in node_ids or edge.target not in node_ids:
                continue
            if allowed_edge_types is not None and edge.edge_type not in allowed_edge_types:
                continue
            filtered_edges.append(edge)

        active_layers = sorted(set(
            lyr for lyr, etypes in layer_to_edge_types.items()
            if any(e.edge_type in etypes for e in filtered_edges)
        ))

        return LineageGraph(
            nodes=filtered_nodes,
            edges=filtered_edges,
            layers=active_layers,
            total_nodes=len(filtered_nodes),
            total_edges=len(filtered_edges),
        )

    # ================================================================
    # Public API — Quality Overlay
    # ================================================================

    def get_quality_overlay(self, entity: str) -> dict:
        """Compute quality scores per tier for an entity."""
        dims_path = self._workspace / "metadata" / "quality" / "dimensions.json"
        dims_data = _safe_load(dims_path)
        dimension_names: list[str] = []
        if dims_data and isinstance(dims_data, dict):
            for d in dims_data.get("dimensions", []):
                dimension_names.append(d.get("id", ""))

        result: dict[str, dict] = {}
        tier_nodes = [n for n in self._nodes.values()
                      if n.node_type == "tier" and n.entity == entity]

        for node in tier_nodes:
            tier = node.tier
            # Simulate quality scores per dimension (in a real system, read from metrics)
            dim_scores = {}
            for dim in dimension_names:
                # Higher tiers get higher quality scores (simulated)
                tier_quality_boost = {
                    "landing": 0.0, "bronze": 0.1, "silver": 0.2,
                    "gold": 0.3, "platinum": 0.35, "reference": 0.3,
                }.get(tier, 0.0)
                dim_scores[dim] = round(min(0.7 + tier_quality_boost, 1.0), 2)

            overall = round(sum(dim_scores.values()) / max(len(dim_scores), 1), 2)
            result[tier] = {
                "overall_score": overall,
                "dimensions": dim_scores,
                "sla_status": "met" if overall >= 0.9 else ("warning" if overall >= 0.8 else "breach"),
            }

        return result

    # ================================================================
    # Public API — Alert Explainability
    # ================================================================

    def get_alert_lineage(self, alert_id: str) -> LineageGraph:
        """Build a reverse-provenance chain for a specific alert."""
        # Try to find the alert in traces
        trace: dict | None = None
        for t in getattr(self, "_alert_traces", []):
            if t.get("alert_id") == alert_id:
                trace = t
                break

        if not trace:
            return LineageGraph()

        model_id = trace.get("model_id", "")
        model_nid = f"model:detection_model:{model_id}:gold"

        # Create the specific alert node
        alert_nid = f"alert:alert:{alert_id}:gold"
        self._add_node(LineageNode(
            id=alert_nid,
            label=f"Alert {alert_id}",
            node_type="alert",
            tier="gold",
            metadata=trace,
        ))
        self._add_edge(LineageEdge(
            source=model_nid,
            target=alert_nid,
            edge_type="alert_output",
            weight="hard",
            label=f"generated {alert_id}",
        ))

        # Now do upstream BFS from the model
        visited: set[str] = {alert_nid}
        queue: deque[str] = deque([model_nid])
        while queue:
            nid = queue.popleft()
            if nid in visited:
                continue
            visited.add(nid)
            for edge in self._reverse.get(nid, []):
                queue.append(edge.source)

        nodes = [self._nodes[nid] for nid in visited if nid in self._nodes]
        edges = [e for e in self._all_edges()
                 if e.source in visited and e.target in visited]
        return LineageGraph(
            nodes=nodes, edges=edges,
            layers=["alert_explainability"],
            total_nodes=len(nodes), total_edges=len(edges),
        )

    # ================================================================
    # Public API — Pipeline Runs (OpenLineage)
    # ================================================================

    def record_run(
        self,
        job_name: str,
        inputs: list,
        outputs: list,
        column_lineage: list,
        quality_scores: dict | None = None,
        duration_ms: int = 0,
        record_count: int = 0,
    ) -> LineageRun:
        """Record an OpenLineage-compatible pipeline run."""
        run_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        input_datasets = [
            LineageDataset(**i) if isinstance(i, dict) else i for i in inputs
        ]
        output_datasets = [
            LineageDataset(**o) if isinstance(o, dict) else o for o in outputs
        ]
        col_lineage = [
            ColumnLineage(**c) if isinstance(c, dict) else c for c in column_lineage
        ]

        run = LineageRun(
            run_id=run_id,
            job_name=job_name,
            event_type="COMPLETE",
            event_time=now,
            duration_ms=duration_ms,
            record_count=record_count,
            inputs=input_datasets,
            outputs=output_datasets,
            column_lineage=col_lineage,
            quality_scores=quality_scores or {},
        )

        # Persist to disk
        run_file = self._runs_dir / f"{run_id}.json"
        run_file.write_text(run.model_dump_json(indent=2), encoding="utf-8")
        return run

    def get_runs(
        self,
        job_name: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> list[LineageRun]:
        """Return recorded runs, optionally filtered."""
        runs: list[LineageRun] = []
        if not self._runs_dir.is_dir():
            return runs

        for rp in sorted(self._runs_dir.glob("*.json")):
            data = _safe_load(rp)
            if not data:
                continue
            try:
                run = LineageRun(**data)
            except Exception:
                continue

            if job_name and run.job_name != job_name:
                continue
            if start_date and run.event_time < start_date:
                continue
            if end_date and run.event_time > end_date:
                continue
            runs.append(run)

        return runs

    def get_run(self, run_id: str) -> LineageRun | None:
        """Return a single run by ID."""
        run_file = self._runs_dir / f"{run_id}.json"
        data = _safe_load(run_file)
        if not data:
            return None
        try:
            return LineageRun(**data)
        except Exception:
            return None

    # ── internal helpers ──────────────────────────────────────────────

    def _all_edges(self) -> list[LineageEdge]:
        """Flatten forward adjacency list into a single edge list."""
        edges: list[LineageEdge] = []
        for edge_list in self._forward.values():
            edges.extend(edge_list)
        return edges
