import { useCallback } from "react";
import type { ColDef } from "ag-grid-community";
import DataGrid from "../../components/DataGrid.tsx";
import type { EntityDef } from "../../stores/metadataStore.ts";

interface EntityListProps {
  entities: EntityDef[];
  onSelect: (entity: EntityDef) => void;
}

const columns: ColDef<EntityDef>[] = [
  { field: "entity_id", headerName: "ID", flex: 1 },
  { field: "name", headerName: "Name", flex: 1 },
  {
    headerName: "Fields",
    flex: 0.5,
    valueGetter: (p) => p.data?.fields?.length ?? 0,
  },
  {
    field: "metadata_layer",
    headerName: "Layer",
    flex: 0.5,
    cellRenderer: (p: { value: string }) => {
      const v = p.value;
      if (v === "oob") return '<span data-tour="entity-layer-badge" class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border bg-cyan-500/15 text-cyan-400 border-cyan-500/30">OOB</span>';
      return '<span data-tour="entity-layer-badge" class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border bg-purple-500/15 text-purple-400 border-purple-500/30">Custom</span>';
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
