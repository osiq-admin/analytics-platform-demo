import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import type { PipelineStep } from "../../stores/pipelineStore.ts";

interface PipelineDAGProps {
  steps: PipelineStep[];
}

const statusColors: Record<string, string> = {
  pending: "var(--color-border)",
  running: "var(--color-warning)",
  done: "var(--color-success)",
  error: "var(--color-destructive)",
};

function layoutSteps(steps: PipelineStep[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 80 });

  for (const step of steps) {
    g.setNode(step.calc_id, { width: 150, height: 50 });
  }

  // Chain by layer order
  for (let i = 1; i < steps.length; i++) {
    g.setEdge(steps[i - 1].calc_id, steps[i].calc_id);
  }

  dagre.layout(g);

  const nodes: Node[] = steps.map((step) => {
    const pos = g.node(step.calc_id);
    return {
      id: step.calc_id,
      position: { x: pos.x - 75, y: pos.y - 25 },
      data: {
        label: `${step.name}\n${step.status === "done" ? `${step.duration_ms}ms` : step.status}`,
      },
      style: {
        background: "var(--color-surface-elevated)",
        color: "var(--color-foreground)",
        border: `2px solid ${statusColors[step.status]}`,
        borderRadius: 6,
        fontSize: 10,
        padding: "6px 10px",
        width: 150,
        whiteSpace: "pre-line" as const,
      },
    };
  });

  const edges: Edge[] = [];
  for (let i = 1; i < steps.length; i++) {
    edges.push({
      id: `${steps[i - 1].calc_id}-${steps[i].calc_id}`,
      source: steps[i - 1].calc_id,
      target: steps[i].calc_id,
      animated: steps[i].status === "running",
      style: { stroke: statusColors[steps[i - 1].status] },
    });
  }

  return { nodes, edges };
}

export default function PipelineDAG({ steps }: PipelineDAGProps) {
  const { nodes, edges } = useMemo(() => layoutSteps(steps), [steps]);

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Run the pipeline to see execution progress
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
