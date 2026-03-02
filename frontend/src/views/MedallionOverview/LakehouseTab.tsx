import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchemaEvolution {
  table_name: string;
  operation: string;
  field_name: string;
  details: Record<string, string>;
  applied_at: string;
}

export interface PIIField {
  field: string;
  classification: string;
  regulation: string[];
  crypto_shred: boolean;
  retention_years: number;
  masking_strategy: string;
}

export interface PIIRegistry {
  registry_version: string;
  entities: Record<string, { pii_fields: PIIField[] }>;
}

export interface CalcResultLog {
  run_id: string;
  calc_id: string;
  layer: string;
  status: string;
  duration_ms: number;
  record_count: number;
  skip_reason: string | null;
  executed_at: string;
}

export interface PipelineRun {
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

export interface MVStatus {
  mv_id: string;
  status: string;
  record_count?: number;
  last_refresh?: string;
}

// ---------------------------------------------------------------------------
// Tier colors (shared with architecture tab)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sub-panels
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
// Props
// ---------------------------------------------------------------------------

interface LakehouseTabProps {
  loading: boolean;
  tables: Record<string, string[]>;
  schemaHistory: SchemaEvolution[];
  piiRegistry: PIIRegistry | null;
  calcStats: Record<string, number> | null;
  calcLog: CalcResultLog[];
  pipelineRuns: PipelineRun[];
  mvStatus: MVStatus[];
  onMVRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LakehouseTab({
  loading,
  tables,
  schemaHistory,
  piiRegistry,
  calcStats,
  calcLog,
  pipelineRuns,
  mvStatus,
  onMVRefresh,
}: LakehouseTabProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto" data-tour="lakehouse-explorer">
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <IcebergTablesPanel tables={tables} />
          <SchemaEvolutionPanel history={schemaHistory} />
          <PIIGovernancePanel registry={piiRegistry} />
          <CalcAuditPanel stats={calcStats} log={calcLog} />
          <PipelineRunsPanel runs={pipelineRuns} />
          <MaterializedViewsPanel mvs={mvStatus} onRefresh={onMVRefresh} />
        </div>
      )}
    </div>
  );
}
