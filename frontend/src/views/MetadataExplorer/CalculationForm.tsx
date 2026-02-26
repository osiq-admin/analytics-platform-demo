import { useState } from "react";
import type { CalculationDef } from "../../stores/metadataStore.ts";

interface CalculationFormProps {
  calc: CalculationDef;
  isNew: boolean;
  onSave: (calc: CalculationDef) => Promise<void>;
  onCancel: () => void;
}

const LAYERS = ["transaction", "time_window", "aggregation", "derived"];

const inputCls =
  "px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs w-full";

export default function CalculationForm({ calc, isNew, onSave, onCancel }: CalculationFormProps) {
  const [calcId, setCalcId] = useState(calc.calc_id);
  const [name, setName] = useState(calc.name);
  const [layer, setLayer] = useState(calc.layer);
  const [description, setDescription] = useState(calc.description);
  const [logic, setLogic] = useState(calc.logic);
  const [valueField, setValueField] = useState(calc.value_field);
  const [storage, setStorage] = useState(calc.storage);
  const [dependsOn, setDependsOn] = useState(calc.depends_on.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!calcId || !name) return;
    setSaving(true);
    setError(null);
    try {
      const depsArray = dependsOn
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await onSave({
        ...calc,
        calc_id: calcId,
        name,
        layer,
        description,
        logic,
        value_field: valueField,
        storage,
        depends_on: depsArray,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 overflow-auto" data-trace="metadata.calculation-form">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {isNew ? "New Calculation" : `Edit: ${calc.name}`}
        </h3>
        <button onClick={onCancel} className="text-xs text-muted hover:text-foreground">
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        {/* Calc ID */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Calc ID</span>
          <input
            className={inputCls}
            value={calcId}
            onChange={(e) => setCalcId(e.target.value)}
            placeholder="e.g. my_calc"
            disabled={!isNew}
          />
        </label>

        {/* Name */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Name</span>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Calculation name"
          />
        </label>

        {/* Layer */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Layer</span>
          <select
            className={inputCls}
            value={layer}
            onChange={(e) => setLayer(e.target.value)}
          >
            {LAYERS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>

        {/* Description */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Description</span>
          <textarea
            className={inputCls + " resize-none"}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this calculation compute?"
          />
        </label>

        {/* SQL Logic */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">SQL Logic</span>
          <textarea
            className={inputCls + " resize-none font-mono"}
            rows={4}
            value={logic}
            onChange={(e) => setLogic(e.target.value)}
            placeholder="SELECT ..."
          />
        </label>

        {/* Value Field */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Value Field</span>
          <input
            className={inputCls}
            value={valueField}
            onChange={(e) => setValueField(e.target.value)}
            placeholder="e.g. wash_score"
          />
        </label>

        {/* Storage */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Storage Table</span>
          <input
            className={inputCls}
            value={storage}
            onChange={(e) => setStorage(e.target.value)}
            placeholder="e.g. calc_wash_trading"
          />
        </label>

        {/* Dependencies */}
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Dependencies (comma-separated)</span>
          <input
            className={inputCls}
            value={dependsOn}
            onChange={(e) => setDependsOn(e.target.value)}
            placeholder="e.g. same_party, price_match"
          />
        </label>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !calcId || !name}
          className="px-4 py-2 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50 w-full"
        >
          {saving ? "Saving..." : isNew ? "Create Calculation" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
