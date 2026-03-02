import { useEffect, useState } from "react";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { api } from "../../api/client.ts";
import { formatLabel, formatTimestamp } from "../../utils/format.ts";

// ── Types ──

type TabId = "platinum" | "sandbox" | "archive";

// Platinum
interface KPIDefinition {
  kpi_id: string;
  name: string;
  description: string;
  category: string;
  sql_template: string;
  dimensions: { field: string; label: string }[];
  schedule: string;
  source_tier: string;
  output_format: string;
}

interface KPIDataPoint {
  dimension_values: Record<string, string>;
  metric_name: string;
  metric_value: number | string;
  period: string;
}

interface KPIDataset {
  kpi_id: string;
  name: string;
  category: string;
  generated_at: string;
  period: string;
  data_points: KPIDataPoint[];
  record_count: number;
}

interface PlatinumConfig {
  tier_id: string;
  kpi_definitions: KPIDefinition[];
  last_generated: string;
}

// Sandbox
interface SandboxOverride {
  setting_id: string;
  original_value: string | number | boolean;
  sandbox_value: string | number | boolean;
}

interface SandboxConfig {
  sandbox_id: string;
  name: string;
  description: string;
  source_tier: string;
  status: "created" | "configured" | "running" | "completed" | "discarded";
  created_at: string;
  updated_at: string;
  overrides: SandboxOverride[];
  results_summary: Record<string, unknown>;
}

interface SandboxComparison {
  sandbox_id: string;
  production_alerts: number;
  sandbox_alerts: number;
  alerts_added: number;
  alerts_removed: number;
  score_shift_avg: number;
  model_diffs: Record<string, unknown>[];
}

// Archive
interface RetentionPolicy {
  policy_id: string;
  regulation: string;
  retention_years: number;
  data_types: string[];
  description: string;
  gdpr_relevant: boolean;
  crypto_shred: boolean;
}

interface ArchiveEntry {
  entry_id: string;
  entity: string;
  source_tier: string;
  record_count: number;
  archived_at: string;
  expires_at: string;
  policy_id: string;
  format: string;
  size_bytes: number;
  checksum: string;
}

interface ArchiveConfig {
  tier_id: string;
  policies: RetentionPolicy[];
  archive_dir: string;
  default_format: string;
}

interface ComplianceSummary {
  total_policies: number;
  entities_covered: number;
  total_archived: number;
  gdpr_relevant: number;
  oldest_archive: string;
  newest_archive: string;
  total_size_bytes: number;
  compliance_status: string;
}

// ── Helpers ──

const TABS: { id: TabId; label: string }[] = [
  { id: "platinum", label: "Platinum KPIs" },
  { id: "sandbox", label: "Sandbox" },
  { id: "archive", label: "Archive" },
];

const CATEGORY_COLORS: Record<string, string> = {
  alert_summary: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  model_effectiveness: "bg-green-500/20 text-green-400 border-green-500/30",
  score_distribution: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  regulatory_report: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function sandboxStatusVariant(status: string): "success" | "warning" | "error" | "info" | "muted" {
  switch (status) {
    case "completed": return "success";
    case "running": return "info";
    case "configured": return "warning";
    case "discarded": return "error";
    default: return "muted";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Component ──

export default function AnalyticsTiers() {
  const [activeTab, setActiveTab] = useState<TabId>("platinum");
  const [loading, setLoading] = useState(true);

  // Platinum state
  const [platinumConfig, setPlatinumConfig] = useState<PlatinumConfig | null>(null);
  const [datasets, setDatasets] = useState<KPIDataset[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<string>("");
  const [selectedDataset, setSelectedDataset] = useState<KPIDataset | null>(null);
  const [generating, setGenerating] = useState(false);

  // Sandbox state
  const [sandboxes, setSandboxes] = useState<SandboxConfig[]>([]);
  const [selectedSandbox, setSelectedSandbox] = useState<SandboxConfig | null>(null);
  const [comparison, setComparison] = useState<SandboxComparison | null>(null);
  const [creatingBox, setCreatingBox] = useState(false);
  const [runningSandbox, setRunningSandbox] = useState(false);

  // Archive state
  const [archiveConfig, setArchiveConfig] = useState<ArchiveConfig | null>(null);
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[]>([]);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [exporting, setExporting] = useState<string>("");

  // ── Data loading ──

  useEffect(() => {
    if (activeTab === "platinum") {
      setLoading(true);
      Promise.all([
        api.get<PlatinumConfig>("/platinum/config"),
        api.get<KPIDataset[]>("/platinum/datasets"),
      ])
        .then(([cfg, ds]) => {
          setPlatinumConfig(cfg);
          setDatasets(ds);
          if (ds.length > 0 && !selectedKpi) setSelectedKpi(ds[0].kpi_id);
        })
        .finally(() => setLoading(false));
    } else if (activeTab === "sandbox") {
      setLoading(true);
      api.get<SandboxConfig[]>("/sandbox/list")
        .then(setSandboxes)
        .finally(() => setLoading(false));
    } else if (activeTab === "archive") {
      setLoading(true);
      Promise.all([
        api.get<ArchiveConfig>("/archive/config"),
        api.get<ArchiveEntry[]>("/archive/entries"),
        api.get<ComplianceSummary>("/archive/compliance"),
      ])
        .then(([cfg, entries, comp]) => {
          setArchiveConfig(cfg);
          setArchiveEntries(entries);
          setCompliance(comp);
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load KPI detail when selection changes
  useEffect(() => {
    if (!selectedKpi) {
      setSelectedDataset(null);
      return;
    }
    api.get<KPIDataset>(`/platinum/datasets/${selectedKpi}`)
      .then(setSelectedDataset)
      .catch(() => setSelectedDataset(null));
  }, [selectedKpi]);

  // Load comparison when sandbox selected
  useEffect(() => {
    if (!selectedSandbox || selectedSandbox.status !== "completed") {
      setComparison(null);
      return;
    }
    api.get<SandboxComparison>(`/sandbox/${selectedSandbox.sandbox_id}/compare`)
      .then(setComparison)
      .catch(() => setComparison(null));
  }, [selectedSandbox]);

  // ── Handlers ──

  const handleGenerateAll = () => {
    setGenerating(true);
    api.post<{ generated: number; datasets: KPIDataset[] }>("/platinum/generate")
      .then((result) => {
        setDatasets(result.datasets);
        if (result.datasets.length > 0) setSelectedKpi(result.datasets[0].kpi_id);
      })
      .finally(() => setGenerating(false));
  };

  const handleCreateSandbox = () => {
    setCreatingBox(true);
    api.post<SandboxConfig>("/sandbox/create", { name: `Sandbox ${Date.now()}`, description: "What-if scenario" })
      .then((sandbox) => {
        setSandboxes((prev) => [...prev, sandbox]);
        setSelectedSandbox(sandbox);
      })
      .finally(() => setCreatingBox(false));
  };

  const handleRunSandbox = () => {
    if (!selectedSandbox) return;
    setRunningSandbox(true);
    api.post<SandboxConfig>(`/sandbox/${selectedSandbox.sandbox_id}/run`)
      .then((updated) => {
        setSandboxes((prev) => prev.map((s) => s.sandbox_id === updated.sandbox_id ? updated : s));
        setSelectedSandbox(updated);
      })
      .finally(() => setRunningSandbox(false));
  };

  const handleDiscardSandbox = () => {
    if (!selectedSandbox) return;
    api.delete(`/sandbox/${selectedSandbox.sandbox_id}`)
      .then(() => {
        setSandboxes((prev) => prev.filter((s) => s.sandbox_id !== selectedSandbox.sandbox_id));
        setSelectedSandbox(null);
        setComparison(null);
      });
  };

  const handleExport = (entity: string, policyId: string) => {
    setExporting(entity);
    api.post<ArchiveEntry>(`/archive/export/${entity}?policy_id=${policyId}`)
      .then((entry) => {
        setArchiveEntries((prev) => [...prev, entry]);
      })
      .finally(() => setExporting(""));
  };

  // ── Render helpers ──

  const renderPlatinumTab = () => {
    const kpiDefs = platinumConfig?.kpi_definitions ?? [];

    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0" data-tour="analytics-platinum" data-trace="analytics-tiers.platinum">
        {/* KPI summary cards */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-medium text-foreground">
            KPI Definitions ({kpiDefs.length})
          </h2>
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="px-4 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generating..." : "Generate All"}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {kpiDefs.map((kpi) => {
            const ds = datasets.find((d) => d.kpi_id === kpi.kpi_id);
            const isSelected = selectedKpi === kpi.kpi_id;
            return (
              <button
                key={kpi.kpi_id}
                onClick={() => setSelectedKpi(kpi.kpi_id)}
                className={`text-left p-3 rounded border transition-colors ${
                  isSelected
                    ? "bg-accent/10 border-accent"
                    : "bg-surface border-border hover:border-border-hover"
                }`}
              >
                <div className="text-xs font-medium text-foreground truncate">{kpi.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded border ${
                      CATEGORY_COLORS[kpi.category] ?? "text-muted border-border"
                    }`}
                  >
                    {formatLabel(kpi.category)}
                  </span>
                </div>
                <div className="text-[10px] text-muted mt-1.5">
                  {ds ? `${ds.data_points.length} data points` : "No data yet"}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail table */}
        {selectedDataset && (
          <Panel
            title={`${selectedDataset.name} — Data Points`}
            dataTour="analytics-platinum-detail"
            dataTrace="analytics-tiers.platinum-detail"
            className="flex-1 min-h-0"
            noPadding
          >
            <div className="overflow-auto h-full">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted border-b border-border">
                    <th className="text-left py-1.5 px-3">Metric</th>
                    <th className="text-left py-1.5 px-3">Value</th>
                    <th className="text-left py-1.5 px-3">Period</th>
                    <th className="text-left py-1.5 px-3">Dimensions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDataset.data_points.map((dp, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface-hover">
                      <td className="py-1.5 px-3 text-foreground">{dp.metric_name || "—"}</td>
                      <td className="py-1.5 px-3 font-mono text-foreground">{String(dp.metric_value)}</td>
                      <td className="py-1.5 px-3 text-muted">{dp.period || "—"}</td>
                      <td className="py-1.5 px-3 text-muted">
                        {Object.entries(dp.dimension_values).map(([k, v]) => (
                          <span key={k} className="mr-2">
                            {formatLabel(k)}: {v}
                          </span>
                        ))}
                        {Object.keys(dp.dimension_values).length === 0 && "—"}
                      </td>
                    </tr>
                  ))}
                  {selectedDataset.data_points.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted">
                        No data points. Click Generate All to compute.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    );
  };

  const renderSandboxTab = () => (
    <div className="flex gap-3 flex-1 min-h-0" data-tour="analytics-sandbox" data-trace="analytics-tiers.sandbox">
      {/* Sandbox list */}
      <Panel
        title="Sandboxes"
        className="w-72 shrink-0"
        noPadding
        dataTour="analytics-sandbox-list"
        dataTrace="analytics-tiers.sandbox-list"
        actions={
          <button
            onClick={handleCreateSandbox}
            disabled={creatingBox}
            className="px-2 py-0.5 text-[10px] bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 transition-colors"
          >
            {creatingBox ? "Creating..." : "+ Create"}
          </button>
        }
      >
        <div className="overflow-auto h-full">
          {sandboxes.length === 0 ? (
            <div className="p-4 text-xs text-muted text-center">
              No sandboxes yet. Create one to start what-if testing.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sandboxes.map((sb) => (
                <button
                  key={sb.sandbox_id}
                  onClick={() => setSelectedSandbox(sb)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-hover transition-colors ${
                    selectedSandbox?.sandbox_id === sb.sandbox_id ? "bg-accent/10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground truncate">{sb.name}</span>
                    <StatusBadge label={formatLabel(sb.status)} variant={sandboxStatusVariant(sb.status)} />
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {sb.created_at ? formatTimestamp(sb.created_at) : "—"}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Sandbox detail */}
      <Panel
        title={selectedSandbox ? `${selectedSandbox.name} — Detail` : "Select a Sandbox"}
        className="flex-1"
        dataTour="analytics-sandbox-detail"
        dataTrace="analytics-tiers.sandbox-detail"
      >
        {!selectedSandbox ? (
          <div className="text-xs text-muted text-center mt-8">
            Select a sandbox from the list to view details
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metadata row */}
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted">ID</span>
                <div className="font-mono text-foreground">{selectedSandbox.sandbox_id}</div>
              </div>
              <div>
                <span className="text-muted">Status</span>
                <div><StatusBadge label={formatLabel(selectedSandbox.status)} variant={sandboxStatusVariant(selectedSandbox.status)} /></div>
              </div>
              <div>
                <span className="text-muted">Source Tier</span>
                <div className="text-foreground">{formatLabel(selectedSandbox.source_tier)}</div>
              </div>
              <div>
                <span className="text-muted">Updated</span>
                <div className="text-foreground">{selectedSandbox.updated_at ? formatTimestamp(selectedSandbox.updated_at) : "—"}</div>
              </div>
            </div>

            {/* Overrides */}
            <div>
              <h3 className="text-xs font-medium text-foreground mb-2">
                Setting Overrides ({selectedSandbox.overrides.length})
              </h3>
              {selectedSandbox.overrides.length === 0 ? (
                <span className="text-[10px] text-muted">No overrides configured</span>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted border-b border-border">
                      <th className="text-left py-1 px-2">Setting</th>
                      <th className="text-left py-1 px-2">Original</th>
                      <th className="text-left py-1 px-2">Sandbox Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSandbox.overrides.map((ov) => (
                      <tr key={ov.setting_id} className="border-b border-border/50 hover:bg-surface-hover">
                        <td className="py-1 px-2 text-foreground">{formatLabel(ov.setting_id)}</td>
                        <td className="py-1 px-2 font-mono text-muted">{String(ov.original_value)}</td>
                        <td className="py-1 px-2 font-mono text-accent">{String(ov.sandbox_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Comparison results */}
            {comparison && (
              <div>
                <h3 className="text-xs font-medium text-foreground mb-2">
                  Comparison vs Production
                </h3>
                <div className="grid grid-cols-5 gap-3 text-xs">
                  <div className="p-2 bg-surface border border-border rounded">
                    <span className="text-muted">Production Alerts</span>
                    <div className="text-foreground font-medium text-sm">{comparison.production_alerts}</div>
                  </div>
                  <div className="p-2 bg-surface border border-border rounded">
                    <span className="text-muted">Sandbox Alerts</span>
                    <div className="text-foreground font-medium text-sm">{comparison.sandbox_alerts}</div>
                  </div>
                  <div className="p-2 bg-surface border border-border rounded">
                    <span className="text-muted">Added</span>
                    <div className="text-green-400 font-medium text-sm">+{comparison.alerts_added}</div>
                  </div>
                  <div className="p-2 bg-surface border border-border rounded">
                    <span className="text-muted">Removed</span>
                    <div className="text-red-400 font-medium text-sm">-{comparison.alerts_removed}</div>
                  </div>
                  <div className="p-2 bg-surface border border-border rounded">
                    <span className="text-muted">Avg Score Shift</span>
                    <div className="text-amber-400 font-medium text-sm">{comparison.score_shift_avg.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleRunSandbox}
                disabled={runningSandbox || selectedSandbox.status === "completed" || selectedSandbox.status === "discarded"}
                className="px-4 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 transition-colors"
              >
                {runningSandbox ? "Running..." : "Run Simulation"}
              </button>
              <button
                onClick={handleDiscardSandbox}
                disabled={selectedSandbox.status === "discarded"}
                className="px-4 py-1.5 text-xs bg-destructive/20 text-destructive rounded hover:bg-destructive/30 disabled:opacity-50 transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );

  const renderArchiveTab = () => {
    const policies = archiveConfig?.policies ?? [];

    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0" data-tour="analytics-archive" data-trace="analytics-tiers.archive">
        {/* Compliance summary */}
        {compliance && (
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: "Policies", value: compliance.total_policies },
              { label: "Entities Covered", value: compliance.entities_covered },
              { label: "Archived", value: compliance.total_archived },
              { label: "GDPR Relevant", value: compliance.gdpr_relevant },
              { label: "Total Size", value: formatBytes(compliance.total_size_bytes) },
              { label: "Status", value: formatLabel(compliance.compliance_status) },
            ].map((stat) => (
              <div key={stat.label} className="p-2 bg-surface border border-border rounded text-center">
                <div className="text-[10px] text-muted">{stat.label}</div>
                <div className="text-sm font-medium text-foreground mt-0.5">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Retention policies */}
        <Panel
          title="Retention Policies"
          dataTour="analytics-archive-policies"
          dataTrace="analytics-tiers.archive-policies"
          noPadding
        >
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left py-1.5 px-3">Regulation</th>
                  <th className="text-right py-1.5 px-3">Retention (Years)</th>
                  <th className="text-left py-1.5 px-3">Data Types</th>
                  <th className="text-center py-1.5 px-3">GDPR</th>
                  <th className="text-left py-1.5 px-3">Description</th>
                  <th className="text-center py-1.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((pol) => (
                  <tr key={pol.policy_id} className="border-b border-border/50 hover:bg-surface-hover">
                    <td className="py-1.5 px-3 font-medium text-foreground">{pol.regulation}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-foreground">{pol.retention_years}</td>
                    <td className="py-1.5 px-3 text-muted">
                      {pol.data_types.map((dt) => (
                        <span key={dt} className="mr-1 px-1 py-0.5 text-[10px] bg-surface-elevated border border-border rounded">
                          {formatLabel(dt)}
                        </span>
                      ))}
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {pol.gdpr_relevant ? (
                        <span className="text-amber-400 text-[10px] font-medium">Yes</span>
                      ) : (
                        <span className="text-muted text-[10px]">No</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3 text-muted">{pol.description}</td>
                    <td className="py-1.5 px-3 text-center">
                      <button
                        onClick={() => {
                          const entity = pol.data_types[0] ?? "";
                          if (entity) handleExport(entity, pol.policy_id);
                        }}
                        disabled={exporting === (pol.data_types[0] ?? "") || pol.data_types.length === 0}
                        className="px-2 py-0.5 text-[10px] bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 transition-colors"
                      >
                        {exporting === (pol.data_types[0] ?? "") ? "Exporting..." : "Export"}
                      </button>
                    </td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-muted">
                      No retention policies configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Archive entries */}
        <Panel
          title={`Archive Entries (${archiveEntries.length})`}
          dataTour="analytics-archive-entries"
          dataTrace="analytics-tiers.archive-entries"
          noPadding
          className="flex-1 min-h-0"
        >
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left py-1.5 px-3">Entity</th>
                  <th className="text-left py-1.5 px-3">Archived At</th>
                  <th className="text-right py-1.5 px-3">Records</th>
                  <th className="text-right py-1.5 px-3">Size</th>
                  <th className="text-left py-1.5 px-3">Policy</th>
                  <th className="text-left py-1.5 px-3">Format</th>
                  <th className="text-left py-1.5 px-3">Expires</th>
                </tr>
              </thead>
              <tbody>
                {archiveEntries.map((entry) => (
                  <tr key={entry.entry_id} className="border-b border-border/50 hover:bg-surface-hover">
                    <td className="py-1.5 px-3 font-medium text-foreground">{formatLabel(entry.entity)}</td>
                    <td className="py-1.5 px-3 text-muted">{entry.archived_at ? formatTimestamp(entry.archived_at) : "—"}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-foreground">{entry.record_count.toLocaleString()}</td>
                    <td className="py-1.5 px-3 text-right text-muted">{formatBytes(entry.size_bytes)}</td>
                    <td className="py-1.5 px-3 text-muted">{entry.policy_id}</td>
                    <td className="py-1.5 px-3 text-muted">{formatLabel(entry.format)}</td>
                    <td className="py-1.5 px-3 text-muted">{entry.expires_at ? formatTimestamp(entry.expires_at) : "—"}</td>
                  </tr>
                ))}
                {archiveEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-muted">
                      No archive entries yet. Use Export to create archives.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        Loading analytics tiers...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Analytics Tiers</h1>
        <span className="text-xs text-muted">
          Extended analytical layers: Platinum KPIs, Sandbox testing, Archive management
        </span>
      </div>

      {/* Tier selector tabs */}
      <div className="flex gap-2" data-tour="analytics-tier-tabs" data-trace="analytics-tiers.tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              activeTab === tab.id
                ? "bg-accent/20 border-accent text-accent"
                : "border-border text-muted hover:text-foreground hover:border-border-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "platinum" && renderPlatinumTab()}
      {activeTab === "sandbox" && renderSandboxTab()}
      {activeTab === "archive" && renderArchiveTab()}
    </div>
  );
}
