import { useCallback, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import DataGrid from "../../components/DataGrid.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import type { AlertSummary as AlertSummaryType } from "../../stores/alertStore.ts";
import { formatLabel, formatTimestamp } from "../../utils/format.ts";
import { useGridColumns } from "../../hooks/useGridColumns.ts";

interface AlertSummaryProps {
  alerts: AlertSummaryType[];
  onSelect: (alert: AlertSummaryType) => void;
}

function scoreVariant(score: number, threshold: number) {
  const ratio = score / Math.max(threshold, 1);
  if (ratio >= 1.5) return "error" as const;
  if (ratio >= 1) return "warning" as const;
  return "muted" as const;
}

/** Hardcoded fallback columns — used when metadata API is unavailable. */
const fallbackColumns: ColDef<AlertSummaryType>[] = [
  { field: "alert_id", headerName: "Alert ID", minWidth: 150, flex: 1 },
  { field: "model_id", headerName: "Model", minWidth: 120, flex: 1 },
  { field: "product_id", headerName: "Product", width: 90 },
  { field: "account_id", headerName: "Account", width: 100 },
  { field: "accumulated_score", headerName: "Score", width: 80 },
  { field: "score_threshold", headerName: "Threshold", width: 80 },
  { field: "trigger_path", headerName: "Trigger", minWidth: 100 },
  { field: "timestamp", headerName: "Time", minWidth: 180 },
];

/**
 * Frontend-specific overrides keyed by field name.
 * Metadata drives structure (field, header, width, filter);
 * these overrides add cellRenderers and valueFormatters that
 * cannot be expressed in JSON.
 */
const rendererOverrides: Record<string, Partial<ColDef<AlertSummaryType>>> = {
  alert_id: {
    cellRenderer: (p: { value: string }) => (
      <span className="text-accent font-mono text-xs">
        {p.value?.slice(0, 12)}...
      </span>
    ),
  },
  model_id: {
    valueFormatter: (p: { value: string }) => formatLabel(p.value ?? ""),
  },
  accumulated_score: {
    cellRenderer: (p: { data: AlertSummaryType | undefined }) => {
      if (!p.data) return null;
      return StatusBadge({
        label: String(p.data.accumulated_score),
        variant: scoreVariant(p.data.accumulated_score, p.data.score_threshold),
      });
    },
  },
  trigger_path: {
    cellRenderer: (p: { value: string }) =>
      StatusBadge({
        label: formatLabel(p.value ?? ""),
        variant: p.value === "all_passed" ? "success" : "warning",
      }),
  },
  timestamp: {
    valueFormatter: (p: { value: string }) => formatTimestamp(p.value ?? ""),
  },
};

export default function AlertSummaryGrid({
  alerts,
  onSelect,
}: AlertSummaryProps) {
  // Fetch metadata-driven base columns; falls back to hardcoded on error
  const baseColumns = useGridColumns("risk_case_manager", fallbackColumns);

  // Merge frontend renderer overrides onto metadata-driven columns
  const columns = useMemo(
    () =>
      baseColumns.map((col) => {
        const overrides = col.field ? rendererOverrides[col.field] : undefined;
        return overrides ? { ...col, ...overrides } : col;
      }) as ColDef<AlertSummaryType>[],
    [baseColumns],
  );

  const handleRowClick = useCallback(
    (e: { data: AlertSummaryType | undefined }) => {
      if (e.data) onSelect(e.data);
    },
    [onSelect],
  );

  return (
    <DataGrid
      rowData={alerts}
      columnDefs={columns}
      onRowClicked={handleRowClick}
      getRowId={(p) => p.data.alert_id}
    />
  );
}
