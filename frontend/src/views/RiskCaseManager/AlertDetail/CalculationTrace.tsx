import { useMemo } from "react";
import { ReactFlow, Background, type Node, type Edge } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import type { AlertTrace } from "../../../stores/alertStore.ts";
import { formatLabel } from "../../../utils/format.ts";

interface CalculationTraceProps {
  alert: AlertTrace;
}

function layoutTrace(alert: AlertTrace) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 60 });

  g.setNode("model", { width: 180, height: 50 });

  for (const cs of alert.calculation_scores) {
    g.setNode(cs.calc_id, { width: 180, height: 60 });
    g.setEdge("model", cs.calc_id);
  }

  dagre.layout(g);

  const nodes: Node[] = [];

  const modelPos = g.node("model");
  nodes.push({
    id: "model",
    position: { x: modelPos.x - 90, y: modelPos.y - 25 },
    data: {
      label: `${formatLabel(alert.model_id)}\nScore: ${alert.accumulated_score} / ${alert.score_threshold}`,
    },
    style: {
      background: "var(--color-surface-elevated)",
      color: "var(--color-foreground)",
      border: `2px solid ${alert.alert_fired ? "var(--color-destructive)" : "var(--color-success)"}`,
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 600,
      padding: "8px 14px",
      width: 180,
      whiteSpace: "pre-line" as const,
      textAlign: "center" as const,
    },
  });

  for (const cs of alert.calculation_scores) {
    const pos = g.node(cs.calc_id);
    const passed = cs.threshold_passed;
    const isMustPass = cs.strictness === "MUST_PASS";

    nodes.push({
      id: cs.calc_id,
      position: { x: pos.x - 90, y: pos.y - 30 },
      data: {
        label: `${formatLabel(cs.calc_id)}\nValue: ${(cs.computed_value ?? cs.raw_value ?? 0).toFixed(2)}\nScore: ${cs.score}`,
      },
      style: {
        background: "var(--color-surface-elevated)",
        color: "var(--color-foreground)",
        border: `2px solid ${
          passed
            ? "var(--color-success)"
            : isMustPass
              ? "var(--color-destructive)"
              : "var(--color-warning)"
        }`,
        borderRadius: 6,
        fontSize: 10,
        padding: "6px 10px",
        width: 180,
        whiteSpace: "pre-line" as const,
      },
    });
  }

  const edges: Edge[] = alert.calculation_scores.map((cs) => ({
    id: `model-${cs.calc_id}`,
    source: "model",
    target: cs.calc_id,
    style: { stroke: cs.threshold_passed ? "var(--color-success)" : "var(--color-border)" },
    animated: false,
  }));

  return { nodes, edges };
}

export default function CalculationTrace({ alert }: CalculationTraceProps) {
  const { nodes, edges } = useMemo(() => layoutTrace(alert), [alert]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
    >
      <Background color="var(--color-border)" gap={20} size={1} />
    </ReactFlow>
  );
}
