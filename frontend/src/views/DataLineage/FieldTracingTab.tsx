import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { api } from "../../api/client.ts";
import { useLineageStore, type FieldTrace } from "../../stores/lineageStore.ts";

// ─── Constants ───

const ENTITIES = [
  "execution",
  "order",
  "product",
  "md_intraday",
  "md_eod",
  "venue",
  "account",
  "trader",
];

const TIER_COLORS: Record<string, string> = {
  landing: "#6366f1",
  bronze: "#d97706",
  silver: "#a3a3a3",
  gold: "#eab308",
};

const TIER_ORDER = ["landing", "bronze", "silver", "gold"];

const TRANSFORM_COLORS: Record<string, string> = {
  cast: "#8b5cf6",
  normalize: "#3b82f6",
  derive: "#f97316",
  aggregate: "#10b981",
  validate: "#ef4444",
  lookup: "#06b6d4",
};

// ─── Node dimensions for dagre layout ───

const NODE_W = 200;
const NODE_H = 70;

// ─── Layout helper ───

function layoutFieldChains(traces: FieldTrace[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 100 });

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeSet = new Set<string>();

  for (const trace of traces) {
    for (let i = 0; i < trace.chain.length; i++) {
      const step = trace.chain[i];
      const nodeId = `${trace.field}-${step.tier}-${step.field_name}`;

      if (!nodeSet.has(nodeId)) {
        nodeSet.add(nodeId);
        g.setNode(nodeId, { width: NODE_W, height: NODE_H });

        const tierColor = TIER_COLORS[step.tier] ?? "#71717a";
        const qualityPct = Math.round((step.quality_score ?? 0) * 100);
        const qualityColor =
          qualityPct >= 90
            ? "#10b981"
            : qualityPct >= 70
              ? "#eab308"
              : "#ef4444";

        nodes.push({
          id: nodeId,
          position: { x: 0, y: 0 }, // Will be set by dagre
          data: {
            label: (
              <div className="text-left leading-tight">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wide mb-0.5"
                  style={{ color: tierColor }}
                >
                  {step.tier}
                </div>
                <div className="text-xs text-zinc-200 font-medium">
                  {step.field_name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-zinc-500">
                    {step.data_type}
                  </span>
                  <span
                    className="text-[9px] px-1 rounded-sm font-medium"
                    style={{
                      backgroundColor: `${qualityColor}20`,
                      color: qualityColor,
                    }}
                  >
                    {qualityPct}%
                  </span>
                </div>
              </div>
            ),
          },
          style: {
            background: "var(--color-surface-elevated, #18181b)",
            color: "var(--color-foreground, #fafafa)",
            border: `2px solid ${tierColor}`,
            borderRadius: 6,
            padding: "8px 10px",
            width: NODE_W,
            fontSize: 11,
          },
        });
      }

      // Create edge from previous step
      if (i > 0) {
        const prevStep = trace.chain[i - 1];
        const prevId = `${trace.field}-${prevStep.tier}-${prevStep.field_name}`;
        const edgeId = `${prevId}->${nodeId}`;
        const transformColor =
          TRANSFORM_COLORS[step.transform] ?? "#71717a";

        if (!edges.some((e) => e.id === edgeId)) {
          g.setEdge(prevId, nodeId);
          edges.push({
            id: edgeId,
            source: prevId,
            target: nodeId,
            label: step.transform,
            style: { stroke: transformColor },
            labelStyle: {
              fill: transformColor,
              fontSize: 9,
              fontWeight: 600,
            },
            labelBgStyle: {
              fill: "#09090b",
              fillOpacity: 0.9,
            },
            animated: false,
          });
        }
      }
    }
  }

  dagre.layout(g);

  // Apply dagre positions
  for (const node of nodes) {
    const pos = g.node(node.id);
    if (pos) {
      node.position = { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 };
    }
  }

  return { nodes, edges };
}

// ─── Field list item classification ───

function classifyField(trace: FieldTrace): "direct" | "derived" {
  const hasDeriveOrAggregate = trace.chain.some(
    (s) => s.transform === "derive" || s.transform === "aggregate",
  );
  return hasDeriveOrAggregate ? "derived" : "direct";
}

// ─── Main component ───

export default function FieldTracingTab() {
  const store = useLineageStore();
  const { fieldTraces, selectedField, selectedEntity } = store;

  const [entity, setEntity] = useState(selectedEntity || "execution");
  const [field, setField] = useState("");
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [traceAll, setTraceAll] = useState(false);
  const [allTraces, setAllTraces] = useState<FieldTrace[]>([]);

  // Fetch available fields when entity changes
  useEffect(() => {
    let cancelled = false;
    setFieldsLoading(true);
    setField("");
    setAvailableFields([]);

    api
      .get<FieldTrace[]>(`/lineage/fields/${entity}`)
      .then((data) => {
        if (!cancelled) {
          const names = data.map((t) => t.field);
          setAvailableFields(names);
          setAllTraces(data);
          setFieldsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableFields([]);
          setAllTraces([]);
          setFieldsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entity]);

  // Trace a specific field
  const handleTrace = useCallback(() => {
    if (entity && field) {
      store.traceField(entity, field);
    }
  }, [entity, field, store]);

  // Click a field in the left panel
  const handleFieldClick = useCallback(
    (fieldName: string) => {
      setField(fieldName);
      store.traceField(entity, fieldName);
    },
    [entity, store],
  );

  // Determine which traces to visualize
  const displayedTraces = useMemo(() => {
    if (traceAll) return allTraces;
    if (fieldTraces.length > 0) return fieldTraces;
    return [];
  }, [traceAll, allTraces, fieldTraces]);

  // Layout the graph
  const { nodes, edges } = useMemo(
    () => layoutFieldChains(displayedTraces),
    [displayedTraces],
  );

  // Group fields for the left panel
  const groupedFields = useMemo(() => {
    const direct: FieldTrace[] = [];
    const derived: FieldTrace[] = [];
    for (const trace of allTraces) {
      if (classifyField(trace) === "derived") {
        derived.push(trace);
      } else {
        direct.push(trace);
      }
    }
    return { direct, derived };
  }, [allTraces]);

  return (
    <div
      className="flex h-full gap-3"
      data-tour="lineage-field-trace"
      data-trace="lineage.field_tracing"
    >
      {/* Left panel: field list */}
      <div className="w-56 shrink-0 flex flex-col border border-zinc-800 rounded bg-zinc-900/50 overflow-hidden">
        <div className="p-2 border-b border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-300 mb-1.5">
            Fields
          </h3>
          {/* Trace All toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={traceAll}
              onChange={(e) => setTraceAll(e.target.checked)}
              className="w-3 h-3 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-0"
            />
            <span className="text-[10px] text-zinc-400">Trace All</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {fieldsLoading ? (
            <div className="text-xs text-zinc-500 text-center py-4">
              Loading fields...
            </div>
          ) : allTraces.length === 0 ? (
            <div className="text-xs text-zinc-500 text-center py-4">
              No fields available
            </div>
          ) : (
            <>
              {/* Direct fields */}
              {groupedFields.direct.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                      Direct
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {groupedFields.direct.map((trace) => (
                      <button
                        key={trace.field}
                        onClick={() => handleFieldClick(trace.field)}
                        className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                          selectedField === trace.field
                            ? "bg-blue-500/20 text-blue-300"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                      >
                        {trace.field}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Derived fields */}
              {groupedFields.derived.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                      Derived
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {groupedFields.derived.map((trace) => (
                      <button
                        key={trace.field}
                        onClick={() => handleFieldClick(trace.field)}
                        className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                          selectedField === trace.field
                            ? "bg-orange-500/20 text-orange-300"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                      >
                        {trace.field}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main area: controls + graph */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top controls */}
        <div
          className="flex items-center gap-2 mb-2"
          data-trace="lineage.field_controls"
        >
          {/* Entity dropdown */}
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 focus:outline-none focus:border-blue-500"
            data-trace="lineage.field_entity_select"
          >
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          {/* Field dropdown */}
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            disabled={fieldsLoading || availableFields.length === 0}
            className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 focus:outline-none focus:border-blue-500 min-w-[140px] disabled:opacity-50"
            data-trace="lineage.field_field_select"
          >
            <option value="">Select field...</option>
            {availableFields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Trace button */}
          <button
            onClick={handleTrace}
            disabled={!entity || !field || store.loading}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded transition-colors font-medium"
            data-trace="lineage.field_trace_btn"
          >
            Trace
          </button>

          {/* Legend */}
          <div className="ml-auto flex items-center gap-3">
            {TIER_ORDER.map((tier) => (
              <div key={tier} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: TIER_COLORS[tier] }}
                />
                <span className="text-[10px] text-zinc-500 capitalize">
                  {tier}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* React Flow graph */}
        <div className="flex-1 min-h-0 border border-zinc-800 rounded bg-zinc-950/50">
          {displayedTraces.length === 0 ? (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              Select an entity and field to trace transformations across tiers
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
              nodesConnectable={false}
            >
              <Background
                color="var(--color-border, #27272a)"
                gap={20}
                size={1}
              />
            </ReactFlow>
          )}
        </div>

        {/* Transform legend */}
        {displayedTraces.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-zinc-600">Transforms:</span>
            {Object.entries(TRANSFORM_COLORS).map(([t, c]) => (
              <div key={t} className="flex items-center gap-1">
                <span
                  className="w-3 h-0.5 rounded"
                  style={{ backgroundColor: c }}
                />
                <span className="text-[10px] text-zinc-500">{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
