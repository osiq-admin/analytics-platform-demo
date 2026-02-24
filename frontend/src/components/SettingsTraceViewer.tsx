import { useState } from "react";
import Panel from "./Panel.tsx";
import StatusBadge from "./StatusBadge.tsx";

interface OverrideEvaluation {
  match: Record<string, string>;
  value: unknown;
  priority: number;
  context_matched: boolean;
  is_selected: boolean;
}

export interface SettingsResolution {
  setting_id: string;
  setting_name?: string;
  resolved_value: unknown;
  matched_override: Record<string, unknown> | null;
  why: string;
  default_value?: unknown;
  override_evaluations?: OverrideEvaluation[];
}

interface SettingsTraceViewerProps {
  entries: SettingsResolution[];
}

function OverrideList({ evaluations }: { evaluations: OverrideEvaluation[] }) {
  const [expanded, setExpanded] = useState(false);

  if (evaluations.length === 0) return null;

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-muted hover:text-foreground transition-colors flex items-center gap-1"
      >
        <span className="font-mono">{expanded ? "\u25BC" : "\u25B6"}</span>
        {evaluations.length} override{evaluations.length !== 1 ? "s" : ""} evaluated
      </button>
      {expanded && (
        <div className="mt-1 space-y-1">
          {evaluations.map((ov, i) => (
            <div
              key={i}
              className={`p-1.5 rounded border text-[10px] ${
                ov.is_selected
                  ? "border-accent/40 bg-accent/5"
                  : ov.context_matched
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-background"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono">
                  {Object.entries(ov.match)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(", ")}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-muted">p={ov.priority}</span>
                  {ov.is_selected && <StatusBadge label="selected" variant="info" />}
                  {ov.context_matched && !ov.is_selected && (
                    <StatusBadge label="matched" variant="success" />
                  )}
                  {!ov.context_matched && (
                    <StatusBadge label="no match" variant="muted" />
                  )}
                </div>
              </div>
              <div className="text-muted mt-0.5">
                Value: <span className="font-mono text-foreground">{JSON.stringify(ov.value)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsTraceViewer({ entries }: SettingsTraceViewerProps) {
  if (!entries || entries.length === 0) {
    return (
      <Panel title="Settings Resolution Trace">
        <p className="text-muted text-xs">No settings trace data available.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Settings Resolution Trace">
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
            {entry.default_value !== undefined && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-muted">Default:</span>
                <span className="font-mono text-foreground/60">
                  {JSON.stringify(entry.default_value)}
                </span>
              </div>
            )}
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
            {entry.override_evaluations && (
              <OverrideList evaluations={entry.override_evaluations} />
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
