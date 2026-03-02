import type { ViewTrace } from "../architectureRegistryTypes";

export const pipelineMonitorSections: ViewTrace = {
  viewId: "pipeline",
  viewName: "Pipeline Monitor",
  route: "/pipeline",
  sections: [
    {
      id: "pipeline.execution-dag",
      displayName: "Execution DAG",
      viewId: "pipeline",
      description:
        "React Flow graph visualizing pipeline execution flow with true dependency edges from the depends_on field in calculation metadata. Nodes represent calculation steps with execution status (pending/running/complete/error). Edges reflect actual upstream/downstream relationships, not a linear chain.",
      files: [
        {
          path: "frontend/src/views/PipelineMonitor/PipelineDAG.tsx",
          role: "React Flow pipeline execution graph",
        },
        { path: "frontend/src/stores/pipelineStore.ts", role: "Provides pipeline DAG and status" },
        { path: "backend/api/pipeline.py", role: "Returns pipeline DAG structure" },
      ],
      stores: [
        {
          name: "pipelineStore",
          path: "frontend/src/stores/pipelineStore.ts",
          role: "Provides DAG structure and execution status",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/pipeline/dag",
          role: "Returns pipeline execution DAG structure",
          routerFile: "backend/api/pipeline.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/calculations/**/*.json",
          category: "metadata",
          role: "Calculation depends_on relationships defining pipeline order",
        },
      ],
      technologies: [
        { name: "React Flow", role: "Interactive pipeline DAG rendering" },
        { name: "Dagre", role: "Automatic hierarchical DAG layout" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "DAG structure and edges derive from calculation depends_on metadata. Adding or changing calculation dependencies automatically updates the graph topology.",
    },
    {
      id: "pipeline.steps-table",
      displayName: "Pipeline Steps",
      viewId: "pipeline",
      description:
        "Table of pipeline execution steps with real-time status updates via WebSocket. Shows step name, status, duration, and row counts. Step names come from calculation metadata.",
      files: [
        { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Main view with steps table" },
        { path: "frontend/src/stores/pipelineStore.ts", role: "Manages pipeline state and WebSocket" },
        { path: "backend/api/pipeline.py", role: "Provides pipeline status" },
        { path: "backend/api/ws.py", role: "WebSocket endpoint for real-time updates" },
      ],
      stores: [
        {
          name: "pipelineStore",
          path: "frontend/src/stores/pipelineStore.ts",
          role: "Manages pipeline steps, status, and WebSocket connection",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/pipeline/status",
          role: "Returns current pipeline execution status",
          routerFile: "backend/api/pipeline.py",
        },
        {
          method: "WS",
          path: "/ws/pipeline",
          role: "Real-time pipeline status updates",
          routerFile: "backend/api/ws.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/calculations/**/*.json",
          category: "metadata",
          role: "Step names derived from calculation metadata",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Step names come from calculation metadata; status, duration, and runtime behavior are code-driven.",
    },
    {
      id: "pipeline.run-button",
      displayName: "Run Pipeline",
      viewId: "pipeline",
      description:
        "Button to trigger full pipeline execution. Initiates the calculation and detection engine sequence.",
      files: [
        { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Run button and trigger logic" },
        { path: "frontend/src/stores/pipelineStore.ts", role: "Provides runPipeline action" },
        { path: "backend/api/pipeline.py", role: "Handles pipeline execution trigger" },
      ],
      stores: [
        {
          name: "pipelineStore",
          path: "frontend/src/stores/pipelineStore.ts",
          role: "Provides runPipeline action",
        },
      ],
      apis: [
        {
          method: "POST",
          path: "/api/pipeline/run",
          role: "Triggers pipeline execution",
          routerFile: "backend/api/pipeline.py",
        },
      ],
      dataSources: [],
      technologies: [],
      metadataMaturity: "infrastructure",
      maturityExplanation:
        "Pipeline trigger is an infrastructure operation. The pipeline itself executes metadata-driven calculations, but the button is a fixed UI element.",
    },
    {
      id: "pipeline.medallion-stages",
      displayName: "Medallion Stage Progress",
      viewId: "pipeline",
      description:
        "Horizontal row of stage buttons showing all medallion pipeline stages loaded from pipeline_stages.json metadata. Each stage button triggers the Pipeline Orchestrator with arrow separators between stages.",
      files: [
        { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Renders stage buttons with arrow separators" },
        { path: "backend/services/pipeline_orchestrator.py", role: "Metadata-driven stage dispatcher" },
        { path: "backend/api/pipeline.py", role: "Stage execution API endpoints" },
      ],
      stores: [
        {
          name: "pipelineStore",
          path: "frontend/src/stores/pipelineStore.ts",
          role: "Fetches stages and runs stage execution",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/pipeline/stages",
          role: "List pipeline stages",
          routerFile: "backend/api/pipeline.py",
        },
        {
          method: "POST",
          path: "/api/pipeline/stages/{stage_id}/run",
          role: "Execute pipeline stage",
          routerFile: "backend/api/pipeline.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/medallion/pipeline_stages.json",
          category: "metadata",
          role: "Pipeline stage definitions",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Pipeline stages, transformations, and dispatch all driven by metadata JSON. Adding a stage to pipeline_stages.json automatically makes it appear.",
    },
    {
      id: "pipeline.contract-validation",
      displayName: "Contract Validation Status",
      viewId: "pipeline",
      description:
        "Shows data contract validation results after running a pipeline stage. Quality rules from contract metadata evaluated against DuckDB tables.",
      files: [
        { path: "frontend/src/views/PipelineMonitor/index.tsx", role: "Renders contract validation table" },
        { path: "backend/services/contract_validator.py", role: "Evaluates quality rules against DuckDB" },
      ],
      stores: [
        {
          name: "pipelineStore",
          path: "frontend/src/stores/pipelineStore.ts",
          role: "Stores stage run result",
        },
      ],
      apis: [
        {
          method: "POST",
          path: "/api/pipeline/stages/{stage_id}/run",
          role: "Returns contract validation",
          routerFile: "backend/api/pipeline.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/medallion/contracts",
          category: "metadata",
          role: "Data contract definitions",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Contract rules, field mappings, and SLA thresholds all from metadata JSON. Validation logic is generic — driven entirely by contract definitions.",
    },
  ],
};
