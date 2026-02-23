import { useCallback, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import DataGrid from "../../components/DataGrid.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import type { AlertSummary as AlertSummaryType } from "../../stores/alertStore.ts";

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

export default function AlertSummaryGrid({
  alerts,
  onSelect,
}: AlertSummaryProps) {
  const columns: ColDef<AlertSummaryType>[] = useMemo(
    () => [
      {
        field: "alert_id",
        headerName: "Alert ID",
        flex: 1.5,
        cellRenderer: (p: { value: string }) => (
          <span className="text-accent font-mono text-xs">{p.value?.slice(0, 12)}...</span>
        ),
      },
      { field: "model_id", headerName: "Model", flex: 1 },
      { field: "product_id", headerName: "Product", width: 90 },
      { field: "account_id", headerName: "Account", width: 100 },
      {
        field: "accumulated_score",
        headerName: "Score",
        width: 80,
        cellRenderer: (p: { data: AlertSummaryType | undefined }) => {
          if (!p.data) return null;
          return StatusBadge({
            label: String(p.data.accumulated_score),
            variant: scoreVariant(p.data.accumulated_score, p.data.score_threshold),
          });
        },
      },
      {
        field: "score_threshold",
        headerName: "Threshold",
        width: 80,
      },
      {
        field: "trigger_path",
        headerName: "Trigger",
        width: 100,
        cellRenderer: (p: { value: string }) =>
          StatusBadge({
            label: p.value ?? "",
            variant: p.value === "all_passed" ? "success" : "warning",
          }),
      },
      { field: "timestamp", headerName: "Time", width: 140 },
    ],
    [],
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
