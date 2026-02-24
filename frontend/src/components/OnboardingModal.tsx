import { useState, useEffect } from "react";
import { FloatingPortal } from "@floating-ui/react";
import { useTourStore } from "../stores/tourStore.ts";

const STORAGE_KEY = "onboarding.completed";

export default function OnboardingModal() {
  const [show, setShow] = useState(false);
  const startTour = useTourStore((s) => s.startTour);
  const definitions = useTourStore((s) => s.definitions);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  };

  const handleStartTour = () => {
    dismiss();
    if (definitions["overview"]) {
      startTour("overview");
    }
  };

  return (
    <FloatingPortal>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/50">
        <div className="bg-surface border border-border rounded-lg shadow-2xl w-[420px] p-6">
          <h2 className="text-lg font-bold text-foreground mb-2">
            Welcome to the Analytics Platform
          </h2>
          <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
            This demo showcases a complete trade surveillance risk case management system.
            Walk through four workflow phases:
          </p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {[
              { label: "Define", desc: "Data model & entities" },
              { label: "Configure", desc: "Settings, mappings & OOB layers" },
              { label: "Operate", desc: "Pipeline & SQL" },
              { label: "Investigate", desc: "Alerts & cases" },
            ].map(({ label, desc }) => (
              <div
                key={label}
                className="px-3 py-2 rounded border border-border bg-surface-elevated"
              >
                <div className="text-xs font-semibold text-accent">{label}</div>
                <div className="text-[11px] text-muted">{desc}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={dismiss}
              className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleStartTour}
              className="px-4 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              Start Tour
            </button>
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
}
