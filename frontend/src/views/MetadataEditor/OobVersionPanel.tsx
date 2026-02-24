import { useState, useCallback } from "react";
import { api } from "../../api/client.ts";
import HelpButton from "../../components/HelpButton.tsx";

interface VersionSummary {
  oob_version: string;
  oob_item_count: number;
  user_override_count: number;
  description: string;
}

interface UpgradeEntry {
  type: string;
  id: string;
  old_version?: string;
  new_version?: string;
}

interface UpgradeReport {
  from_version: string;
  to_version: string;
  added: UpgradeEntry[];
  removed: UpgradeEntry[];
  modified: UpgradeEntry[];
  conflicts: UpgradeEntry[];
  user_overrides_intact: number;
}

export default function OobVersionPanel() {
  const [summary, setSummary] = useState<VersionSummary | null>(null);
  const [report, setReport] = useState<UpgradeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (summary) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<VersionSummary>("/metadata/oob-version");
      setSummary(data);
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  }, [summary, expanded]);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const manifest = await api.get<Record<string, unknown>>("/metadata/demo-upgrade-manifest");
      const result = await api.post<UpgradeReport>("/metadata/oob-upgrade/simulate", manifest);
      setReport(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-tour="oob-version-panel">
      <button
        onClick={fetchSummary}
        className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        OOB Version Info
        <HelpButton
          text="Shows the current out-of-box metadata version and lets you preview what would change during an upgrade."
          placement="right"
        />
      </button>

      {expanded && summary && (
        <div className="mt-2 p-3 rounded border border-border bg-surface text-xs space-y-2">
          <div className="flex items-center gap-4">
            <span>
              <span className="text-muted">Version:</span>{" "}
              <span className="font-medium">{summary.oob_version}</span>
            </span>
            <span>
              <span className="text-muted">OOB Items:</span>{" "}
              <span className="font-medium">{summary.oob_item_count}</span>
            </span>
            <span>
              <span className="text-muted">Overrides:</span>{" "}
              <span className="font-medium">{summary.user_override_count}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              data-tour="oob-upgrade-btn"
              onClick={handleSimulate}
              disabled={loading}
              className="px-3 py-1 rounded text-xs font-medium border border-accent/30 text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
            >
              {loading ? "Simulating..." : "Simulate Upgrade"}
            </button>
          </div>

          {report && (
            <div className="mt-2 space-y-1.5" data-tour="oob-upgrade-report">
              <div className="font-medium text-foreground">
                Upgrade Report: v{report.from_version} → v{report.to_version}
              </div>
              {report.added.length === 0 && report.modified.length === 0 && report.removed.length === 0 && report.conflicts.length === 0 && (
                <div className="text-muted">No changes detected.</div>
              )}
              {report.added.map((e) => (
                <div key={`add-${e.type}-${e.id}`} className="flex items-center gap-2 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
                  <span className="text-green-400 font-medium">+ Added</span>
                  <span className="text-muted">{e.type}</span>
                  <span>{e.id}</span>
                </div>
              ))}
              {report.modified.map((e) => (
                <div key={`mod-${e.type}-${e.id}`} className="flex items-center gap-2 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-400 font-medium">~ Modified</span>
                  <span className="text-muted">{e.type}</span>
                  <span>{e.id}</span>
                  <span className="text-muted ml-auto">{e.old_version} → {e.new_version}</span>
                </div>
              ))}
              {report.conflicts.map((e) => (
                <div key={`conflict-${e.type}-${e.id}`} className="flex items-center gap-2 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                  <span className="text-red-400 font-medium">! Conflict</span>
                  <span className="text-muted">{e.type}</span>
                  <span>{e.id}</span>
                  <span className="text-muted ml-auto">has user override</span>
                </div>
              ))}
              {report.removed.map((e) => (
                <div key={`rm-${e.type}-${e.id}`} className="flex items-center gap-2 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                  <span className="text-red-400 font-medium">- Removed</span>
                  <span className="text-muted">{e.type}</span>
                  <span>{e.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
