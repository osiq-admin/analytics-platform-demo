interface ChartTypeSwitcherProps {
  chartId: string;
  currentType: string;
  options: string[];
  onChange: (type: string) => void;
}

const LABELS: Record<string, string> = {
  bar: "Bar",
  horizontal_bar: "H-Bar",
  line: "Line",
  pie: "Pie",
  table: "Table",
};

export default function ChartTypeSwitcher({
  chartId,
  currentType,
  options,
  onChange,
}: ChartTypeSwitcherProps) {
  return (
    <select
      id={`chart-type-${chartId}`}
      value={currentType}
      onChange={(e) => onChange(e.target.value)}
      className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-surface text-foreground/80
                 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {LABELS[opt] ?? opt}
        </option>
      ))}
    </select>
  );
}
