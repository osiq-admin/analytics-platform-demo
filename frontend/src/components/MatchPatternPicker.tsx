import { useState, useEffect, useCallback, useRef } from "react";
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
import { useMetadataStore, type MatchPatternDef } from "../stores/metadataStore.ts";
import SuggestionInput from "./SuggestionInput.tsx";
import LoadingSpinner from "./LoadingSpinner.tsx";

interface MatchKeyInfo {
  key: string;
  entity: string;
  type: string;
  domain_values: string[];
  description: string;
}

interface MatchPatternPickerProps {
  onSelect: (match: Record<string, string>) => void;
  onSaveNew?: (pattern: { label: string; description: string; match: Record<string, string> }) => void;
  currentMatch?: Record<string, string>;
  className?: string;
}

interface CriteriaRow {
  id: number;
  key: string;
  value: string;
}

export default function MatchPatternPicker({
  onSelect,
  onSaveNew,
  currentMatch,
  className,
}: MatchPatternPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"existing" | "create">("existing");
  const [search, setSearch] = useState("");
  const [matchKeys, setMatchKeys] = useState<MatchKeyInfo[]>([]);
  const [criteria, setCriteria] = useState<CriteriaRow[]>([
    { id: 1, key: "", value: "" },
  ]);
  const [saveAsPattern, setSaveAsPattern] = useState(false);
  const [patternLabel, setPatternLabel] = useState("");
  const [patternDescription, setPatternDescription] = useState("");
  const nextId = useRef(2);

  const { matchPatterns, fetchMatchPatterns } = useMetadataStore();

  // Floating UI setup
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

  // Fetch patterns and match keys on mount
  useEffect(() => {
    if (open) {
      fetchMatchPatterns();
      fetch("/api/metadata/domain-values/match-keys")
        .then((r) => (r.ok ? r.json() : { match_keys: [] }))
        .then((data) => setMatchKeys(data.match_keys || []))
        .catch(() => setMatchKeys([]));
    }
  }, [open, fetchMatchPatterns]);

  // Filter patterns by search
  const filteredPatterns = matchPatterns.filter(
    (p) =>
      !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      Object.entries(p.match).some(
        ([k, v]) =>
          k.toLowerCase().includes(search.toLowerCase()) ||
          v.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  // Get match key info for a given key
  const getMatchKeyInfo = useCallback(
    (key: string): MatchKeyInfo | undefined => matchKeys.find((mk) => mk.key === key),
    [matchKeys],
  );

  // Match key names as suggestions
  const matchKeyNames = matchKeys.map((mk) => mk.key);

  // Handle criteria changes
  const updateCriteria = (id: number, field: "key" | "value", val: string) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
    );
  };

  const addCriteria = () => {
    setCriteria((prev) => [...prev, { id: nextId.current++, key: "", value: "" }]);
  };

  const removeCriteria = (id: number) => {
    setCriteria((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
  };

  // Build match dict from criteria
  const buildMatch = (): Record<string, string> => {
    const match: Record<string, string> = {};
    for (const c of criteria) {
      if (c.key && c.value) {
        match[c.key] = c.value;
      }
    }
    return match;
  };

  const handleUsePattern = (pattern: MatchPatternDef) => {
    onSelect(pattern.match);
    setOpen(false);
  };

  const handleApply = () => {
    const match = buildMatch();
    if (Object.keys(match).length === 0) return;
    onSelect(match);
    if (saveAsPattern && onSaveNew && patternLabel.trim()) {
      onSaveNew({
        label: patternLabel.trim(),
        description: patternDescription.trim(),
        match,
      });
    }
    setOpen(false);
  };

  // Reset create form when panel opens
  useEffect(() => {
    if (open) {
      setCriteria([{ id: 1, key: "", value: "" }]);
      nextId.current = 2;
      setSaveAsPattern(false);
      setPatternLabel("");
      setPatternDescription("");
      setSearch("");
    }
  }, [open]);

  // Count current match criteria for button label
  const currentMatchCount = currentMatch ? Object.keys(currentMatch).length : 0;

  return (
    <div className={clsx("inline-block", className)}>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        className="px-2 py-1 text-xs border border-border rounded hover:bg-accent/10 text-foreground transition-colors"
      >
        {currentMatchCount > 0
          ? `Match (${currentMatchCount})`
          : "Pick Pattern..."}
      </button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 bg-surface-elevated border border-border rounded-lg shadow-xl p-4 w-[400px] max-h-[500px] overflow-auto"
            >
              {/* Tabs */}
              <div className="flex border-b border-border mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("existing")}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors",
                    activeTab === "existing"
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground",
                  )}
                >
                  Use Existing Pattern
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-medium border-b-2 transition-colors",
                    activeTab === "create"
                      ? "border-accent text-accent"
                      : "border-transparent text-muted hover:text-foreground",
                  )}
                >
                  Create New Match
                </button>
              </div>

              {/* Existing Patterns Tab */}
              {activeTab === "existing" && (
                <div className="flex flex-col gap-2">
                  {/* Search */}
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search patterns..."
                    className="w-full bg-surface border border-border rounded px-2 py-1 text-sm text-foreground placeholder:text-muted/60 outline-none focus:border-accent transition-colors"
                  />

                  {/* Pattern list */}
                  {matchPatterns.length === 0 && (
                    <div className="flex items-center justify-center py-4">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-xs text-muted">Loading patterns...</span>
                    </div>
                  )}

                  {matchPatterns.length > 0 && filteredPatterns.length === 0 && (
                    <div className="text-xs text-muted text-center py-3">
                      No patterns match "{search}"
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 max-h-[320px] overflow-auto">
                    {filteredPatterns.map((pattern) => (
                      <div
                        key={pattern.pattern_id}
                        className="p-2 border border-border rounded hover:border-accent/50 cursor-pointer transition-colors group"
                        onClick={() => handleUsePattern(pattern)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {pattern.label}
                          </span>
                          <span
                            className={clsx(
                              "inline-flex px-1.5 py-0.5 text-[10px] rounded",
                              pattern.layer === "oob"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-accent/10 text-accent",
                            )}
                          >
                            {pattern.layer === "oob" ? "OOB" : "User"}
                          </span>
                        </div>
                        {pattern.description && (
                          <p className="text-xs text-muted mb-1.5 line-clamp-2">
                            {pattern.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mb-1">
                          {Object.entries(pattern.match).map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-flex px-1.5 py-0.5 text-[10px] rounded bg-accent/10 text-accent"
                            >
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted">
                            Used in {pattern.usage_count} override{pattern.usage_count !== 1 ? "s" : ""}
                          </span>
                          <span className="text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to use
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Match Tab */}
              {activeTab === "create" && (
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] text-muted">
                    Build a match pattern by adding key-value criteria.
                  </p>

                  {/* Criteria rows */}
                  <div className="flex flex-col gap-2">
                    {criteria.map((c) => {
                      const mkInfo = getMatchKeyInfo(c.key);
                      return (
                        <div key={c.id} className="flex items-start gap-1.5">
                          <div className="flex-1 min-w-0">
                            <SuggestionInput
                              value={c.key}
                              onChange={(val) =>
                                updateCriteria(
                                  c.id,
                                  "key",
                                  Array.isArray(val) ? val[0] || "" : val,
                                )
                              }
                              suggestions={matchKeyNames}
                              placeholder="Select key..."
                              allowFreeform={false}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <SuggestionInput
                              value={c.value}
                              onChange={(val) =>
                                updateCriteria(
                                  c.id,
                                  "value",
                                  Array.isArray(val) ? val[0] || "" : val,
                                )
                              }
                              entityId={mkInfo?.entity}
                              fieldName={mkInfo?.key}
                              suggestions={
                                !mkInfo?.entity && mkInfo?.domain_values?.length
                                  ? mkInfo.domain_values
                                  : undefined
                              }
                              placeholder="Select value..."
                              allowFreeform={true}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCriteria(c.id)}
                            className="shrink-0 mt-1 px-1.5 py-0.5 text-xs text-muted hover:text-red-400 transition-colors"
                            title="Remove criteria"
                          >
                            x
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={addCriteria}
                    className="text-xs text-accent hover:text-accent/80 self-start transition-colors"
                  >
                    + Add Criteria
                  </button>

                  {/* Preview */}
                  {Object.keys(buildMatch()).length > 0 && (
                    <div className="bg-surface border border-border rounded p-2">
                      <p className="text-[10px] text-muted mb-1 uppercase tracking-wider font-medium">
                        Preview
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(buildMatch()).map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-flex px-1.5 py-0.5 text-[10px] rounded bg-accent/10 text-accent"
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save as pattern option */}
                  {onSaveNew && (
                    <div className="border-t border-border pt-2">
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAsPattern}
                          onChange={(e) => setSaveAsPattern(e.target.checked)}
                          className="accent-accent"
                        />
                        Save as reusable pattern
                      </label>

                      {saveAsPattern && (
                        <div className="mt-2 flex flex-col gap-1.5">
                          <input
                            type="text"
                            value={patternLabel}
                            onChange={(e) => setPatternLabel(e.target.value)}
                            placeholder="Pattern label..."
                            className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted/60 outline-none focus:border-accent transition-colors"
                          />
                          <input
                            type="text"
                            value={patternDescription}
                            onChange={(e) => setPatternDescription(e.target.value)}
                            placeholder="Description (optional)..."
                            className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted/60 outline-none focus:border-accent transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Apply button */}
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={Object.keys(buildMatch()).length === 0}
                    className={clsx(
                      "w-full py-1.5 text-xs font-medium rounded transition-colors",
                      Object.keys(buildMatch()).length > 0
                        ? "bg-accent text-white hover:bg-accent/90"
                        : "bg-surface text-muted cursor-not-allowed",
                    )}
                  >
                    {saveAsPattern ? "Apply & Save Pattern" : "Apply Match"}
                  </button>
                </div>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
