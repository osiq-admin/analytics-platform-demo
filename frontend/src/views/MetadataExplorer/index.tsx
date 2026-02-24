import { useEffect, useState } from "react";
import {
  useMetadataStore,
  type CalculationDef,
} from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import CalculationList from "./CalculationList.tsx";
import CalculationDetail from "./CalculationDetail.tsx";
import CalculationForm from "./CalculationForm.tsx";
import CalculationDAG from "./CalculationDAG.tsx";

const layers = [
  { value: null, label: "All" },
  { value: "transaction", label: "Transaction" },
  { value: "time_window", label: "Time Window" },
  { value: "aggregation", label: "Aggregation" },
  { value: "derived", label: "Derived" },
];

export default function MetadataExplorer() {
  const {
    calculations,
    loading,
    fetchCalculations,
    saveCalculation,
    deleteCalculation,
    getCalculationDependents,
  } = useMetadataStore();
  const [selected, setSelected] = useState<CalculationDef | null>(null);
  const [layerFilter, setLayerFilter] = useState<string | null>(null);
  const [mode, setMode] = useState<"browse" | "create" | "edit">("browse");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string>("");

  useEffect(() => {
    fetchCalculations();
  }, [fetchCalculations]);

  const handleDagSelect = (calcId: string) => {
    const calc = calculations.find((c) => c.calc_id === calcId);
    if (calc) {
      setSelected(calc);
      setMode("browse");
    }
  };

  const handleSave = async (calc: CalculationDef) => {
    await saveCalculation(calc);
    setMode("browse");
    setSelected(null);
  };

  const handleRequestDelete = async () => {
    if (!selected) return;
    try {
      const deps = await getCalculationDependents(selected.calc_id);
      const warnings: string[] = [];
      if (deps.calculations.length > 0) {
        warnings.push(`Calculations: ${deps.calculations.join(", ")}`);
      }
      if (deps.detection_models.length > 0) {
        warnings.push(`Detection Models: ${deps.detection_models.join(", ")}`);
      }
      if (warnings.length > 0) {
        setDeleteWarning(
          `This calculation has dependents that will be affected:\n\n${warnings.join("\n")}\n\nAre you sure you want to delete it?`
        );
      } else {
        setDeleteWarning(
          `Are you sure you want to delete calculation "${selected.name}"? This action cannot be undone.`
        );
      }
      setConfirmDelete(true);
    } catch {
      setDeleteWarning(
        `Are you sure you want to delete calculation "${selected.name}"? This action cannot be undone.`
      );
      setConfirmDelete(true);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteCalculation(selected.calc_id);
    setConfirmDelete(false);
    setSelected(null);
    setMode("browse");
  };

  const emptyCalc: CalculationDef = {
    calc_id: "",
    name: "",
    layer: "transaction",
    description: "",
    inputs: [],
    output: {},
    logic: "",
    parameters: {},
    display: {},
    storage: "",
    value_field: "",
    depends_on: [],
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
        <Panel
          title="Calculations"
          className="w-[380px] shrink-0"
          noPadding
          actions={
            <button
              onClick={() => {
                setSelected(null);
                setMode("create");
              }}
              className="px-2 py-0.5 text-xs rounded font-medium text-accent border border-dashed border-accent/30 hover:bg-accent/10 transition-colors"
            >
              + New Calculation
            </button>
          }
        >
          <CalculationList
            calculations={calculations}
            selectedLayer={layerFilter}
            onSelect={(calc) => {
              setSelected(calc);
              setMode("browse");
            }}
          />
        </Panel>

        {/* Center: DAG */}
        <Panel title="Calculation DAG" className="flex-1 min-w-[300px]" noPadding>
          <CalculationDAG
            calculations={calculations}
            onSelectCalc={handleDagSelect}
          />
        </Panel>

        {/* Right: Detail or Form */}
        <div className="w-72 shrink-0">
          {mode === "create" ? (
            <CalculationForm
              calc={emptyCalc}
              isNew
              onSave={handleSave}
              onCancel={() => setMode("browse")}
            />
          ) : mode === "edit" && selected ? (
            <CalculationForm
              calc={selected}
              isNew={false}
              onSave={handleSave}
              onCancel={() => setMode("browse")}
            />
          ) : selected ? (
            <CalculationDetail
              calc={selected}
              onEdit={() => setMode("edit")}
              onDelete={handleRequestDelete}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Select a calculation
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Calculation"
        message={deleteWarning}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
