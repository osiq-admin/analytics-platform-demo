import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 7. Pipeline Monitor
// --------------------------------------------------------------------------
export const pipelineOperations: ViewOperations = {
  viewId: "pipeline",
  label: "Pipeline Monitor",
  operations: [
    {
      id: "view_pipeline_dag",
      name: "View Pipeline DAG",
      description:
        "Visualize the full detection pipeline as a directed graph — from data ingestion through calculations to alert generation.",
    },
    {
      id: "run_pipeline",
      name: "Run Pipeline",
      description:
        "Execute the detection pipeline and watch each stage process in real-time. See timing, row counts, and status for every step.",
    },
    {
      id: "check_status",
      name: "Check Execution Status",
      description:
        "Review the status of each pipeline stage: pending, running, completed, or failed. Click a node for detailed execution logs.",
    },
    {
      id: "view_execution_history",
      name: "View Execution History",
      description:
        "Browse past pipeline runs to compare timing, identify bottlenecks, and track changes in detection results over time.",
    },
    {
      id: "run_medallion_stage",
      name: "Run Medallion Stage",
      description:
        "Execute a specific pipeline stage (e.g., Silver-to-Gold) using the metadata-driven orchestrator.",
      scenarioId: "s30_pipeline_orchestration",
    },
    {
      id: "view_contract_validation",
      name: "View Contract Validation",
      description:
        "After running a pipeline stage, review the contract validation results showing quality rule pass/fail status and quality score.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Green nodes are completed, yellow are running, red indicate failures",
    "Click any pipeline node to see its execution log and row counts",
    "The pipeline DAG updates in real-time during execution",
    "Pipeline stages are loaded from metadata — edit pipeline_stages.json to add or modify stages",
  ],
};
