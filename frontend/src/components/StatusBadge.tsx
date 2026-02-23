import { clsx } from "clsx";

type Variant = "success" | "warning" | "error" | "info" | "muted";

interface StatusBadgeProps {
  label: string;
  variant?: Variant;
  className?: string;
}

const styles: Record<Variant, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-info/15 text-info border-info/30",
  muted: "bg-muted/10 text-muted border-muted/20",
};

export default function StatusBadge({
  label,
  variant = "muted",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
        styles[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
