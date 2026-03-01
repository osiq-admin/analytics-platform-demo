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

// ---------------------------------------------------------------------------
// Types — Architecture tab
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Types — Lakehouse tab
// ---------------------------------------------------------------------------

interface SchemaEvolution {
  table_name: string;
  operation: string;
  field_name: string;
  details: Record<string, string>;
  applied_at: string;
}

interface PIIField {
  field: string;
  classification: string;
  regulation: string[];
  crypto_shred: boolean;
  retention_years: number;
  masking_strategy: string;
}

interface PIIRegistry {
  registry_version: string;
  entities: Record<string, { pii_fields: PIIField[] }>;
}

interface CalcResultLog {
  run_id: string;
  calc_id: string;
  layer: string;
  status: string;
  duration_ms: number;
  record_count: number;
  skip_reason: string | null;
  executed_at: string;
}

interface PipelineRun {
  run_id: string;
  run_type: string;
  status: string;
  branch_name: string | null;
  tag_name: string | null;
  started_at: string;
  completed_at: string | null;
  entities_processed: string[];
  tiers_affected: string[];
}

interface MVStatus {
  mv_id: string;
  status: string;
  record_count?: number;
  last_refresh?: string;
}

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type ViewTab = "architecture" | "lakehouse";

const TABS: { key: ViewTab; label: string }[] = [
  { key: "architecture", label: "Architecture" },
  { key: "lakehouse", label: "Lakehouse" },
];

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Lakehouse sub-panels
// ---------------------------------------------------------------------------

function IcebergTablesPanel({ tables }: { tables: Record<string, string[]> }) {
  const tierNames = Object.keys(tables);
  const totalTables = tierNames.reduce((acc, t) => acc + tables[t].length, 0);
  return (
    <Panel title={`Iceberg Tables (${totalTables})`} dataTour="lakehouse-iceberg-tables" dataTrace="medallion.lakehouse.iceberg-tables">
      {tierNames.length === 0 ? (
        <p className="text-muted text-xs">No Iceberg tables available. Lakehouse services may not be initialized.</p>
      ) : (
        <div className="flex flex-col gap-2 text-xs">
          {tierNames.map((tier) => (
            <div key={tier}>
              <h4 className="font-semibold text-xs mb-1 capitalize" style={{ color: TIER_COLORS[tier] ?? "var(--color-text)" }}>
                {tier} ({tables[tier].length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {tables[tier].map((name) => (
                  <span key={name} className="px-2 py-0.5 rounded bg-surface-elevated border border-border text-[10px]">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SchemaEvolutionPanel({ history }: { history: SchemaEvolution[] }) {
  return (
    <Panel title={`Schema Evolution (${history.length})`} dataTour="lakehouse-schema-evolution" dataTrace="medallion.lakehouse.schema-evolution">
      {history.length === 0 ? (
        <p className="text-muted text-xs">No schema evolutions recorded.</p>
      ) : (
        <div className="flex flex-col gap-1 text-xs max-h-48 overflow-y-auto">
          {history.map((ev, i) => (
            <div key={i} className="border border-border rounded p-2 flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                ev.operation === "add_column" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              }`}>
                {ev.operation}
              </span>
              <span className="font-medium">{ev.table_name}.{ev.field_name}</span>
              <span className="text-muted ml-auto text-[10px]">{ev.applied_at ? new Date(ev.applied_at).toLocaleString() : ""}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function PIIGovernancePanel({ registry }: { registry: PIIRegistry | null }) {
  if (!registry) {
    return (
      <Panel title="PII Governance" dataTour="lakehouse-pii-governance" dataTrace="medallion.lakehouse.pii-governance">
        <p className="text-muted text-xs">Governance service not available.</p>
      </Panel>
    );
  }
  const entities = Object.entries(registry.entities);
  const totalFields = entities.reduce((acc, [, e]) => acc + e.pii_fields.length, 0);
  const allRegulations = new Set<string>();
  for (const [, e] of entities) {
    for (const f of e.pii_fields) {
      for (const r of f.regulation) allRegulations.add(r);
    }
  }

  return (
    <Panel title={`PII Governance (${totalFields} fields)`} dataTour="lakehouse-pii-governance" dataTrace="medallion.lakehouse.pii-governance">
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex gap-2">
          <StatusBadge label={`v${registry.registry_version}`} variant="info" />
          <StatusBadge label={`${entities.length} entities`} variant="muted" />
          {Array.from(allRegulations).map((r) => (
            <StatusBadge key={r} label={r} variant="warning" />
          ))}
        </div>
        {entities.map(([entityId, entityGov]) => (
          <div key={entityId} className="border border-border rounded p-2">
            <h4 className="font-semibold capitalize">{entityId}</h4>
            {entityGov.pii_fields.length === 0 ? (
              <p className="text-muted">No PII fields</p>
            ) : (
              <div className="flex flex-col gap-1 mt-1">
                {entityGov.pii_fields.map((f) => (
                  <div key={f.field} className="flex items-center gap-2">
                    <span className="font-mono text-[10px]">{f.field}</span>
                    <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                      f.classification === "HIGH" ? "bg-red-500/20 text-red-400"
                      : f.classification === "MEDIUM" ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-green-500/20 text-green-400"
                    }`}>
                      {f.classification}
                    </span>
                    {f.crypto_shred && (
                      <span className="px-1 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400">crypto-shred</span>
                    )}
                    <span className="text-muted text-[10px]">{f.retention_years}yr</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CalcAuditPanel({ stats, log }: { stats: Record<string, number> | null; log: CalcResultLog[] }) {
  return (
    <Panel title="Calculation Audit" dataTour="lakehouse-calc-audit" dataTrace="medallion.lakehouse.calc-audit">
      <div className="flex flex-col gap-2 text-xs">
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="border border-border rounded p-2 text-center">
              <p className="text-muted">Executions</p>
              <p className="text-lg font-semibold">{stats.total_executions ?? 0}</p>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <p className="text-muted">Skipped</p>
              <p className="text-lg font-semibold">{stats.skipped ?? 0}</p>
            </div>
            <div className="border border-border rounded p-2 text-center">
              <p className="text-muted">Skip Rate</p>
              <p className="text-lg font-semibold">{stats.skip_rate ?? 0}%</p>
            </div>
          </div>
        )}
        {log.length > 0 && (
          <div className="max-h-36 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left py-1">Calc</th>
                  <th className="text-left py-1">Status</th>
                  <th className="text-right py-1">Records</th>
                  <th className="text-right py-1">Duration</th>
                </tr>
              </thead>
              <tbody>
                {log.slice(0, 20).map((entry, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-0.5 font-mono">{entry.calc_id}</td>
                    <td className="py-0.5">
                      <span className={`px-1 py-0.5 rounded font-medium ${
                        entry.status === "success" ? "bg-green-500/20 text-green-400"
                        : entry.status === "skipped" ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-red-500/20 text-red-400"
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-0.5 text-right">{entry.record_count}</td>
                    <td className="py-0.5 text-right">{entry.duration_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!stats && log.length === 0 && (
          <p className="text-muted">No calculation audit data available.</p>
        )}
      </div>
    </Panel>
  );
}

function PipelineRunsPanel({ runs }: { runs: PipelineRun[] }) {
  return (
    <Panel title={`Pipeline Runs (${runs.length})`} dataTour="lakehouse-pipeline-runs" dataTrace="medallion.lakehouse.pipeline-runs">
      {runs.length === 0 ? (
        <p className="text-muted text-xs">No pipeline runs recorded.</p>
      ) : (
        <div className="flex flex-col gap-1 text-xs max-h-48 overflow-y-auto">
          {runs.map((run) => (
            <div key={run.run_id} className="border border-border rounded p-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]">{run.run_id}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  run.status === "published" ? "bg-green-500/20 text-green-400"
                  : run.status === "running" ? "bg-blue-500/20 text-blue-400"
                  : run.status === "failed" ? "bg-red-500/20 text-red-400"
                  : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {run.status}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface-elevated border border-border">
                  {run.run_type}
                </span>
              </div>
              <div className="flex gap-3 mt-1 text-muted text-[10px]">
                {run.branch_name && <span>branch: {run.branch_name}</span>}
                {run.tag_name && <span>tag: {run.tag_name}</span>}
                <span>{run.entities_processed.length} entities</span>
                <span>{run.tiers_affected.length} tiers</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function MaterializedViewsPanel({ mvs, onRefresh }: { mvs: MVStatus[]; onRefresh: () => void }) {
  return (
    <Panel title={`Materialized Views (${mvs.length})`} dataTour="lakehouse-materialized-views" dataTrace="medallion.lakehouse.materialized-views">
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-end">
          <button
            onClick={onRefresh}
            className="px-2 py-1 text-[10px] rounded border border-blue-500 text-blue-400 hover:bg-blue-500/10"
          >
            Refresh All
          </button>
        </div>
        {mvs.length === 0 ? (
          <p className="text-muted">No materialized views configured.</p>
        ) : (
          mvs.map((mv) => (
            <div key={mv.mv_id} className="border border-border rounded p-2 flex items-center gap-2">
              <span className="font-mono">{mv.mv_id}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                mv.status === "success" ? "bg-green-500/20 text-green-400"
                : mv.status === "pending" ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400"
              }`}>
                {mv.status}
              </span>
              {mv.record_count !== undefined && (
                <span className="text-muted text-[10px]">{mv.record_count} rows</span>
              )}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MedallionOverview() {
  const [activeTab, setActiveTab] = useState<ViewTab>("architecture");

  // Architecture tab state
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageStatus, setStageStatus] = useState<Record<string, { status: string; duration_ms: number; quality_score: number | null }>>({});
  const [runningStage, setRunningStage] = useState<string | null>(null);

  // Lakehouse tab state
  const [lhTables, setLhTables] = useState<Record<string, string[]>>({});
  const [schemaHistory] = useState<SchemaEvolution[]>([]);
  const [piiRegistry, setPiiRegistry] = useState<PIIRegistry | null>(null);
  const [calcStats, setCalcStats] = useState<Record<string, number> | null>(null);
  const [calcLog, setCalcLog] = useState<CalcResultLog[]>([]);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [mvStatus, setMvStatus] = useState<MVStatus[]>([]);
  const [lhLoading, setLhLoading] = useState(false);
  const [lhLoaded, setLhLoaded] = useState(false);

  // Load architecture data on mount
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

  // Lazy-load lakehouse data when tab is first selected
  useEffect(() => {
    if (activeTab !== "lakehouse" || lhLoaded) return;
    setLhLoading(true);
    Promise.all([
      api.get<Record<string, string[]>>("/lakehouse/tables").catch(() => ({})),
      api.get<PIIRegistry>("/lakehouse/governance/pii-registry").catch(() => null),
      api.get<Record<string, number>>("/lakehouse/calc/stats").catch(() => null),
      api.get<CalcResultLog[]>("/lakehouse/calc/result-log").catch(() => []),
      api.get<PipelineRun[]>("/lakehouse/runs").catch(() => []),
      api.get<MVStatus[]>("/lakehouse/materialized-views").catch(() => []),
    ]).then(([tables, registry, stats, log, runs, mvs]) => {
      setLhTables(tables as Record<string, string[]>);
      setPiiRegistry(registry as PIIRegistry | null);
      setCalcStats(stats as Record<string, number> | null);
      setCalcLog(log as CalcResultLog[]);
      setPipelineRuns(runs as PipelineRun[]);
      setMvStatus(mvs as MVStatus[]);
      setLhLoaded(true);
    }).finally(() => setLhLoading(false));
  }, [activeTab, lhLoaded]);

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

  const handleMVRefresh = useCallback(async () => {
    try {
      const result = await api.post<Record<string, { status: string; record_count: number }>>("/lakehouse/materialized-views/refresh");
      setMvStatus(Object.entries(result).map(([mv_id, v]) => ({ mv_id, status: v.status, record_count: v.record_count })));
    } catch {
      // ignore
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

        {/* Tab bar */}
        <div className="flex border-b border-border ml-auto shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-accent border-b-2 border-accent"
                  : "text-muted hover:text-foreground"
              }`}
              data-tour={`medallion-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Architecture tab */}
      {activeTab === "architecture" && (
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
      )}

      {/* Lakehouse tab */}
      {activeTab === "lakehouse" && (
        <div className="flex-1 min-h-0 overflow-y-auto" data-tour="lakehouse-explorer">
          {lhLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <IcebergTablesPanel tables={lhTables} />
              <SchemaEvolutionPanel history={schemaHistory} />
              <PIIGovernancePanel registry={piiRegistry} />
              <CalcAuditPanel stats={calcStats} log={calcLog} />
              <PipelineRunsPanel runs={pipelineRuns} />
              <MaterializedViewsPanel mvs={mvStatus} onRefresh={handleMVRefresh} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
