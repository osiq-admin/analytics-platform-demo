import { useState, useEffect } from "react";
import { useMetadataStore } from "../../stores/metadataStore.ts";
import type { UseCase, UseCaseComponent } from "../../stores/useCaseStore.ts";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import SampleDataEditor from "./SampleDataEditor.tsx";
import ExpectedResults from "./ExpectedResults.tsx";

const STEPS = ["Describe", "Components", "Sample Data", "Expected Results", "Review & Save"] as const;

interface UseCaseBuilderProps {
  existing?: UseCase | null;
  onSave: (uc: UseCase) => void;
  onCancel: () => void;
}

function generateId(): string {
  return `uc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function UseCaseBuilder({
  existing,
  onSave,
  onCancel,
}: UseCaseBuilderProps) {
  const { calculations, settings, detectionModels, fetchAll } =
    useMetadataStore();

  const [step, setStep] = useState(0);

  // Step 1: Describe
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [author, setAuthor] = useState(existing?.author ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);

  // Step 2: Components
  const [components, setComponents] = useState<UseCaseComponent[]>(
    existing?.components ?? []
  );

  // Step 3: Sample Data
  const [sampleData, setSampleData] = useState<Record<string, unknown[]>>(
    existing?.sample_data ?? {}
  );

  // Step 4: Expected Results
  const [expectedResults, setExpectedResults] = useState<Record<string, unknown>>(
    existing?.expected_results ?? { should_fire: false, expected_alert_count: 0, notes: "" }
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const toggleComponent = (type: string, id: string, label: string) => {
    const exists = components.find((c) => c.type === type && c.id === id);
    if (exists) {
      setComponents(components.filter((c) => !(c.type === type && c.id === id)));
    } else {
      setComponents([...components, { type, id, action: `Include ${label}` }]);
    }
  };

  const isComponentSelected = (type: string, id: string) =>
    components.some((c) => c.type === type && c.id === id);

  const handleSave = () => {
    const now = new Date().toISOString();
    const uc: UseCase = {
      use_case_id: existing?.use_case_id ?? generateId(),
      name,
      description,
      status: existing?.status ?? "draft",
      author,
      components,
      sample_data: sampleData,
      expected_results: expectedResults,
      tags,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    onSave(uc);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 1:
        return true; // components are optional
      case 2:
        return true; // sample data is optional
      case 3:
        return true; // expected results are optional
      case 4:
        return name.trim().length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-3">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i <= step && setStep(i)}
            className={`flex items-center gap-1.5 px-2 py-1 text-[10px] rounded font-medium transition-colors ${
              i === step
                ? "bg-accent/15 text-accent"
                : i < step
                ? "text-success cursor-pointer hover:bg-success/10"
                : "text-muted cursor-default"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                i === step
                  ? "border-accent text-accent"
                  : i < step
                  ? "border-success text-success bg-success/15"
                  : "border-muted/30 text-muted"
              }`}
            >
              {i < step ? "\u2713" : i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      <Panel
        title={STEPS[step]}
        className="flex-1"
        noPadding={step === 2}
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={onCancel}
              className="px-2 py-0.5 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-2 py-0.5 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-2 py-0.5 text-xs rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!canProceed()}
                className="px-2 py-0.5 text-xs rounded bg-accent text-white hover:bg-accent/80 disabled:opacity-50 transition-colors"
              >
                Save Use Case
              </button>
            )}
          </div>
        }
      >
        {/* Step 1: Describe */}
        {step === 0 && (
          <div className="space-y-3 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Wash Trading — Same Account, Same Day"
                className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this use case tests..."
                rows={3}
                className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:border-accent resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
                className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">
                Tags
              </label>
              <div className="flex items-center gap-1 mb-1.5">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                  className="flex-1 px-2 py-1.5 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:border-accent"
                />
                <button
                  onClick={addTag}
                  className="px-2 py-1.5 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/15 text-accent border border-accent/30"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-accent/60 hover:text-accent"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Components */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Selected summary */}
            {components.length > 0 && (
              <div className="text-xs text-muted mb-2">
                {components.length} component{components.length !== 1 ? "s" : ""} selected
              </div>
            )}

            {/* Detection Models */}
            <div>
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-1.5">
                Detection Models
              </h4>
              <div className="space-y-1">
                {detectionModels.map((m) => (
                  <button
                    key={m.model_id}
                    onClick={() =>
                      toggleComponent("detection_model", m.model_id, m.name)
                    }
                    className={`w-full text-left px-2 py-1.5 rounded text-xs border transition-colors ${
                      isComponentSelected("detection_model", m.model_id)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-foreground/70 hover:bg-foreground/5"
                    }`}
                  >
                    <div className="font-medium">{m.name}</div>
                    <div className="text-muted mt-0.5 truncate">
                      {m.description}
                    </div>
                  </button>
                ))}
                {detectionModels.length === 0 && (
                  <div className="text-xs text-muted italic">
                    No detection models available
                  </div>
                )}
              </div>
            </div>

            {/* Calculations */}
            <div>
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-1.5">
                Calculations
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {calculations.map((c) => (
                  <button
                    key={c.calc_id}
                    onClick={() =>
                      toggleComponent("calculation", c.calc_id, c.name)
                    }
                    className={`w-full text-left px-2 py-1.5 rounded text-xs border transition-colors ${
                      isComponentSelected("calculation", c.calc_id)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-foreground/70 hover:bg-foreground/5"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted">({c.layer})</span>
                    </div>
                  </button>
                ))}
                {calculations.length === 0 && (
                  <div className="text-xs text-muted italic">
                    No calculations available
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div>
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-1.5">
                Settings
              </h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {settings.map((s) => (
                  <button
                    key={s.setting_id}
                    onClick={() =>
                      toggleComponent("setting", s.setting_id, s.name)
                    }
                    className={`w-full text-left px-2 py-1.5 rounded text-xs border transition-colors ${
                      isComponentSelected("setting", s.setting_id)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-foreground/70 hover:bg-foreground/5"
                    }`}
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-muted mt-0.5 truncate">
                      {s.description ?? `Default: ${JSON.stringify(s.default)}`}
                    </div>
                  </button>
                ))}
                {settings.length === 0 && (
                  <div className="text-xs text-muted italic">
                    No settings available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Sample Data */}
        {step === 2 && (
          <SampleDataEditor
            sampleData={sampleData}
            setSampleData={setSampleData}
          />
        )}

        {/* Step 4: Expected Results */}
        {step === 3 && (
          <ExpectedResults
            expectedResults={expectedResults}
            setExpectedResults={setExpectedResults}
          />
        )}

        {/* Step 5: Review & Save */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Summary */}
            <div>
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-1">
                Use Case Summary
              </h4>
              <div className="p-2 rounded border border-border bg-background text-xs space-y-1.5">
                <div>
                  <span className="text-muted">Name:</span>{" "}
                  <span className="font-medium">{name || "(untitled)"}</span>
                </div>
                <div>
                  <span className="text-muted">Author:</span>{" "}
                  <span>{author || "(none)"}</span>
                </div>
                <div>
                  <span className="text-muted">Description:</span>{" "}
                  <span>{description || "(none)"}</span>
                </div>
                {tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-muted">Tags:</span>
                    {tags.map((tag) => (
                      <StatusBadge key={tag} label={tag} variant="info" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Components */}
            <div>
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-1">
                Components ({components.length})
              </h4>
              {components.length > 0 ? (
                <div className="space-y-1">
                  {components.map((c) => (
                    <div
                      key={`${c.type}-${c.id}`}
                      className="flex items-center gap-2 p-1.5 rounded border border-border bg-background text-xs"
                    >
                      <StatusBadge
                        label={c.type.replace("_", " ")}
                        variant={
                          c.type === "detection_model"
                            ? "error"
                            : c.type === "calculation"
                            ? "info"
                            : "warning"
                        }
                      />
                      <span className="font-medium">{c.id}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted italic">
                  No components selected
                </div>
              )}
            </div>

            {/* Sample Data */}
            <div>
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-1">
                Sample Data
              </h4>
              {Object.keys(sampleData).length > 0 ? (
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(sampleData).map(([key, rows]) => (
                    <StatusBadge
                      key={key}
                      label={`${key}: ${Array.isArray(rows) ? rows.length : 0} rows`}
                      variant="info"
                    />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted italic">
                  No sample data provided
                </div>
              )}
            </div>

            {/* Expected Results */}
            <div>
              <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-1">
                Expected Results
              </h4>
              <div className="p-2 rounded border border-border bg-background text-xs space-y-1">
                <div>
                  <span className="text-muted">Should fire:</span>{" "}
                  <StatusBadge
                    label={expectedResults.should_fire ? "Yes" : "No"}
                    variant={expectedResults.should_fire ? "success" : "warning"}
                  />
                </div>
                {Boolean(expectedResults.should_fire) && (
                  <div>
                    <span className="text-muted">Expected alerts:</span>{" "}
                    <span className="font-medium">
                      {Number(expectedResults.expected_alert_count ?? 0)}
                    </span>
                  </div>
                )}
                {Boolean(expectedResults.notes) && (
                  <div>
                    <span className="text-muted">Notes:</span>{" "}
                    <span>{String(expectedResults.notes)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
