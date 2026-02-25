import { useState } from "react";
import { modelExamples, type ModelExample } from "../data/modelExamples.ts";
import { settingsExamples, type SettingExample } from "../data/settingsExamples.ts";
import {
  calculationExamples,
  type CalculationExample,
} from "../data/calculationExamples.ts";

type ExampleType = "model" | "setting" | "calculation";
type AnyExample = ModelExample | SettingExample | CalculationExample;

interface ExamplesDrawerProps {
  open: boolean;
  onClose: () => void;
  onUseAsStartingPoint?: (
    type: ExampleType,
    config: Record<string, unknown>
  ) => void;
}

const tabs: { key: ExampleType; label: string }[] = [
  { key: "model", label: "Models" },
  { key: "setting", label: "Settings" },
  { key: "calculation", label: "Calculations" },
];

function categoryColor(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes("abuse") || lower.includes("insider"))
    return "bg-red-500/15 text-red-400 border-red-500/30";
  if (lower.includes("manipulation"))
    return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  if (lower.includes("threshold"))
    return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (lower.includes("score step"))
    return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  if (lower.includes("score threshold"))
    return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
  if (lower.includes("transaction"))
    return "bg-green-500/15 text-green-400 border-green-500/30";
  if (lower.includes("time window"))
    return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  if (lower.includes("aggregation"))
    return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
  if (lower.includes("derived"))
    return "bg-pink-500/15 text-pink-400 border-pink-500/30";
  return "bg-foreground/10 text-foreground/60 border-foreground/20";
}

function ExampleCard({
  example,
  type,
  onUseAsStartingPoint,
}: {
  example: AnyExample;
  type: ExampleType;
  onUseAsStartingPoint?: (
    type: ExampleType,
    config: Record<string, unknown>
  ) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded border border-border bg-background overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 hover:bg-foreground/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground flex-1">
            {example.name}
          </span>
          <span
            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${categoryColor(
              example.category
            )}`}
          >
            {example.category}
          </span>
          <span className="text-muted text-[10px]">
            {expanded ? "\u25B2" : "\u25BC"}
          </span>
        </div>
        <p className="text-[11px] text-muted mt-1 leading-relaxed">
          {example.description}
        </p>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-3 py-2.5 space-y-3">
          {/* Rationale */}
          <div>
            <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wide mb-1">
              Why this design?
            </div>
            <p className="text-[11px] text-foreground/80 leading-relaxed">
              {example.rationale}
            </p>
          </div>

          {/* Annotated config */}
          <div>
            <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wide mb-1">
              Configuration
            </div>
            <pre className="text-[10px] font-mono bg-surface-elevated border border-border rounded p-2 overflow-x-auto leading-relaxed text-foreground/80">
              {JSON.stringify(example.config, null, 2)}
            </pre>
          </div>

          {/* Annotations */}
          {Object.keys(example.annotations).length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wide mb-1">
                Annotations
              </div>
              <div className="space-y-1.5">
                {Object.entries(example.annotations).map(([key, note]) => (
                  <div key={key} className="flex gap-2 text-[11px]">
                    <code className="shrink-0 px-1 py-0.5 rounded bg-accent/10 text-accent font-mono text-[10px]">
                      {key}
                    </code>
                    <span className="text-foreground/70 leading-relaxed">
                      {note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Use as starting point button */}
          {onUseAsStartingPoint && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUseAsStartingPoint(type, example.config);
              }}
              className="w-full px-3 py-1.5 text-xs rounded font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
            >
              Use as Starting Point
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExamplesDrawer({
  open,
  onClose,
  onUseAsStartingPoint,
}: ExamplesDrawerProps) {
  const [activeTab, setActiveTab] = useState<ExampleType>("model");

  const examples: AnyExample[] =
    activeTab === "model"
      ? modelExamples
      : activeTab === "setting"
      ? settingsExamples
      : calculationExamples;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        } backdrop-blur-sm bg-black/30`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] z-50 bg-surface-elevated border-l border-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-10 shrink-0 flex items-center justify-between px-4 border-b border-border">
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
            Examples & Use Cases
          </span>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors text-sm"
            aria-label="Close examples drawer"
          >
            &#x2715;
          </button>
        </div>

        {/* Tab bar */}
        <div className="h-8 shrink-0 flex items-center border-b border-border bg-surface">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 h-full text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                activeTab === tab.key
                  ? "text-accent border-b-2 border-accent"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {examples.map((ex) => (
            <ExampleCard
              key={ex.id}
              example={ex}
              type={activeTab}
              onUseAsStartingPoint={onUseAsStartingPoint}
            />
          ))}
        </div>
      </div>
    </>
  );
}
