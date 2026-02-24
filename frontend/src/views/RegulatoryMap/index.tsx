import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";

import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import {
  useRegulatoryStore,
  type TraceabilityNode,
  type TraceabilityEdge,
  type SuggestionData,
} from "../../stores/regulatoryStore.ts";

/* ---------- Constants ---------- */

const NODE_WIDTH = 180;
const NODE_HEIGHT = 54;

const BORDER_COLORS: Record<string, string> = {
  regulation: "#3b82f6",
  article_covered: "#22c55e",
  article_uncovered: "#ef4444",
  detection_model: "#f97316",
  calculation: "#a855f7",
};

/* ---------- Dagre layout ---------- */

function layoutGraph(
  rawNodes: TraceabilityNode[],
  rawEdges: TraceabilityEdge[]
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 100 });

  for (const n of rawNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of rawEdges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const nodes: Node[] = rawNodes.map((n) => {
    const pos = g.node(n.id);
    const borderColor =
      n.type === "article"
        ? n.covered
          ? BORDER_COLORS.article_covered
          : BORDER_COLORS.article_uncovered
        : BORDER_COLORS[n.type] ?? "var(--color-border)";

    return {
      id: n.id,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      data: { label: n.label, raw: n },
      style: {
        background: "var(--color-surface-elevated)",
        color: "var(--color-foreground)",
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 500,
        padding: "8px 12px",
        width: NODE_WIDTH,
        whiteSpace: "pre-line" as const,
        textAlign: "center" as const,
        cursor: "pointer",
      },
    };
  });

  const edges: Edge[] = rawEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    style: { stroke: "var(--color-border)" },
    animated: false,
  }));

  return { nodes, edges };
}

/* ---------- Legend ---------- */

const LEGEND_ITEMS = [
  { color: BORDER_COLORS.regulation, label: "Regulation" },
  { color: BORDER_COLORS.article_covered, label: "Article (covered)" },
  { color: BORDER_COLORS.article_uncovered, label: "Article (uncovered)" },
  { color: BORDER_COLORS.detection_model, label: "Detection Model" },
  { color: BORDER_COLORS.calculation, label: "Calculation" },
];

/* ---------- Component ---------- */

export default function RegulatoryMap() {
  const { coverage, graphNodes, graphEdges, suggestions, loading, error, fetchAll } =
    useRegulatoryStore();

  const [selectedNode, setSelectedNode] = useState<TraceabilityNode | null>(
    null
  );
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const { nodes, edges } = useMemo(
    () => layoutGraph(graphNodes, graphEdges),
    [graphNodes, graphEdges]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
      <h2 className="text-lg font-semibold">Regulatory Traceability</h2>

      {/* Row 1: Coverage summary cards */}
      <div className="grid grid-cols-4 gap-3" data-tour="regulatory-cards">
        <SummaryCard
          label="Total Requirements"
          value={coverage?.total_articles ?? 0}
        />
        <SummaryCard label="Covered" value={coverage?.covered ?? 0} accent="text-green-500" />
        <SummaryCard label="Uncovered" value={coverage?.uncovered ?? 0} accent="text-red-500" />
        <SummaryCard
          label="Coverage %"
          value={`${coverage?.coverage_pct ?? 0}%`}
          accent={
            (coverage?.coverage_pct ?? 0) >= 70
              ? "text-green-500"
              : "text-amber-500"
          }
        />
      </div>

      {/* Row 2: Graph + Detail */}
      <div className="flex-1 flex gap-3 min-h-0">
        <Panel
          title="Traceability Graph"
          className="flex-[3]"
          noPadding
          dataTour="regulatory-graph"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            onNodeClick={(_event, node) => {
              const raw = (node.data as { raw: TraceabilityNode }).raw;
              setSelectedNode(raw);
            }}
          >
            <Background color="var(--color-border)" gap={20} size={1} />
          </ReactFlow>
        </Panel>

        <Panel
          title="Details"
          className="w-72 shrink-0"
          dataTour="regulatory-detail"
        >
          {selectedNode ? (
            <NodeDetail node={selectedNode} />
          ) : (
            <p className="text-xs text-muted">
              Click a node in the graph to view details.
            </p>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2">
              Legend
            </p>
            <div className="flex flex-col gap-1.5">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-sm border-2"
                    style={{ borderColor: item.color }}
                  />
                  <span className="text-xs text-foreground/70">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Row 3: Suggestions Panel */}
      {suggestions && (
        <SuggestionsPanel
          suggestions={suggestions}
          expanded={showSuggestions}
          onToggle={() => setShowSuggestions((p) => !p)}
        />
      )}
    </div>
  );
}

/* ---------- Summary Card ---------- */

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="rounded border border-border bg-surface p-3">
      <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">
        {label}
      </p>
      <p className={`text-xl font-bold mt-1 ${accent ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

/* ---------- Node Detail ---------- */

function NodeDetail({ node }: { node: TraceabilityNode }) {
  const typeLabels: Record<string, string> = {
    regulation: "Regulation",
    article: "Article",
    detection_model: "Detection Model",
    calculation: "Calculation",
  };

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div>
        <span className="font-semibold text-muted">Type:</span>{" "}
        {typeLabels[node.type] ?? node.type}
      </div>
      <div>
        <span className="font-semibold text-muted">Label:</span> {node.label}
      </div>
      {node.full_name && (
        <div>
          <span className="font-semibold text-muted">Full Name:</span>{" "}
          {node.full_name}
        </div>
      )}
      {node.jurisdiction && (
        <div>
          <span className="font-semibold text-muted">Jurisdiction:</span>{" "}
          {node.jurisdiction}
        </div>
      )}
      {node.title && (
        <div>
          <span className="font-semibold text-muted">Title:</span>{" "}
          {node.title}
        </div>
      )}
      {node.type === "article" && (
        <div>
          <span className="font-semibold text-muted">Status:</span>{" "}
          <span
            className={node.covered ? "text-green-500" : "text-red-500"}
          >
            {node.covered ? "Covered" : "Uncovered"}
          </span>
        </div>
      )}
      {node.layer && (
        <div>
          <span className="font-semibold text-muted">Layer:</span>{" "}
          {node.layer}
        </div>
      )}
    </div>
  );
}

/* ---------- Suggestions Panel ---------- */

function SuggestionsPanel({
  suggestions,
  expanded,
  onToggle,
}: {
  suggestions: SuggestionData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { gap_count, improvement_count, total_suggestions } =
    suggestions.summary;

  return (
    <div
      className="rounded border border-border bg-surface shrink-0"
      data-tour="regulatory-suggestions"
    >
      {/* Header — always visible */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold hover:bg-surface-elevated/50 transition-colors"
        onClick={onToggle}
      >
        <span className="flex items-center gap-2">
          Suggestions
          {total_suggestions > 0 && (
            <>
              {gap_count > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-500/15 text-red-500 px-2 py-0.5 text-[10px] font-bold">
                  {gap_count} gap{gap_count !== 1 ? "s" : ""}
                </span>
              )}
              {improvement_count > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-500 px-2 py-0.5 text-[10px] font-bold">
                  {improvement_count} improvement{improvement_count !== 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
          {total_suggestions === 0 && (
            <span className="inline-flex items-center rounded-full bg-green-500/15 text-green-500 px-2 py-0.5 text-[10px] font-bold">
              All clear
            </span>
          )}
        </span>
        <span className="text-muted text-xs">{expanded ? "Collapse" : "Expand"}</span>
      </button>

      {/* Body — collapsible */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border pt-3">
          {/* Gaps */}
          {suggestions.gaps.map((g) => (
            <div
              key={`${g.regulation}-${g.article}`}
              className="rounded border border-red-500/30 bg-red-500/5 p-3"
            >
              <p className="text-xs font-semibold text-red-500">
                {g.regulation} {g.article}
                {g.title ? ` — ${g.title}` : ""}
              </p>
              {g.description && (
                <p className="text-[11px] text-foreground/60 mt-0.5">
                  {g.description}
                </p>
              )}
              <p className="text-xs text-foreground/80 mt-1.5">{g.suggestion}</p>
            </div>
          ))}

          {/* Improvements */}
          {suggestions.improvements.map((imp) => (
            <div
              key={imp.model_id}
              className="rounded border border-amber-500/30 bg-amber-500/5 p-3"
            >
              <p className="text-xs font-semibold text-amber-500">
                {imp.model_name}
                <span className="font-normal text-foreground/60 ml-1">
                  ({imp.current_calc_count} calc{imp.current_calc_count !== 1 ? "s" : ""})
                </span>
              </p>
              <p className="text-xs text-foreground/80 mt-1.5">{imp.suggestion}</p>
              <p className="text-[11px] text-foreground/50 mt-1 italic">
                {imp.impact}
              </p>
            </div>
          ))}

          {/* Empty state */}
          {total_suggestions === 0 && (
            <p className="text-xs text-muted">
              No coverage gaps or improvement suggestions detected.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
