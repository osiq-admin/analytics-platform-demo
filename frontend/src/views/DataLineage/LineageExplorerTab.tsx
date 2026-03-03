import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import {
  useLineageStore,
  type LineageGraph,
} from "../../stores/lineageStore.ts";
import Panel from "../../components/Panel.tsx";

// ─── Constants ───

const NODE_W = 240;
const NODE_H = 85;
const CALC_W = 170;
const CALC_H = 50;

const TIER_COLORS: Record<string, string> = {
  landing: "#6366f1",
  bronze: "#d97706",
  quarantine: "#ef4444",
  silver: "#a3a3a3",
  gold: "#eab308",
  platinum: "#8b5cf6",
  reference: "#06b6d4",
  sandbox: "#22c55e",
};

const LAYER_COLORS: Record<string, string> = {
  transaction: "#6366f1",
  time_window: "#f59e0b",
  aggregation: "#10b981",
  derived: "#ef4444",
};

const REGULATION_COLORS: Record<string, string> = {
  MAR: "#3b82f6",
  MiFID: "#22c55e",
  "Dodd-Frank": "#ef4444",
  FINRA: "#f97316",
  EMIR: "#a855f7",
  SEC: "#f59e0b",
};

// ─── Quality badge helper ───

function qualityColor(score: number): string {
  if (score >= 95) return "#22c55e";
  if (score >= 80) return "#f59e0b";
  return "#ef4444";
}

function slaColor(status: string): string {
  if (status === "met") return "#22c55e";
  if (status === "warning") return "#f59e0b";
  return "#ef4444";
}

// ─── Custom node data interfaces ───

interface TierNodeData {
  label: string;
  tier: string;
  entity: string;
  qualityScore: number | null;
  recordCount: number;
  slaStatus: string;
  regulatoryTags: string[];
  showRegulatory: boolean;
  dimmed: boolean;
  selected: boolean;
  [key: string]: unknown;
}

interface CalcNodeData {
  label: string;
  layer: string;
  weight: "hard" | "soft";
  regulatoryTags: string[];
  showRegulatory: boolean;
  dimmed: boolean;
  selected: boolean;
  [key: string]: unknown;
}

interface ModelNodeData {
  label: string;
  alertCount: number;
  regulatoryTags: string[];
  showRegulatory: boolean;
  dimmed: boolean;
  selected: boolean;
  [key: string]: unknown;
}

interface AlertNodeData {
  label: string;
  alertCount: number;
  dimmed: boolean;
  selected: boolean;
  [key: string]: unknown;
}

// ─── Custom node components ───

function TierNode({ data }: NodeProps<Node<TierNodeData>>) {
  const d = data as TierNodeData;
  const tierColor = TIER_COLORS[d.tier] ?? "var(--color-border)";
  const opacity = d.dimmed ? 0.3 : 1;

  return (
    <div
      style={{
        background: "var(--color-surface-elevated)",
        border: d.selected ? `2px solid var(--color-accent)` : `2px solid ${tierColor}`,
        borderRadius: 8,
        padding: "8px 12px",
        width: NODE_W,
        opacity,
        transition: "opacity 0.2s, border 0.2s",
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: tierColor }} />
      <Handle type="source" position={Position.Right} style={{ background: tierColor }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text)" }}>{d.label}</span>
        {d.qualityScore !== null && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: 4,
              background: `${qualityColor(d.qualityScore)}20`,
              color: qualityColor(d.qualityScore),
            }}
          >
            {d.qualityScore.toFixed(0)}%
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "var(--color-muted)" }}>{d.entity}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {d.recordCount > 0 && (
            <span style={{ fontSize: 9, color: "var(--color-muted)" }}>
              {d.recordCount.toLocaleString()} rows
            </span>
          )}
          {d.slaStatus && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: slaColor(d.slaStatus),
                display: "inline-block",
              }}
              title={`SLA: ${d.slaStatus}`}
            />
          )}
        </div>
      </div>

      {/* Regulatory badges */}
      {d.showRegulatory && d.regulatoryTags.length > 0 && (
        <div style={{ display: "flex", gap: 2, marginTop: 4, flexWrap: "wrap" }}>
          {d.regulatoryTags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 8,
                fontWeight: 600,
                padding: "0px 3px",
                borderRadius: 2,
                background: `${REGULATION_COLORS[tag] ?? "#6b7280"}25`,
                color: REGULATION_COLORS[tag] ?? "#6b7280",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CalcNode({ data }: NodeProps<Node<CalcNodeData>>) {
  const d = data as CalcNodeData;
  const layerColor = LAYER_COLORS[d.layer] ?? "var(--color-border)";
  const opacity = d.dimmed ? 0.3 : 1;

  return (
    <div
      style={{
        background: "var(--color-surface-elevated)",
        border: d.selected
          ? `2px solid var(--color-accent)`
          : `2px ${d.weight === "hard" ? "solid" : "dashed"} ${layerColor}`,
        borderRadius: 6,
        padding: "6px 10px",
        width: CALC_W,
        opacity,
        transition: "opacity 0.2s, border 0.2s",
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: layerColor }} />
      <Handle type="source" position={Position.Right} style={{ background: layerColor }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text)" }}>{d.label}</span>
        <span
          style={{
            fontSize: 8,
            padding: "1px 4px",
            borderRadius: 3,
            background: `${layerColor}20`,
            color: layerColor,
          }}
        >
          {d.layer}
        </span>
      </div>

      {/* Regulatory badges */}
      {d.showRegulatory && d.regulatoryTags.length > 0 && (
        <div style={{ display: "flex", gap: 2, marginTop: 3, flexWrap: "wrap" }}>
          {d.regulatoryTags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 7,
                fontWeight: 600,
                padding: "0px 3px",
                borderRadius: 2,
                background: `${REGULATION_COLORS[tag] ?? "#6b7280"}25`,
                color: REGULATION_COLORS[tag] ?? "#6b7280",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ModelNode({ data }: NodeProps<Node<ModelNodeData>>) {
  const d = data as ModelNodeData;
  const opacity = d.dimmed ? 0.3 : 1;

  return (
    <div
      style={{
        background: "#7c3aed15",
        border: d.selected ? "2px solid var(--color-accent)" : "2px solid #7c3aed",
        borderRadius: 6,
        padding: "6px 10px",
        width: CALC_W,
        opacity,
        transition: "opacity 0.2s, border 0.2s",
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#7c3aed" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#7c3aed" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#c4b5fd" }}>{d.label}</span>
        {d.alertCount > 0 && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 8,
              background: "#7c3aed30",
              color: "#a78bfa",
            }}
          >
            {d.alertCount}
          </span>
        )}
      </div>

      {/* Regulatory badges */}
      {d.showRegulatory && d.regulatoryTags.length > 0 && (
        <div style={{ display: "flex", gap: 2, marginTop: 3, flexWrap: "wrap" }}>
          {d.regulatoryTags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 7,
                fontWeight: 600,
                padding: "0px 3px",
                borderRadius: 2,
                background: `${REGULATION_COLORS[tag] ?? "#6b7280"}25`,
                color: REGULATION_COLORS[tag] ?? "#6b7280",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertNode({ data }: NodeProps<Node<AlertNodeData>>) {
  const d = data as AlertNodeData;
  const opacity = d.dimmed ? 0.3 : 1;

  return (
    <div
      style={{
        background: "#f59e0b15",
        border: d.selected ? "2px solid var(--color-accent)" : "2px solid #f59e0b",
        borderRadius: 6,
        padding: "6px 10px",
        width: 140,
        opacity,
        transition: "opacity 0.2s, border 0.2s",
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#f59e0b" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#fbbf24" }}>{d.label}</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: 8,
            background: "#f59e0b30",
            color: "#fbbf24",
          }}
        >
          {d.alertCount}
        </span>
      </div>
    </div>
  );
}

// ─── Node type registry (must be stable reference) ───

const nodeTypes = {
  tierNode: TierNode,
  calcNode: CalcNode,
  modelNode: ModelNode,
  alertNode: AlertNode,
};

// ─── Layout helper ───

function buildLineageGraph(
  graph: LineageGraph,
  selectedNode: string | null,
  showRegulatory: boolean,
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 140 });

  // Determine node dimensions based on type
  for (const node of graph.nodes) {
    const w = node.node_type === "alert" ? 140 : node.node_type === "tier" ? NODE_W : CALC_W;
    const h = node.node_type === "tier" ? NODE_H : CALC_H;
    g.setNode(node.id, { width: w, height: h });
  }

  // Add edges
  for (const edge of graph.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Build connected set for selection dimming
  const connectedIds = new Set<string>();
  const connectedEdgeKeys = new Set<string>();
  if (selectedNode) {
    connectedIds.add(selectedNode);
    for (const edge of graph.edges) {
      if (edge.source === selectedNode || edge.target === selectedNode) {
        connectedIds.add(edge.source);
        connectedIds.add(edge.target);
        connectedEdgeKeys.add(`${edge.source}__${edge.target}`);
      }
    }
  }

  const hasSelection = !!selectedNode;

  // Map nodes to React Flow nodes
  const rfNodes: Node[] = graph.nodes.map((node) => {
    const pos = g.node(node.id);
    const w = node.node_type === "alert" ? 140 : node.node_type === "tier" ? NODE_W : CALC_W;
    const h = node.node_type === "tier" ? NODE_H : CALC_H;
    const isSelected = node.id === selectedNode;
    const dimmed = hasSelection && !connectedIds.has(node.id);

    const baseData = {
      label: node.label,
      dimmed,
      selected: isSelected,
    };

    switch (node.node_type) {
      case "tier":
        return {
          id: node.id,
          type: "tierNode",
          position: { x: pos.x - w / 2, y: pos.y - h / 2 },
          data: {
            ...baseData,
            tier: node.tier,
            entity: node.entity,
            qualityScore: node.quality?.overall_score ?? null,
            recordCount: node.quality?.record_count ?? 0,
            slaStatus: node.quality?.sla_status ?? "",
            regulatoryTags: node.regulatory_tags,
            showRegulatory,
          } satisfies TierNodeData,
        };
      case "calculation":
        return {
          id: node.id,
          type: "calcNode",
          position: { x: pos.x - w / 2, y: pos.y - h / 2 },
          data: {
            ...baseData,
            layer: (node.metadata?.layer as string) ?? "derived",
            weight: (node.metadata?.weight as "hard" | "soft") ?? "hard",
            regulatoryTags: node.regulatory_tags,
            showRegulatory,
          } satisfies CalcNodeData,
        };
      case "model":
        return {
          id: node.id,
          type: "modelNode",
          position: { x: pos.x - w / 2, y: pos.y - h / 2 },
          data: {
            ...baseData,
            alertCount: (node.metadata?.alert_count as number) ?? 0,
            regulatoryTags: node.regulatory_tags,
            showRegulatory,
          } satisfies ModelNodeData,
        };
      case "alert":
        return {
          id: node.id,
          type: "alertNode",
          position: { x: pos.x - w / 2, y: pos.y - h / 2 },
          data: {
            ...baseData,
            alertCount: (node.metadata?.alert_count as number) ?? 0,
          } satisfies AlertNodeData,
        };
      default:
        return {
          id: node.id,
          type: "tierNode",
          position: { x: pos.x - w / 2, y: pos.y - h / 2 },
          data: {
            ...baseData,
            tier: node.tier,
            entity: node.entity,
            qualityScore: null,
            recordCount: 0,
            slaStatus: "",
            regulatoryTags: node.regulatory_tags,
            showRegulatory,
          } satisfies TierNodeData,
        };
    }
  });

  // Map edges
  const rfEdges: Edge[] = graph.edges.map((edge) => {
    const key = `${edge.source}__${edge.target}`;
    const isHighlighted = connectedEdgeKeys.has(key);
    const dimmed = hasSelection && !isHighlighted;
    const isTierEdge = edge.edge_type === "tier_flow";
    const isSoft = edge.weight === "soft";

    // SLA coloring from edge metadata
    const edgeSlaStatus = edge.metadata?.sla_status as string | undefined;
    let strokeColor = "var(--color-border)";
    if (edgeSlaStatus) {
      strokeColor = slaColor(edgeSlaStatus);
    } else if (isHighlighted) {
      strokeColor = "var(--color-accent)";
    }

    return {
      id: key,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: isTierEdge,
      label: edge.label || undefined,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: strokeColor,
      },
      style: {
        stroke: strokeColor,
        strokeWidth: isHighlighted ? 2 : 1,
        strokeDasharray: isSoft ? "5 3" : undefined,
        opacity: dimmed ? 0.25 : 1,
        transition: "opacity 0.2s, stroke 0.2s",
      },
      labelStyle: {
        fill: dimmed ? "var(--color-muted)" : "var(--color-foreground)",
        fontSize: 8,
        fontWeight: 500,
        opacity: dimmed ? 0.3 : 1,
      },
      labelBgStyle: {
        fill: "var(--color-surface)",
        fillOpacity: 0.9,
      },
      labelBgPadding: [3, 5] as [number, number],
      labelBgBorderRadius: 3,
    };
  });

  return { nodes: rfNodes, edges: rfEdges };
}

// ─── Main component ───

export default function LineageExplorerTab() {
  const store = useLineageStore();
  const graph = store.selectedAlertId ? store.alertLineage : store.unifiedGraph;

  const { nodes, edges } = useMemo(
    () =>
      graph
        ? buildLineageGraph(graph, store.selectedNode, store.showRegulatoryOverlay)
        : { nodes: [], edges: [] },
    [graph, store.selectedNode, store.showRegulatoryOverlay],
  );

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      // Toggle selection: clicking same node deselects
      store.setSelectedNode(store.selectedNode === node.id ? null : node.id);
    },
    [store.selectedNode],
  );

  const handlePaneClick = useCallback(() => {
    store.setSelectedNode(null);
  }, []);

  if (!graph || graph.nodes.length === 0) {
    return (
      <Panel
        title="Lineage Explorer"
        className="h-full"
        dataTour="lineage-hero-graph"
        dataTrace="lineage.explorer"
      >
        <div className="flex items-center justify-center h-64 border border-dashed border-zinc-700 rounded text-zinc-500 text-sm">
          {store.selectedAlertId ? (
            <span>Loading alert lineage for: {store.selectedAlertId}</span>
          ) : (
            <span>Select entities and layers to explore lineage</span>
          )}
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Lineage Explorer"
      className="h-full"
      noPadding
      dataTour="lineage-hero-graph"
      dataTrace="lineage.explorer"
      actions={
        <div className="flex items-center gap-3">
          {store.selectedNode && (
            <span className="text-xs text-blue-400">
              Selected: {store.selectedNode}
            </span>
          )}
          <span className="text-xs text-zinc-500">
            {graph.total_nodes} nodes, {graph.total_edges} edges
          </span>
        </div>
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--color-border)" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          style={{ background: "var(--color-surface)", height: 60, width: 100 }}
          nodeColor={(node) => {
            if (node.type === "modelNode") return "#7c3aed";
            if (node.type === "alertNode") return "#f59e0b";
            if (node.type === "calcNode") {
              const layer = (node.data as CalcNodeData).layer;
              return LAYER_COLORS[layer] ?? "#6b7280";
            }
            const tier = (node.data as TierNodeData).tier;
            return TIER_COLORS[tier] ?? "#6b7280";
          }}
          maskColor="rgba(0,0,0,0.3)"
        />
      </ReactFlow>
    </Panel>
  );
}
