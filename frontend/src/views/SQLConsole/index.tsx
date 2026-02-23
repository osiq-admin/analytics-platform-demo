import { useState, useEffect } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import QueryEditor from "./QueryEditor.tsx";
import ResultsGrid from "./ResultsGrid.tsx";

interface Preset {
  name: string;
  sql: string;
}

interface QueryResult {
  columns?: string[];
  rows?: Record<string, unknown>[];
  row_count?: number;
  error?: string;
}

export default function SQLConsole() {
  const [sql, setSql] = useState("SHOW TABLES;");
  const [result, setResult] = useState<QueryResult>({});
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);

  useEffect(() => {
    api.get<Preset[]>("/query/presets").then(setPresets).catch(() => {});
  }, []);

  const execute = () => {
    setLoading(true);
    api
      .post<QueryResult>("/query/execute", { sql })
      .then(setResult)
      .catch((e) => setResult({ error: String(e) }))
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">SQL Console</h2>
        <div className="flex items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => setSql(p.sql)}
              className="px-2 py-1 text-xs rounded border border-border text-muted hover:text-foreground transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <Panel
        title="Query"
        className="h-48 shrink-0"
        noPadding
        actions={
          <button
            onClick={execute}
            disabled={loading}
            className="px-2 py-0.5 text-xs rounded bg-accent text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading ? <LoadingSpinner size="sm" /> : "Run (Ctrl+Enter)"}
          </button>
        }
      >
        <QueryEditor value={sql} onChange={setSql} onExecute={execute} />
      </Panel>

      {/* Error */}
      {result.error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
          {result.error}
        </div>
      )}

      {/* Results */}
      <Panel
        title={`Results${result.row_count != null ? ` (${result.row_count} rows)` : ""}`}
        className="flex-1 min-h-[200px]"
        noPadding
      >
        <ResultsGrid
          columns={result.columns ?? []}
          rows={result.rows ?? []}
        />
      </Panel>
    </div>
  );
}
