import { useEffect, useState } from "react";
import { useMetadataStore, type EntityDef } from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import EntityList from "./EntityList.tsx";
import EntityDetail from "./EntityDetail.tsx";
import RelationshipGraph from "./RelationshipGraph.tsx";

export default function EntityDesigner() {
  const { entities, loading, fetchEntities } = useMetadataStore();
  const [selected, setSelected] = useState<EntityDef | null>(null);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <h2 className="text-lg font-semibold">Entity Designer</h2>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Entity list */}
        <Panel title="Entities" className="w-72 shrink-0" noPadding>
          {entities.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted text-sm p-4">
              No entities defined yet.
            </div>
          ) : (
            <EntityList entities={entities} onSelect={setSelected} />
          )}
        </Panel>

        {/* Center: Detail */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <EntityDetail entity={selected} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Select an entity to view details
            </div>
          )}
        </div>

        {/* Right: Relationship graph */}
        <Panel title="Relationships" className="w-96 shrink-0" noPadding>
          <RelationshipGraph entities={entities} />
        </Panel>
      </div>
    </div>
  );
}
