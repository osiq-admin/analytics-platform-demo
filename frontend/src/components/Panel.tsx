import { clsx } from "clsx";
import type { ReactNode } from "react";
import HelpButton from "./HelpButton.tsx";

interface PanelProps {
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
  tooltip?: string;
  /** data-tour attribute for tour targeting */
  dataTour?: string;
  /** Show collapse/expand chevron in header */
  collapsible?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Callback when toggled */
  onToggleCollapse?: () => void;
  /** Affects chevron arrow direction */
  collapseDirection?: "left" | "right";
}

export default function Panel({
  title,
  children,
  actions,
  className,
  noPadding,
  tooltip,
  dataTour,
  collapsible,
  collapsed,
  onToggleCollapse,
  collapseDirection = "left",
}: PanelProps) {
  if (collapsed) {
    return (
      <div
        className={clsx(
          "rounded border border-border bg-surface flex flex-col overflow-hidden w-10 shrink-0 transition-all duration-200 cursor-pointer hover:bg-surface-elevated",
          className?.replace(/w-\S+/g, "").replace(/shrink-\S+/g, "")
        )}
        onClick={onToggleCollapse}
        title={`Expand ${typeof title === "string" ? title : ""}`}
        {...(dataTour ? { "data-tour": dataTour } : {})}
      >
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-foreground/60 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180 select-none">
            {title}
          </span>
        </div>
        <div className="flex items-center justify-center py-2">
          <svg
            className="w-3.5 h-3.5 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {collapseDirection === "right" ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            )}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "rounded border border-border bg-surface flex flex-col overflow-hidden transition-all duration-200",
        className
      )}
      {...(dataTour ? { "data-tour": dataTour } : {})}
    >
      <div className="h-8 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface-elevated">
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide flex items-center gap-1.5">
          {title}
          {tooltip && <HelpButton text={tooltip} placement="right" />}
        </span>
        <div className="flex items-center gap-1">
          {actions}
          {collapsible && (
            <button
              onClick={onToggleCollapse}
              className="text-muted hover:text-foreground transition-colors p-0.5"
              title={`Collapse ${typeof title === "string" ? title : ""}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {collapseDirection === "right" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className={clsx("flex-1 overflow-auto", !noPadding && "p-3")}>
        {children}
      </div>
    </div>
  );
}
