import { useState } from "react";
import type { ColDef } from "ag-grid-community";
import DataGrid from "../../components/DataGrid.tsx";
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
  onFieldSelect?: (field: Field) => void;
}

const fieldColumns: ColDef<Field>[] = [
  { field: "name", headerName: "Field", minWidth: 120, flex: 1 },
  { field: "type", headerName: "Type", width: 80 },
  {
    headerName: "Key",
    width: 55,
    valueGetter: (p) => (p.data?.is_key ? "PK" : ""),
  },
  {
    headerName: "Null",
    width: 55,
    valueGetter: (p) => (p.data?.nullable !== false ? "Y" : "N"),
  },
  {
    headerName: "Domain",
    width: 85,
    valueGetter: (p) => p.data?.domain_values?.length ?? 0,
    cellRenderer: (p: { value: number }) =>
      p.value > 0 ? (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/15 text-accent border border-accent/30">
          {p.value} val{p.value !== 1 ? "s" : ""}
        </span>
      ) : (
        <span className="text-muted text-[10px]">—</span>
      ),
  },
  { field: "description", headerName: "Description", minWidth: 150, flex: 2 },
];

export default function EntityDetail({ entity, onEdit, onDelete, onFieldSelect }: EntityDetailProps) {
  const [activeTab, setActiveTab] = useState<"fields" | "relationships">("fields");
  const relCount = entity.relationships?.length ?? 0;

  return (
    <div className="flex flex-col h-full rounded border border-border bg-surface overflow-hidden">
      {/* Compact header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-surface-elevated">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{entity.name}</h3>
            {entity.subtypes && entity.subtypes.length > 0 && (
              <div className="flex gap-1 shrink-0">
                {entity.subtypes.map((s) => (
                  <StatusBadge key={s} label={s} variant="info" />
                ))}
              </div>
            )}
          </div>
          {entity.description && (
            <p className="text-[11px] text-muted mt-0.5 line-clamp-2">{entity.description}</p>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1 text-xs rounded font-medium border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1 text-xs rounded font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="h-8 shrink-0 flex items-center border-b border-border">
        {(["fields", "relationships"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 h-full text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? "text-accent border-b-2 border-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab === "fields"
              ? `Fields (${entity.fields.length})`
              : `Relationships (${relCount})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === "fields" ? (
          <div className="h-full" data-tour="entity-fields">
            <DataGrid
              rowData={entity.fields}
              columnDefs={fieldColumns}
              getRowId={(p) => p.data.name}
              rowSelection="single"
              onRowClicked={(e) => {
                if (e.data && onFieldSelect) onFieldSelect(e.data);
              }}
            />
          </div>
        ) : (
          <div className="h-full overflow-auto p-3" data-tour="entity-detail-relationships">
            {relCount > 0 ? (
              <div className="space-y-2">
                {entity.relationships!.map((rel, i) => (
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
            ) : (
              <div className="flex items-center justify-center h-full text-muted text-sm">
                No relationships defined
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
