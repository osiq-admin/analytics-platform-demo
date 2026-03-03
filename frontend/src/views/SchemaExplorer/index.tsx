import { useEffect, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import DataGrid from "../../components/DataGrid.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

interface TableInfo {
  name: string;
  type: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

interface PreviewResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
}

type DetailTab = "schema" | "data";

const tableColumns: ColDef<TableInfo>[] = [
  { field: "name", headerName: "Table", flex: 1 },
  { field: "type", headerName: "Type", width: 90 },
];

const colColumns: ColDef<ColumnInfo>[] = [
  { field: "name", headerName: "Column", flex: 1 },
  { field: "type", headerName: "Type", flex: 1 },
  {
    field: "nullable",
    headerName: "Null",
    width: 60,
    valueFormatter: (p) => (p.value ? "Y" : "N"),
  },
];

export default function SchemaExplorer() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailTab, setDetailTab] = useState<DetailTab>("schema");

  useEffect(() => {
    api
      .get<TableInfo[]>("/query/tables")
      .then(setTables)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTable) return;
    api
      .get<{ columns: ColumnInfo[] }>(`/query/tables/${selectedTable}/schema`)
      .then((d) => setColumns(d.columns))
      .catch(() => setColumns([]));
    api
      .post<PreviewResult>("/query/execute", {
        sql: `SELECT * FROM "${selectedTable}" LIMIT 50`,
      })
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [selectedTable]);

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
        <h2 className="text-lg font-semibold">Data Explorer</h2>
        <StatusBadge
          label={`${tables.length} tables`}
          variant="info"
        />
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Table list */}
        <Panel title="Tables" className="w-72 shrink-0" noPadding dataTour="schema-tables" tooltip="Database tables available for querying" dataTrace="schema.tables-list">
          <DataGrid
            rowData={tables}
            columnDefs={tableColumns}
            onRowClicked={(e) => {
              if (e.data) setSelectedTable(e.data.name);
            }}
            getRowId={(p) => p.data.name}
          />
        </Panel>

        {/* Right: Schema or Data Preview (tabbed) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-2" data-trace="schema.detail-tabs">
            {(["schema", "data"] as DetailTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  detailTab === tab
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "border border-border text-muted hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                {tab === "schema" ? "Schema" : "Data Preview"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {detailTab === "schema" ? (
            <Panel
              title={selectedTable ? `${selectedTable} \u2014 Columns` : "Columns"}
              className="flex-1"
              noPadding
              dataTour="schema-columns"
              tooltip="Column details for the selected table"
              dataTrace="schema.columns-grid"
            >
              {selectedTable ? (
                <DataGrid
                  rowData={columns}
                  columnDefs={colColumns}
                  getRowId={(p) => p.data.name}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted text-sm">
                  Select a table to view its schema
                </div>
              )}
            </Panel>
          ) : (
            <Panel
              title={selectedTable ? `Preview: ${selectedTable}` : "Data Preview"}
              className="flex-1"
              noPadding
              dataTour="data-preview"
              tooltip="Preview rows from the selected data source"
              dataTrace="schema.data-grid"
            >
              {selectedTable && preview ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
