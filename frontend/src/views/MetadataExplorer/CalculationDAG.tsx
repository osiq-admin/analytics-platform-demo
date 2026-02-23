import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import type { CalculationDef } from "../../stores/metadataStore.ts";

interface CalculationDAGProps {
  calculations: CalculationDef[];
  onSelectCalc?: (calcId: string) => void;
}

const layerColors: Record<string, string> = {
  transaction: "#6366f1",
  time_window: "#f59e0b",
  aggregation: "#10b981",
  derived: "#ef4444",
};

function layoutGraph(calculations: CalculationDef[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 60 });

  for (const calc of calculations) {
    g.setNode(calc.calc_id, { width: 160, height: 44 });
  }

  for (const calc of calculations) {
    for (const dep of calc.depends_on) {
      if (calculations.some((c) => c.calc_id === dep)) {
        g.setEdge(dep, calc.calc_id);
      }
    }
  }

  dagre.layout(g);

  const nodes: Node[] = calculations.map((calc) => {
    const pos = g.node(calc.calc_id);
    return {
      id: calc.calc_id,
      position: { x: pos.x - 80, y: pos.y - 22 },
      data: { label: calc.name },
      style: {
        background: "var(--color-surface-elevated)",
        color: "var(--color-foreground)",
        border: `2px solid ${layerColors[calc.layer] ?? "var(--color-border)"}`,
        borderRadius: 6,
        fontSize: 11,
        padding: "6px 12px",
        width: 160,
      },
    };
  });

  const edges: Edge[] = [];
  for (const calc of calculations) {
    for (const dep of calc.depends_on) {
      if (calculations.some((c) => c.calc_id === dep)) {
        edges.push({
          id: `${dep}-${calc.calc_id}`,
          source: dep,
          target: calc.calc_id,
          style: { stroke: "var(--color-border)" },
          animated: false,
        });
      }
    }
  }

  return { nodes, edges };
}

export default function CalculationDAG({
  calculations,
  onSelectCalc,
}: CalculationDAGProps) {
  const { nodes, edges } = useMemo(
    () => layoutGraph(calculations),
    [calculations],
  );

  if (calculations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        No calculations to display
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={(_e, node) => onSelectCalc?.(node.id)}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--color-border)" gap={20} size={1} />
    </ReactFlow>
  );
}
