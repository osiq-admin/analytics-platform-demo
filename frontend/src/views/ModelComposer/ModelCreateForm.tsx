import { useState, useEffect } from "react";
import { useMetadataStore, type CalculationDef, type DetectionModelDef } from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

interface ModelCreateFormProps {
  calculations: CalculationDef[];
  onSaved: (modelId: string) => void;
  onCancel: () => void;
  existingModel?: DetectionModelDef;
}

interface SelectedCalc {
  calc_id: string;
  strictness: "MUST_PASS" | "OPTIONAL";
}

export default function ModelCreateForm({ calculations, onSaved, onCancel, existingModel }: ModelCreateFormProps) {
  const { saveDetectionModel, updateDetectionModel } = useMetadataStore();
  const [name, setName] = useState(existingModel?.name ?? "");
  const [description, setDescription] = useState(existingModel?.description ?? "");
  const [selectedCalcs, setSelectedCalcs] = useState<SelectedCalc[]>(
    existingModel?.calculations.map((c) => ({
      calc_id: c.calc_id,
      strictness: c.strictness,
    })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!existingModel;
  const modelId = isEdit
    ? existingModel.model_id
    : name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  // Reset form when existingModel changes
  useEffect(() => {
    if (existingModel) {
      setName(existingModel.name);
      setDescription(existingModel.description);
      setSelectedCalcs(
        existingModel.calculations.map((c) => ({
          calc_id: c.calc_id,
          strictness: c.strictness,
        }))
      );
    }
  }, [existingModel]);

  const toggleCalc = (calcId: string) => {
    setSelectedCalcs((prev) => {
      const exists = prev.find((c) => c.calc_id === calcId);
      if (exists) {
        return prev.filter((c) => c.calc_id !== calcId);
      }
      return [...prev, { calc_id: calcId, strictness: "OPTIONAL" as const }];
    });
  };

  const toggleStrictness = (calcId: string) => {
    setSelectedCalcs((prev) =>
      prev.map((c) =>
        c.calc_id === calcId
          ? { ...c, strictness: c.strictness === "MUST_PASS" ? "OPTIONAL" : "MUST_PASS" }
          : c
      )
    );
  };

  const handleSave = async () => {
    if (!name || selectedCalcs.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const modelPayload = {
        model_id: modelId,
        name,
        description,
        time_window: existingModel?.time_window ?? "business_date",
        granularity: existingModel?.granularity ?? ["product_id", "account_id"],
        calculations: selectedCalcs,
        score_threshold_setting: existingModel?.score_threshold_setting ?? "wash_score_threshold",
        query: existingModel?.query ?? "",
      };

      if (isEdit) {
        await updateDetectionModel(modelPayload);
      } else {
        await saveDetectionModel(modelPayload);
      }
      onSaved(modelId);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {isEdit ? `Edit: ${existingModel.name}` : "Create New Model"}
        </h3>
        <button onClick={onCancel} className="text-xs text-muted hover:text-foreground">
          Cancel
        </button>
      </div>

      <div className="space-y-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Model Name</span>
          <input
            className="px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Custom Wash Detection"
          />
          {modelId && <span className="text-muted">ID: {modelId}</span>}
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted">Description</span>
          <textarea
            className="px-2 py-1.5 rounded border border-border bg-background text-foreground text-xs resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this model detect?"
          />
        </label>

        <Panel title="Select Calculations">
          <div className="space-y-1">
            {calculations.map((c) => {
              const selected = selectedCalcs.find((sc) => sc.calc_id === c.calc_id);
              return (
                <div
                  key={c.calc_id}
                  className={`flex items-center justify-between p-2 rounded border text-xs cursor-pointer transition-colors ${
                    selected ? "border-accent bg-accent/10" : "border-border bg-background hover:border-accent/30"
                  }`}
                  onClick={() => toggleCalc(c.calc_id)}
                >
                  <div>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted ml-2">({c.layer})</span>
                  </div>
                  {selected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStrictness(c.calc_id);
                      }}
                    >
                      <StatusBadge
                        label={selected.strictness}
                        variant={selected.strictness === "MUST_PASS" ? "error" : "warning"}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !name || selectedCalcs.length === 0}
          className="px-4 py-2 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? `Save Changes (${selectedCalcs.length} calcs)` : `Save Model (${selectedCalcs.length} calcs)`}
        </button>
      </div>
    </div>
  );
}
