import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import type { EntityDef } from "../../stores/metadataStore.ts";

interface RelationshipGraphProps {
  entities: EntityDef[];
  selectedEntityId?: string;
  onSelect?: (entityId: string) => void;
}

function layoutGraph(
  entities: EntityDef[],
  selectedEntityId?: string,
) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60 });

  for (const entity of entities) {
    g.setNode(entity.entity_id, { width: 140, height: 40 });
  }

  // Collect connected entity IDs for the selected entity
  const connectedIds = new Set<string>();
  const edgeKeys = new Set<string>();
  if (selectedEntityId) {
    connectedIds.add(selectedEntityId);
    for (const entity of entities) {
      const rels = entity.relationships ?? [];
      for (const rel of rels) {
        if (entity.entity_id === selectedEntityId) {
          connectedIds.add(rel.target_entity);
          edgeKeys.add(`${entity.entity_id}-${rel.target_entity}`);
        }
        if (rel.target_entity === selectedEntityId) {
          connectedIds.add(entity.entity_id);
          edgeKeys.add(`${entity.entity_id}-${rel.target_entity}`);
        }
      }
    }
  }

  for (const entity of entities) {
    const rels = entity.relationships ?? [];
    for (const rel of rels) {
      if (entities.some((e) => e.entity_id === rel.target_entity)) {
        g.setEdge(entity.entity_id, rel.target_entity);
      }
    }
  }

  dagre.layout(g);

  const hasSelection = !!selectedEntityId;

  const nodes: Node[] = entities.map((entity) => {
    const pos = g.node(entity.entity_id);
    const isSelected = entity.entity_id === selectedEntityId;
    const isConnected = connectedIds.has(entity.entity_id);
    const dimmed = hasSelection && !isConnected;

    return {
      id: entity.entity_id,
      position: { x: pos.x - 70, y: pos.y - 20 },
      data: { label: entity.name },
      style: {
        background: "var(--color-surface-elevated)",
        color: "var(--color-foreground)",
        border: isSelected
          ? "2px solid var(--color-accent)"
          : "1px solid var(--color-border)",
        borderRadius: 6,
        fontSize: 11,
        padding: "6px 12px",
        width: 140,
        opacity: dimmed ? 0.4 : 1,
        transition: "opacity 0.2s, border 0.2s",
      },
    };
  });

  const edges: Edge[] = [];
  for (const entity of entities) {
    const rels = entity.relationships ?? [];
    for (const rel of rels) {
      if (!entities.some((e) => e.entity_id === rel.target_entity)) continue;
      const key = `${entity.entity_id}-${rel.target_entity}`;
      const isHighlighted = edgeKeys.has(key);
      const dimmed = hasSelection && !isHighlighted;

      edges.push({
        id: key,
        source: entity.entity_id,
        target: rel.target_entity,
        label: rel.relationship_type,
        style: {
          stroke: isHighlighted
            ? "var(--color-accent)"
            : "var(--color-border)",
          strokeWidth: isHighlighted ? 2 : 1,
          opacity: dimmed ? 0.4 : 1,
          transition: "opacity 0.2s, stroke 0.2s",
        },
        labelStyle: {
          fill: dimmed ? "var(--color-muted)" : "var(--color-foreground)",
          fontSize: 10,
          opacity: dimmed ? 0.4 : 1,
        },
      });
    }
  }

  return { nodes, edges };
}

export default function RelationshipGraph({
  entities,
  selectedEntityId,
  onSelect,
}: RelationshipGraphProps) {
  const { nodes, edges } = useMemo(
    () => layoutGraph(entities, selectedEntityId),
    [entities, selectedEntityId],
  );

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
      onNodeClick={(_e, node) => onSelect?.(node.id)}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--color-border)" gap={20} size={1} />
      <MiniMap
        style={{ background: "var(--color-surface)", height: 60, width: 80 }}
        nodeColor="var(--color-accent)"
        maskColor="rgba(0,0,0,0.3)"
      />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
