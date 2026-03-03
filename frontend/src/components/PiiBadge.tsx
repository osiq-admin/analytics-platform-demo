import { clsx } from "clsx";

interface PiiBadgeProps {
  classification: string;
  masked: boolean;
  compact?: boolean;
  className?: string;
}

const classificationColors: Record<string, string> = {
  HIGH: "bg-destructive/15 text-destructive border-destructive/30",
  MEDIUM: "bg-warning/15 text-warning border-warning/30",
  LOW: "bg-success/15 text-success border-success/30",
};

export default function PiiBadge({
  classification,
  masked,
  compact = false,
  className,
}: PiiBadgeProps) {
  const colors =
    classificationColors[classification.toUpperCase()] ??
    "bg-muted/10 text-muted border-muted/20";

  const label = compact
    ? classification[0]
    : `${classification} ${masked ? "Masked" : "Visible"}`;

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded border font-medium",
        compact
          ? "px-1 py-0 text-[9px]"
          : "px-1.5 py-0.5 text-[10px] gap-1",
        colors,
        className
      )}
      title={`PII: ${classification} — ${masked ? "Masked" : "Visible to current role"}`}
    >
      {!compact && masked && (
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7 7 0 0 0-2.79.588l.77.771A6 6 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8a13 13 0 0 1-1.64 2.22zM3.093 5.21A13 13 0 0 0 1.172 8a13 13 0 0 0 2.66 2.954C5.121 12.332 6.88 13.5 8 13.5c1.195 0 2.354-.584 3.36-1.388l.77.77A7 7 0 0 1 8 14.5C3 14.5 0 9 0 8s1.394-3.583 3.022-5.093zM8 5.5a2.5 2.5 0 0 0-2.277 3.522l3.777-3.777A2.5 2.5 0 0 0 8 5.5m2.241 1.286L6.534 10.493A2.5 2.5 0 0 0 10.241 6.786" />
          <path d="M2 0L14 12" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
      {label}
    </span>
  );
}
