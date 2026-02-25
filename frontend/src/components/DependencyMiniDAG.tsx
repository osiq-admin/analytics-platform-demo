import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import type { CalculationDef } from "../stores/metadataStore.ts";

interface DependencyMiniDAGProps {
  selectedCalcIds: string[];
  calculations: CalculationDef[];
}

const layerColors: Record<string, string> = {
  transaction: "#6366f1",
  time_windows: "#f59e0b",
  time_window: "#f59e0b",
  aggregations: "#10b981",
  aggregation: "#10b981",
  derived: "#ef4444",
};

function buildMiniGraph(
  selectedCalcIds: string[],
  calculations: CalculationDef[],
) {
  const calcMap = new Map(calculations.map((c) => [c.calc_id, c]));
  const selectedSet = new Set(selectedCalcIds);

  // Collect selected calcs + their direct dependencies
  const visibleIds = new Set<string>(selectedCalcIds);
  for (const id of selectedCalcIds) {
    const calc = calcMap.get(id);
    if (calc) {
      for (const dep of calc.depends_on) {
        if (calcMap.has(dep)) {
          visibleIds.add(dep);
        }
      }
    }
  }

  const visibleCalcs = calculations.filter((c) => visibleIds.has(c.calc_id));

  // Dagre layout
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 30, ranksep: 50 });

  for (const calc of visibleCalcs) {
    g.setNode(calc.calc_id, { width: 130, height: 36 });
  }

  for (const calc of visibleCalcs) {
    for (const dep of calc.depends_on) {
      if (visibleIds.has(dep)) {
        g.setEdge(dep, calc.calc_id);
      }
    }
  }

  dagre.layout(g);

  const nodes: Node[] = visibleCalcs.map((calc) => {
    const pos = g.node(calc.calc_id);
    const isSelected = selectedSet.has(calc.calc_id);
    return {
      id: calc.calc_id,
      position: { x: pos.x - 65, y: pos.y - 18 },
      data: { label: calc.name },
      style: {
        background: "var(--color-surface-elevated)",
        color: "var(--color-foreground)",
        border: isSelected
          ? `2px solid ${layerColors[calc.layer] ?? "var(--color-accent)"}`
          : "1px dashed var(--color-border)",
        borderRadius: 6,
        fontSize: 10,
        padding: "4px 8px",
        width: 130,
        opacity: isSelected ? 1 : 0.6,
      },
    };
  });

  const edges: Edge[] = [];
  for (const calc of visibleCalcs) {
    for (const dep of calc.depends_on) {
      if (visibleIds.has(dep)) {
        edges.push({
          id: `${dep}-${calc.calc_id}`,
          source: dep,
          target: calc.calc_id,
          style: { stroke: "var(--color-border)" },
          animated: selectedSet.has(dep) && selectedSet.has(calc.calc_id),
        });
      }
    }
  }

  return { nodes, edges };
}

export default function DependencyMiniDAG({
  selectedCalcIds,
  calculations,
}: DependencyMiniDAGProps) {
  const { nodes, edges } = useMemo(
    () => buildMiniGraph(selectedCalcIds, calculations),
    [selectedCalcIds, calculations],
  );

  if (selectedCalcIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-muted">
        Select calculations to see dependencies
      </div>
    );
  }

  return (
    <div className="h-full min-h-[200px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
      >
        <Background color="var(--color-border)" gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
