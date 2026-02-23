import { useState } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

interface ResolveResult {
  setting_id: string;
  value: unknown;
  matched_override: { match: Record<string, string>; value: unknown; priority: number } | null;
  why: string;
}

interface OverrideEditorProps {
  settingId: string;
  valueType: string;
}

export default function OverrideEditor({ settingId, valueType }: OverrideEditorProps) {
  const [context, setContext] = useState<Record<string, string>>({
    asset_class: "",
    product_id: "",
  });
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    setLoading(true);
    setError(null);
    try {
      // Filter out empty context values
      const filteredContext = Object.fromEntries(
        Object.entries(context).filter(([, v]) => v.trim() !== "")
      );
      const data = await api.post<ResolveResult>(
        `/metadata/settings/${settingId}/resolve`,
        { context: filteredContext }
      );
      setResult(data);
    } catch (e) {
      setError(String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Resolution Tester">
      <div className="space-y-3 text-xs">
        <p className="text-muted">
          Test how setting <span className="text-accent">{settingId}</span> ({valueType}) resolves for a given entity context.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-muted">Asset Class</span>
            <input
              className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
              value={context.asset_class}
              onChange={(e) => setContext({ ...context, asset_class: e.target.value })}
              placeholder="e.g. equity"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted">Product ID</span>
            <input
              className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
              value={context.product_id}
              onChange={(e) => setContext({ ...context, product_id: e.target.value })}
              placeholder="e.g. AAPL"
            />
          </label>
        </div>

        <button
          onClick={handleResolve}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-accent text-white text-xs font-medium hover:bg-accent/80 disabled:opacity-50"
        >
          {loading ? "Resolving..." : "Resolve"}
        </button>

        {error && <p className="text-destructive">{error}</p>}

        {result && (
          <div className="space-y-2 p-2 rounded border border-border bg-surface">
            <div className="flex items-center gap-2">
              <span className="text-muted">Resolved Value:</span>
              <span className="font-mono font-medium">{JSON.stringify(result.value)}</span>
              <StatusBadge
                label={result.matched_override ? "override" : "default"}
                variant={result.matched_override ? "success" : "info"}
              />
            </div>
            <div>
              <span className="text-muted">Why: </span>
              <span>{result.why}</span>
            </div>
            {result.matched_override && (
              <div>
                <span className="text-muted">Match: </span>
                <span className="font-mono">
                  {Object.entries(result.matched_override.match).map(([k, v]) => `${k}=${v}`).join(", ")}
                </span>
                <span className="text-muted ml-2">(priority {result.matched_override.priority})</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
