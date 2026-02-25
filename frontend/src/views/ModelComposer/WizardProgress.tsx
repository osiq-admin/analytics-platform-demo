import { clsx } from "clsx";

interface WizardProgressProps {
  currentStep: number;
  steps: { label: string; icon?: string }[];
  onStepClick?: (step: number) => void;
}

export default function WizardProgress({ currentStep, steps, onStepClick }: WizardProgressProps) {
  return (
    <div className="flex items-center w-full px-2 py-2">
      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isFuture = stepNum > currentStep;

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <button
              type="button"
              onClick={() => onStepClick?.(stepNum)}
              className={clsx(
                "flex flex-col items-center gap-1 group",
                onStepClick && "cursor-pointer",
                !onStepClick && "cursor-default",
              )}
            >
              <div
                className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                  isCompleted && "bg-accent border-accent text-white",
                  isCurrent && "bg-accent/15 border-accent text-accent",
                  isFuture && "bg-surface border-border text-muted",
                  onStepClick && !isFuture && "group-hover:border-accent/70",
                )}
              >
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={clsx(
                  "text-[10px] font-medium whitespace-nowrap transition-colors",
                  isCompleted && "text-accent",
                  isCurrent && "text-accent",
                  isFuture && "text-muted",
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connecting line (not after last step) */}
            {idx < steps.length - 1 && (
              <div className="flex-1 mx-1.5 mt-[-14px]">
                <div
                  className={clsx(
                    "h-0.5 w-full rounded transition-colors",
                    stepNum < currentStep ? "bg-accent" : "bg-border",
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
