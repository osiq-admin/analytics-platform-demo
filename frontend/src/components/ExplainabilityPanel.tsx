import { useState } from "react";
import Panel from "./Panel.tsx";
import StatusBadge from "./StatusBadge.tsx";
import SQLViewer from "./SQLViewer.tsx";
import SettingsTraceViewer, { type SettingsResolution } from "./SettingsTraceViewer.tsx";

/** Shape returned by GET /api/trace/alert/{id}. */
export interface AlertTraceResponse {
  alert_id: string;
  model_id: string;
  model_name: string;
  timestamp: string;
  alert_fired: boolean;
  trigger_path: string;
  accumulated_score: number;
  score_threshold: number;
  executed_sql: string;
  sql_row_count: number;
  entity_context: Record<string, string>;
  entity_context_source: Record<string, string>;
  calculation_scores: {
    calc_id: string;
    score: number;
    raw_value: number;
    computed_value?: number;
    strictness: string;
    threshold_passed: boolean;
    score_step_matched?: { min_value: number | null; max_value: number | null; score: number } | null;
  }[];
  calculation_traces: {
    calc_id: string;
    computed_value?: number;
    score_awarded?: number;
    passed?: boolean;
    formula?: string;
    inputs?: Record<string, unknown>;
  }[];
  scoring_breakdown: {
    calc_id: string;
    score: number;
    weight?: number;
    weighted_score?: number;
  }[];
  resolved_settings: Record<string, unknown>;
  settings_trace: SettingsResolution[];
  calculation_trace: { query_row?: Record<string, string> };
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, defaultOpen = true, badge, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated hover:bg-surface-elevated/80 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide flex items-center gap-2">
          <span className="font-mono text-[10px]">{open ? "\u25BC" : "\u25B6"}</span>
          {title}
        </span>
        {badge && <StatusBadge label={badge} variant="info" />}
      </button>
      {open && <div className="p-3 bg-surface">{children}</div>}
    </div>
  );
}

interface ExplainabilityPanelProps {
  trace: AlertTraceResponse;
}

export default function ExplainabilityPanel({ trace }: ExplainabilityPanelProps) {
  return (
    <Panel title="Explainability Trace">
      <div className="space-y-3">
        {/* Summary header */}
        <div className="flex items-center gap-2 text-xs">
          <StatusBadge label={trace.model_id} variant="info" />
          <StatusBadge
            label={trace.alert_fired ? "FIRED" : "NOT FIRED"}
            variant={trace.alert_fired ? "error" : "success"}
          />
          <StatusBadge
            label={`Score: ${trace.accumulated_score}/${trace.score_threshold}`}
            variant={trace.accumulated_score >= trace.score_threshold ? "error" : "warning"}
          />
          <span className="text-muted ml-auto font-mono text-[10px]">{trace.alert_id}</span>
        </div>

        {/* SQL Query */}
        <CollapsibleSection
          title="SQL Query"
          badge={trace.sql_row_count ? `${trace.sql_row_count} rows` : undefined}
        >
          <SQLViewer sql={trace.executed_sql} rowCount={trace.sql_row_count} title="" />
        </CollapsibleSection>

        {/* Calculation Traces */}
        {trace.calculation_traces.length > 0 && (
          <CollapsibleSection
            title="Calculation Traces"
            badge={`${trace.calculation_traces.length} calcs`}
          >
            <div className="space-y-2">
              {trace.calculation_traces.map((ct, i) => (
                <div
                  key={`${ct.calc_id}-${i}`}
                  className="p-2 rounded border border-border bg-background text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{ct.calc_id}</span>
                    {ct.passed !== undefined && (
                      <StatusBadge
                        label={ct.passed ? "passed" : "failed"}
                        variant={ct.passed ? "success" : "error"}
                      />
                    )}
                  </div>
                  {ct.computed_value !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted">Value:</span>
                      <span className="font-mono text-accent">{ct.computed_value}</span>
                    </div>
                  )}
                  {ct.score_awarded !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted">Score:</span>
                      <span className="font-mono text-warning">{ct.score_awarded}</span>
                    </div>
                  )}
                  {ct.formula && (
                    <div className="mt-1 text-muted">
                      Formula: <span className="font-mono text-foreground/70">{ct.formula}</span>
                    </div>
                  )}
                  {ct.inputs && Object.keys(ct.inputs).length > 0 && (
                    <div className="mt-1">
                      <span className="text-muted">Inputs:</span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-0.5">
                        {Object.entries(ct.inputs).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-1">
                            <span className="text-muted">{k}:</span>
                            <span className="font-mono text-foreground/80">{JSON.stringify(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Scoring Breakdown */}
        {trace.scoring_breakdown.length > 0 && (
          <CollapsibleSection
            title="Scoring Breakdown"
            badge={`Total: ${trace.accumulated_score}`}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-1">Calculation</th>
                  <th className="pb-1">Score</th>
                  <th className="pb-1">Weight</th>
                  <th className="pb-1">Weighted</th>
                </tr>
              </thead>
              <tbody>
                {trace.scoring_breakdown.map((sb) => (
                  <tr key={sb.calc_id} className="border-b border-border/50">
                    <td className="py-1">{sb.calc_id}</td>
                    <td className="py-1 font-mono text-accent">{sb.score}</td>
                    <td className="py-1 font-mono text-foreground/70">{sb.weight ?? 1}</td>
                    <td className="py-1 font-mono text-warning">{sb.weighted_score ?? sb.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between text-xs p-2 mt-2 rounded bg-background border border-border">
              <span className="text-muted">Accumulated / Threshold</span>
              <span className="font-mono text-accent">
                {trace.accumulated_score} / {trace.score_threshold}
              </span>
            </div>
          </CollapsibleSection>
        )}

        {/* Settings Resolution */}
        {trace.settings_trace.length > 0 && (
          <CollapsibleSection
            title="Settings Resolution"
            badge={`${trace.settings_trace.length} settings`}
          >
            <SettingsTraceViewer entries={trace.settings_trace} />
          </CollapsibleSection>
        )}

        {/* Entity Context */}
        {Object.keys(trace.entity_context).length > 0 && (
          <CollapsibleSection
            title="Entity Context"
            badge={`${Object.keys(trace.entity_context).length} fields`}
          >
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(trace.entity_context).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-muted">{key}:</span>
                    <span className="font-mono text-foreground">{value}</span>
                    {trace.entity_context_source[key] && (
                      <span className="text-[10px] text-muted/60">
                        ({trace.entity_context_source[key]})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Resolved Settings (flat view) */}
        {Object.keys(trace.resolved_settings).length > 0 && (
          <CollapsibleSection
            title="Resolved Settings (Summary)"
            defaultOpen={false}
            badge={`${Object.keys(trace.resolved_settings).length} values`}
          >
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(trace.resolved_settings).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-muted">{key}:</span>
                  <span className="font-mono text-accent">{JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </Panel>
  );
}
