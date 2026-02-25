import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import StatusBadge from "./StatusBadge";

interface AICalcReviewProps {
  suggestion: Record<string, unknown>;
  onAccept: () => void;
  onRefine: () => void;
  onReject: () => void;
}

const CONFIDENCE_VARIANT: Record<string, "success" | "warning" | "error"> = {
  high: "success",
  medium: "warning",
  low: "error",
};

const LAYER_VARIANT: Record<string, "info" | "success" | "warning" | "muted"> = {
  transaction: "info",
  time_window: "success",
  aggregation: "warning",
  derived: "muted",
};

export default function AICalcReview({
  suggestion,
  onAccept,
  onRefine,
  onReject,
}: AICalcReviewProps) {
  const confidence = (suggestion.confidence as string) || "medium";
  const layer = (suggestion.layer as string) || "derived";
  const templateType = (suggestion.template_type as string) || "derived";
  const suggestions = (suggestion.suggestions as string[]) || [];
  const dependsOn = (suggestion.depends_on as string[]) || [];
  const name = (suggestion.name as string) || "";
  const valueField = (suggestion.value_field as string) || "";
  const calcId = (suggestion.calc_id as string) || "";

  // Editable JSON in Monaco
  const [jsonValue, setJsonValue] = useState(() =>
    JSON.stringify(suggestion, null, 2)
  );

  // Suggestion checklist state
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Parse the current JSON to detect changes
  const isValidJson = useMemo(() => {
    try {
      JSON.parse(jsonValue);
      return true;
    } catch {
      return false;
    }
  }, [jsonValue]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
            AI-Generated Calculation
          </span>
          <StatusBadge
            label={`AI ${confidence}`}
            variant={CONFIDENCE_VARIANT[confidence] || "warning"}
          />
          <StatusBadge
            label={templateType.replace("_", " ")}
            variant="info"
          />
        </div>
        <span className="text-[10px] text-muted">
          Review and edit before saving
        </span>
      </div>

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Monaco JSON editor */}
        <div className="flex-1 border-r border-border flex flex-col min-w-0">
          <div className="px-3 py-1.5 border-b border-border bg-surface-elevated">
            <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
              Calculation Definition (JSON)
            </span>
          </div>
          <div className="flex-1 monaco-themed">
            <Editor
              language="json"
              theme="vs-dark"
              value={jsonValue}
              onChange={(v) => setJsonValue(v ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 8, bottom: 8 },
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
          {!isValidJson && (
            <div className="px-3 py-1 bg-destructive/10 border-t border-destructive/30 text-[10px] text-destructive">
              Invalid JSON -- fix before saving
            </div>
          )}
        </div>

        {/* Right: Summary + suggestions */}
        <div className="w-72 shrink-0 flex flex-col overflow-y-auto p-3 gap-3 bg-surface">
          {/* Key fields */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-semibold text-muted uppercase tracking-wide">
              Summary
            </h4>
            <InfoRow label="Name" value={name} />
            <InfoRow label="Calc ID" value={calcId} />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted w-16 shrink-0">Layer</span>
              <StatusBadge
                label={layer}
                variant={LAYER_VARIANT[layer] || "muted"}
              />
            </div>
            <InfoRow label="Value Field" value={valueField} />
            {dependsOn.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted">Depends On</span>
                <div className="flex flex-wrap gap-1">
                  {dependsOn.map((dep) => (
                    <span
                      key={dep}
                      className="inline-flex items-center rounded bg-surface-elevated border border-border
                                 px-1.5 py-0.5 text-[10px] text-foreground/70"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Suggestions Checklist */}
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-semibold text-muted uppercase tracking-wide">
                AI Suggestions
              </h4>
              <ul className="flex flex-col gap-1">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <input
                      type="checkbox"
                      checked={checkedItems.has(i)}
                      onChange={() => toggleCheck(i)}
                      className="mt-0.5 accent-accent"
                    />
                    <span className="text-[11px] text-foreground/70 leading-tight">
                      {s}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-surface-elevated">
        <button
          type="button"
          className="rounded border border-destructive/30 px-3 py-1.5 text-xs font-medium
                     text-destructive hover:bg-destructive/10 transition-colors"
          onClick={onReject}
        >
          Discard
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-border px-3 py-1.5 text-xs font-medium
                       text-foreground/70 hover:bg-surface-elevated transition-colors"
            onClick={onRefine}
          >
            Refine
          </button>
          <button
            type="button"
            className="rounded bg-accent px-4 py-1.5 text-xs font-medium text-white
                       hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
            onClick={onAccept}
            disabled={!isValidJson}
          >
            Save Calculation
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted w-16 shrink-0">{label}</span>
      <span className="text-[11px] text-foreground/90 truncate">{value}</span>
    </div>
  );
}
