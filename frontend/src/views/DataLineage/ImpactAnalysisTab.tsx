import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import Panel from "../../components/Panel.tsx";
import { useLineageStore, type LineageNode, type LineageEdge } from "../../stores/lineageStore.ts";
import { api } from "../../api/client.ts";

// ─── Types ───

interface SettingOption {
  setting_id: string;
  name: string;
  value_type: string;
  default: unknown;
}

// ─── CSS keyframes (injected once) ───

const PULSE_STYLE_ID = "impact-pulse-keyframes";
function ensurePulseStyles() {
  if (document.getElementById(PULSE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PULSE_STYLE_ID;
  style.textContent = `
    @keyframes impact-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.6); }
      50% { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
    }
  `;
  document.head.appendChild(style);
}

// ─── Graph layout ───

const NODE_W = 160;
const NODE_H = 48;

function layoutImpactGraph(
  allNodes: LineageNode[],
  allEdges: LineageEdge[],
  origin: LineageNode | null,
  affectedNodeIds: Set<string>,
  hardNodeIds: Set<string>,
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 70 });

  for (const n of allNodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of allEdges) {
    if (allNodes.some((n) => n.id === e.source) && allNodes.some((n) => n.id === e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = allNodes.map((n) => {
    const pos = g.node(n.id);
    const isOrigin = origin?.id === n.id;
    const isHard = hardNodeIds.has(n.id);
    const isSoft = affectedNodeIds.has(n.id) && !isHard;
    const isAffected = affectedNodeIds.has(n.id) || isOrigin;

    let background = "var(--color-surface-elevated)";
    let border = "2px solid var(--color-border)";
    let opacity = 0.15;

    if (isOrigin) {
      background = "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(59,130,246,0.10))";
      border = "2px solid rgb(59,130,246)";
      opacity = 1;
    } else if (isHard) {
      background = "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.10))";
      border = "2px solid rgb(239,68,68)";
      opacity = 1;
    } else if (isSoft) {
      background = "linear-gradient(135deg, rgba(245,158,11,0.20), rgba(245,158,11,0.08))";
      border = "2px dashed rgb(245,158,11)";
      opacity = 1;
    } else if (!origin) {
      // No analysis yet — show all normally
      opacity = 1;
    }

    return {
      id: n.id,
      position: { x: (pos?.x ?? 0) - NODE_W / 2, y: (pos?.y ?? 0) - NODE_H / 2 },
      data: { label: n.label || n.id, nodeType: n.node_type, tier: n.tier },
      style: {
        background: isAffected || !origin ? background : "var(--color-surface-elevated)",
        border,
        borderRadius: 6,
        fontSize: 10,
        fontWeight: isOrigin ? 700 : 500,
        padding: "6px 10px",
        width: NODE_W,
        opacity,
        cursor: "pointer",
        color: "var(--color-text)",
        animation: isOrigin ? "impact-pulse 2s ease-in-out infinite" : undefined,
        textAlign: "center" as const,
      },
    };
  });

  const affectedEdgeSet = new Set<string>();
  for (const e of allEdges) {
    if (
      (affectedNodeIds.has(e.source) || origin?.id === e.source) &&
      (affectedNodeIds.has(e.target) || origin?.id === e.target)
    ) {
      affectedEdgeSet.add(`${e.source}->${e.target}`);
    }
  }

  const edges: Edge[] = allEdges
    .filter(
      (e) =>
        allNodes.some((n) => n.id === e.source) &&
        allNodes.some((n) => n.id === e.target),
    )
    .map((e) => {
      const key = `${e.source}->${e.target}`;
      const isAffectedEdge = affectedEdgeSet.has(key);
      return {
        id: key,
        source: e.source,
        target: e.target,
        label: e.label || undefined,
        labelStyle: { fontSize: 8, fill: "var(--color-muted)" },
        style: {
          stroke: isAffectedEdge
            ? e.weight === "hard"
              ? "rgb(239,68,68)"
              : "rgb(245,158,11)"
            : "var(--color-border)",
          strokeDasharray: e.weight === "soft" ? "5 3" : undefined,
          opacity: isAffectedEdge || !origin ? 1 : 0.12,
        },
        animated: isAffectedEdge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 10,
          height: 10,
          color: isAffectedEdge
            ? e.weight === "hard"
              ? "rgb(239,68,68)"
              : "rgb(245,158,11)"
            : undefined,
        },
      };
    });

  return { nodes, edges };
}

// ─── Component ───

export default function ImpactAnalysisTab() {
  const store = useLineageStore();
  const {
    unifiedGraph,
    impactResult,
    impactDirection,
    settingsPreview,
    selectedNode,
    setImpactDirection,
    fetchImpact,
    previewThresholdChange,
  } = store;

  // Local state
  const [nodeInput, setNodeInput] = useState(selectedNode ?? "");
  const [settingsList, setSettingsList] = useState<SettingOption[]>([]);
  const [selectedSetting, setSelectedSetting] = useState<string>("");
  const [paramName, setParamName] = useState<string>("threshold");
  const [currentValue, setCurrentValue] = useState<number>(50);
  const [proposedValue, setProposedValue] = useState<number>(50);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Sync from store when a node is clicked in Explorer tab
  useEffect(() => {
    if (selectedNode) setNodeInput(selectedNode);
  }, [selectedNode]);

  // Inject pulse animation CSS
  useEffect(() => {
    ensurePulseStyles();
  }, []);

  // Fetch settings list on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingSettings(true);
    api
      .get<SettingOption[]>("/metadata/settings")
      .then((data) => {
        if (!cancelled) {
          setSettingsList(data);
          if (data.length > 0) {
            setSelectedSetting(data[0].setting_id);
            const defVal =
              typeof data[0].default === "number" ? data[0].default : 50;
            setCurrentValue(defVal);
            setProposedValue(defVal);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setSettingsList([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSettings(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When setting changes, update current value
  useEffect(() => {
    const s = settingsList.find((s) => s.setting_id === selectedSetting);
    if (s) {
      const defVal = typeof s.default === "number" ? s.default : 50;
      setCurrentValue(defVal);
      setProposedValue(defVal);
      setParamName(s.value_type === "numeric" ? "threshold" : "value");
    }
  }, [selectedSetting, settingsList]);

  // Compute affected node sets
  const hardNodeIds = useMemo(() => {
    if (!impactResult) return new Set<string>();
    return new Set(
      impactResult.affected_nodes
        .filter((n) =>
          impactResult.affected_edges.some(
            (e) =>
              e.weight === "hard" &&
              (e.source === n.id || e.target === n.id),
          ),
        )
        .map((n) => n.id),
    );
  }, [impactResult]);

  const affectedNodeIds = useMemo(() => {
    if (!impactResult) return new Set<string>();
    return new Set(impactResult.affected_nodes.map((n) => n.id));
  }, [impactResult]);

  // Build graph
  const graphNodes = unifiedGraph?.nodes ?? impactResult?.affected_nodes ?? [];
  const graphEdges = unifiedGraph?.edges ?? impactResult?.affected_edges ?? [];

  const { nodes, edges } = useMemo(
    () =>
      layoutImpactGraph(
        graphNodes,
        graphEdges,
        impactResult?.origin ?? null,
        affectedNodeIds,
        hardNodeIds,
      ),
    [graphNodes, graphEdges, impactResult, affectedNodeIds, hardNodeIds],
  );

  const handleAnalyze = useCallback(() => {
    if (!nodeInput.trim()) return;
    fetchImpact(nodeInput.trim(), impactDirection);
  }, [nodeInput, impactDirection, fetchImpact]);

  const handlePreview = useCallback(() => {
    if (!selectedSetting) return;
    previewThresholdChange(selectedSetting, paramName, proposedValue);
  }, [selectedSetting, paramName, proposedValue, previewThresholdChange]);

  // Impact summary table data
  const summaryRows = useMemo(() => {
    if (!impactResult) return [];
    const rows: { type: string; count: number; severity: string }[] = [];
    for (const [key, count] of Object.entries(impactResult.impact_summary)) {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      // Derive severity from whether these nodes are mostly hard or soft
      const hardCount = impactResult.affected_nodes.filter(
        (n) => n.node_type === key && hardNodeIds.has(n.id),
      ).length;
      const severity = hardCount > 0 ? "hard" : "soft";
      rows.push({ type: label, count, severity });
    }
    return rows;
  }, [impactResult, hardNodeIds]);

  return (
    <div className="flex gap-3 h-full min-h-0" data-trace="lineage.impact_analysis">
      {/* Main content (left) */}
      <div className="flex flex-col flex-1 min-w-0 gap-3">
        {/* Input controls */}
        <Panel title="Impact Analysis" dataTour="lineage-impact-controls" dataTrace="lineage.impact_controls">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Node selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-zinc-500">Node:</label>
              <input
                type="text"
                value={nodeInput}
                onChange={(e) => setNodeInput(e.target.value)}
                placeholder="Enter node ID..."
                className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 w-48 focus:outline-none focus:border-blue-500"
                data-tour="lineage-impact-node-input"
                data-trace="lineage.impact_node_input"
              />
            </div>

            {/* Direction toggle */}
            <div className="flex items-center gap-1" data-tour="lineage-impact-direction">
              {(["upstream", "downstream", "both"] as const).map((dir) => (
                <button
                  key={dir}
                  onClick={() => setImpactDirection(dir)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    impactDirection === dir
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600"
                  }`}
                  data-trace={`lineage.impact_dir.${dir}`}
                >
                  {dir.charAt(0).toUpperCase() + dir.slice(1)}
                </button>
              ))}
            </div>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!nodeInput.trim() || store.loading}
              className="px-3 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-tour="lineage-impact-analyze-btn"
              data-trace="lineage.impact_analyze"
            >
              {store.loading ? "Analyzing..." : "Analyze Impact"}
            </button>
          </div>
        </Panel>

        {/* Impact graph */}
        <Panel
          title="Impact Graph"
          className="flex-1"
          noPadding
          dataTour="lineage-impact-graph"
          dataTrace="lineage.impact_graph"
          actions={
            impactResult ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                  Hard: {impactResult.hard_impact_count}
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                  Soft: {impactResult.soft_impact_count}
                </span>
              </div>
            ) : undefined
          }
        >
          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={(_e, node) => setNodeInput(node.id)}
              fitView
              minZoom={0.3}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="var(--color-border)" gap={20} size={1} />
              <Controls showInteractive={false} />
              <MiniMap nodeStrokeWidth={2} style={{ background: "var(--color-surface)" }} />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              {impactResult
                ? "No nodes to display"
                : "Enter a node ID and click Analyze Impact to visualize impact propagation"}
            </div>
          )}
        </Panel>

        {/* Impact summary table */}
        {impactResult && (
          <Panel
            title="Impact Summary"
            dataTour="lineage-impact-summary"
            dataTrace="lineage.impact_summary"
          >
            <div className="flex gap-4">
              {/* Summary table */}
              <div className="flex-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left py-1.5 px-2 text-zinc-500 font-medium">Affected Type</th>
                      <th className="text-right py-1.5 px-2 text-zinc-500 font-medium">Count</th>
                      <th className="text-center py-1.5 px-2 text-zinc-500 font-medium">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.length > 0 ? (
                      summaryRows.map((row) => (
                        <tr key={row.type} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="py-1.5 px-2 text-zinc-300">{row.type}</td>
                          <td className="py-1.5 px-2 text-right text-zinc-200 font-medium">{row.count}</td>
                          <td className="py-1.5 px-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                row.severity === "hard"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {row.severity}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-2 px-2 text-center text-zinc-500">
                          No impact data yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Regulatory impact list */}
              {impactResult.regulatory_impact.length > 0 && (
                <div className="w-48 shrink-0">
                  <h4 className="text-xs font-medium text-zinc-300 mb-1.5">Regulatory Impact</h4>
                  <div className="space-y-1">
                    {impactResult.regulatory_impact.map((reg) => (
                      <div
                        key={reg}
                        className="flex items-center gap-1.5 text-xs text-amber-400/90"
                      >
                        <span className="text-amber-500">!</span>
                        <span>{reg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>

      {/* What-If Simulator panel (right side) */}
      <Panel
        title="What-If Simulator"
        className="w-72 shrink-0 overflow-y-auto"
        dataTour="lineage-whatif"
        dataTrace="lineage.whatif_simulator"
      >
        <div className="flex flex-col gap-3 text-xs">
          <p className="text-zinc-500">
            Preview how threshold changes affect alert counts and detection models.
          </p>

          {/* Setting selector */}
          <div>
            <label className="text-zinc-500 block mb-1">Setting</label>
            {loadingSettings ? (
              <p className="text-zinc-600 text-[10px]">Loading settings...</p>
            ) : (
              <select
                value={selectedSetting}
                onChange={(e) => setSelectedSetting(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
                data-trace="lineage.whatif_setting_select"
              >
                {settingsList.map((s) => (
                  <option key={s.setting_id} value={s.setting_id}>
                    {s.name}
                  </option>
                ))}
                {settingsList.length === 0 && (
                  <option value="">No settings available</option>
                )}
              </select>
            )}
          </div>

          {/* Parameter name */}
          <div>
            <label className="text-zinc-500 block mb-1">Parameter</label>
            <p className="text-zinc-300 font-medium">{paramName}</p>
          </div>

          {/* Current value */}
          <div>
            <label className="text-zinc-500 block mb-1">Current Value</label>
            <p className="text-zinc-200 font-medium text-sm">{currentValue}</p>
          </div>

          {/* Proposed value slider */}
          <div>
            <label className="text-zinc-500 block mb-1">
              Proposed Value: <span className="text-zinc-200 font-medium">{proposedValue}</span>
            </label>
            <input
              type="range"
              min={0}
              max={Math.max(currentValue * 3, 100)}
              step={1}
              value={proposedValue}
              onChange={(e) => setProposedValue(Number(e.target.value))}
              className="w-full accent-blue-500"
              data-trace="lineage.whatif_slider"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
              <span>0</span>
              <span>{Math.max(currentValue * 3, 100)}</span>
            </div>
          </div>

          {/* Preview button */}
          <button
            onClick={handlePreview}
            disabled={!selectedSetting || store.loading}
            className="w-full px-3 py-1.5 text-xs font-medium rounded bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            data-tour="lineage-whatif-preview-btn"
            data-trace="lineage.whatif_preview"
          >
            {store.loading ? "Previewing..." : "Preview"}
          </button>

          {/* Preview results */}
          {settingsPreview && (
            <div className="mt-1 p-2.5 border border-zinc-700/60 rounded bg-zinc-800/40 space-y-2">
              <h4 className="font-semibold text-zinc-300">Preview Results</h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Current Alerts</span>
                  <p className="text-zinc-200 font-medium">{settingsPreview.current_alert_count}</p>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Projected Alerts</span>
                  <p className="text-zinc-200 font-medium">{settingsPreview.projected_alert_count}</p>
                </div>
              </div>

              <div>
                <span className="text-zinc-500 block text-[10px]">Delta</span>
                <p
                  className={`font-semibold text-sm ${
                    settingsPreview.delta > 0
                      ? "text-red-400"
                      : settingsPreview.delta < 0
                        ? "text-emerald-400"
                        : "text-zinc-400"
                  }`}
                >
                  {settingsPreview.delta > 0 ? "+" : ""}
                  {settingsPreview.delta}
                </p>
              </div>

              {settingsPreview.affected_models.length > 0 && (
                <div>
                  <span className="text-zinc-500 block text-[10px] mb-0.5">Affected Models</span>
                  <div className="flex flex-wrap gap-1">
                    {settingsPreview.affected_models.map((m) => (
                      <span
                        key={m}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      >
                        {m.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {settingsPreview.affected_products.length > 0 && (
                <div>
                  <span className="text-zinc-500 block text-[10px] mb-0.5">Affected Products</span>
                  <p className="text-zinc-400 text-[10px]">
                    {settingsPreview.affected_products.length} product(s)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
