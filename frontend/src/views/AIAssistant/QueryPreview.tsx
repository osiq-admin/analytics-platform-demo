import { useState } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import DataGrid from "../../components/DataGrid.tsx";

interface QueryResult {
  columns?: string[];
  rows?: Record<string, unknown>[];
  row_count?: number;
  error?: string;
}

interface QueryPreviewProps {
  sql: string | null;
  onClear: () => void;
}

export default function QueryPreview({ sql, onClear }: QueryPreviewProps) {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!sql) return null;

  const execute = async () => {
    setLoading(true);
    try {
      const data = await api.post<QueryResult>("/query/execute", { sql });
      setResult(data);
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel
      title="Query Preview"
      className="shrink-0"
      actions={
        <div className="flex items-center gap-1">
          <button
            onClick={execute}
            disabled={loading}
            className="px-2 py-0.5 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Execute"}
          </button>
          <button
            onClick={() => {
              setResult(null);
              onClear();
            }}
            className="px-2 py-0.5 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      }
    >
      <pre className="text-xs bg-background/50 rounded border border-border p-2 mb-2 overflow-x-auto">
        <code>{sql}</code>
      </pre>

      {result?.error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2 mb-2">
          {result.error}
        </div>
      )}

      {result?.columns && result.rows && (
        <div className="h-48">
          <DataGrid
            columnDefs={result.columns.map((c) => ({ field: c, sortable: true, filter: true }))}
            rowData={result.rows}
          />
        </div>
      )}
    </Panel>
  );
}
