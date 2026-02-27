import { useEffect, useState } from "react";
import { api } from "../api/client.ts";

export interface WorkflowState {
  id: string;
  label: string;
  badge_variant: string;
  transitions: string[];
}

interface WorkflowConfigResponse {
  workflow_id: string;
  description: string;
  states: WorkflowState[];
}

let cached: WorkflowState[] | null = null;

/** Default fallback states matching the hardcoded Submissions view logic. */
const FALLBACK_STATES: WorkflowState[] = [
  { id: "pending", label: "Pending", badge_variant: "info", transitions: ["in_review", "approved", "rejected"] },
  { id: "in_review", label: "In Review", badge_variant: "warning", transitions: ["approved", "rejected"] },
  { id: "approved", label: "Approved", badge_variant: "success", transitions: ["implemented"] },
  { id: "rejected", label: "Rejected", badge_variant: "error", transitions: ["pending"] },
  { id: "implemented", label: "Implemented", badge_variant: "success", transitions: [] },
];

export function useWorkflowStates(workflowId: string): WorkflowState[] {
  const [states, setStates] = useState<WorkflowState[]>(cached ?? FALLBACK_STATES);

  useEffect(() => {
    if (cached) return;
    api
      .get<WorkflowConfigResponse>(`/metadata/workflows/${workflowId}`)
      .then((config) => {
        if (config.states.length > 0) {
          cached = config.states;
          setStates(config.states);
        }
      })
      .catch(() => {
        // Fallback to hardcoded states
      });
  }, [workflowId]);

  return states;
}
