import type { ColDef } from "ag-grid-community";
import DataGrid from "../../components/DataGrid.tsx";
import Panel from "../../components/Panel.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

interface Field {
  name: string;
  type: string;
  description?: string;
  is_key?: boolean;
  nullable?: boolean;
  domain_values?: string[] | null;
}

interface EntityDetailProps {
  entity: {
    entity_id: string;
    name: string;
    description?: string;
    fields: Field[];
    relationships?: Array<{
      target_entity: string;
      join_fields: Record<string, string>;
      relationship_type: string;
    }>;
    subtypes?: string[];
  };
  onEdit?: () => void;
  onDelete?: () => void;
}

const fieldColumns: ColDef<Field>[] = [
  { field: "name", headerName: "Field", flex: 1 },
  { field: "type", headerName: "Type", width: 100 },
  {
    headerName: "Key",
    width: 60,
    valueGetter: (p) => (p.data?.is_key ? "PK" : ""),
  },
  {
    headerName: "Null",
    width: 60,
    valueGetter: (p) => (p.data?.nullable !== false ? "Y" : "N"),
  },
  { field: "description", headerName: "Description", flex: 2 },
];

export default function EntityDetail({ entity, onEdit, onDelete }: EntityDetailProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{entity.name}</h3>
          {entity.description && (
            <p className="text-xs text-muted mt-1">{entity.description}</p>
          )}
          {entity.subtypes && entity.subtypes.length > 0 && (
            <div className="flex gap-1 mt-2">
              {entity.subtypes.map((s) => (
                <StatusBadge key={s} label={s} variant="info" />
              ))}
            </div>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 text-xs rounded font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-xs rounded font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fields Grid */}
      <Panel title="Fields" className="flex-1 min-h-[200px]" noPadding dataTour="entity-fields" tooltip="Field definitions for this entity">
        <DataGrid
          rowData={entity.fields}
          columnDefs={fieldColumns}
          getRowId={(p) => p.data.name}
        />
      </Panel>

      {/* Relationships */}
      {entity.relationships && entity.relationships.length > 0 && (
        <Panel title="Relationships" className="min-h-[100px]">
          <div className="space-y-2">
            {entity.relationships.map((rel, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs"
              >
                <StatusBadge label={rel.relationship_type} variant="muted" />
                <span className="text-accent">{rel.target_entity}</span>
                <span className="text-muted">
                  ({Object.entries(rel.join_fields)
                    .map(([k, v]) => `${k} → ${v}`)
                    .join(", ")})
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
