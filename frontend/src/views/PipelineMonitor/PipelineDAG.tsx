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

  // Build edges from actual depends_on
  const stepIds = new Set(steps.map((s) => s.calc_id));
  for (const step of steps) {
    if (step.depends_on) {
      for (const dep of step.depends_on) {
        if (stepIds.has(dep)) {
          g.setEdge(dep, step.calc_id);
        }
      }
    }
  }
  // Fallback for steps with empty depends_on (connect from previous layer)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (i > 0 && (!step.depends_on || step.depends_on.length === 0)) {
      const prevLayerSteps = steps.filter((s, j) => j < i && s.layer !== step.layer);
      if (prevLayerSteps.length > 0) {
        g.setEdge(prevLayerSteps[prevLayerSteps.length - 1].calc_id, step.calc_id);
      }
    }
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

  const stepMap = new Map(steps.map((s) => [s.calc_id, s]));
  const edges: Edge[] = g.edges().map((e) => ({
    id: `${e.v}-${e.w}`,
    source: e.v,
    target: e.w,
    animated: stepMap.get(e.w)?.status === "running",
    style: { stroke: statusColors[stepMap.get(e.v)?.status ?? "pending"] },
  }));

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
