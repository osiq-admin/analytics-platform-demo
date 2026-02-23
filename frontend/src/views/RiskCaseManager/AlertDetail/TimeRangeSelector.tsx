interface TimeRangeSelectorProps {
  selected: string;
  onChange: (range: string) => void;
}

const RANGES = ["1W", "1M", "3M", "6M", "All"] as const;

export default function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
            selected === r
              ? "border-accent bg-accent/15 text-accent"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/** Convert a range label to a start_date string (YYYY-MM-DD). */
export function rangeToStartDate(range: string): string | undefined {
  if (range === "All") return undefined;
  const now = new Date();
  const map: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180 };
  const days = map[range] ?? 60;
  now.setDate(now.getDate() - days);
  return now.toISOString().slice(0, 10);
}
