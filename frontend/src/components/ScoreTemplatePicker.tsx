import { useState, useEffect, useMemo } from "react";
import {
  useFloating,
  useClick,
  useDismiss,
  useInteractions,
  offset,
  flip,
  shift,
  FloatingPortal,
  FloatingFocusManager,
} from "@floating-ui/react";
import { clsx } from "clsx";
import {
  useMetadataStore,
  type ScoreStepDef,
  type ScoreTemplateDef,
} from "../stores/metadataStore.ts";

/* ------------------------------------------------------------------ */
/*  Score color helper (shared with ScoreStepBuilder)                  */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): string {
  if (score <= 2) return "#22c55e";
  if (score <= 5) return "#eab308";
  if (score <= 8) return "#f97316";
  return "#ef4444";
}

/* ------------------------------------------------------------------ */
/*  Mini range bar (preview inside template card)                      */
/* ------------------------------------------------------------------ */

function MiniRangeBar({ steps }: { steps: ScoreStepDef[] }) {
  const sorted = [...steps].sort((a, b) => a.min_value - b.min_value);
  if (sorted.length === 0) {
    return (
      <div className="h-3 rounded bg-surface border border-border" />
    );
  }

  const maxVal = sorted.reduce(
    (m, s) => Math.max(m, s.max_value ?? s.min_value + 10),
    0,
  );
  const total = maxVal || 1;

  return (
    <div className="h-3 flex rounded overflow-hidden border border-border">
      {sorted.map((step, i) => {
        const end = step.max_value ?? total;
        const width = ((end - step.min_value) / total) * 100;
        return (
          <div
            key={i}
            style={{
              width: `${Math.max(width, 2)}%`,
              backgroundColor: scoreColor(step.score),
              opacity: 0.75,
            }}
            title={`${step.min_value}-${step.max_value ?? "\u221e"} \u2192 score ${step.score}`}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ScoreTemplatePickerProps {
  onSelect: (steps: ScoreStepDef[]) => void;
  onSaveNew?: (template: {
    label: string;
    description: string;
    value_category: string;
    steps: ScoreStepDef[];
  }) => void;
  valueCategory?: string;
  currentSteps?: ScoreStepDef[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ScoreTemplatePicker({
  onSelect,
  onSaveNew,
  valueCategory,
  currentSteps,
}: ScoreTemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saveLabel, setSaveLabel] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveCategory, setSaveCategory] = useState(valueCategory ?? "");

  const { scoreTemplates, fetchScoreTemplates } = useMetadataStore();

  /* Floating UI ------------------------------------------------------ */
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    middleware: [
      offset(4),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
  });

  const click = useClick(context, { event: "mousedown" });
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  /* Fetch on open ---------------------------------------------------- */
  useEffect(() => {
    if (open) {
      fetchScoreTemplates(valueCategory);
      setSearch("");
      setSaveLabel("");
      setSaveDescription("");
      setSaveCategory(valueCategory ?? "");
    }
  }, [open, fetchScoreTemplates, valueCategory]);

  /* Filter ----------------------------------------------------------- */
  const filteredTemplates = useMemo(
    () =>
      scoreTemplates.filter(
        (t) =>
          !search ||
          t.label.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.value_category.toLowerCase().includes(search.toLowerCase()),
      ),
    [scoreTemplates, search],
  );

  /* Group by category ------------------------------------------------ */
  const grouped = useMemo(() => {
    const map = new Map<string, ScoreTemplateDef[]>();
    for (const t of filteredTemplates) {
      const cat = t.value_category || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    return map;
  }, [filteredTemplates]);

  /* All known categories for the dropdown ----------------------------- */
  const allCategories = useMemo(() => {
    const cats = new Set(scoreTemplates.map((t) => t.value_category));
    if (valueCategory) cats.add(valueCategory);
    return [...cats].filter(Boolean).sort();
  }, [scoreTemplates, valueCategory]);

  /* Handlers --------------------------------------------------------- */
  const handleApply = (template: ScoreTemplateDef) => {
    onSelect(template.steps);
    setOpen(false);
  };

  const handleSave = () => {
    if (!onSaveNew || !saveLabel.trim() || !currentSteps?.length) return;
    onSaveNew({
      label: saveLabel.trim(),
      description: saveDescription.trim(),
      value_category: saveCategory.trim(),
      steps: currentSteps,
    });
    setOpen(false);
  };

  /* ------------------------------------------------------------------ */
  return (
    <div className="inline-block">
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        className="text-xs px-2 py-1 border border-border rounded hover:border-accent text-muted hover:text-accent transition-colors"
      >
        Templates
      </button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 bg-surface-elevated border border-border rounded-lg shadow-xl p-4 w-[420px] max-h-[520px] overflow-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Score Templates
                </h3>
                {valueCategory && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                    {valueCategory}
                  </span>
                )}
              </div>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-surface border border-border rounded px-2 py-1 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent transition-colors mb-3"
              />

              {/* Template groups */}
              {scoreTemplates.length === 0 && (
                <div className="text-xs text-muted text-center py-6">
                  No score templates available.
                </div>
              )}

              {scoreTemplates.length > 0 && filteredTemplates.length === 0 && (
                <div className="text-xs text-muted text-center py-3">
                  No templates match &quot;{search}&quot;
                </div>
              )}

              <div className="flex flex-col gap-3 max-h-[280px] overflow-auto">
                {[...grouped.entries()].map(([category, templates]) => (
                  <div key={category}>
                    <div className="text-[10px] text-muted uppercase tracking-wider font-medium mb-1.5">
                      {category}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {templates.map((template) => (
                        <div
                          key={template.template_id}
                          className="p-2 border border-border rounded hover:border-accent/50 transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">
                              {template.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={clsx(
                                  "inline-flex px-1.5 py-0.5 text-[10px] rounded",
                                  template.layer === "oob"
                                    ? "bg-blue-500/10 text-blue-400"
                                    : "bg-accent/10 text-accent",
                                )}
                              >
                                {template.layer === "oob" ? "OOB" : "User"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleApply(template)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                          {template.description && (
                            <p className="text-[11px] text-muted mb-1.5 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <MiniRangeBar steps={template.steps} />
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted">
                              {template.steps.length} tier{template.steps.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-[10px] text-muted">
                              Used {template.usage_count} time{template.usage_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Current as Template */}
              {onSaveNew && currentSteps && currentSteps.length > 0 && (
                <div className="border-t border-border mt-3 pt-3">
                  <p className="text-[10px] text-muted uppercase tracking-wider font-medium mb-2">
                    Save Current as Template
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={saveLabel}
                      onChange={(e) => setSaveLabel(e.target.value)}
                      placeholder="Template label..."
                      className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted/60 outline-none focus:border-accent transition-colors"
                    />
                    <input
                      type="text"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="Description (optional)..."
                      className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted/60 outline-none focus:border-accent transition-colors"
                    />
                    {allCategories.length > 0 ? (
                      <select
                        value={saveCategory}
                        onChange={(e) => setSaveCategory(e.target.value)}
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-foreground outline-none focus:border-accent transition-colors"
                      >
                        <option value="">Select category...</option>
                        {allCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={saveCategory}
                        onChange={(e) => setSaveCategory(e.target.value)}
                        placeholder="Value category..."
                        className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted/60 outline-none focus:border-accent transition-colors"
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!saveLabel.trim()}
                      className={clsx(
                        "w-full py-1.5 text-xs font-medium rounded transition-colors mt-1",
                        saveLabel.trim()
                          ? "bg-accent text-white hover:bg-accent/90"
                          : "bg-surface text-muted cursor-not-allowed",
                      )}
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
