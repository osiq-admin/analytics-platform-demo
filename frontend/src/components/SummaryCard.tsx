interface SummaryCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

export default function SummaryCard({ label, value, subtitle }: SummaryCardProps) {
  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {subtitle && (
        <div className="text-[11px] text-muted mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}
