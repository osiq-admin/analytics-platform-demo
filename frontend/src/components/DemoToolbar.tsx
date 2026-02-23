import { useEffect } from "react";
import { useDemoStore } from "../stores/demoStore.ts";
import { useTourStore } from "../stores/tourStore.ts";
import StatusBadge from "./StatusBadge.tsx";

export default function DemoToolbar() {
  const {
    current_checkpoint,
    checkpoints,
    loading,
    fetchState,
    reset,
    step,
    skipToEnd,
    jumpTo,
  } = useDemoStore();

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const currentIndex = checkpoints.indexOf(current_checkpoint);
  const progress =
    checkpoints.length > 1
      ? Math.round((currentIndex / (checkpoints.length - 1)) * 100)
      : 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Current state */}
      <StatusBadge label={current_checkpoint} variant="info" />

      {/* Progress bar */}
      <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <button
        onClick={() => { void reset(); }}
        disabled={loading}
        className="px-1.5 py-0.5 rounded border border-border text-muted hover:text-foreground hover:border-foreground/30 disabled:opacity-50 transition-colors"
        title="Reset to pristine"
      >
        Reset
      </button>

      <button
        onClick={() => { void step(); }}
        disabled={loading}
        className="px-1.5 py-0.5 rounded border border-accent text-accent hover:bg-accent/10 disabled:opacity-50 transition-colors"
        title="Advance one step"
      >
        Step
      </button>

      <button
        onClick={() => { void skipToEnd(); }}
        disabled={loading}
        className="px-1.5 py-0.5 rounded border border-border text-muted hover:text-foreground hover:border-foreground/30 disabled:opacity-50 transition-colors"
        title="Skip to end"
      >
        End
      </button>

      {/* Guide button */}
      <GuideButton />

      {/* Act jumps */}
      {checkpoints.includes("act1_complete") && (
        <button
          onClick={() => { void jumpTo("act1_complete"); }}
          disabled={loading}
          className="px-1.5 py-0.5 rounded border border-border text-muted hover:text-foreground disabled:opacity-50 transition-colors"
        >
          Act 1
        </button>
      )}
      {checkpoints.includes("act2_complete") && (
        <button
          onClick={() => { void jumpTo("act2_complete"); }}
          disabled={loading}
          className="px-1.5 py-0.5 rounded border border-border text-muted hover:text-foreground disabled:opacity-50 transition-colors"
        >
          Act 2
        </button>
      )}
    </div>
  );
}

function GuideButton() {
  const { startTour, activeTour, definitions } = useTourStore();
  const current = useDemoStore((s) => s.current_checkpoint);

  const handleGuide = () => {
    if (activeTour) return;
    // Pick guide based on demo state
    if (current.includes("act2") && definitions["act2_guide"]) {
      startTour("act2_guide");
    } else if (current.includes("act3") && definitions["act3_guide"]) {
      startTour("act3_guide");
    } else if (definitions["act1_guide"]) {
      startTour("act1_guide");
    }
  };

  if (!definitions["act1_guide"]) return null;

  return (
    <button
      onClick={handleGuide}
      className="px-1.5 py-0.5 rounded border border-accent/50 text-accent hover:bg-accent/10 transition-colors"
      title="Start guided workflow for current demo act"
    >
      Guide
    </button>
  );
}
