import { useCallback, useState } from "react";
import { api } from "../api/client";
import LoadingSpinner from "./LoadingSpinner";
import AICalcReview from "./AICalcReview";

interface AICalcBuilderProps {
  onSave?: (calc: Record<string, unknown>) => void;
  onCancel?: () => void;
}

const EXAMPLE_PROMPTS = [
  "Calculate the buy-sell ratio for each product per day",
  "Total trading volume aggregation per account",
  "Rolling 5-day time window for price movement analysis",
  "Detect unusual concentration of orders in a short period",
];

export default function AICalcBuilder({ onSave, onCancel }: AICalcBuilderProps) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Record<string, unknown> | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const result = await api.post<Record<string, unknown>>("/ai/suggest-calculation", {
        description: description.trim(),
      });
      setSuggestion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate calculation");
    } finally {
      setLoading(false);
    }
  }, [description]);

  const handleRefine = useCallback(() => {
    setSuggestion(null);
    setError(null);
  }, []);

  const handleAccept = useCallback(() => {
    if (suggestion && onSave) {
      onSave(suggestion);
    }
  }, [suggestion, onSave]);

  // If we have a suggestion, show the review view
  if (suggestion) {
    return (
      <AICalcReview
        suggestion={suggestion}
        onAccept={handleAccept}
        onRefine={handleRefine}
        onReject={() => {
          setSuggestion(null);
          setDescription("");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          AI Calculation Builder
        </h3>
        <p className="text-xs text-muted">
          Describe a calculation in natural language and the AI will generate a
          metadata-driven definition for you.
        </p>
      </div>

      {/* Description input */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="calc-description"
          className="text-xs font-medium text-foreground/80"
        >
          Calculation Description
        </label>
        <textarea
          id="calc-description"
          className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-foreground
                     placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent
                     resize-none"
          rows={4}
          placeholder="e.g., Calculate the buy-sell ratio for each product per day"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Example prompts */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-medium text-muted uppercase tracking-wide">
          Examples
        </span>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded border border-border bg-surface-elevated px-2 py-1 text-[11px]
                         text-foreground/70 hover:bg-accent/10 hover:border-accent/30
                         transition-colors"
              onClick={() => setDescription(prompt)}
              disabled={loading}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          className="rounded bg-accent px-4 py-1.5 text-xs font-medium text-white
                     hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-2"
          onClick={handleGenerate}
          disabled={loading || !description.trim()}
        >
          {loading && <LoadingSpinner size="sm" />}
          {loading ? "Generating..." : "Generate Calculation"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="rounded border border-border px-4 py-1.5 text-xs font-medium
                       text-foreground/70 hover:bg-surface-elevated transition-colors"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
