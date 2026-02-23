import { useCallback, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import DataGrid from "../../components/DataGrid.tsx";
import type { SettingDef } from "../../stores/metadataStore.ts";

interface SettingsListProps {
  settings: SettingDef[];
  onSelect: (setting: SettingDef) => void;
}

export default function SettingsList({ settings, onSelect }: SettingsListProps) {
  const columns: ColDef<SettingDef>[] = useMemo(
    () => [
      { field: "setting_id", headerName: "ID", flex: 1.5 },
      { field: "name", headerName: "Name", flex: 1.5 },
      { field: "value_type", headerName: "Type", width: 100 },
      {
        headerName: "Default",
        width: 100,
        valueGetter: (p) => {
          const d = p.data?.default;
          if (Array.isArray(d)) return `[${d.length} steps]`;
          return String(d ?? "");
        },
      },
    ],
    [],
  );

  const handleRowClick = useCallback(
    (e: { data: SettingDef | undefined }) => {
      if (e.data) onSelect(e.data);
    },
    [onSelect],
  );

  return (
    <DataGrid
      rowData={settings}
      columnDefs={columns}
      onRowClicked={handleRowClick}
      getRowId={(p) => p.data.setting_id}
    />
  );
}
