import { useState, useEffect } from "react";

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
export function rangeToStartDate(range: string, maxDate?: string): string | undefined {
  if (range === "All") return undefined;
  const base = maxDate ? new Date(maxDate) : new Date();
  const map: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180 };
  const days = map[range] ?? 60;
  base.setDate(base.getDate() - days);
  return base.toISOString().slice(0, 10);
}

/** Hook to fetch the max date from an entity's date range endpoint. */
export function useDataDateRange(entityId: string = "md_eod") {
  const [maxDate, setMaxDate] = useState<string | undefined>();

  useEffect(() => {
    fetch(`/api/data/date-range/${entityId}`)
      .then((r) => r.json())
      .then((data) => {
        const firstField = Object.keys(data.date_ranges || {})[0];
        if (firstField) setMaxDate(data.date_ranges[firstField].max_date);
      })
      .catch(() => {});
  }, [entityId]);

  return maxDate;
}
