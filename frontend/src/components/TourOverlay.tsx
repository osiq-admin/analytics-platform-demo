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
import { useTourStore } from "../stores/tourStore.ts";

export default function TourOverlay() {
  const navigate = useNavigate();
  const { activeTour, currentStep, definitions, nextStep, prevStep, skipTour } = useTourStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  const tour = activeTour ? definitions[activeTour] : null;
  const step = tour?.steps[currentStep];

  const placement = (step?.placement as Placement) ?? "bottom";

  const { refs, floatingStyles } = useFloating({
    placement,
    middleware: [offset(12), flip(), shift({ padding: 12 })],
  });

  // Navigate to step route if needed, then find and highlight target element
  const syncTarget = useCallback(() => {
    if (!step) return;

    if (step.route) {
      navigate(step.route);
    }

    // Wait a tick for route change + DOM update, then find target
    const find = () => {
      const el = document.querySelector(step.target);
      if (el) {
        refs.setReference(el);
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    // Try immediately, then retry after a short delay for route transitions
    find();
    const timer = setTimeout(find, 200);
    return () => clearTimeout(timer);
  }, [step, navigate, refs]);

  useEffect(() => {
    return syncTarget();
  }, [syncTarget]);

  // Update target rect on scroll/resize
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

  if (!tour || !step) return null;

  const total = tour.steps.length;
  const pad = 6;

  return (
    <FloatingPortal>
      {/* Backdrop — 4 edge overlays around spotlight cutout */}
      {targetRect ? (
        <>
          {/* Top */}
          <div
            className="fixed left-0 top-0 z-[9998] bg-black/50"
            style={{ width: "100%", height: Math.max(0, targetRect.top - pad) }}
            onClick={skipTour}
          />
          {/* Bottom */}
          <div
            className="fixed left-0 z-[9998] bg-black/50"
            style={{
              width: "100%",
              top: targetRect.bottom + pad,
              bottom: 0,
            }}
            onClick={skipTour}
          />
          {/* Left */}
          <div
            className="fixed left-0 z-[9998] bg-black/50"
            style={{
              top: targetRect.top - pad,
              width: Math.max(0, targetRect.left - pad),
              height: targetRect.height + pad * 2,
            }}
            onClick={skipTour}
          />
          {/* Right */}
          <div
            className="fixed z-[9998] bg-black/50"
            style={{
              top: targetRect.top - pad,
              left: targetRect.right + pad,
              right: 0,
              height: targetRect.height + pad * 2,
            }}
            onClick={skipTour}
          />
        </>
      ) : (
        <div className="fixed inset-0 z-[9998] bg-black/50" onClick={skipTour} />
      )}

      {/* Spotlight border */}
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
        className="z-[10000] w-80 bg-surface border border-border rounded-lg shadow-xl p-4"
      >
        <div className="text-sm font-semibold text-foreground mb-1">{step.title}</div>
        <p className="text-xs text-foreground/70 mb-3 leading-relaxed">{step.content}</p>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted">
            {currentStep + 1} of {total}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={skipTour}
              className="px-2 py-1 text-[11px] text-muted hover:text-foreground transition-colors"
            >
              Skip
            </button>
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="px-2 py-1 text-[11px] rounded border border-border hover:bg-surface-elevated transition-colors"
              >
                Prev
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-2.5 py-1 text-[11px] rounded bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              {currentStep === total - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
}
