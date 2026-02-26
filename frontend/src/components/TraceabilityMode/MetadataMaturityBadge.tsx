import { clsx } from "clsx";
import type { MetadataMaturity } from "../../data/architectureRegistryTypes.ts";

const MATURITY_CONFIG: Record<
  MetadataMaturity,
  { label: string; color: string }
> = {
  "fully-metadata-driven": {
    label: "Fully Metadata",
    color: "bg-success/15 text-success border-success/30",
  },
  "mostly-metadata-driven": {
    label: "Mostly Metadata",
    color: "bg-accent/15 text-accent border-accent/30",
  },
  mixed: {
    label: "Mixed",
    color: "bg-warning/15 text-warning border-warning/30",
  },
  "code-driven": {
    label: "Code-Driven",
    color: "bg-destructive/15 text-destructive border-destructive/30",
  },
  infrastructure: {
    label: "Infrastructure",
    color: "bg-muted/15 text-muted border-muted/30",
  },
};

export default function MetadataMaturityBadge({
  maturity,
}: {
  maturity: MetadataMaturity;
}) {
  const config = MATURITY_CONFIG[maturity];
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border",
        config.color
      )}
    >
      {config.label}
    </span>
  );
}
