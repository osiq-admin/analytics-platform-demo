import { useEffect, useState } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import DataGrid from "../../components/DataGrid.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { useGridColumns } from "../../hooks/useGridColumns.ts";
import type { ColDef } from "ag-grid-community";

interface DataFile {
  name: string;
  type: string;
  size?: number;
}

interface PreviewResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
}

export default function DataManager() {
  const [tables, setTables] = useState<DataFile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DataFile[]>("/query/tables")
      .then(setTables)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api
      .post<PreviewResult>("/query/execute", {
        sql: `SELECT * FROM "${selected}" LIMIT 50`,
      })
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [selected]);

  const fallbackFileColumns: ColDef<DataFile>[] = [
    { field: "name", headerName: "Table", flex: 1 },
    { field: "type", headerName: "Type", width: 90 },
  ];
  const fileColumns = useGridColumns("data_manager", fallbackFileColumns);

  const previewColumns: ColDef[] =
    preview?.columns.map((col) => ({
      field: col,
      headerName: col,
      flex: 1,
      minWidth: 100,
    })) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Data Manager</h2>
        <StatusBadge label={`${tables.length} tables`} variant="info" />
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: File list */}
        <Panel title="Data Sources" className="w-72 shrink-0" noPadding dataTour="data-list" dataTrace="data.tables-list" tooltip="Uploaded data files and tables">
          <DataGrid
            rowData={tables}
            columnDefs={fileColumns}
            onRowClicked={(e) => {
              if (e.data) setSelected(e.data.name);
            }}
            getRowId={(p) => p.data.name}
          />
        </Panel>

        {/* Right: Data preview */}
        <Panel
          title={selected ? `Preview: ${selected}` : "Data Preview"}
          className="flex-1"
          noPadding
          dataTour="data-preview"
          dataTrace="data.data-grid"
          tooltip="Preview rows from the selected data source"
        >
          {preview ? (
            <DataGrid
              rowData={preview.rows}
              columnDefs={previewColumns}
              getRowId={(p) =>
                String(
                  p.data[preview.columns[0]] ?? Math.random(),
                )
              }
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Select a table to preview data
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
