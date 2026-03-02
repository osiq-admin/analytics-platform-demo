import Panel from "../../components/Panel.tsx";
import { formatLabel, formatTimestamp } from "../../utils/format.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetentionPolicy {
  policy_id: string;
  regulation: string;
  retention_years: number;
  data_types: string[];
  description: string;
  gdpr_relevant: boolean;
  crypto_shred: boolean;
}

export interface ArchiveEntry {
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

export interface ArchiveConfig {
  tier_id: string;
  policies: RetentionPolicy[];
  archive_dir: string;
  default_format: string;
}

export interface ComplianceSummary {
  total_policies: number;
  entities_covered: number;
  total_archived: number;
  gdpr_relevant: number;
  oldest_archive: string;
  newest_archive: string;
  total_size_bytes: number;
  compliance_status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ArchiveTabProps {
  archiveConfig: ArchiveConfig | null;
  archiveEntries: ArchiveEntry[];
  compliance: ComplianceSummary | null;
  exporting: string;
  onExport: (entity: string, policyId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArchiveTab({
  archiveConfig,
  archiveEntries,
  compliance,
  exporting,
  onExport,
}: ArchiveTabProps) {
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
                        if (entity) onExport(entity, pol.policy_id);
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
}
