import { useState, useEffect } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import SuggestionInput from "../../components/SuggestionInput.tsx";

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
  const [matchKeys, setMatchKeys] = useState<Array<{ key: string; entity: string }>>([]);
  const [context, setContext] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/metadata/domain-values/match-keys")
      .then((r) => r.json())
      .then((d) => {
        const raw = (d.match_keys || []) as Array<{ key: string; entity: string }>;
        const uniqueKeys = [...new Set(raw.map((mk) => mk.key))];
        setMatchKeys(raw);
        const initial: Record<string, string> = {};
        uniqueKeys.slice(0, 4).forEach((k) => (initial[k] = ""));
        setContext(initial);
      })
      .catch(() => {
        setMatchKeys([{ key: "asset_class", entity: "product" }, { key: "product_id", entity: "product" }]);
        setContext({ asset_class: "", product_id: "" });
      });
  }, []);

  const contextKeys = Object.keys(context);

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
    <Panel title="Resolution Tester" dataTour="settings-resolver" dataTrace="settings.override-editor" tooltip="Test how a setting resolves for a given entity context">
      <div className="space-y-3 text-xs">
        <p className="text-muted">
          Test how setting <span className="text-accent">{settingId}</span> ({valueType}) resolves for a given entity context.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {contextKeys.map((key) => (
            <SuggestionInput
              key={key}
              value={context[key] || ""}
              onChange={(val) =>
                setContext({ ...context, [key]: Array.isArray(val) ? val[0] || "" : val })
              }
              entityId={matchKeys.find((mk) => mk.key === key)?.entity}
              fieldName={key}
              placeholder={`e.g. ${key === "asset_class" ? "equity" : key === "product_id" ? "AAPL" : ""}`}
              label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              allowFreeform={true}
            />
          ))}
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
