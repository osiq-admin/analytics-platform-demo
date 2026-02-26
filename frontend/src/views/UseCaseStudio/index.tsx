import { useEffect, useState } from "react";
import {
  useUseCaseStore,
  type UseCase,
} from "../../stores/useCaseStore.ts";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import UseCaseBuilder from "./UseCaseBuilder.tsx";
import { formatLabel } from "../../utils/format.ts";

type StatusVariant = "muted" | "info" | "warning" | "success" | "error";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  draft: "muted",
  ready: "info",
  submitted: "warning",
  approved: "success",
  rejected: "error",
};

export default function UseCaseStudio() {
  const { useCases, loading, fetchUseCases, saveUseCase, deleteUseCase, runUseCase } =
    useUseCaseStore();

  const [selected, setSelected] = useState<UseCase | null>(null);
  const [mode, setMode] = useState<"browse" | "create" | "edit">("browse");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetchUseCases();
  }, [fetchUseCases]);

  if (loading && useCases.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleSave = async (uc: UseCase) => {
    await saveUseCase(uc);
    setMode("browse");
    setSelected(uc);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteUseCase(selected.use_case_id);
    setConfirmDelete(false);
    setSelected(null);
    setMode("browse");
  };

  const handleRun = async () => {
    if (!selected) return;
    setRunning(true);
    setRunResult(null);
    try {
      const result = await runUseCase(selected.use_case_id);
      setRunResult(result);
    } catch (e) {
      setRunResult({ error: String(e) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Use Case Studio</h2>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left panel: use case list */}
        <Panel
          title="Use Cases"
          className="w-72 shrink-0"
          dataTrace="use-cases.use-case-list"
          tooltip="Detection use cases bundle models, sample data, and expected results"
        >
          <div className="space-y-1">
            <button
              onClick={() => {
                setMode("create");
                setSelected(null);
                setRunResult(null);
              }}
              className="w-full text-left px-2 py-1.5 rounded text-xs font-medium text-accent border border-dashed border-accent/30 hover:bg-accent/10 transition-colors"
            >
              + New Use Case
            </button>
            {useCases.map((uc) => (
              <button
                key={uc.use_case_id}
                onClick={() => {
                  setSelected(uc);
                  setMode("browse");
                  setRunResult(null);
                }}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  selected?.use_case_id === uc.use_case_id
                    ? "bg-accent/15 text-accent"
                    : "text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate flex-1">
                    {uc.name}
                  </span>
                  <StatusBadge
                    label={uc.status}
                    variant={STATUS_VARIANT[uc.status] ?? "muted"}
                  />
                </div>
                <div className="text-muted mt-0.5 truncate">
                  {uc.components.length} components
                  {uc.tags.length > 0 && ` \u00B7 ${uc.tags.join(", ")}`}
                </div>
              </button>
            ))}
            {useCases.length === 0 && (
              <div className="text-xs text-muted italic px-2 py-2">
                No use cases yet. Create one to get started.
              </div>
            )}
          </div>
        </Panel>

        {/* Center: wizard or detail */}
        {mode === "create" ? (
          <UseCaseBuilder
            onSave={handleSave}
            onCancel={() => setMode("browse")}
          />
        ) : mode === "edit" && selected ? (
          <UseCaseBuilder
            existing={selected}
            onSave={handleSave}
            onCancel={() => setMode("browse")}
          />
        ) : selected ? (
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold">{selected.name}</h3>
                  <StatusBadge
                    label={selected.status}
                    variant={STATUS_VARIANT[selected.status] ?? "muted"}
                  />
                </div>
                <p className="text-xs text-muted mt-1">
                  {selected.description || "No description"}
                </p>
                {selected.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {selected.tags.map((tag) => (
                      <StatusBadge key={tag} label={tag} variant="info" />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {runResult && (
                  <StatusBadge
                    label={
                      runResult.error
                        ? "Error"
                        : `${runResult.alerts_generated ?? 0} alerts`
                    }
                    variant={runResult.error ? "error" : "success"}
                  />
                )}
                <button
                  onClick={() => setMode("edit")}
                  className="px-3 py-1.5 text-xs rounded font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 text-xs rounded font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={handleRun}
                  disabled={running}
                  className="px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50"
                >
                  {running ? "Running..." : "Run"}
                </button>
              </div>
            </div>

            {/* Components */}
            <Panel title={`Components (${selected.components.length})`}>
              {selected.components.length > 0 ? (
                <div className="space-y-1">
                  {selected.components.map((c) => (
                    <div
                      key={`${c.type}-${c.id}`}
                      className="flex items-center justify-between p-2 rounded border border-border bg-background text-xs"
                    >
                      <div className="flex items-center gap-2">
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
                        <span className="font-medium">{formatLabel(c.id)}</span>
                      </div>
                      <span className="text-muted">{c.action}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted italic">
                  No components attached
                </div>
              )}
            </Panel>

            {/* Sample Data & Expected Results side by side */}
            <div className="flex gap-3 flex-1 min-h-0">
              <Panel title="Sample Data" className="flex-1" dataTrace="use-cases.sample-data">
                {Object.keys(selected.sample_data).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(selected.sample_data).map(([key, rows]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-1.5 rounded border border-border bg-background text-xs"
                      >
                        <span className="font-medium">{key}</span>
                        <StatusBadge
                          label={`${Array.isArray(rows) ? rows.length : 0} rows`}
                          variant="info"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted italic">
                    No sample data provided
                  </div>
                )}
              </Panel>

              <Panel title="Expected Results" className="flex-1" dataTrace="use-cases.expected-results">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Should fire:</span>
                    <StatusBadge
                      label={
                        selected.expected_results.should_fire ? "Yes" : "No"
                      }
                      variant={
                        selected.expected_results.should_fire
                          ? "success"
                          : "warning"
                      }
                    />
                  </div>
                  {Boolean(selected.expected_results.should_fire) && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Expected alerts:</span>
                      <span className="font-medium">
                        {Number(selected.expected_results.expected_alert_count ?? 0)}
                      </span>
                    </div>
                  )}
                  {Boolean(selected.expected_results.notes) && (
                    <div className="mt-2 p-2 rounded border border-border bg-background">
                      <span className="text-muted block mb-0.5">Notes:</span>
                      <span>{String(selected.expected_results.notes)}</span>
                    </div>
                  )}
                </div>
              </Panel>
            </div>

            {/* Run result details */}
            {runResult && !runResult.error && (
              <Panel title="Run Results">
                {Array.isArray(runResult.results) ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted border-b border-border">
                        <th className="pb-1">Model</th>
                        <th className="pb-1">Evaluated</th>
                        <th className="pb-1">Fired</th>
                        <th className="pb-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(runResult.results as Array<Record<string, unknown>>).map(
                        (r, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-1 font-medium">
                              {formatLabel(String(r.model_id ?? ""))}
                            </td>
                            <td className="py-1 font-mono">
                              {String(r.alerts_evaluated ?? "-")}
                            </td>
                            <td className="py-1 font-mono">
                              {String(r.alerts_fired ?? "-")}
                            </td>
                            <td className="py-1">
                              <StatusBadge
                                label={String(r.status ?? "unknown")}
                                variant={
                                  r.status === "ok"
                                    ? "success"
                                    : r.status === "error"
                                    ? "error"
                                    : "muted"
                                }
                              />
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                ) : (
                  <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono">
                    {JSON.stringify(runResult, null, 2)}
                  </pre>
                )}
              </Panel>
            )}
            {Boolean(runResult?.error) && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
                {String(runResult!.error)}
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-[10px] text-muted">
              <span>Author: {selected.author || "Unknown"}</span>
              <span>
                Created: {new Date(selected.created_at).toLocaleDateString()}
              </span>
              <span>
                Updated: {new Date(selected.updated_at).toLocaleDateString()}
              </span>
              <span>ID: {selected.use_case_id}</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">
            Select a use case or create a new one
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Use Case"
        message={`Are you sure you want to delete "${selected?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
