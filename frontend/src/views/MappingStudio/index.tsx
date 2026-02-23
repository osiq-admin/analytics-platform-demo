import { useEffect, useState } from "react";
import { useMetadataStore, type CalculationDef } from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import SourcePreview from "./SourcePreview.tsx";
import CanonicalFields from "./CanonicalFields.tsx";

export default function MappingStudio() {
  const { calculations, loading, fetchCalculations } = useMetadataStore();
  const [selectedCalc, setSelectedCalc] = useState<CalculationDef | null>(null);

  useEffect(() => {
    fetchCalculations();
  }, [fetchCalculations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Demo source columns (will come from uploaded CSV)
  const sourceColumns = [
    "exec_id",
    "order_id",
    "symbol",
    "price",
    "qty",
    "side",
    "timestamp",
    "account",
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      <h2 className="text-lg font-semibold">Mapping Studio</h2>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Calculation selector */}
        <Panel title="Select Calculation" className="w-64 shrink-0">
          <div className="space-y-1">
            {calculations.map((calc) => (
              <button
                key={calc.calc_id}
                onClick={() => setSelectedCalc(calc)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  selectedCalc?.calc_id === calc.calc_id
                    ? "bg-accent/15 text-accent"
                    : "text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                {calc.name}
              </button>
            ))}
          </div>
        </Panel>

        {/* Center: Source preview (drag from) */}
        <div className="w-56 shrink-0">
          <SourcePreview columns={sourceColumns} />
        </div>

        {/* Right: Canonical fields (drop to) */}
        <div className="flex-1 min-w-0">
          <CanonicalFields
            fields={
              selectedCalc
                ? [
                    { name: "product_id", type: "string", mapped: undefined },
                    { name: "account_id", type: "string", mapped: undefined },
                    { name: "price", type: "decimal", mapped: undefined },
                    { name: "quantity", type: "decimal", mapped: undefined },
                    { name: "side", type: "string", mapped: undefined },
                  ]
                : []
            }
          />
        </div>
      </div>
    </div>
  );
}
