import { useCallback, useEffect, useState } from "react";
import Panel from "./Panel.tsx";

interface VersionEntry {
  version: number;
  timestamp: string;
  author: string;
  change_type: string;
  snapshot: Record<string, unknown>;
  description: string;
}

interface Change {
  field: string;
  type: "added" | "removed" | "changed";
  old: unknown;
  new: unknown;
}

interface CompareResult {
  item_type: string;
  item_id: string;
  version_a: number;
  version_b: number;
  changes: Change[];
  summary: string;
}

interface VersionComparisonProps {
  itemType: string;
  itemId: string;
}

export default function VersionComparison({ itemType, itemId }: VersionComparisonProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [versionA, setVersionA] = useState<number | null>(null);
  const [versionB, setVersionB] = useState<number | null>(null);
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load version history
  const loadHistory = useCallback(async () => {
    try {
      const resp = await fetch(`/api/versions/${itemType}/${itemId}`);
      const data = await resp.json();
      setVersions(data.versions ?? []);
      setError(null);
    } catch (e) {
      setError("Failed to load version history");
    }
  }, [itemType, itemId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Compare when both versions selected
  useEffect(() => {
    if (versionA == null || versionB == null || versionA === versionB) {
      setComparison(null);
      return;
    }
    setLoading(true);
    fetch(`/api/versions/${itemType}/${itemId}/compare/${versionA}/${versionB}`)
      .then((r) => r.json())
      .then((data) => {
        setComparison(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to compare versions");
        setLoading(false);
      });
  }, [itemType, itemId, versionA, versionB]);

  const handleRollback = async (targetVersion: number) => {
    try {
      const resp = await fetch(`/api/versions/${itemType}/${itemId}/rollback/${targetVersion}`, {
        method: "POST",
      });
      if (resp.ok) {
        await loadHistory();
        setComparison(null);
        setVersionA(null);
        setVersionB(null);
      }
    } catch {
      setError("Failed to rollback");
    }
  };

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return "(none)";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  if (error) {
    return (
      <Panel title="Version History">
        <p className="text-xs text-destructive">{error}</p>
      </Panel>
    );
  }

  if (versions.length === 0) {
    return (
      <Panel title="Version History">
        <p className="text-xs text-muted">No versions recorded yet.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Version History" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        {/* Version selectors */}
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <span className="text-muted font-medium">Version A:</span>
            <select
              className="rounded border border-border bg-surface px-2 py-1 text-xs"
              value={versionA ?? ""}
              onChange={(e) => setVersionA(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select...</option>
              {versions.map((v) => (
                <option key={v.version} value={v.version}>
                  v{v.version} — {v.change_type} ({v.timestamp.slice(0, 19)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted font-medium">Version B:</span>
            <select
              className="rounded border border-border bg-surface px-2 py-1 text-xs"
              value={versionB ?? ""}
              onChange={(e) => setVersionB(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select...</option>
              {versions.map((v) => (
                <option key={v.version} value={v.version}>
                  v{v.version} — {v.change_type} ({v.timestamp.slice(0, 19)})
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Comparison result */}
        {loading && <p className="text-xs text-muted">Comparing...</p>}
        {comparison && !loading && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-foreground">{comparison.summary}</p>
            {comparison.changes.length === 0 ? (
              <p className="text-xs text-muted">No differences found.</p>
            ) : (
              <div className="rounded border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-elevated text-left">
                      <th className="px-2 py-1 font-medium text-muted">Field</th>
                      <th className="px-2 py-1 font-medium text-muted">Change</th>
                      <th className="px-2 py-1 font-medium text-muted">Old</th>
                      <th className="px-2 py-1 font-medium text-muted">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.changes.map((c, i) => (
                      <tr
                        key={i}
                        className={
                          c.type === "added"
                            ? "bg-success/10"
                            : c.type === "removed"
                              ? "bg-destructive/10"
                              : "bg-warning/10"
                        }
                      >
                        <td className="px-2 py-1 font-mono">{c.field}</td>
                        <td className="px-2 py-1">
                          <span
                            className={
                              c.type === "added"
                                ? "text-success"
                                : c.type === "removed"
                                  ? "text-destructive"
                                  : "text-warning"
                            }
                          >
                            {c.type}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-muted">{formatValue(c.old)}</td>
                        <td className="px-2 py-1">{formatValue(c.new)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Version list with rollback */}
        <div className="flex flex-col gap-1 mt-2">
          <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">All Versions</p>
          {versions.map((v) => (
            <div
              key={v.version}
              className="flex items-center justify-between rounded border border-border px-2 py-1.5 text-xs"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">
                  v{v.version} — <span className="text-accent">{v.change_type}</span>
                </span>
                <span className="text-muted">
                  {v.author} &middot; {v.timestamp.slice(0, 19)}
                  {v.description ? ` — ${v.description}` : ""}
                </span>
              </div>
              <button
                className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-elevated transition-colors"
                onClick={() => handleRollback(v.version)}
              >
                Rollback
              </button>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
