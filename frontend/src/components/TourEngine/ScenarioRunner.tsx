import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTourStore } from "../../stores/tourStore.ts";
import StepOverlay from "./StepOverlay.tsx";

// ---------------------------------------------------------------------------
// ScenarioRunner — Orchestrates dual-mode scenario playback
// ---------------------------------------------------------------------------
// Watch mode:  auto-advances steps, performs auto-actions, narrates.
// Try mode:    shows hints, validates user completed each step.
//
// All behavior is driven by ScenarioDefinition metadata — no per-scenario
// logic is hardcoded here.
// ---------------------------------------------------------------------------

const DEFAULT_DELAY = 2500;

export default function ScenarioRunner() {
  const navigate = useNavigate();
  const {
    activeScenario,
    scenarioStep,
    scenarioDefinitions,
    mode,
    isAutoPlaying,
    setMode,
    nextScenarioStep,
    prevScenarioStep,
    skipScenario,
    toggleAutoPlay,
  } = useTourStore();

  const autoPlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stepValidated, setStepValidated] = useState(false);

  const scenario = activeScenario ? scenarioDefinitions[activeScenario] : null;
  const step = scenario?.steps[scenarioStep];

  // -----------------------------------------------------------------------
  // Validation polling (try mode) — check if validation selector exists
  // -----------------------------------------------------------------------
  useEffect(() => {
    setStepValidated(false);
    if (mode !== "try" || !step?.validation) return;

    const VALIDATION_TIMEOUT = 10_000;
    const startTime = Date.now();
    const poll = setInterval(() => {
      if (document.querySelector(step.validation!)) {
        setStepValidated(true);
        clearInterval(poll);
      } else if (Date.now() - startTime > VALIDATION_TIMEOUT) {
        clearInterval(poll);
        setStepValidated(true); // Allow progression
        console.warn(`[ScenarioRunner] Validation timeout for step: ${step.title}`);
      }
    }, 500);

    return () => clearInterval(poll);
  }, [mode, step, scenarioStep]);

  // -----------------------------------------------------------------------
  // Auto-play: perform actions + advance after delay (watch mode only)
  // -----------------------------------------------------------------------
  const performAutoAction = useCallback(() => {
    if (!step) return;

    // Auto-fill form fields
    if (step.autoFillData) {
      for (const [selector, value] of Object.entries(step.autoFillData)) {
        const el = document.querySelector(selector) as HTMLInputElement | null;
        if (el) {
          // Trigger React-compatible value change
          const nativeSet = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value"
          )?.set;
          if (nativeSet) {
            nativeSet.call(el, value);
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } else {
          console.warn(`[ScenarioRunner] AutoFill target not found: ${selector}`);
        }
      }
    }

    // Perform action
    switch (step.action) {
      case "click": {
        const target = step.actionTarget ?? step.target;
        const el = document.querySelector(target) as HTMLElement | null;
        if (el) {
          el.click();
        } else {
          console.warn(`[ScenarioRunner] Click target not found: ${target}`);
        }
        break;
      }
      case "type": {
        const target = step.actionTarget ?? step.target;
        const el = document.querySelector(target) as HTMLInputElement | null;
        if (el && step.actionValue) {
          const nativeSet = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value"
          )?.set;
          if (nativeSet) {
            nativeSet.call(el, step.actionValue);
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        } else if (!el) {
          console.warn(`[ScenarioRunner] Type target not found: ${target}`);
        }
        break;
      }
      case "select": {
        const target = step.actionTarget ?? step.target;
        const el = document.querySelector(target) as HTMLSelectElement | null;
        if (el && step.actionValue) {
          el.value = step.actionValue;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (!el) {
          console.warn(`[ScenarioRunner] Select target not found: ${target}`);
        }
        break;
      }
      case "navigate": {
        if (step.actionValue) navigate(step.actionValue);
        break;
      }
      case "wait":
      default:
        // No action — just display and wait
        break;
    }
  }, [step, navigate]);

  // Schedule auto-advance when auto-playing
  useEffect(() => {
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }

    if (!isAutoPlaying || mode !== "watch" || !step) return;

    // Perform action first, then schedule advance
    const actionDelay = 400; // brief pause before action for visual effect
    const actionTimer = setTimeout(() => {
      performAutoAction();

      const advanceDelay = step.delay ?? DEFAULT_DELAY;
      autoPlayTimer.current = setTimeout(() => {
        nextScenarioStep();
      }, advanceDelay);
    }, actionDelay);

    return () => {
      clearTimeout(actionTimer);
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
        autoPlayTimer.current = null;
      }
    };
  }, [isAutoPlaying, mode, step, scenarioStep, performAutoAction, nextScenarioStep]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current);
      }
    };
  }, []);

  // -----------------------------------------------------------------------
  // Mode change handler — switching modes mid-scenario
  // -----------------------------------------------------------------------
  const handleModeChange = useCallback(
    (newMode: "watch" | "try") => {
      setMode(newMode);
      // If switching to watch mode, auto-play starts; try mode pauses
      if (newMode === "watch" && !isAutoPlaying) {
        toggleAutoPlay();
      } else if (newMode === "try" && isAutoPlaying) {
        toggleAutoPlay();
      }
    },
    [setMode, isAutoPlaying, toggleAutoPlay]
  );

  // Replay current step (reset auto-play timer)
  const handleReplay = useCallback(() => {
    if (autoPlayTimer.current) {
      clearTimeout(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
    // Re-trigger by toggling autoplay off+on
    if (mode === "watch") {
      if (isAutoPlaying) {
        toggleAutoPlay();
        requestAnimationFrame(() => toggleAutoPlay());
      }
    }
  }, [mode, isAutoPlaying, toggleAutoPlay]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (!scenario || !step) return null;

  return (
    <StepOverlay
      step={step}
      stepIndex={scenarioStep}
      totalSteps={scenario.steps.length}
      mode={mode}
      isAutoPlaying={isAutoPlaying}
      isValidated={stepValidated}
      onNext={nextScenarioStep}
      onPrev={prevScenarioStep}
      onSkip={skipScenario}
      onToggleAutoPlay={toggleAutoPlay}
      onModeChange={handleModeChange}
      onReplay={handleReplay}
    />
  );
}
