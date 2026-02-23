import Panel from "../../components/Panel.tsx";

interface SourcePreviewProps {
  columns: string[];
}

export default function SourcePreview({ columns }: SourcePreviewProps) {
  return (
    <Panel title="Source Columns">
      {columns.length === 0 ? (
        <p className="text-muted text-xs">No source data loaded.</p>
      ) : (
        <ul className="space-y-1">
          {columns.map((col) => (
            <li
              key={col}
              className="px-2 py-1 text-xs rounded bg-background border border-border cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", col);
                e.dataTransfer.effectAllowed = "link";
              }}
            >
              {col}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
