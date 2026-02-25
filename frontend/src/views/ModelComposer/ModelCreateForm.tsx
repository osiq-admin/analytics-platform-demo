import { useState, useEffect, useMemo } from "react";
import { useMetadataStore, type CalculationDef, type DetectionModelDef } from "../../stores/metadataStore.ts";
import WizardProgress from "./WizardProgress.tsx";
import DefineStep from "./steps/DefineStep.tsx";
import SelectCalcsStep, { type SelectedCalc } from "./steps/SelectCalcsStep.tsx";
import ConfigureScoringStep from "./steps/ConfigureScoringStep.tsx";
import QueryStep from "./steps/QueryStep.tsx";
import ReviewStep from "./steps/ReviewStep.tsx";
import TestRunStep from "./steps/TestRunStep.tsx";
import DeployStep from "./steps/DeployStep.tsx";

interface ModelCreateFormProps {
  calculations: CalculationDef[];
  onSaved: (modelId: string) => void;
  onCancel: () => void;
  existingModel?: DetectionModelDef;
}

const STEPS = [
  { label: "Define" },
  { label: "Calculations" },
  { label: "Scoring" },
  { label: "Query" },
  { label: "Review" },
  { label: "Test Run" },
  { label: "Deploy" },
];

export default function ModelCreateForm({ calculations, onSaved, onCancel, existingModel }: ModelCreateFormProps) {
  const { saveDetectionModel, updateDetectionModel } = useMetadataStore();

  // Wizard step
  const [step, setStep] = useState(1);

  // Step 1: Define
  const [name, setName] = useState(existingModel?.name ?? "");
  const [description, setDescription] = useState(existingModel?.description ?? "");
  const [timeWindow, setTimeWindow] = useState(existingModel?.time_window ?? "business_date_window");
  const [granularity, setGranularity] = useState<string[]>(existingModel?.granularity ?? ["product_id", "account_id"]);
  const [contextFields, setContextFields] = useState<string[]>(existingModel?.context_fields ?? ["product_id", "account_id"]);

  // Step 2: Calculations
  const [selectedCalcs, setSelectedCalcs] = useState<SelectedCalc[]>(
    existingModel?.calculations.map((c) => ({
      calc_id: c.calc_id,
      strictness: c.strictness,
      threshold_setting: c.threshold_setting ?? undefined,
      score_steps_setting: c.score_steps_setting ?? undefined,
      value_field: c.value_field ?? undefined,
    })) ?? [],
  );

  // Step 3: Scoring
  const [scoreThresholdSetting, setScoreThresholdSetting] = useState(
    existingModel?.score_threshold_setting ?? "",
  );

  // Step 4: Query (placeholder)
  const [query, setQuery] = useState(existingModel?.query ?? "");

  // Save state
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
      setTimeWindow(existingModel.time_window ?? "business_date_window");
      setGranularity(existingModel.granularity ?? ["product_id", "account_id"]);
      setContextFields(existingModel.context_fields ?? ["product_id", "account_id"]);
      setSelectedCalcs(
        existingModel.calculations.map((c) => ({
          calc_id: c.calc_id,
          strictness: c.strictness,
          threshold_setting: c.threshold_setting ?? undefined,
          score_steps_setting: c.score_steps_setting ?? undefined,
          value_field: c.value_field ?? undefined,
        })),
      );
      setScoreThresholdSetting(existingModel.score_threshold_setting ?? "");
      setQuery(existingModel.query ?? "");
      setStep(1);
    }
  }, [existingModel]);

  // Validation for each step
  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return selectedCalcs.length > 0;
      case 3:
        return scoreThresholdSetting.trim().length > 0;
      default:
        return true;
    }
  }, [step, name, selectedCalcs, scoreThresholdSetting]);

  const handleSave = async () => {
    if (!name || selectedCalcs.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const modelPayload = {
        model_id: modelId,
        name,
        description,
        time_window: timeWindow,
        granularity,
        context_fields: contextFields,
        calculations: selectedCalcs.map((sc) => ({
          calc_id: sc.calc_id,
          strictness: sc.strictness,
          threshold_setting: sc.threshold_setting || null,
          score_steps_setting: sc.score_steps_setting || null,
          value_field: sc.value_field || null,
        })),
        score_threshold_setting: scoreThresholdSetting || "wash_score_threshold",
        query,
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

  // Allow clicking to completed or current steps only
  const handleStepClick = (targetStep: number) => {
    if (targetStep <= step || targetStep === step + 1) {
      if (targetStep > step && !canProceed) return;
      setStep(targetStep);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {isEdit ? `Edit: ${existingModel.name}` : "Create New Model"}
        </h3>
      </div>

      {/* Progress bar */}
      <WizardProgress currentStep={step} steps={STEPS} onStepClick={handleStepClick} />

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        {step === 1 && (
          <DefineStep
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            timeWindow={timeWindow}
            setTimeWindow={setTimeWindow}
            granularity={granularity}
            setGranularity={setGranularity}
            contextFields={contextFields}
            setContextFields={setContextFields}
          />
        )}
        {step === 2 && (
          <SelectCalcsStep
            calculations={calculations}
            selectedCalcs={selectedCalcs}
            setSelectedCalcs={setSelectedCalcs}
          />
        )}
        {step === 3 && (
          <ConfigureScoringStep
            selectedCalcs={selectedCalcs}
            setSelectedCalcs={setSelectedCalcs}
            scoreThresholdSetting={scoreThresholdSetting}
            setScoreThresholdSetting={setScoreThresholdSetting}
            calculations={calculations}
          />
        )}
        {step === 4 && (
          <QueryStep
            query={query}
            setQuery={setQuery}
            selectedCalcs={selectedCalcs}
            calculations={calculations}
          />
        )}
        {step === 5 && (
          <ReviewStep
            modelId={modelId}
            name={name}
            description={description}
            timeWindow={timeWindow}
            granularity={granularity}
            contextFields={contextFields}
            selectedCalcs={selectedCalcs}
            scoreThresholdSetting={scoreThresholdSetting}
            query={query}
            calculations={calculations}
          />
        )}
        {step === 6 && (
          <TestRunStep
            modelId={modelId}
            query={query}
            name={name}
            description={description}
            timeWindow={timeWindow}
            granularity={granularity}
            contextFields={contextFields}
            selectedCalcs={selectedCalcs}
            scoreThresholdSetting={scoreThresholdSetting}
          />
        )}
        {step === 7 && (
          <DeployStep
            modelId={modelId}
            name={name}
            isEdit={isEdit}
            onSave={handleSave}
            saving={saving}
            error={error}
          />
        )}

        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button onClick={onCancel} className="text-xs text-muted hover:text-foreground">
          Cancel
        </button>
        <div className="flex gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-3 py-1.5 text-xs border border-border rounded hover:bg-accent/10 transition-colors"
            >
              Back
            </button>
          )}
          {step < 7 && (
            <button
              onClick={() => setStep(step + 1)}
              className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 transition-colors"
              disabled={!canProceed}
            >
              Next
            </button>
          )}
          {step === 7 && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-accent text-white rounded text-xs font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
              disabled={saving}
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Model"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
