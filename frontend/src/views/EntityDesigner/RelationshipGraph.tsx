import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EntityDef } from "../../stores/metadataStore.ts";

interface RelationshipGraphProps {
  entities: EntityDef[];
}

export default function RelationshipGraph({
  entities,
}: RelationshipGraphProps) {
  const nodes: Node[] = entities.map((e, i) => ({
    id: e.entity_id,
    position: { x: (i % 3) * 220, y: Math.floor(i / 3) * 120 },
    data: { label: e.name },
    style: {
      background: "var(--color-surface-elevated)",
      color: "var(--color-foreground)",
      border: "1px solid var(--color-border)",
      borderRadius: 6,
      fontSize: 12,
      padding: "8px 16px",
    },
  }));

  const edges: Edge[] = [];
  for (const entity of entities) {
    const rels =
      (entity as EntityDef & { relationships?: Array<{ target_entity: string; relationship_type: string }> })
        .relationships ?? [];
    for (const rel of rels) {
      edges.push({
        id: `${entity.entity_id}-${rel.target_entity}`,
        source: entity.entity_id,
        target: rel.target_entity,
        label: rel.relationship_type,
        style: { stroke: "var(--color-border)" },
        labelStyle: { fill: "var(--color-muted)", fontSize: 10 },
      });
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No entities to display
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--color-border)" gap={20} size={1} />
    </ReactFlow>
  );
}
