import { useEffect, useState } from "react";
import {
  useMetadataStore,
  type CalculationDef,
} from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import CalculationList from "./CalculationList.tsx";
import CalculationDetail from "./CalculationDetail.tsx";
import CalculationDAG from "./CalculationDAG.tsx";

const layers = [
  { value: null, label: "All" },
  { value: "transaction", label: "Transaction" },
  { value: "time_window", label: "Time Window" },
  { value: "aggregation", label: "Aggregation" },
  { value: "derived", label: "Derived" },
];

export default function MetadataExplorer() {
  const { calculations, loading, fetchCalculations } = useMetadataStore();
  const [selected, setSelected] = useState<CalculationDef | null>(null);
  const [layerFilter, setLayerFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchCalculations();
  }, [fetchCalculations]);

  const handleDagSelect = (calcId: string) => {
    const calc = calculations.find((c) => c.calc_id === calcId);
    if (calc) setSelected(calc);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Metadata Explorer</h2>
        <div className="flex gap-1">
          {layers.map((l) => (
            <button
              key={l.label}
              onClick={() => setLayerFilter(l.value)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                layerFilter === l.value
                  ? "border-accent text-accent bg-accent/10"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Calculation list */}
        <Panel title="Calculations" className="w-[380px] shrink-0" noPadding>
          <CalculationList
            calculations={calculations}
            selectedLayer={layerFilter}
            onSelect={setSelected}
          />
        </Panel>

        {/* Center: DAG */}
        <Panel title="Calculation DAG" className="flex-1 min-w-[300px]" noPadding>
          <CalculationDAG
            calculations={calculations}
            onSelectCalc={handleDagSelect}
          />
        </Panel>

        {/* Right: Detail */}
        <div className="w-72 shrink-0">
          {selected ? (
            <CalculationDetail calc={selected} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Select a calculation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
