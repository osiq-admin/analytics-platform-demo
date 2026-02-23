import Panel from "../../../components/Panel.tsx";
import StatusBadge from "../../../components/StatusBadge.tsx";
import type { SettingsTraceEntry } from "../../../stores/alertStore.ts";

interface SettingsTraceProps {
  entries: SettingsTraceEntry[];
}

export default function SettingsTrace({ entries }: SettingsTraceProps) {
  if (!entries || entries.length === 0) {
    return (
      <Panel title="Settings Resolution">
        <p className="text-muted text-xs">No settings resolution data available.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Settings Resolution">
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div
            key={`${entry.setting_id}-${i}`}
            className="p-2 rounded border border-border bg-background text-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">
                {entry.setting_name || entry.setting_id}
              </span>
              <StatusBadge
                label={entry.matched_override ? "override" : "default"}
                variant={entry.matched_override ? "success" : "info"}
              />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-muted">Resolved:</span>
              <span className="font-mono text-accent">
                {JSON.stringify(entry.resolved_value)}
              </span>
            </div>
            <div className="text-muted">{entry.why}</div>
            {entry.matched_override && (
              <div className="mt-1 text-muted">
                <span>Match: </span>
                <span className="font-mono">
                  {Object.entries(
                    (entry.matched_override as Record<string, unknown>).match as Record<string, string> ?? {}
                  )
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ")}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
