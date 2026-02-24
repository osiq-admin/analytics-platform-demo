import type { ReactNode } from "react";

interface WidgetContainerProps {
  id: string;
  title: string;
  children: ReactNode;
  visible: boolean;
  onToggle: () => void;
  chartTypeSwitcher?: ReactNode;
  dataTour?: string;
}

export default function WidgetContainer({
  id,
  title,
  children,
  visible,
  onToggle,
  chartTypeSwitcher,
  dataTour,
}: WidgetContainerProps) {
  if (!visible) {
    return (
      <div
        className="rounded border border-border bg-surface/60 flex items-center"
        data-widget={id}
        {...(dataTour ? { "data-tour": dataTour } : {})}
      >
        <div className="h-8 w-full flex items-center justify-between px-3">
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">
            {title}
          </span>
          <button
            onClick={onToggle}
            title="Show widget"
            className="text-muted hover:text-foreground transition-colors p-0.5"
          >
            {/* Eye-off icon (hidden state) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded border border-border bg-surface flex flex-col overflow-hidden"
      data-widget={id}
      {...(dataTour ? { "data-tour": dataTour } : {})}
    >
      <div className="h-8 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface-elevated">
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {chartTypeSwitcher}
          <button
            onClick={onToggle}
            title="Hide widget"
            className="text-muted hover:text-foreground transition-colors p-0.5"
          >
            {/* Eye icon (visible state) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {children}
      </div>
    </div>
  );
}
