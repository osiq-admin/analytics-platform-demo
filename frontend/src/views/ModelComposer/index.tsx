import { useEffect, useState } from "react";
import {
  useMetadataStore,
  type CalculationDef,
  type DetectionModelDef,
} from "../../stores/metadataStore.ts";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import ChatPanel from "../AIAssistant/ChatPanel.tsx";
import ModelCreateForm from "./ModelCreateForm.tsx";

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
  } = useMetadataStore();
  const [selectedModel, setSelectedModel] = useState<DetectionModelDef | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [confirmDeploy, setConfirmDeploy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

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
    setCreateMode(false);
    fetchDetectionModels().then(() => {
      const newModel = detectionModels.find((m) => m.model_id === modelId);
      if (newModel) setSelectedModel(newModel);
    });
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

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Detection models */}
        <Panel title="Detection Models" className="w-72 shrink-0">
          <div className="space-y-1">
            <button
              onClick={() => {
                setCreateMode(true);
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
                  setCreateMode(false);
                  setDeployResult(null);
                }}
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
        </Panel>

        {/* Center: Model detail or create form */}
        {createMode ? (
          <ModelCreateForm
            calculations={calculations}
            onSaved={handleModelCreated}
            onCancel={() => setCreateMode(false)}
          />
        ) : selectedModel ? (
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{selectedModel.name}</h3>
                <p className="text-xs text-muted mt-1">{selectedModel.description}</p>
              </div>
              <div className="flex items-center gap-2">
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

        {/* AI chat panel (collapsible) */}
        {aiOpen && (
          <Panel title="AI Assistant" className="w-72 shrink-0" noPadding>
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
    </div>
  );
}
