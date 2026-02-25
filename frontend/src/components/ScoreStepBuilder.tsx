import { useMemo } from "react";
import type { ScoreStepDef } from "../stores/metadataStore.ts";
import ScoreTemplatePicker from "./ScoreTemplatePicker.tsx";

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): string {
  if (score <= 2) return "#22c55e";
  if (score <= 5) return "#eab308";
  if (score <= 8) return "#f97316";
  return "#ef4444";
}

function scoreColorClass(score: number): string {
  if (score <= 2) return "text-green-400";
  if (score <= 5) return "text-yellow-400";
  if (score <= 8) return "text-orange-400";
  return "text-red-400";
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

interface StepWarning {
  type: "gap" | "overlap" | "non-monotonic";
  message: string;
}

function validateSteps(steps: ScoreStepDef[]): StepWarning[] {
  if (steps.length < 2) return [];
  const sorted = [...steps].sort((a, b) => a.min_value - b.min_value);
  const warnings: StepWarning[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const currentMax = current.max_value;

    if (currentMax !== null) {
      if (currentMax < next.min_value) {
        warnings.push({
          type: "gap",
          message: `Gap between ${currentMax} and ${next.min_value}`,
        });
      } else if (currentMax > next.min_value) {
        warnings.push({
          type: "overlap",
          message: `Overlap: tier ending at ${currentMax} overlaps with tier starting at ${next.min_value}`,
        });
      }
    }
  }

  // Non-monotonic check
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].score > sorted[i + 1].score) {
      warnings.push({
        type: "non-monotonic",
        message: `Non-monotonic: score ${sorted[i].score} is higher than next score ${sorted[i + 1].score}`,
      });
      break;
    }
  }

  return warnings;
}

/* ------------------------------------------------------------------ */
/*  Range bar segment types                                            */
/* ------------------------------------------------------------------ */

interface BarSegment {
  kind: "step" | "gap" | "overlap";
  start: number;
  end: number;
  score?: number;
}

function buildBarSegments(steps: ScoreStepDef[]): BarSegment[] {
  if (steps.length === 0) return [];
  const sorted = [...steps].sort((a, b) => a.min_value - b.min_value);
  const segments: BarSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const step = sorted[i];
    const end = step.max_value ?? (step.min_value + 10);

    // Check for gap or overlap with previous
    if (i > 0) {
      const prevEnd = sorted[i - 1].max_value;
      if (prevEnd !== null && prevEnd < step.min_value) {
        segments.push({ kind: "gap", start: prevEnd, end: step.min_value });
      } else if (prevEnd !== null && prevEnd > step.min_value) {
        segments.push({
          kind: "overlap",
          start: step.min_value,
          end: Math.min(prevEnd, end),
        });
      }
    }

    segments.push({ kind: "step", start: step.min_value, end, score: step.score });
  }

  return segments;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ScoreStepBuilderProps {
  value: ScoreStepDef[];
  onChange: (steps: ScoreStepDef[]) => void;
  valueCategory?: string;
  readOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ScoreStepBuilder({
  value,
  onChange,
  valueCategory,
  readOnly = false,
}: ScoreStepBuilderProps) {
  const warnings = useMemo(() => validateSteps(value), [value]);
  const segments = useMemo(() => buildBarSegments(value), [value]);

  /* ---- Mutation helpers ------------------------------------------- */

  const updateStep = (index: number, field: keyof ScoreStepDef, raw: string) => {
    const next = [...value];
    if (field === "max_value") {
      next[index] = {
        ...next[index],
        max_value: raw === "" ? null : Number(raw),
      };
    } else {
      next[index] = { ...next[index], [field]: Number(raw) };
    }
    onChange(next);
  };

  const addStep = () => {
    const last = value[value.length - 1];
    const newMin = last ? (last.max_value ?? last.min_value + 1) : 0;
    onChange([...value, { min_value: newMin, max_value: null, score: 0 }]);
  };

  const removeStep = (index: number) => {
    if (value.length <= 1) return;
    onChange(value.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const handleTemplateSelect = (steps: ScoreStepDef[]) => {
    onChange(steps);
  };

  /* ---- Total range for bar ---------------------------------------- */
  const totalRange = useMemo(() => {
    if (segments.length === 0) return 1;
    const maxEnd = Math.max(...segments.map((s) => s.end));
    return maxEnd || 1;
  }, [segments]);

  /* ------------------------------------------------------------------ */
  return (
    <div className="flex flex-col gap-2">
      {/* ---- Visual Range Bar ---- */}
      {value.length > 0 && (
        <div className="h-8 flex rounded overflow-hidden border border-border">
          {segments.map((seg, i) => {
            const width = ((seg.end - seg.start) / totalRange) * 100;
            if (seg.kind === "gap") {
              return (
                <div
                  key={`gap-${i}`}
                  style={{ width: `${Math.max(width, 2)}%` }}
                  className="flex items-center justify-center border-x border-dashed border-border bg-surface"
                  title={`Gap: ${seg.start} - ${seg.end}`}
                >
                  <span className="text-[9px] text-muted">GAP</span>
                </div>
              );
            }
            if (seg.kind === "overlap") {
              return (
                <div
                  key={`overlap-${i}`}
                  style={{
                    width: `${Math.max(width, 2)}%`,
                    background:
                      "repeating-linear-gradient(45deg, #ef444433, #ef444433 2px, #ef444411 2px, #ef444411 4px)",
                  }}
                  className="flex items-center justify-center"
                  title={`Overlap: ${seg.start} - ${seg.end}`}
                >
                  <span className="text-[9px] text-red-400 font-medium">OVR</span>
                </div>
              );
            }
            // Normal step segment
            return (
              <div
                key={`step-${i}`}
                style={{
                  width: `${Math.max(width, 4)}%`,
                  backgroundColor: scoreColor(seg.score ?? 0),
                  opacity: 0.8,
                }}
                className="flex items-center justify-center transition-all"
                title={`${seg.start} - ${seg.end === seg.start + 10 && value.find((s) => s.min_value === seg.start)?.max_value === null ? "\u221e" : seg.end} \u2192 score ${seg.score}`}
              >
                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                  {seg.score}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Editable Table ---- */}
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted border-b border-border">
              {!readOnly && <th className="py-1 px-1 text-left w-12">Move</th>}
              <th className="py-1 px-1 text-left">Min Value</th>
              <th className="py-1 px-1 text-left">Max Value</th>
              <th className="py-1 px-1 text-left">Score</th>
              {!readOnly && <th className="py-1 px-1 text-center w-8" />}
            </tr>
          </thead>
          <tbody>
            {value.map((step, index) => (
              <tr key={index} className="border-b border-border/50">
                {!readOnly && (
                  <td className="py-1 px-1">
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveStep(index, -1)}
                        disabled={index === 0}
                        className="px-1 text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                        title="Move up"
                      >
                        &uarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(index, 1)}
                        disabled={index === value.length - 1}
                        className="px-1 text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                        title="Move down"
                      >
                        &darr;
                      </button>
                    </div>
                  </td>
                )}
                <td className="py-1 px-1">
                  {readOnly ? (
                    <span className="text-foreground">{step.min_value}</span>
                  ) : (
                    <input
                      type="number"
                      value={step.min_value}
                      onChange={(e) => updateStep(index, "min_value", e.target.value)}
                      className="w-20 bg-surface border border-border rounded px-1 py-0.5 text-foreground outline-none focus:border-accent transition-colors"
                    />
                  )}
                </td>
                <td className="py-1 px-1">
                  {readOnly ? (
                    <span className="text-foreground">
                      {step.max_value !== null ? step.max_value : "\u221e"}
                    </span>
                  ) : (
                    <input
                      type="number"
                      value={step.max_value ?? ""}
                      onChange={(e) => updateStep(index, "max_value", e.target.value)}
                      placeholder="\u221e"
                      className="w-20 bg-surface border border-border rounded px-1 py-0.5 text-foreground placeholder:text-muted/60 outline-none focus:border-accent transition-colors"
                    />
                  )}
                </td>
                <td className="py-1 px-1">
                  {readOnly ? (
                    <span className={scoreColorClass(step.score)}>{step.score}</span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={step.score}
                      onChange={(e) => updateStep(index, "score", e.target.value)}
                      className="w-20 bg-surface border border-border rounded px-1 py-0.5 text-foreground outline-none focus:border-accent transition-colors"
                    />
                  )}
                </td>
                {!readOnly && (
                  <td className="py-1 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      disabled={value.length <= 1}
                      className="text-muted hover:text-red-400 disabled:opacity-30 transition-colors"
                      title="Remove tier"
                    >
                      &times;
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Toolbar ---- */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addStep}
            className="text-xs px-2 py-1 border border-dashed border-border rounded hover:border-accent text-muted hover:text-accent transition-colors"
          >
            + Add Tier
          </button>
          <ScoreTemplatePicker
            onSelect={handleTemplateSelect}
            valueCategory={valueCategory}
            currentSteps={value}
            onSaveNew={(t) => {
              // Delegate to store — the parent using ScoreStepBuilder can wire this up
              // For now we pass through the onSaveNew from the picker
              void t;
            }}
          />
        </div>
      )}

      {/* ---- Validation Warnings ---- */}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {warnings.map((w, i) => (
            <span key={i} className="text-xs text-amber-400 mt-0.5">
              {w.type === "gap" && "\u26A0"}{" "}
              {w.type === "overlap" && "\u26D4"}{" "}
              {w.type === "non-monotonic" && "\u2139"}{" "}
              {w.message}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
