import { useEffect, useState, useCallback } from "react";
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
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

interface Tier {
  tier_id: string;
  tier_number: number;
  name: string;
  purpose: string;
  data_state: string;
  storage_format: string;
  retention_policy: string;
  quality_gate: string;
  access_level: string;
  mutable: boolean;
  append_only: boolean;
}

interface Contract {
  contract_id: string;
  source_tier: string;
  target_tier: string;
  entity: string;
  description: string;
  field_mappings: { source: string; target: string; transform: string }[];
  quality_rules: { rule: string; fields?: string[]; field?: string }[];
  sla: { freshness_minutes: number; completeness_pct: number };
  owner: string;
  classification: string;
}

interface PipelineStage {
  stage_id: string;
  name: string;
  tier_from: string | null;
  tier_to: string;
  order: number;
  depends_on: string[];
  entities: string[];
  parallel: boolean;
}

const NODE_W = 180;
const NODE_H = 80;

const TIER_COLORS: Record<string, string> = {
  landing: "#6366f1",
  bronze: "#d97706",
  quarantine: "#ef4444",
  silver: "#a3a3a3",
  gold: "#eab308",
  platinum: "#8b5cf6",
  reference: "#06b6d4",
  sandbox: "#22c55e",
  logging: "#64748b",
  metrics: "#f97316",
  archive: "#78716c",
};

function buildGraph(tiers: Tier[], contracts: Contract[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 50, ranksep: 140 });

  for (const t of tiers) {
    g.setNode(t.tier_id, { width: NODE_W, height: NODE_H });
  }

  const edgeSet = new Set<string>();
  for (const c of contracts) {
    const key = `${c.source_tier}->${c.target_tier}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      g.setEdge(c.source_tier, c.target_tier);
    }
  }

  // Core flow edges for tiers without contracts
  const coreFlow = ["landing", "bronze", "silver", "gold", "platinum"];
  for (let i = 0; i < coreFlow.length - 1; i++) {
    const key = `${coreFlow[i]}->${coreFlow[i + 1]}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      g.setEdge(coreFlow[i], coreFlow[i + 1]);
    }
  }
  if (!edgeSet.has("bronze->quarantine")) {
    edgeSet.add("bronze->quarantine");
    g.setEdge("bronze", "quarantine");
  }

  dagre.layout(g);

  const nodes: Node[] = tiers.map((t) => {
    const pos = g.node(t.tier_id);
    const color = TIER_COLORS[t.tier_id] ?? "var(--color-border)";
    return {
      id: t.tier_id,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: { label: `T${t.tier_number}: ${t.name}`, tier: t },
      style: {
        background: "var(--color-surface-elevated)",
        border: `2px solid ${color}`,
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        padding: "8px 10px",
        width: NODE_W,
        textAlign: "center" as const,
        cursor: "pointer",
        color: "var(--color-text)",
      },
    };
  });

  const edgeCounts: Record<string, number> = {};
  for (const c of contracts) {
    const key = `${c.source_tier}->${c.target_tier}`;
    edgeCounts[key] = (edgeCounts[key] ?? 0) + 1;
  }

  const edges: Edge[] = [];
  for (const key of edgeSet) {
    const [source, target] = key.split("->");
    const count = edgeCounts[key];
    edges.push({
      id: key,
      source,
      target,
      label: count ? `${count} contract${count > 1 ? "s" : ""}` : "",
      style: { stroke: "var(--color-border)" },
      labelStyle: { fontSize: 9, fill: "var(--color-muted)" },
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    });
  }

  return { nodes, edges };
}

export default function MedallionOverview() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageStatus, setStageStatus] = useState<Record<string, { status: string; duration_ms: number; quality_score: number | null }>>({});
  const [runningStage, setRunningStage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Tier[]>("/medallion/tiers"),
      api.get<Contract[]>("/medallion/contracts"),
      api.get<PipelineStage[]>("/medallion/pipeline-stages"),
    ])
      .then(([t, c, s]) => {
        setTiers(t);
        setContracts(c);
        setStages(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const tier = (node.data as { tier: Tier }).tier;
      setSelectedTier(tier);
    },
    []
  );

  const handleRunStage = useCallback(async (stageId: string) => {
    setRunningStage(stageId);
    try {
      const result = await api.post<{
        stage_id: string;
        status: string;
        duration_ms: number;
        contract_validation?: { quality_score?: number };
      }>(`/pipeline/stages/${stageId}/run`);
      setStageStatus((prev) => ({
        ...prev,
        [result.stage_id]: {
          status: result.status,
          duration_ms: result.duration_ms,
          quality_score: result.contract_validation?.quality_score ?? null,
        },
      }));
    } catch {
      setStageStatus((prev) => ({
        ...prev,
        [stageId]: { status: "failed", duration_ms: 0, quality_score: null },
      }));
    } finally {
      setRunningStage(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const { nodes, edges } = buildGraph(tiers, contracts);
  const tierContracts = selectedTier
    ? contracts.filter(
        (c) =>
          c.source_tier === selectedTier.tier_id ||
          c.target_tier === selectedTier.tier_id
      )
    : [];
  const tierStages = selectedTier
    ? stages.filter(
        (s) =>
          s.tier_from === selectedTier.tier_id ||
          s.tier_to === selectedTier.tier_id
      )
    : [];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold" data-trace="medallion.title">
          Medallion Architecture
        </h2>
        <StatusBadge label={`${tiers.length} tiers`} variant="info" />
        <StatusBadge label={`${contracts.length} contracts`} variant="muted" />
        <StatusBadge label={`${stages.length} stages`} variant="muted" />
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <Panel
          title="Tier Architecture"
          className="flex-1"
          noPadding
          dataTour="medallion-graph"
          dataTrace="medallion.tier-graph"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.5}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={2}
              style={{ background: "var(--color-surface)" }}
            />
          </ReactFlow>
        </Panel>

        <Panel
          title={selectedTier ? selectedTier.name : "Select a tier"}
          className="w-80 shrink-0 overflow-y-auto"
          dataTour="medallion-tier-detail"
          dataTrace="medallion.tier-detail"
        >
          {selectedTier ? (
            <div className="flex flex-col gap-3 text-xs">
              <p className="text-muted">{selectedTier.purpose}</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted">Data State</span>
                  <p className="font-medium">{selectedTier.data_state}</p>
                </div>
                <div>
                  <span className="text-muted">Format</span>
                  <p className="font-medium">{selectedTier.storage_format}</p>
                </div>
                <div>
                  <span className="text-muted">Retention</span>
                  <p className="font-medium">{selectedTier.retention_policy}</p>
                </div>
                <div>
                  <span className="text-muted">Quality Gate</span>
                  <p className="font-medium">{selectedTier.quality_gate}</p>
                </div>
                <div>
                  <span className="text-muted">Access Level</span>
                  <p className="font-medium">{selectedTier.access_level}</p>
                </div>
                <div>
                  <span className="text-muted">Mutable</span>
                  <p className="font-medium">{selectedTier.mutable ? "Yes" : "No"}</p>
                </div>
              </div>

              {tierContracts.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs mb-1">
                    Data Contracts ({tierContracts.length})
                  </h4>
                  {tierContracts.map((c) => (
                    <div
                      key={c.contract_id}
                      className="border border-border rounded p-2 mb-1"
                    >
                      <p className="font-medium">{c.entity}</p>
                      <p className="text-muted">
                        {c.source_tier} → {c.target_tier}
                      </p>
                      <p className="text-muted">
                        {c.field_mappings.length} mappings, {c.quality_rules.length} rules
                      </p>
                      <p className="text-muted">
                        SLA: {c.sla.freshness_minutes}min, {c.sla.completeness_pct}%
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {tierStages.length > 0 && (
                <div>
                  <h4 className="font-semibold text-xs mb-1">
                    Pipeline Stages ({tierStages.length})
                  </h4>
                  {tierStages.map((s) => (
                    <div
                      key={s.stage_id}
                      className="border border-border rounded p-2 mb-1"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{s.name}</p>
                        <button
                          onClick={() => handleRunStage(s.stage_id)}
                          disabled={runningStage === s.stage_id}
                          className="px-2 py-0.5 text-[10px] rounded border border-blue-500 text-blue-400 hover:bg-blue-500/10 disabled:opacity-50"
                          data-tour="medallion-run-stage"
                        >
                          {runningStage === s.stage_id ? "Running..." : "Run Stage"}
                        </button>
                      </div>
                      <p className="text-muted">
                        {s.tier_from ?? "source"} → {s.tier_to}
                      </p>
                      <p className="text-muted">
                        {s.entities.length} entities
                        {s.parallel ? " (parallel)" : " (sequential)"}
                      </p>
                      {stageStatus[s.stage_id] && (
                        <div className="mt-1 pt-1 border-t border-border/50 flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            stageStatus[s.stage_id].status === "completed" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          }`}>
                            {stageStatus[s.stage_id].status}
                          </span>
                          <span className="text-[10px] text-muted">{stageStatus[s.stage_id].duration_ms}ms</span>
                          {stageStatus[s.stage_id].quality_score !== null && (
                            <span className="text-[10px] text-muted">Quality: {stageStatus[s.stage_id].quality_score}%</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted text-xs">
              Click a tier in the graph to see its details, data contracts, and pipeline stages.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
