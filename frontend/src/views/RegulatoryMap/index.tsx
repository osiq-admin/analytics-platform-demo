import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { Group, Panel as ResizablePanel, Separator, useDefaultLayout } from "react-resizable-panels";
import type { ColDef } from "ag-grid-community";

import Panel from "../../components/Panel.tsx";
import DataGrid from "../../components/DataGrid.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import { useLocalStorage } from "../../hooks/useLocalStorage.ts";
import { useThemePalettes } from "../../hooks/useThemePalettes.ts";
import {
  useRegulatoryStore,
  type TraceabilityNode,
  type TraceabilityEdge,
  type SuggestionData,
  type ComplianceMatrixData,
  type BCBS239Data,
  type ComplianceControl,
} from "../../stores/regulatoryStore.ts";

/* ---------- Constants ---------- */

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

/** Default graph node border colors — overridden at runtime by metadata palette. */
const DEFAULT_BORDER_COLORS: Record<string, string> = {
  regulation: "#3b82f6",
  article_covered: "#22c55e",
  article_uncovered: "#ef4444",
  detection_model: "#f97316",
  calculation: "#a855f7",
};

/** Active border colors — set by RegulatoryMap component from useThemePalettes hook. */
let BORDER_COLORS: Record<string, string> = DEFAULT_BORDER_COLORS;

const EDGE_LABELS: Record<string, string> = {
  contains: "contains",
  detected_by: "detected by",
  uses_calc: "uses",
};

/* ---------- Dagre layout ---------- */

function layoutGraph(
  rawNodes: TraceabilityNode[],
  rawEdges: TraceabilityEdge[]
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 120 });

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
    type: "smoothstep",
    label: EDGE_LABELS[e.type] ?? e.type,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: "var(--color-border)",
    },
    style: { stroke: "var(--color-border)", strokeWidth: 1 },
    labelStyle: {
      fill: "var(--color-muted)",
      fontSize: 8,
      fontWeight: 500,
    },
    labelBgStyle: {
      fill: "var(--color-surface)",
      fillOpacity: 0.9,
    },
    labelBgPadding: [3, 5] as [number, number],
    labelBgBorderRadius: 3,
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

/* ---------- Regulation Details Grid Types ---------- */

interface RegulationRow {
  regulation: string;
  jurisdiction: string;
  article: string;
  title: string;
  description: string;
  covered: boolean;
  articleId: string;
}

type ViewTab = "graph" | "details" | "standards";

/* ---------- Component ---------- */

export default function RegulatoryMap() {
  const { regulations, coverage, graphNodes, graphEdges, suggestions, loading, error, fetchAll,
    complianceMatrix, bcbs239, fetchComplianceData } = useRegulatoryStore();
  const palette = useThemePalettes();

  // Update module-level border colors from metadata palette
  BORDER_COLORS = Object.keys(palette.graph_node_colors).length > 0
    ? palette.graph_node_colors
    : DEFAULT_BORDER_COLORS;

  const [selectedNode, setSelectedNode] = useState<TraceabilityNode | null>(null);
  const [selectedRow, setSelectedRow] = useState<RegulationRow | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useLocalStorage<ViewTab>("regulatory-map-tab", "graph");

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "regulatory-map-layout",
    storage: localStorage,
  });

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (activeTab === "standards" && !complianceMatrix) {
      fetchComplianceData();
    }
  }, [activeTab, complianceMatrix, fetchComplianceData]);

  const { nodes, edges } = useMemo(
    () => layoutGraph(graphNodes, graphEdges),
    [graphNodes, graphEdges]
  );

  // Flatten regulations → articles for the details grid
  const regulationRows = useMemo<RegulationRow[]>(() => {
    const coveredArticles = new Set(coverage?.covered_articles ?? []);
    const rows: RegulationRow[] = [];
    for (const reg of regulations) {
      for (const art of reg.articles) {
        const articleKey = `${reg.name} ${art.article}`;
        rows.push({
          regulation: reg.name,
          jurisdiction: reg.jurisdiction ?? "",
          article: art.article,
          title: art.title,
          description: art.description ?? "",
          covered: coveredArticles.has(articleKey),
          articleId: art.id,
        });
      }
    }
    return rows;
  }, [regulations, coverage]);

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

  const viewTabs: { key: ViewTab; label: string }[] = [
    { key: "graph", label: "Traceability Map" },
    { key: "details", label: "Regulation Details" },
    { key: "standards", label: "Standards Compliance" },
  ];

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Header + tabs */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Regulatory Traceability</h2>
        <div className="flex rounded border border-border overflow-hidden">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:text-foreground hover:bg-surface-elevated"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 shrink-0" data-tour="regulatory-cards" data-trace="regulatory.summary-cards">
        <SummaryCard label="Total Requirements" value={coverage?.total_articles ?? 0} />
        <SummaryCard label="Covered" value={coverage?.covered ?? 0} accent="text-green-500" />
        <SummaryCard label="Uncovered" value={coverage?.uncovered ?? 0} accent="text-red-500" />
        <SummaryCard
          label="Coverage %"
          value={`${coverage?.coverage_pct ?? 0}%`}
          accent={(coverage?.coverage_pct ?? 0) >= 70 ? "text-green-500" : "text-amber-500"}
        />
      </div>

      {activeTab === "standards" ? (
        /* Standards Compliance tab — full-height scrollable content */
        <div className="flex-1 min-h-0 overflow-auto">
          <StandardsComplianceContent
            complianceMatrix={complianceMatrix}
            bcbs239={bcbs239}
          />
        </div>
      ) : (
        <>
          {/* Tab content with resizable panels */}
          <Group
            orientation="vertical"
            className="flex-1 min-h-0"
            defaultLayout={defaultLayout}
            onLayoutChanged={onLayoutChanged}
          >
            <ResizablePanel id="regulatory-top" defaultSize="60%" minSize="25%">
              {activeTab === "graph" ? (
                <Panel title="Traceability Graph" className="h-full" noPadding dataTour="regulatory-graph" dataTrace="regulatory.traceability-graph">
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
                    <MiniMap
                      style={{ background: "var(--color-surface)", height: 60, width: 100 }}
                      nodeColor="var(--color-accent)"
                      maskColor="rgba(0,0,0,0.3)"
                    />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </Panel>
              ) : (
                <Panel title="Regulation Details" className="h-full" noPadding dataTour="regulatory-details-grid" dataTrace="regulatory.coverage-grid">
                  <DataGrid
                    rowData={regulationRows}
                    columnDefs={regulationColumns}
                    getRowId={(p) => p.data.articleId}
                    rowSelection="single"
                    onRowClicked={(e) => {
                      if (e.data) setSelectedRow(e.data);
                    }}
                  />
                </Panel>
              )}
            </ResizablePanel>

            <Separator className="h-1.5 bg-border hover:bg-accent transition-colors cursor-row-resize" />

            <ResizablePanel id="regulatory-bottom" defaultSize="40%" minSize="15%">
              <Panel
                title={activeTab === "graph" ? "Node Details" : "Article Details"}
                className="h-full"
                dataTour="regulatory-detail"
              >
                {activeTab === "graph" ? (
                  selectedNode ? (
                    <NodeDetail node={selectedNode} />
                  ) : (
                    <p className="text-xs text-muted">Click a node in the graph to view details.</p>
                  )
                ) : (
                  selectedRow ? (
                    <ArticleDetail row={selectedRow} />
                  ) : (
                    <p className="text-xs text-muted">Click a row in the table to view article details.</p>
                  )
                )}

                {/* Legend */}
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1.5">Legend</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {LEGEND_ITEMS.map((item) => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm border-2" style={{ borderColor: item.color }} />
                        <span className="text-[10px] text-foreground/70">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </ResizablePanel>
          </Group>

          {/* Suggestions Panel */}
          {suggestions && (
            <SuggestionsPanel
              suggestions={suggestions}
              expanded={showSuggestions}
              onToggle={() => setShowSuggestions((p) => !p)}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Regulation Details Columns ---------- */

const regulationColumns: ColDef<RegulationRow>[] = [
  { field: "regulation", headerName: "Regulation", width: 100 },
  { field: "jurisdiction", headerName: "Jurisdiction", width: 90 },
  { field: "article", headerName: "Article", width: 120 },
  { field: "title", headerName: "Title", minWidth: 150, flex: 1 },
  {
    headerName: "Coverage",
    width: 100,
    valueGetter: (p) => (p.data?.covered ? "Covered" : "Uncovered"),
    cellRenderer: (p: { value: string }) => (
      <StatusBadge
        label={p.value}
        variant={p.value === "Covered" ? "success" : "error"}
      />
    ),
  },
];

/* ---------- Compliance Matrix Columns ---------- */

interface ComplianceMatrixRow extends ComplianceControl {
  standard_name: string;
  standard_category: string;
}

const complianceMatrixColumns: ColDef<ComplianceMatrixRow>[] = [
  { field: "standard_name", headerName: "Standard", width: 160 },
  { field: "standard_category", headerName: "Category", width: 100 },
  { field: "control_id", headerName: "Control", width: 120 },
  { field: "control_name", headerName: "Name", minWidth: 150, flex: 1 },
  {
    field: "compliance_level",
    headerName: "Level",
    width: 90,
    cellRenderer: (p: { value: string }) => (
      <StatusBadge
        label={p.value}
        variant={p.value === "full" ? "success" : p.value === "partial" ? "warning" : "error"}
      />
    ),
  },
  { field: "platform_capability", headerName: "Capability", width: 130 },
  {
    headerName: "Evidence",
    width: 80,
    valueGetter: (p) => p.data?.evidence_links?.length ?? 0,
  },
];

/* ---------- Standards Compliance Content ---------- */

function StandardsComplianceContent({
  complianceMatrix,
  bcbs239,
}: {
  complianceMatrix: ComplianceMatrixData | null;
  bcbs239: BCBS239Data | null;
}) {
  const [selectedControl, setSelectedControl] = useState<ComplianceControl | null>(null);
  const [showGaps, setShowGaps] = useState(false);

  if (!complianceMatrix || !bcbs239) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  const { summary } = complianceMatrix;

  const matrixRows: ComplianceMatrixRow[] = complianceMatrix.standards.flatMap((std) =>
    std.controls.map((ctrl) => ({
      ...ctrl,
      standard_name: std.name,
      standard_category: std.category,
    }))
  );

  const gapControls = matrixRows.filter((r) => r.compliance_level === "gap");

  return (
    <div className="flex flex-col h-full gap-3" data-trace="regulatory.standards-compliance">
      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3" data-tour="standards-summary" data-trace="regulatory.standards-summary">
        <ComplianceSummaryCard label="Standards" value={summary.total_standards} />
        <ComplianceSummaryCard label="Controls" value={summary.total_controls} />
        <ComplianceSummaryCard label="Full" value={summary.full_count} accent="text-green-500" />
        <ComplianceSummaryCard label="Partial" value={summary.partial_count} accent="text-amber-500" />
        <ComplianceSummaryCard
          label="Compliance"
          value={`${summary.compliance_percentage}%`}
          accent={summary.compliance_percentage >= 75 ? "text-green-500" : "text-amber-500"}
        />
      </div>

      {/* Compliance Matrix Grid */}
      <Panel title="Compliance Matrix" noPadding dataTour="standards-matrix" dataTrace="regulatory.compliance-matrix" className="h-[320px]">
        <DataGrid<ComplianceMatrixRow>
          rowData={matrixRows}
          columnDefs={complianceMatrixColumns}
          onRowClicked={(e) => setSelectedControl(e.data ?? null)}
          rowSelection="single"
          getRowId={(p) => p.data.control_id}
        />
      </Panel>

      {/* Evidence detail */}
      {selectedControl && (
        <Panel title={`Evidence: ${selectedControl.control_name}`} dataTrace="regulatory.evidence-detail">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <StatusBadge
                label={selectedControl.compliance_level}
                variant={selectedControl.compliance_level === "full" ? "success" : selectedControl.compliance_level === "partial" ? "warning" : "error"}
              />
              <span className="text-muted">{selectedControl.platform_capability}</span>
            </div>
            <p className="text-muted">{selectedControl.description}</p>
            {selectedControl.gap_notes && (
              <p className="text-amber-500 text-[10px]">Gap: {selectedControl.gap_notes}</p>
            )}
            <div className="space-y-1">
              <span className="text-muted font-medium">Evidence Links:</span>
              {selectedControl.evidence_links.length === 0 ? (
                <p className="text-muted italic">No evidence links</p>
              ) : (
                selectedControl.evidence_links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-mono bg-surface-elevated rounded px-2 py-1">
                    <StatusBadge label={link.type} variant="info" />
                    <span className="text-foreground">{link.path}</span>
                    <span className="text-muted ml-auto">{link.description}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* BCBS 239 Principles */}
      <Panel title="BCBS 239 Principles" dataTour="bcbs239-principles" dataTrace="regulatory.bcbs239-principles">
        <div className="grid grid-cols-3 gap-2">
          {bcbs239.principles.map((p) => (
            <div key={p.principle_number} className="rounded border border-border bg-surface-elevated p-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground">
                  {p.principle_number}. {p.principle_name}
                </span>
                <StatusBadge
                  label={p.compliance_level}
                  variant={p.compliance_level === "full" ? "success" : p.compliance_level === "partial" ? "warning" : "error"}
                />
              </div>
              <p className="text-muted text-[10px] mb-1 line-clamp-2">{p.description}</p>
              <div className="flex flex-wrap gap-1">
                {p.platform_capabilities.map((cap) => (
                  <span key={cap} className="bg-surface rounded px-1 py-0.5 text-[9px] text-muted">
                    {cap}
                  </span>
                ))}
              </div>
              {p.gap_notes && (
                <p className="text-amber-500 text-[9px] mt-1">{p.gap_notes}</p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Gap Analysis */}
      {gapControls.length > 0 && (
        <div data-trace="regulatory.gap-analysis">
          <button
            onClick={() => setShowGaps(!showGaps)}
            className="flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground transition-colors mb-2"
          >
            <span className={`transform transition-transform ${showGaps ? "rotate-90" : ""}`}>&#9654;</span>
            Gap Analysis ({gapControls.length} gaps)
          </button>
          {showGaps && (
            <div className="space-y-2">
              {gapControls.map((gap) => (
                <div key={gap.control_id} className="rounded border border-red-500/30 bg-red-500/5 p-2 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge label="gap" variant="error" />
                    <span className="font-medium text-foreground">{gap.standard_name}</span>
                    <span className="text-muted">&mdash; {gap.control_name}</span>
                  </div>
                  {gap.gap_notes && <p className="text-muted text-[10px]">{gap.gap_notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Compliance Summary Card ---------- */

function ComplianceSummaryCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded border border-border bg-surface p-2 text-center">
      <div className={`text-lg font-semibold ${accent ?? "text-foreground"}`}>{value}</div>
      <div className="text-[10px] text-muted uppercase tracking-wide">{label}</div>
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
      <div className="flex items-center gap-2">
        <StatusBadge label={typeLabels[node.type] ?? node.type} variant="info" />
        <span className="font-semibold">{node.label}</span>
      </div>
      {node.full_name && (
        <div>
          <span className="font-semibold text-muted">Full Name:</span> {node.full_name}
        </div>
      )}
      {node.jurisdiction && (
        <div>
          <span className="font-semibold text-muted">Jurisdiction:</span> {node.jurisdiction}
        </div>
      )}
      {node.title && (
        <div>
          <span className="font-semibold text-muted">Title:</span> {node.title}
        </div>
      )}
      {node.type === "article" && (
        <div>
          <span className="font-semibold text-muted">Status:</span>{" "}
          <span className={node.covered ? "text-green-500" : "text-red-500"}>
            {node.covered ? "Covered" : "Uncovered"}
          </span>
        </div>
      )}
      {node.layer && (
        <div>
          <span className="font-semibold text-muted">Layer:</span> {node.layer}
        </div>
      )}
      {node.description && (
        <div className="rounded border border-border bg-background p-3 mt-2">
          <span className="font-semibold text-muted block mb-1 text-[10px] uppercase">Description</span>
          <p className="text-foreground/80 text-xs leading-relaxed">{node.description}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Article Detail ---------- */

function ArticleDetail({ row }: { row: RegulationRow }) {
  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center gap-2">
        <StatusBadge label={row.covered ? "Covered" : "Uncovered"} variant={row.covered ? "success" : "error"} />
        <span className="font-semibold">{row.regulation} {row.article}</span>
      </div>
      <div>
        <span className="font-semibold text-muted">Title:</span> {row.title}
      </div>
      <div>
        <span className="font-semibold text-muted">Jurisdiction:</span> {row.jurisdiction}
      </div>
      {row.description && (
        <div className="rounded border border-border bg-background p-3 mt-2">
          <span className="font-semibold text-muted block mb-1 text-[10px] uppercase">Description</span>
          <p className="text-foreground/80 text-xs leading-relaxed">{row.description}</p>
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
      data-trace="regulatory.suggestions"
    >
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

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border pt-3">
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
                <p className="text-[11px] text-foreground/60 mt-0.5">{g.description}</p>
              )}
              <p className="text-xs text-foreground/80 mt-1.5">{g.suggestion}</p>
            </div>
          ))}

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
              <p className="text-[11px] text-foreground/50 mt-1 italic">{imp.impact}</p>
            </div>
          ))}

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
