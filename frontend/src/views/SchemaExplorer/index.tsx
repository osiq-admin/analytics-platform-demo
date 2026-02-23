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
  const [loading, setLoading] = useState(true);

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
  }, [selectedTable]);

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
        <h2 className="text-lg font-semibold">Schema Explorer</h2>
        <StatusBadge
          label={`${tables.length} tables`}
          variant="info"
        />
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Table list */}
        <Panel title="Tables" className="w-72 shrink-0" noPadding>
          <DataGrid
            rowData={tables}
            columnDefs={tableColumns}
            onRowClicked={(e) => {
              if (e.data) setSelectedTable(e.data.name);
            }}
            getRowId={(p) => p.data.name}
          />
        </Panel>

        {/* Right: Column detail */}
        <Panel
          title={selectedTable ? `${selectedTable} — Columns` : "Columns"}
          className="flex-1"
          noPadding
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
      </div>
    </div>
  );
}
