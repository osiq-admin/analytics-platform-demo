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
