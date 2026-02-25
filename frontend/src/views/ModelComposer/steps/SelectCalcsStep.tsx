import { useMemo } from "react";
import type { CalculationDef } from "../../../stores/metadataStore.ts";
import StatusBadge from "../../../components/StatusBadge.tsx";

export interface SelectedCalc {
  calc_id: string;
  strictness: "MUST_PASS" | "OPTIONAL";
  threshold_setting?: string;
  score_steps_setting?: string;
  value_field?: string;
}

interface SelectCalcsStepProps {
  calculations: CalculationDef[];
  selectedCalcs: SelectedCalc[];
  setSelectedCalcs: (calcs: SelectedCalc[]) => void;
}

const LAYER_LABELS: Record<string, string> = {
  time_windows: "Time Windows",
  aggregations: "Aggregations",
  derived: "Derived",
  transaction: "Transaction",
};

const LAYER_BADGE_VARIANT: Record<string, "info" | "warning" | "success" | "muted"> = {
  time_windows: "info",
  aggregations: "success",
  derived: "warning",
  transaction: "muted",
};

export default function SelectCalcsStep({
  calculations,
  selectedCalcs,
  setSelectedCalcs,
}: SelectCalcsStepProps) {
  // Group calculations by layer
  const grouped = useMemo(() => {
    const groups: Record<string, CalculationDef[]> = {};
    for (const calc of calculations) {
      const layer = calc.layer || "other";
      if (!groups[layer]) groups[layer] = [];
      groups[layer].push(calc);
    }
    // Sort by preferred order
    const order = ["time_windows", "aggregations", "derived", "transaction"];
    const sorted: [string, CalculationDef[]][] = [];
    for (const layer of order) {
      if (groups[layer]) sorted.push([layer, groups[layer]]);
    }
    // Add any remaining layers
    for (const [layer, calcs] of Object.entries(groups)) {
      if (!order.includes(layer)) sorted.push([layer, calcs]);
    }
    return sorted;
  }, [calculations]);

  const selectedIds = new Set(selectedCalcs.map((c) => c.calc_id));

  const toggleCalc = (calcId: string, calc: CalculationDef) => {
    if (selectedIds.has(calcId)) {
      setSelectedCalcs(selectedCalcs.filter((c) => c.calc_id !== calcId));
    } else {
      setSelectedCalcs([
        ...selectedCalcs,
        {
          calc_id: calcId,
          strictness: "OPTIONAL",
          value_field: calc.value_field || undefined,
        },
      ]);
    }
  };

  const toggleStrictness = (calcId: string) => {
    setSelectedCalcs(
      selectedCalcs.map((c) =>
        c.calc_id === calcId
          ? { ...c, strictness: c.strictness === "MUST_PASS" ? "OPTIONAL" : "MUST_PASS" }
          : c,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Step 2: Select Calculations</h3>
        <span className="text-xs text-muted">
          {selectedCalcs.length} selected
        </span>
      </div>

      <div className="flex flex-col gap-4 overflow-auto max-h-[60vh]">
        {grouped.map(([layer, calcs]) => (
          <div key={layer} className="flex flex-col gap-1.5">
            <div className="text-[11px] font-medium text-muted uppercase tracking-wider">
              {LAYER_LABELS[layer] || layer}
            </div>
            <div className="grid gap-1.5">
              {calcs.map((calc) => {
                const selected = selectedCalcs.find((sc) => sc.calc_id === calc.calc_id);
                return (
                  <div
                    key={calc.calc_id}
                    className={`p-2.5 rounded border text-xs cursor-pointer transition-all ${
                      selected
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-border bg-surface hover:border-accent/30"
                    }`}
                    onClick={() => toggleCalc(calc.calc_id, calc)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-semibold text-foreground">{calc.name}</span>
                          <StatusBadge
                            label={layer}
                            variant={LAYER_BADGE_VARIANT[layer] || "muted"}
                          />
                        </div>
                        {calc.description && (
                          <p className="text-muted text-[11px] leading-relaxed line-clamp-2 mb-1">
                            {calc.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted">
                          {calc.value_field && (
                            <span>
                              Value: <span className="text-foreground/70">{calc.value_field}</span>
                            </span>
                          )}
                          {calc.depends_on && calc.depends_on.length > 0 && (
                            <span>
                              Depends on: <span className="text-foreground/70">{calc.depends_on.join(", ")}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Strictness toggle (only when selected) */}
                      {selected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStrictness(calc.calc_id);
                          }}
                          className="shrink-0 mt-0.5"
                        >
                          <StatusBadge
                            label={selected.strictness}
                            variant={selected.strictness === "MUST_PASS" ? "error" : "warning"}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
