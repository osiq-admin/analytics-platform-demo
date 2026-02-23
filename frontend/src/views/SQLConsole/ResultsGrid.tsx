import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import DataGrid from "../../components/DataGrid.tsx";

interface ResultsGridProps {
  columns: string[];
  rows: Record<string, unknown>[];
}

export default function ResultsGrid({ columns, rows }: ResultsGridProps) {
  const colDefs: ColDef[] = useMemo(
    () =>
      columns.map((col) => ({
        field: col,
        headerName: col,
        flex: 1,
        minWidth: 100,
        valueFormatter: (p) => {
          const v = p.value;
          if (v == null) return "";
          if (typeof v === "object") return JSON.stringify(v);
          return String(v);
        },
      })),
    [columns],
  );

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Execute a query to see results
      </div>
    );
  }

  return (
    <DataGrid rowData={rows} columnDefs={colDefs} getRowId={(p) => String(p.data[columns[0]] ?? Math.random())} />
  );
}
