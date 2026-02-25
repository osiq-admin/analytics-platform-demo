import { useEffect, useRef, useState, useCallback } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  FloatingPortal,
  type Placement,
} from "@floating-ui/react";
import { useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import type { TourMode, ScenarioStep } from "../../stores/tourStore.ts";

// ---------------------------------------------------------------------------
// StepOverlay — Enhanced spotlight + popover for scenario steps
// ---------------------------------------------------------------------------
// Features over base TourOverlay:
//   - Mode toggle (Watch / Try) in header
//   - Auto-play indicator + pause button (watch mode)
//   - Hint button + validation status (try mode)
//   - Step counter with progress bar
//   - Expandable detail section
// ---------------------------------------------------------------------------

interface StepOverlayProps {
  step: ScenarioStep;
  stepIndex: number;
  totalSteps: number;
  mode: TourMode;
  isAutoPlaying: boolean;
  isValidated?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onToggleAutoPlay: () => void;
  onModeChange: (mode: TourMode) => void;
  onReplay?: () => void;
}

export default function StepOverlay({
  step,
  stepIndex,
  totalSteps,
  mode,
  isAutoPlaying,
  isValidated = false,
  onNext,
  onPrev,
  onSkip,
  onToggleAutoPlay,
  onModeChange,
  onReplay,
}: StepOverlayProps) {
  const navigate = useNavigate();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const rafRef = useRef<number>(0);

  const placement = (step.placement as Placement) ?? "bottom";

  const { refs, floatingStyles } = useFloating({
    placement,
    middleware: [offset(14), flip(), shift({ padding: 12 })],
  });

  // Navigate + find target element
  const syncTarget = useCallback(() => {
    if (!step) return;

    if (step.route) {
      navigate(step.route);
    }

    const find = () => {
      const el = document.querySelector(step.target);
      if (el) {
        refs.setReference(el);
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    find();
    const timer = setTimeout(find, 200);
    return () => clearTimeout(timer);
  }, [step, navigate, refs]);

  useEffect(() => {
    return syncTarget();
  }, [syncTarget]);

  // Track scroll/resize to keep spotlight accurate
  useEffect(() => {
    if (!step) return;
    const update = () => {
      const el = document.querySelector(step.target);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(rafRef.current);
    };
  }, [step]);

  // Reset hint when step changes
  useEffect(() => {
    setShowHint(false);
    setExpanded(false);
  }, [stepIndex]);

  const pad = 6;
  const progressPct = ((stepIndex + 1) / totalSteps) * 100;
  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <FloatingPortal>
      {/* Backdrop with spotlight cutout */}
      <div className="fixed inset-0 z-[9998]" onClick={onSkip}>
        <svg className="w-full h-full">
          <defs>
            <mask id="scenario-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - pad}
                  y={targetRect.top - pad}
                  width={targetRect.width + pad * 2}
                  height={targetRect.height + pad * 2}
                  rx={6}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#scenario-mask)"
          />
        </svg>
      </div>

      {/* Spotlight ring */}
      {targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-md ring-2 ring-accent"
          style={{
            left: targetRect.left - pad,
            top: targetRect.top - pad,
            width: targetRect.width + pad * 2,
            height: targetRect.height + pad * 2,
          }}
        />
      )}

      {/* Popover */}
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="z-[10000] w-[340px] bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-border/40">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Header — mode toggle + step counter */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          {/* Mode toggle */}
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => onModeChange("watch")}
              className={clsx(
                "px-2 py-0.5 text-[10px] font-medium transition-colors",
                mode === "watch"
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              )}
            >
              Watch
            </button>
            <button
              onClick={() => onModeChange("try")}
              className={clsx(
                "px-2 py-0.5 text-[10px] font-medium transition-colors",
                mode === "try"
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              )}
            >
              Try It
            </button>
          </div>

          {/* Step counter + auto-play indicator */}
          <div className="flex items-center gap-2">
            {mode === "watch" && (
              <button
                onClick={onToggleAutoPlay}
                className={clsx(
                  "flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border transition-colors",
                  isAutoPlaying
                    ? "border-accent/50 text-accent"
                    : "border-border text-muted hover:text-foreground"
                )}
                title={isAutoPlaying ? "Pause auto-play" : "Resume auto-play"}
              >
                <span className="text-[10px]">
                  {isAutoPlaying ? "\u275A\u275A" : "\u25B6"}
                </span>
                <span>{isAutoPlaying ? "Playing" : "Paused"}</span>
              </button>
            )}
            {mode === "try" && isValidated && (
              <span className="text-[10px] text-green-400 font-medium">
                Done
              </span>
            )}
            <span className="text-[10px] text-muted tabular-nums">
              {stepIndex + 1}/{totalSteps}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 pb-1 pt-1">
          <div className="text-sm font-semibold text-foreground mb-1">
            {step.title}
          </div>
          <p className="text-xs text-foreground/70 leading-relaxed">
            {step.content}
          </p>

          {/* Expandable detail: action info */}
          {step.action && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1.5 text-[10px] text-accent hover:text-accent/80 transition-colors"
            >
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}
          {expanded && step.action && (
            <div className="mt-1 p-2 rounded bg-surface-elevated border border-border text-[10px] text-muted">
              <span className="font-medium text-foreground">Action:</span>{" "}
              {step.action}
              {step.actionTarget && (
                <>
                  {" "}on <code className="text-accent">{step.actionTarget}</code>
                </>
              )}
              {step.actionValue && (
                <>
                  {" "}= <code className="text-accent">{step.actionValue}</code>
                </>
              )}
            </div>
          )}

          {/* Hint (try mode) */}
          {mode === "try" && step.hint && (
            <div className="mt-2">
              {showHint ? (
                <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-[11px] text-yellow-200 leading-relaxed">
                  <span className="font-semibold">Hint:</span> {step.hint}
                </div>
              ) : (
                <button
                  onClick={() => setShowHint(true)}
                  className="text-[10px] text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Need a hint?
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer — navigation buttons */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onSkip}
              className="px-2 py-1 text-[11px] text-muted hover:text-foreground transition-colors"
            >
              Skip
            </button>
            {onReplay && (
              <button
                onClick={onReplay}
                className="px-2 py-1 text-[11px] text-muted hover:text-foreground transition-colors"
                title="Replay current step"
              >
                Replay
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            {stepIndex > 0 && (
              <button
                onClick={onPrev}
                className="px-2 py-1 text-[11px] rounded border border-border hover:bg-surface-elevated transition-colors"
              >
                Prev
              </button>
            )}
            <button
              onClick={onNext}
              disabled={mode === "try" && step.validation != null && !isValidated}
              className={clsx(
                "px-2.5 py-1 text-[11px] rounded transition-colors",
                mode === "try" && step.validation != null && !isValidated
                  ? "bg-accent/40 text-white/50 cursor-not-allowed"
                  : "bg-accent text-white hover:bg-accent/90"
              )}
            >
              {isLastStep ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
}
