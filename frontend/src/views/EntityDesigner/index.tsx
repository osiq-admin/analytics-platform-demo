import { useEffect, useState } from "react";
import { useMetadataStore, type EntityDef, type FieldDef } from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import EntityList from "./EntityList.tsx";
import EntityDetail from "./EntityDetail.tsx";
import EntityForm from "./EntityForm.tsx";
import RelationshipGraph from "./RelationshipGraph.tsx";

export default function EntityDesigner() {
  const { entities, loading, fetchEntities, saveEntity, deleteEntity } = useMetadataStore();
  const [selected, setSelected] = useState<EntityDef | null>(null);
  const [mode, setMode] = useState<"browse" | "create" | "edit">("browse");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const handleSave = async (entity: EntityDef) => {
    await saveEntity(entity);
    setMode("browse");
    setSelected(null);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteEntity(selected.entity_id);
    setConfirmDelete(false);
    setSelected(null);
    setMode("browse");
  };

  const handleEdit = () => {
    setMode("edit");
  };

  const handleCancelForm = () => {
    setMode("browse");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const emptyEntity: EntityDef = {
    entity_id: "",
    name: "",
    description: "",
    fields: [] as FieldDef[],
    relationships: [],
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <h2 className="text-lg font-semibold">Entity Designer</h2>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Entity list */}
        <Panel
          title="Entities"
          className="w-80 shrink-0"
          noPadding
          dataTour="entity-list"
          tooltip="Browse and select entity definitions"
          actions={
            <button
              onClick={() => {
                setSelected(null);
                setMode("create");
              }}
              className="px-2 py-0.5 text-xs rounded font-medium text-accent border border-dashed border-accent/30 hover:bg-accent/10 transition-colors"
            >
              + New Entity
            </button>
          }
        >
          {entities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted text-sm p-4">
              No entities defined yet.
            </div>
          ) : (
            <EntityList
              entities={entities}
              onSelect={(entity) => {
                setSelected(entity);
                setMode("browse");
              }}
            />
          )}
        </Panel>

        {/* Center: Detail or Form */}
        <div className="flex-1 min-w-0">
          {mode === "create" ? (
            <EntityForm
              entity={emptyEntity}
              isNew
              onSave={handleSave}
              onCancel={handleCancelForm}
            />
          ) : mode === "edit" && selected ? (
            <EntityForm
              entity={selected}
              isNew={false}
              onSave={handleSave}
              onCancel={handleCancelForm}
            />
          ) : selected ? (
            <EntityDetail
              entity={selected}
              onEdit={handleEdit}
              onDelete={() => setConfirmDelete(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Select an entity to view details
            </div>
          )}
        </div>

        {/* Right: Relationship graph */}
        <Panel title="Relationships" className="w-80 shrink-0" noPadding dataTour="entity-relationships" tooltip="Visual graph of entity relationships">
          <RelationshipGraph entities={entities} />
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Entity"
        message={`Are you sure you want to delete entity "${selected?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
