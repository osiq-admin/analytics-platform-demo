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
      { field: "setting_id", headerName: "ID", minWidth: 140, flex: 1.2 },
      { field: "name", headerName: "Name", minWidth: 140, flex: 1.5 },
      { field: "value_type", headerName: "Type", width: 90 },
      {
        headerName: "Default",
        width: 90,
        valueGetter: (p) => {
          const d = p.data?.default;
          if (Array.isArray(d)) return `[${d.length} steps]`;
          return String(d ?? "");
        },
      },
      {
        field: "metadata_layer",
        headerName: "Layer",
        width: 70,
        cellRenderer: (p: { value: string }) => {
          const isOob = p.value === "oob";
          return (
            <span
              data-tour="setting-layer-badge"
              className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                isOob
                  ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                  : "bg-purple-500/15 text-purple-400 border-purple-500/30"
              }`}
            >
              {isOob ? "OOB" : "Custom"}
            </span>
          );
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
