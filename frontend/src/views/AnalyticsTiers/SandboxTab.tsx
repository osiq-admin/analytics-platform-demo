import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { formatLabel, formatTimestamp } from "../../utils/format.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SandboxOverride {
  setting_id: string;
  original_value: string | number | boolean;
  sandbox_value: string | number | boolean;
}

export interface SandboxConfig {
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

export interface SandboxComparison {
  sandbox_id: string;
  production_alerts: number;
  sandbox_alerts: number;
  alerts_added: number;
  alerts_removed: number;
  score_shift_avg: number;
  model_diffs: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sandboxStatusVariant(status: string): "success" | "warning" | "error" | "info" | "muted" {
  switch (status) {
    case "completed": return "success";
    case "running": return "info";
    case "configured": return "warning";
    case "discarded": return "error";
    default: return "muted";
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SandboxTabProps {
  sandboxes: SandboxConfig[];
  selectedSandbox: SandboxConfig | null;
  comparison: SandboxComparison | null;
  creatingBox: boolean;
  runningSandbox: boolean;
  onSelectSandbox: (sandbox: SandboxConfig) => void;
  onCreateSandbox: () => void;
  onRunSandbox: () => void;
  onDiscardSandbox: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SandboxTab({
  sandboxes,
  selectedSandbox,
  comparison,
  creatingBox,
  runningSandbox,
  onSelectSandbox,
  onCreateSandbox,
  onRunSandbox,
  onDiscardSandbox,
}: SandboxTabProps) {
  return (
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
            onClick={onCreateSandbox}
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
                  onClick={() => onSelectSandbox(sb)}
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
                onClick={onRunSandbox}
                disabled={runningSandbox || selectedSandbox.status === "completed" || selectedSandbox.status === "discarded"}
                className="px-4 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 transition-colors"
              >
                {runningSandbox ? "Running..." : "Run Simulation"}
              </button>
              <button
                onClick={onDiscardSandbox}
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
}
