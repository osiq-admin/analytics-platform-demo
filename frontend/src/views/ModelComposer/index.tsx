import { useEffect, useState } from "react";
import {
  useMetadataStore,
  type CalculationDef,
  type DetectionModelDef,
} from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";

export default function ModelComposer() {
  const {
    calculations,
    detectionModels,
    loading,
    fetchCalculations,
    fetchDetectionModels,
  } = useMetadataStore();
  const [selectedModel, setSelectedModel] = useState<DetectionModelDef | null>(
    null,
  );

  useEffect(() => {
    fetchCalculations();
    fetchDetectionModels();
  }, [fetchCalculations, fetchDetectionModels]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const calcMap = new Map<string, CalculationDef>(
    calculations.map((c) => [c.calc_id, c]),
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <h2 className="text-lg font-semibold">Model Composer</h2>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Detection models */}
        <Panel title="Detection Models" className="w-72 shrink-0">
          {detectionModels.length === 0 ? (
            <p className="text-muted text-xs">No models defined.</p>
          ) : (
            <div className="space-y-1">
              {detectionModels.map((m) => (
                <button
                  key={m.model_id}
                  onClick={() => setSelectedModel(m)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                    selectedModel?.model_id === m.model_id
                      ? "bg-accent/15 text-accent"
                      : "text-foreground/70 hover:bg-foreground/5"
                  }`}
                >
                  <div className="font-medium">{m.name}</div>
                  <div className="text-muted mt-0.5">
                    {m.calculations.length} calcs
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* Center: Model detail */}
        {selectedModel ? (
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div>
              <h3 className="text-base font-semibold">{selectedModel.name}</h3>
              <p className="text-xs text-muted mt-1">
                {selectedModel.description}
              </p>
            </div>

            <Panel title="Calculations & Scoring">
              <div className="space-y-2">
                {selectedModel.calculations.map((mc) => {
                  const calc = calcMap.get(mc.calc_id);
                  return (
                    <div
                      key={mc.calc_id}
                      className="flex items-center justify-between p-2 rounded border border-border bg-background text-xs"
                    >
                      <div>
                        <span className="font-medium">
                          {calc?.name ?? mc.calc_id}
                        </span>
                        {calc && (
                          <span className="text-muted ml-2">
                            ({calc.layer})
                          </span>
                        )}
                      </div>
                      <StatusBadge
                        label={mc.strictness}
                        variant={
                          mc.strictness === "MUST_PASS" ? "error" : "warning"
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">
            Select a detection model to view its composition
          </div>
        )}

        {/* Right: Available calculations */}
        <Panel title="Available Calculations" className="w-64 shrink-0">
          <div className="space-y-1">
            {calculations.map((c) => (
              <div
                key={c.calc_id}
                className="px-2 py-1 text-xs rounded border border-border bg-background"
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-muted">{c.layer}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
