import { clsx } from "clsx";
import type { ReactNode } from "react";
import HelpButton from "./HelpButton.tsx";

interface PanelProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
  tooltip?: string;
  /** data-tour attribute for tour targeting */
  dataTour?: string;
}

export default function Panel({
  title,
  children,
  actions,
  className,
  noPadding,
  tooltip,
  dataTour,
}: PanelProps) {
  return (
    <div
      className={clsx(
        "rounded border border-border bg-surface flex flex-col overflow-hidden",
        className
      )}
      {...(dataTour ? { "data-tour": dataTour } : {})}
    >
      <div className="h-8 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface-elevated">
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide flex items-center gap-1.5">
          {title}
          {tooltip && <HelpButton text={tooltip} placement="right" />}
        </span>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      <div className={clsx("flex-1 overflow-auto", !noPadding && "p-3")}>
        {children}
      </div>
    </div>
  );
}
