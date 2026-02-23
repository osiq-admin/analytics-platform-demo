import { useEffect, useState } from "react";
import { useMetadataStore, type CalculationDef } from "../../stores/metadataStore.ts";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import SourcePreview from "./SourcePreview.tsx";
import CanonicalFields from "./CanonicalFields.tsx";

export default function MappingStudio() {
  const { calculations, loading, fetchCalculations } = useMetadataStore();
  const [selectedCalc, setSelectedCalc] = useState<CalculationDef | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);

  useEffect(() => {
    fetchCalculations();
  }, [fetchCalculations]);

  // Reset mappings when calculation changes
  useEffect(() => {
    setMappings({});
    setSaveStatus(null);
  }, [selectedCalc?.calc_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Demo source columns (would come from uploaded CSV in production)
  const sourceColumns = [
    "exec_id", "order_id", "symbol", "price", "qty", "side", "timestamp", "account",
  ];

  const canonicalFields = selectedCalc
    ? [
        { name: "product_id", type: "string", mapped: mappings["product_id"] },
        { name: "account_id", type: "string", mapped: mappings["account_id"] },
        { name: "price", type: "decimal", mapped: mappings["price"] },
        { name: "quantity", type: "decimal", mapped: mappings["quantity"] },
        { name: "side", type: "string", mapped: mappings["side"] },
      ]
    : [];

  const handleMap = (fieldName: string, sourceColumn: string) => {
    setMappings((prev) => ({ ...prev, [fieldName]: sourceColumn }));
    setSaveStatus(null);
  };

  const handleUnmap = (fieldName: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    setSaveStatus(null);
  };

  const handleSave = async () => {
    if (!selectedCalc) return;
    try {
      await api.post("/metadata/mappings", {
        calc_id: selectedCalc.calc_id,
        mappings,
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const mappedCount = Object.keys(mappings).length;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Mapping Studio</h2>
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && <StatusBadge label="Saved" variant="success" />}
          {saveStatus === "error" && <StatusBadge label="Error" variant="error" />}
          <button
            onClick={() => setConfirmSave(true)}
            disabled={mappedCount === 0 || !selectedCalc}
            className="px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50"
          >
            Save Mappings ({mappedCount})
          </button>
        </div>
      </div>

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
            fields={canonicalFields}
            onMap={handleMap}
            onUnmap={handleUnmap}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirmSave}
        title="Save Mappings"
        message={`Save ${mappedCount} field mapping(s) for ${selectedCalc?.name ?? "calculation"}?`}
        confirmLabel="Save"
        onConfirm={() => { setConfirmSave(false); handleSave(); }}
        onCancel={() => setConfirmSave(false)}
      />
    </div>
  );
}
