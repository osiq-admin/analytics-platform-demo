import { useEffect, useState } from "react";
import { Group, Panel as ResizablePanel, Separator, useDefaultLayout } from "react-resizable-panels";
import { useMetadataStore, type EntityDef, type FieldDef } from "../../stores/metadataStore.ts";
import { useLocalStorage } from "../../hooks/useLocalStorage.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import EntityList from "./EntityList.tsx";
import EntityDetail from "./EntityDetail.tsx";
import EntityForm from "./EntityForm.tsx";
import RelationshipGraph from "./RelationshipGraph.tsx";
import DomainValuesPane from "./DomainValuesPane.tsx";

type ViewTab = "details" | "relationships";

export default function EntityDesigner() {
  const { entities, loading, fetchEntities, saveEntity, deleteEntity } = useMetadataStore();
  const [selected, setSelected] = useState<EntityDef | null>(null);
  const [mode, setMode] = useState<"browse" | "create" | "edit">("browse");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeView, setActiveView] = useLocalStorage<ViewTab>("entity-designer-view", "details");
  const [selectedField, setSelectedField] = useState<FieldDef | null>(null);

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "entity-designer-layout",
    storage: localStorage,
  });

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

  const handleGraphSelect = (entityId: string) => {
    const entity = entities.find((e) => e.entity_id === entityId);
    if (entity) {
      setSelected(entity);
      setSelectedField(null);
      setMode("browse");
    }
  };

  const handleUpdateDomainValues = async (fieldName: string, values: string[]) => {
    if (!selected) return;
    const updatedFields = selected.fields.map((f: FieldDef) =>
      f.name === fieldName ? { ...f, domain_values: values.length > 0 ? values : undefined } : f
    );
    const updatedEntity = { ...selected, fields: updatedFields };
    await saveEntity(updatedEntity);
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

  const viewTabs: { key: ViewTab; label: string }[] = [
    { key: "details", label: "Entity Details" },
    { key: "relationships", label: "Relationship Graph" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header row: title + view tabs */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Entity Designer</h2>
        <div className="flex rounded border border-border overflow-hidden" data-trace="entities.view-tabs">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeView === tab.key
                  ? "bg-accent text-white"
                  : "bg-surface text-muted hover:text-foreground hover:bg-surface-elevated"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resizable two-pane layout: entity list (top) + view content (bottom) */}
      <Group
        orientation="vertical"
        className="flex-1 min-h-0"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
      >
        {/* Top: Entity list (shared across both tabs) */}
        <ResizablePanel id="entity-list" defaultSize="35%" minSize="15%">
          <Panel
            title="Entities"
            className="h-full"
            noPadding
            dataTour="entity-list"
            dataTrace="entities.entity-list"
            tooltip="Browse and select entity definitions"
            actions={
              <button
                onClick={() => {
                  setSelected(null);
                  setMode("create");
                  setActiveView("details");
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
                selectedId={selected?.entity_id}
                onSelect={(entity) => {
                  setSelected(entity);
                  setSelectedField(null);
                  setMode("browse");
                }}
              />
            )}
          </Panel>
        </ResizablePanel>

        <Separator className="h-1.5 bg-border hover:bg-accent transition-colors cursor-row-resize" />

        {/* Bottom: view content switches based on active tab */}
        <ResizablePanel id="entity-content" defaultSize="65%" minSize="30%">
          {activeView === "details" ? (
            <div className="h-full flex">
              <div className={`h-full transition-all duration-200 ${selectedField ? "flex-[3]" : "flex-1"}`}>
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
                    onFieldSelect={(f) => setSelectedField(f as FieldDef)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted text-sm">
                    Select an entity to view details
                  </div>
                )}
              </div>
              {selectedField && selected && mode === "browse" && (
                <div className="w-72 shrink-0 border-l border-border h-full overflow-hidden bg-surface">
                  <DomainValuesPane
                    entityId={selected.entity_id}
                    field={selectedField}
                    onUpdateDomainValues={handleUpdateDomainValues}
                    onClose={() => setSelectedField(null)}
                  />
                </div>
              )}
            </div>
          ) : (
            <Panel
              title="Relationships"
              className="h-full"
              noPadding
              dataTour="entity-relationships"
              dataTrace="entities.relationship-graph"
              tooltip="Visual graph of entity relationships"
            >
              <RelationshipGraph
                entities={entities}
                selectedEntityId={selected?.entity_id}
                onSelect={handleGraphSelect}
              />
            </Panel>
          )}
        </ResizablePanel>
      </Group>

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
