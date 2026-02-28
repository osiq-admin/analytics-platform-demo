import { useCallback, useEffect, useState } from "react";
import {
  useMetadataStore,
  type CalculationDef,
  type DetectionModelDef,
} from "../../stores/metadataStore.ts";
import { api } from "../../api/client.ts";
import { useViewTabs } from "../../hooks/useViewTabs.ts";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import ChatPanel from "../AIAssistant/ChatPanel.tsx";
import ModelCreateForm, { type WizardState } from "./ModelCreateForm.tsx";
import ValidationPanel from "../../components/ValidationPanel.tsx";
import PreviewPanel from "../../components/PreviewPanel.tsx";
import DependencyMiniDAG from "../../components/DependencyMiniDAG.tsx";
import ExamplesDrawer from "../../components/ExamplesDrawer.tsx";

type RightTab = "validation" | "preview" | "dependencies";

interface DeployResult {
  model_id: string;
  alerts_generated: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ModelComposer() {
  const {
    calculations,
    detectionModels,
    loading,
    fetchCalculations,
    fetchDetectionModels,
    deleteDetectionModel,
  } = useMetadataStore();
  const [selectedModel, setSelectedModel] = useState<DetectionModelDef | null>(null);
  const [mode, setMode] = useState<"browse" | "create" | "edit">("browse");
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [confirmDeploy, setConfirmDeploy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [wizardState, setWizardState] = useState<WizardState | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("validation");
  const [examplesOpen, setExamplesOpen] = useState(false);

  const fallbackRightTabs: { key: RightTab; label: string }[] = [
    { key: "validation", label: "Validate" },
    { key: "preview", label: "Preview" },
    { key: "dependencies", label: "Deps" },
  ];
  const rightTabs = useViewTabs<RightTab>("model_composer", fallbackRightTabs);

  const handleWizardStateChange = useCallback((state: WizardState) => {
    setWizardState(state);
  }, []);

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

  const handleDeploy = async () => {
    if (!selectedModel) return;
    setDeploying(true);
    setDeployResult(null);
    try {
      const result = await api.post<DeployResult>(
        `/alerts/generate/${selectedModel.model_id}`
      );
      setDeployResult(result);
    } catch {
      setDeployResult({ model_id: selectedModel.model_id, alerts_generated: -1 });
    } finally {
      setDeploying(false);
    }
  };

  const handleModelCreated = (modelId: string) => {
    setMode("browse");
    fetchDetectionModels().then(() => {
      const newModel = detectionModels.find((m) => m.model_id === modelId);
      if (newModel) setSelectedModel(newModel);
    });
  };

  const handleModelEdited = (modelId: string) => {
    setMode("browse");
    fetchDetectionModels().then(() => {
      const updated = detectionModels.find((m) => m.model_id === modelId);
      if (updated) setSelectedModel(updated);
    });
  };

  const handleDelete = async () => {
    if (!selectedModel) return;
    await deleteDetectionModel(selectedModel.model_id);
    setConfirmDelete(false);
    setSelectedModel(null);
    setMode("browse");
  };

  const handleAiSend = async (content: string) => {
    const userMsg: Message = { role: "user", content };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setAiLoading(true);
    try {
      const reply = await api.post<Message & { mode: string }>("/ai/chat", {
        messages: updated,
      });
      setMessages([...updated, { role: reply.role as "assistant", content: reply.content }]);
    } catch (e) {
      setMessages([...updated, { role: "assistant", content: `Error: ${e}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Model Composer</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExamplesOpen(!examplesOpen)}
            data-action={examplesOpen ? "close-examples" : "examples"}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              examplesOpen
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {examplesOpen ? "Close Examples" : "Examples"}
          </button>
          <button
            onClick={() => setAiOpen(!aiOpen)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              aiOpen
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {aiOpen ? "Close AI" : "Ask AI"}
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Detection models */}
        <Panel title="Detection Models" className="w-72 shrink-0" dataTour="model-list" dataTrace="models.model-list" tooltip="List of detection models to compose and deploy">
          <div className="space-y-1">
            <button
              onClick={() => {
                setMode("create");
                setSelectedModel(null);
                setDeployResult(null);
              }}
              className="w-full text-left px-2 py-1.5 rounded text-xs font-medium text-accent border border-dashed border-accent/30 hover:bg-accent/10 transition-colors"
            >
              + New Model
            </button>
            {detectionModels.map((m) => (
              <button
                key={m.model_id}
                onClick={() => {
                  setSelectedModel(m);
                  setMode("browse");
                  setDeployResult(null);
                }}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  selectedModel?.model_id === m.model_id
                    ? "bg-accent/15 text-accent"
                    : "text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{m.name}</span>
                  <span
                    data-tour="model-layer-badge"
                    className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      m.metadata_layer === "oob"
                        ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                        : "bg-purple-500/15 text-purple-400 border-purple-500/30"
                    }`}
                  >
                    {m.metadata_layer === "oob" ? "OOB" : "Custom"}
                  </span>
                </div>
                <div className="text-muted mt-0.5">
                  {m.calculations.length} calcs
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Center: Model detail, create form, or edit form */}
        {mode === "create" ? (
          <ModelCreateForm
            calculations={calculations}
            onSaved={handleModelCreated}
            onCancel={() => setMode("browse")}
            onStateChange={handleWizardStateChange}
          />
        ) : mode === "edit" && selectedModel ? (
          <ModelCreateForm
            calculations={calculations}
            existingModel={selectedModel}
            onSaved={handleModelEdited}
            onCancel={() => setMode("browse")}
            onStateChange={handleWizardStateChange}
          />
        ) : selectedModel ? (
          <div className="flex-1 flex flex-col gap-3 min-w-0" data-tour="model-detail" data-trace="models.model-detail">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold">{selectedModel.name}</h3>
                <p className="text-xs text-muted mt-1 line-clamp-2">{selectedModel.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {deployResult && (
                  <StatusBadge
                    label={
                      deployResult.alerts_generated >= 0
                        ? `${deployResult.alerts_generated} alerts`
                        : "Error"
                    }
                    variant={
                      deployResult.alerts_generated > 0
                        ? "success"
                        : deployResult.alerts_generated === 0
                        ? "warning"
                        : "error"
                    }
                  />
                )}
                <button
                  onClick={() => setMode("edit")}
                  data-action="edit"
                  className="px-3 py-1.5 text-xs rounded font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  data-action="delete"
                  className="px-3 py-1.5 text-xs rounded font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDeploy(true)}
                  disabled={deploying}
                  className="px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50"
                >
                  {deploying ? "Running..." : "Deploy & Run"}
                </button>
              </div>
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
                        <span className="font-medium">{calc?.name ?? mc.calc_id}</span>
                        {calc && <span className="text-muted ml-2">({calc.layer})</span>}
                      </div>
                      <StatusBadge
                        label={mc.strictness}
                        variant={mc.strictness === "MUST_PASS" ? "error" : "warning"}
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

        {/* Right: Tabbed panels in create/edit, Available Calculations in browse */}
        {(mode === "create" || mode === "edit") && wizardState ? (
          <div className="w-64 shrink-0 rounded border border-border bg-surface flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="h-8 shrink-0 flex items-center border-b border-border bg-surface-elevated">
              {rightTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setRightTab(tab.key)}
                  data-action={`tab-${tab.key}`}
                  className={`flex-1 h-full text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                    rightTab === tab.key
                      ? "text-accent border-b-2 border-accent"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-auto p-3">
              {rightTab === "validation" && (
                <div data-trace="models.validation-panel">
                  <ValidationPanel
                    name={wizardState.name}
                    description={wizardState.description}
                    selectedCalcs={wizardState.selectedCalcs}
                    scoreThresholdSetting={wizardState.scoreThresholdSetting}
                    query={wizardState.query}
                    contextFields={wizardState.contextFields}
                    granularity={wizardState.granularity}
                  />
                </div>
              )}
              {rightTab === "preview" && (
                <div data-trace="models.preview-panel">
                  <PreviewPanel
                    selectedCalcs={wizardState.selectedCalcs}
                    scoreThresholdSetting={wizardState.scoreThresholdSetting}
                    calculations={calculations}
                  />
                </div>
              )}
              {rightTab === "dependencies" && (
                <div data-trace="models.dependency-dag">
                  <DependencyMiniDAG
                    selectedCalcIds={wizardState.selectedCalcs.map((c) => c.calc_id)}
                    calculations={calculations}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
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
        )}

        {/* AI chat panel (collapsible) */}
        {aiOpen && (
          <Panel title="AI Assistant" className="w-72 shrink-0" noPadding dataTrace="models.ai-chat">
            <ChatPanel
              messages={messages}
              onSend={handleAiSend}
              loading={aiLoading}
            />
          </Panel>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeploy}
        title="Deploy & Run Model"
        message={`Run detection model "${selectedModel?.name}" and generate alerts? This will execute the model's query against current data.`}
        confirmLabel="Deploy & Run"
        onConfirm={() => { setConfirmDeploy(false); handleDeploy(); }}
        onCancel={() => setConfirmDeploy(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Detection Model"
        message={`Are you sure you want to delete model "${selectedModel?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ExamplesDrawer
        open={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        onUseAsStartingPoint={(_type, _config) => {
          setExamplesOpen(false);
          setMode("create");
          setSelectedModel(null);
          setDeployResult(null);
        }}
      />
    </div>
  );
}
