import { useMemo } from "react";
import type { SelectedCalc } from "./SelectCalcsStep.tsx";
import type { CalculationDef } from "../../../stores/metadataStore.ts";
import StatusBadge from "../../../components/StatusBadge.tsx";

interface ReviewStepProps {
  modelId: string;
  name: string;
  description: string;
  timeWindow: string;
  granularity: string[];
  contextFields: string[];
  selectedCalcs: SelectedCalc[];
  scoreThresholdSetting: string;
  query: string;
  calculations: CalculationDef[];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded bg-surface p-3">
      <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function ReviewStep({
  modelId,
  name,
  description,
  timeWindow,
  granularity,
  contextFields,
  selectedCalcs,
  scoreThresholdSetting,
  query,
  calculations,
}: ReviewStepProps) {
  const calcMap = useMemo(
    () => new Map(calculations.map((c) => [c.calc_id, c])),
    [calculations],
  );

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">Step 5: Review Configuration</h3>
      <p className="text-xs text-muted">
        Review all wizard decisions before running a test. Go back to any step to make changes.
      </p>

      {/* Model Identity */}
      <Section title="Model Identity">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <span className="text-muted">ID:</span>
          <span className="font-mono text-foreground">{modelId}</span>
          <span className="text-muted">Name:</span>
          <span className="text-foreground">{name}</span>
          {description && (
            <>
              <span className="text-muted">Description:</span>
              <span className="text-foreground">{description}</span>
            </>
          )}
        </div>
      </Section>

      {/* Metadata */}
      <Section title="Metadata">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          <span className="text-muted">Time Window:</span>
          <span className="font-mono text-foreground">{timeWindow || "(none)"}</span>
          <span className="text-muted">Granularity:</span>
          <span className="text-foreground">{granularity.length > 0 ? granularity.join(", ") : "(none)"}</span>
          <span className="text-muted">Context Fields:</span>
          <span className="text-foreground">{contextFields.length > 0 ? contextFields.join(", ") : "(none)"}</span>
        </div>
      </Section>

      {/* Calculations */}
      <Section title={`Calculations (${selectedCalcs.length})`}>
        <div className="flex flex-col gap-1.5">
          {selectedCalcs.map((sc) => {
            const calc = calcMap.get(sc.calc_id);
            return (
              <div key={sc.calc_id} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-foreground">{calc?.name ?? sc.calc_id}</span>
                <StatusBadge
                  label={sc.strictness}
                  variant={sc.strictness === "MUST_PASS" ? "error" : "warning"}
                />
                {sc.value_field && (
                  <span className="text-muted text-[11px]">({sc.value_field})</span>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Scoring */}
      <Section title="Scoring">
        <div className="text-xs">
          <span className="text-muted">Alert Threshold Setting: </span>
          <span className="font-mono text-foreground">{scoreThresholdSetting || "(none)"}</span>
        </div>
      </Section>

      {/* Query */}
      <Section title="Query">
        {query.trim() ? (
          <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap bg-surface-elevated rounded p-2 border border-border overflow-auto max-h-40">
            {query}
          </pre>
        ) : (
          <span className="text-xs text-muted italic">No query defined</span>
        )}
      </Section>
    </div>
  );
}
