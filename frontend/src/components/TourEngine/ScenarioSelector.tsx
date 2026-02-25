import { useState, useMemo } from "react";
import { FloatingPortal } from "@floating-ui/react";
import { clsx } from "clsx";
import {
  useTourStore,
  type ScenarioDefinition,
  type ScenarioCategory,
  type ScenarioDifficulty,
} from "../../stores/tourStore.ts";

// ---------------------------------------------------------------------------
// ScenarioSelector — Full-screen scenario browser overlay
// ---------------------------------------------------------------------------
// Displays scenarios grouped by category with difficulty filter.
// Each card offers both "Watch Demo" and "Try It Yourself" entry points.
// ---------------------------------------------------------------------------

interface ScenarioSelectorProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_META: Record<
  ScenarioCategory,
  { label: string; description: string }
> = {
  settings: {
    label: "Settings & Thresholds",
    description: "Configure scoring thresholds and overrides",
  },
  calculations: {
    label: "Calculations",
    description: "Define and map calculation logic",
  },
  detection_models: {
    label: "Detection Models",
    description: "Compose and deploy detection models",
  },
  use_cases: {
    label: "Use Cases",
    description: "End-to-end surveillance workflows",
  },
  entities: {
    label: "Entities & Data",
    description: "Manage the data model and entity definitions",
  },
  investigation: {
    label: "Investigation",
    description: "Alert triage and risk case workflows",
  },
  admin: {
    label: "Administration",
    description: "System settings, pipeline, and metadata",
  },
};

const CATEGORY_ORDER: ScenarioCategory[] = [
  "entities",
  "settings",
  "calculations",
  "detection_models",
  "use_cases",
  "investigation",
  "admin",
];

const DIFFICULTY_LABELS: Record<ScenarioDifficulty, { label: string; color: string }> = {
  beginner: { label: "Beginner", color: "text-green-400 border-green-400/40" },
  intermediate: { label: "Intermediate", color: "text-yellow-400 border-yellow-400/40" },
  advanced: { label: "Advanced", color: "text-red-400 border-red-400/40" },
};

export default function ScenarioSelector({ open, onClose }: ScenarioSelectorProps) {
  const {
    scenarioDefinitions,
    completedScenarios,
    setMode,
    startScenario,
  } = useTourStore();

  const [difficultyFilter, setDifficultyFilter] = useState<ScenarioDifficulty | "all">("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORY_ORDER)
  );

  // Group scenarios by category with optional difficulty filter
  const grouped = useMemo(() => {
    const scenarios = Object.values(scenarioDefinitions);
    const filtered =
      difficultyFilter === "all"
        ? scenarios
        : scenarios.filter((s) => s.difficulty === difficultyFilter);

    const groups: Partial<Record<ScenarioCategory, ScenarioDefinition[]>> = {};
    for (const s of filtered) {
      (groups[s.category] ??= []).push(s);
    }
    return groups;
  }, [scenarioDefinitions, difficultyFilter]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleStart = (id: string, mode: "watch" | "try") => {
    setMode(mode);
    startScenario(id);
    onClose();
  };

  if (!open) return null;

  const totalScenarios = Object.keys(scenarioDefinitions).length;
  const completedCount = completedScenarios.length;

  return (
    <FloatingPortal>
      <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/60">
        <div className="bg-surface border border-border rounded-xl shadow-2xl w-[720px] max-h-[80vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Guided Scenarios
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {totalScenarios === 0
                    ? "No scenarios available yet"
                    : `${completedCount} of ${totalScenarios} completed`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-elevated text-muted hover:text-foreground transition-colors"
                title="Close"
              >
                x
              </button>
            </div>

            {/* Difficulty filter */}
            <div className="flex gap-1.5">
              {(["all", "beginner", "intermediate", "advanced"] as const).map(
                (d) => (
                  <button
                    key={d}
                    onClick={() => setDifficultyFilter(d)}
                    className={clsx(
                      "px-2.5 py-1 text-[11px] rounded-full border transition-colors",
                      difficultyFilter === d
                        ? "bg-accent/20 border-accent text-accent"
                        : "border-border text-muted hover:text-foreground"
                    )}
                  >
                    {d === "all" ? "All levels" : DIFFICULTY_LABELS[d].label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {totalScenarios === 0 ? (
              <div className="text-center py-12 text-muted text-sm">
                Scenarios will be available after M114-M118 milestones.
              </div>
            ) : (
              CATEGORY_ORDER.map((cat) => {
                const items = grouped[cat];
                if (!items || items.length === 0) return null;
                const meta = CATEGORY_META[cat];
                const isOpen = expandedCategories.has(cat);

                return (
                  <div key={cat} className="mb-3">
                    {/* Category accordion header */}
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center gap-2 w-full text-left py-2 group"
                    >
                      <span
                        className={clsx(
                          "text-[10px] text-muted transition-transform",
                          isOpen && "rotate-90"
                        )}
                      >
                        {"\u25B6"}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted">
                        ({items.length})
                      </span>
                      <span className="text-[10px] text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        {meta.description}
                      </span>
                    </button>

                    {/* Scenario cards */}
                    {isOpen && (
                      <div className="grid gap-2 pl-5">
                        {items.map((s) => (
                          <ScenarioCard
                            key={s.id}
                            scenario={s}
                            isCompleted={completedScenarios.includes(s.id)}
                            onStart={(m) => handleStart(s.id, m)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
}

// ---------------------------------------------------------------------------
// ScenarioCard — Individual scenario entry
// ---------------------------------------------------------------------------

interface ScenarioCardProps {
  scenario: ScenarioDefinition;
  isCompleted: boolean;
  onStart: (mode: "watch" | "try") => void;
}

function ScenarioCard({ scenario, isCompleted, onStart }: ScenarioCardProps) {
  const diff = DIFFICULTY_LABELS[scenario.difficulty];

  return (
    <div
      className={clsx(
        "p-3 rounded-lg border transition-colors",
        isCompleted
          ? "border-green-500/30 bg-green-500/5"
          : "border-border bg-surface-elevated/50 hover:bg-surface-elevated"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isCompleted && (
              <span className="text-green-400 text-xs font-bold" title="Completed">
                {"\u2713"}
              </span>
            )}
            <span className="text-sm font-medium text-foreground truncate">
              {scenario.name}
            </span>
            <span
              className={clsx(
                "px-1.5 py-0.5 text-[9px] font-medium rounded border",
                diff.color
              )}
            >
              {diff.label}
            </span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed line-clamp-2">
            {scenario.description}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] text-muted">
              {scenario.steps.length} steps
            </span>
            <span className="text-[10px] text-muted">
              ~{scenario.estimatedMinutes} min
            </span>
            {scenario.prerequisites && scenario.prerequisites.length > 0 && (
              <span className="text-[10px] text-yellow-400">
                Requires: {scenario.prerequisites.join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Start buttons */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onStart("watch")}
            className="px-3 py-1 text-[11px] rounded bg-accent text-white hover:bg-accent/90 transition-colors whitespace-nowrap"
          >
            Watch Demo
          </button>
          <button
            onClick={() => onStart("try")}
            className="px-3 py-1 text-[11px] rounded border border-accent text-accent hover:bg-accent/10 transition-colors whitespace-nowrap"
          >
            Try It Yourself
          </button>
        </div>
      </div>
    </div>
  );
}
