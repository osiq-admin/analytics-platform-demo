import { useState, useCallback, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import DataGrid from "../../../components/DataGrid.tsx";
import { api } from "../../../api/client.ts";
import type { SelectedCalc } from "./SelectCalcsStep.tsx";

interface DryRunAlert {
  row_index: number;
  entity_context: Record<string, string>;
  accumulated_score: number;
  calculation_details: Array<{
    calc_id: string;
    value_field: string;
    computed_value: number;
    strictness: string;
  }>;
  raw_row: Record<string, string | null>;
}

interface DryRunResponse {
  status: string;
  error?: string;
  row_count?: number;
  preview_count?: number;
  columns?: string[];
  alerts: DryRunAlert[];
}

interface TestRunStepProps {
  modelId: string;
  query: string;
  name: string;
  description: string;
  timeWindow: string;
  granularity: string[];
  contextFields: string[];
  selectedCalcs: SelectedCalc[];
  scoreThresholdSetting: string;
}

export default function TestRunStep({
  modelId,
  query,
  name,
  description,
  timeWindow,
  granularity,
  contextFields,
  selectedCalcs,
  scoreThresholdSetting,
}: TestRunStepProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DryRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const runTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedRow(null);

    try {
      const payload = {
        model_id: modelId,
        name,
        description,
        time_window: timeWindow,
        granularity,
        context_fields: contextFields,
        calculations: selectedCalcs.map((sc) => ({
          calc_id: sc.calc_id,
          strictness: sc.strictness,
          value_field: sc.value_field || sc.calc_id,
          threshold_setting: sc.threshold_setting || null,
          score_steps_setting: sc.score_steps_setting || null,
        })),
        score_threshold_setting: scoreThresholdSetting,
        query,
      };

      const resp = await api.post<DryRunResponse>("/detection-models/dry-run", payload);

      if (resp.status === "error") {
        setError(resp.error || "Unknown error");
      } else {
        setResult(resp);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [modelId, name, description, timeWindow, granularity, contextFields, selectedCalcs, scoreThresholdSetting, query]);

  // AG Grid column definitions for preview results
  const columnDefs = useMemo<ColDef[]>(() => {
    if (!result || result.alerts.length === 0) return [];

    // Build columns from the raw_row keys of first alert
    const firstRow = result.alerts[0].raw_row;
    const cols: ColDef[] = [
      { headerName: "#", field: "row_index", width: 60, sortable: true },
    ];

    for (const key of Object.keys(firstRow)) {
      cols.push({
        headerName: key,
        field: `raw_row.${key}`,
        flex: 1,
        minWidth: 100,
        valueGetter: (params) => params.data?.raw_row?.[key] ?? "",
      });
    }

    return cols;
  }, [result]);

  const rowData = useMemo(() => {
    if (!result) return [];
    return result.alerts;
  }, [result]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Step 6: Test Run</h3>
        <button
          onClick={runTest}
          disabled={loading || !query.trim()}
          className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 transition-colors"
        >
          {loading ? "Running..." : "Run Test"}
        </button>
      </div>

      <p className="text-xs text-muted">
        Execute a dry run of the detection query to preview candidate rows.
        No alerts will be persisted.
      </p>

      {!query.trim() && (
        <div className="flex items-center justify-center h-20 text-xs text-muted border border-dashed border-border rounded">
          No query defined. Go back to Step 4 to write a query.
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center h-20 text-xs text-muted border border-dashed border-border rounded">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Executing dry run...
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-3 rounded border border-destructive/30 bg-destructive/10 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !error && (
        <div className="flex flex-col gap-2">
          {/* Summary bar */}
          <div className="flex items-center gap-4 text-xs text-muted">
            <span>
              Total rows: <span className="text-foreground font-medium">{result.row_count}</span>
            </span>
            <span>
              Preview: <span className="text-foreground font-medium">{result.preview_count}</span>
            </span>
            {result.columns && (
              <span>
                Columns: <span className="text-foreground font-medium">{result.columns.length}</span>
              </span>
            )}
          </div>

          {result.alerts.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-muted border border-dashed border-border rounded">
              No rows returned. The query matched zero candidates.
            </div>
          ) : (
            <>
              {/* AG Grid for results */}
              <div style={{ height: 260 }}>
                <DataGrid
                  columnDefs={columnDefs}
                  rowData={rowData}
                  getRowId={(params) => String(params.data.row_index)}
                  onRowClicked={(e) => {
                    const idx = e.data?.row_index;
                    setExpandedRow(expandedRow === idx ? null : idx);
                  }}
                />
              </div>

              {/* Expanded row detail */}
              {expandedRow !== null && (
                <ExpandedDetail
                  alert={result.alerts.find((a) => a.row_index === expandedRow)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ExpandedDetail({ alert }: { alert?: DryRunAlert }) {
  if (!alert) return null;

  return (
    <div className="border border-border rounded bg-surface p-3">
      <div className="text-[11px] font-medium text-muted uppercase tracking-wider mb-2">
        Row {alert.row_index} -- Calculation Details
      </div>

      {alert.entity_context && Object.keys(alert.entity_context).length > 0 && (
        <div className="mb-2 text-xs">
          <span className="text-muted">Context: </span>
          <span className="font-mono text-foreground">
            {Object.entries(alert.entity_context)
              .map(([k, v]) => `${k}=${v}`)
              .join(", ")}
          </span>
        </div>
      )}

      {alert.calculation_details.length > 0 ? (
        <div className="flex flex-col gap-1">
          {alert.calculation_details.map((cd) => (
            <div key={cd.calc_id} className="flex items-center gap-3 text-xs">
              <span className="font-mono text-foreground w-40 truncate">{cd.calc_id}</span>
              <span className="text-muted">{cd.value_field}: {cd.computed_value}</span>
              <span className={cd.strictness === "MUST_PASS" ? "text-destructive" : "text-muted"}>
                {cd.strictness}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted italic">No calculation details</span>
      )}
    </div>
  );
}
