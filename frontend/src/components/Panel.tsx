import { clsx } from "clsx";
import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Panel({
  title,
  children,
  actions,
  className,
  noPadding,
}: PanelProps) {
  return (
    <div
      className={clsx(
        "rounded border border-border bg-surface flex flex-col overflow-hidden",
        className
      )}
    >
      <div className="h-8 shrink-0 flex items-center justify-between px-3 border-b border-border bg-surface-elevated">
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
          {title}
        </span>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
      <div className={clsx("flex-1 overflow-auto", !noPadding && "p-3")}>
        {children}
      </div>
    </div>
  );
}
