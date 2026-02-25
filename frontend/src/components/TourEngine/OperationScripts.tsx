import { useState } from "react";
import { clsx } from "clsx";
import { FloatingPortal } from "@floating-ui/react";

// ---------------------------------------------------------------------------
// OperationScripts — Per-view help panel
// ---------------------------------------------------------------------------
// Displays available operations for the current view as a slide-in panel.
// Driven entirely by OperationDefinition metadata.
//
// Scaffolded in M113 for use by M119. Scenarios will register their
// operation scripts via registerOperations().
// ---------------------------------------------------------------------------

export interface OperationDefinition {
  id: string;
  name: string;
  description: string;
  /** Related scenario ID — clicking "Learn more" starts this scenario */
  scenarioId?: string;
}

export interface ViewOperations {
  /** View route path, e.g. "/settings" */
  viewId: string;
  label: string;
  operations: OperationDefinition[];
  tips?: string[];
}

interface OperationScriptsProps {
  viewOperations: ViewOperations | null;
  onStartScenario?: (scenarioId: string) => void;
}

export default function OperationScripts({
  viewOperations,
  onStartScenario,
}: OperationScriptsProps) {
  const [open, setOpen] = useState(false);

  if (!viewOperations) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={clsx(
          "fixed bottom-4 right-4 z-[9990] w-8 h-8 rounded-full",
          "flex items-center justify-center",
          "bg-accent text-white shadow-lg",
          "hover:bg-accent/90 transition-colors",
          "text-sm font-bold"
        )}
        title="What can I do here?"
      >
        ?
      </button>

      {/* Slide-in panel */}
      {open && (
        <FloatingPortal>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9991] bg-black/30"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 z-[9992] h-full w-80 bg-surface border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {viewOperations.label}
                  </h3>
                  <p className="text-[10px] text-muted mt-0.5">
                    What can you do on this view?
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-elevated text-muted hover:text-foreground transition-colors text-xs"
                >
                  x
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {/* Operations list */}
              {viewOperations.operations.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                    Available Operations
                  </h4>
                  <div className="space-y-2">
                    {viewOperations.operations.map((op) => (
                      <div
                        key={op.id}
                        className="p-2.5 rounded-lg border border-border bg-surface-elevated/50"
                      >
                        <div className="text-xs font-medium text-foreground mb-0.5">
                          {op.name}
                        </div>
                        <p className="text-[10px] text-muted leading-relaxed">
                          {op.description}
                        </p>
                        {op.scenarioId && onStartScenario && (
                          <button
                            onClick={() => {
                              setOpen(false);
                              onStartScenario(op.scenarioId!);
                            }}
                            className="mt-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors"
                          >
                            Learn with guided scenario
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick tips */}
              {viewOperations.tips && viewOperations.tips.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
                    Quick Tips
                  </h4>
                  <ul className="space-y-1.5">
                    {viewOperations.tips.map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[11px] text-foreground/70"
                      >
                        <span className="text-accent mt-0.5 shrink-0">
                          {"\u2022"}
                        </span>
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Empty state */}
              {viewOperations.operations.length === 0 &&
                (!viewOperations.tips || viewOperations.tips.length === 0) && (
                  <div className="text-center py-8 text-muted text-xs">
                    Operation scripts will be added in upcoming milestones.
                  </div>
                )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
