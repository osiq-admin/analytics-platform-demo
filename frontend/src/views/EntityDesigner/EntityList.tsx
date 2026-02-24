import { useCallback } from "react";
import type { ColDef } from "ag-grid-community";
import DataGrid from "../../components/DataGrid.tsx";
import type { EntityDef } from "../../stores/metadataStore.ts";

interface EntityListProps {
  entities: EntityDef[];
  onSelect: (entity: EntityDef) => void;
}

const columns: ColDef<EntityDef>[] = [
  { field: "entity_id", headerName: "ID", minWidth: 100, flex: 1.2 },
  { field: "name", headerName: "Name", minWidth: 120, flex: 1.5 },
  {
    headerName: "Fields",
    width: 70,
    valueGetter: (p) => p.data?.fields?.length ?? 0,
  },
  {
    field: "metadata_layer",
    headerName: "Layer",
    width: 70,
    cellRenderer: (p: { value: string }) => {
      const isOob = p.value === "oob";
      return (
        <span
          data-tour="entity-layer-badge"
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
];

export default function EntityList({ entities, onSelect }: EntityListProps) {
  const handleRowClick = useCallback(
    (e: { data: EntityDef | undefined }) => {
      if (e.data) onSelect(e.data);
    },
    [onSelect],
  );

  return (
    <div className="h-full">
      <DataGrid
        rowData={entities}
        columnDefs={columns}
        onRowClicked={handleRowClick}
        getRowId={(p) => p.data.entity_id}
      />
    </div>
  );
}
