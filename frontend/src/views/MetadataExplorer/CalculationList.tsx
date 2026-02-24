import { useMemo, useCallback } from "react";
import type { ColDef } from "ag-grid-community";
import DataGrid from "../../components/DataGrid.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import type { CalculationDef } from "../../stores/metadataStore.ts";

interface CalculationListProps {
  calculations: CalculationDef[];
  selectedLayer: string | null;
  onSelect: (calc: CalculationDef) => void;
}

const layerVariant = (layer: string) => {
  switch (layer) {
    case "transaction": return "info" as const;
    case "time_window": return "warning" as const;
    case "aggregation": return "success" as const;
    case "derived": return "error" as const;
    default: return "muted" as const;
  }
};

export default function CalculationList({
  calculations,
  selectedLayer,
  onSelect,
}: CalculationListProps) {
  const filtered = useMemo(() => {
    if (!selectedLayer) return calculations;
    return calculations.filter((c) => c.layer === selectedLayer);
  }, [calculations, selectedLayer]);

  const columns: ColDef<CalculationDef>[] = useMemo(
    () => [
      { field: "calc_id", headerName: "ID", flex: 1 },
      { field: "name", headerName: "Name", flex: 1.5 },
      {
        field: "layer",
        headerName: "Layer",
        width: 120,
        cellRenderer: (p: { value: string }) => {
          const v = layerVariant(p.value);
          return StatusBadge({ label: p.value, variant: v });
        },
      },
      {
        headerName: "Deps",
        width: 60,
        valueGetter: (p) => p.data?.depends_on?.length ?? 0,
      },
      {
        field: "metadata_layer",
        headerName: "OOB",
        width: 70,
        cellRenderer: (p: { value: string }) => {
          const isOob = p.value === "oob";
          return (
            <span
              data-tour="calc-layer-badge"
              className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                isOob
                  ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                  : "bg-purple-500/15 text-purple-400 border-purple-500/30"
              }`}
            >
              {isOob ? "OOB" : "User"}
            </span>
          );
        },
      },
    ],
    [],
  );

  const handleRowClick = useCallback(
    (e: { data: CalculationDef | undefined }) => {
      if (e.data) onSelect(e.data);
    },
    [onSelect],
  );

  return (
    <DataGrid
      rowData={filtered}
      columnDefs={columns}
      onRowClicked={handleRowClick}
      getRowId={(p) => p.data.calc_id}
    />
  );
}
