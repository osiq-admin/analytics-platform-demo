import type { ViewTrace } from "../architectureRegistryTypes";

export const modelComposerSections: ViewTrace = {
  viewId: "models",
  viewName: "Model Composer",
  route: "/models",
  sections: [
    {
      id: "models.model-list",
      displayName: "Model List",
      viewId: "models",
      description:
        "Custom button list of detection models with layer badges (OOB/custom). Shows model name, layer badge, and calculation count for each model.",
      files: [
        { path: "frontend/src/views/ModelComposer/index.tsx", role: "Main view layout with model list" },
        { path: "frontend/src/stores/metadataStore.ts", role: "Fetches detection model metadata" },
        { path: "backend/api/metadata.py", role: "Serves detection model metadata" },
      ],
      stores: [
        {
          name: "metadataStore",
          path: "frontend/src/stores/metadataStore.ts",
          role: "Provides detection models array from metadata API",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/detection-models",
          role: "Returns all detection model definitions",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/detection_models/*.json",
          category: "metadata",
          role: "Detection model JSON definitions",
          editHint: "Add JSON files to define new detection models",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Model list populated entirely from detection model JSON files. New model files are automatically discovered.",
    },
    {
      id: "models.model-detail",
      displayName: "Model Detail",
      viewId: "models",
      description:
        "Detailed view of selected detection model showing name, description, and a calculations-and-scoring panel listing each referenced calculation with its strictness badge.",
      files: [
        { path: "frontend/src/views/ModelComposer/index.tsx", role: "Renders model detail panels" },
        { path: "frontend/src/stores/metadataStore.ts", role: "Provides selected model data" },
      ],
      stores: [
        {
          name: "metadataStore",
          path: "frontend/src/stores/metadataStore.ts",
          role: "Provides detection model object with full configuration",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/metadata/detection_models/*.json",
          category: "metadata",
          role: "Detection model definitions with scoring and calculation references",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "All displayed model properties come from detection model metadata JSON.",
    },
    {
      id: "models.create-wizard",
      displayName: "Create/Edit Wizard",
      viewId: "models",
      description:
        "Multi-step wizard (7 steps) for creating or editing detection models. Steps: Define, Select Calculations, Configure Scoring, Query, Test Run, Review, Deploy. Wizard structure driven by model JSON schema.",
      files: [
        {
          path: "frontend/src/views/ModelComposer/ModelCreateForm.tsx",
          role: "Wizard container managing step flow",
        },
        {
          path: "frontend/src/views/ModelComposer/WizardProgress.tsx",
          role: "Step progress indicator",
        },
        {
          path: "frontend/src/views/ModelComposer/steps/DefineStep.tsx",
          role: "Step 1: Basic model definition",
        },
        {
          path: "frontend/src/views/ModelComposer/steps/SelectCalcsStep.tsx",
          role: "Step 2: Select calculations",
        },
        {
          path: "frontend/src/views/ModelComposer/steps/ConfigureScoringStep.tsx",
          role: "Step 3: Configure scoring rules",
        },
        {
          path: "frontend/src/views/ModelComposer/steps/QueryStep.tsx",
          role: "Step 4: Define query patterns",
        },
        {
          path: "frontend/src/views/ModelComposer/steps/TestRunStep.tsx",
          role: "Step 5: Test run the model",
        },
        {
          path: "frontend/src/views/ModelComposer/steps/ReviewStep.tsx",
          role: "Step 6: Review configuration",
        },
        {
          path: "frontend/src/views/ModelComposer/steps/DeployStep.tsx",
          role: "Step 7: Deploy model",
        },
        { path: "backend/api/metadata.py", role: "Handles model create/update" },
      ],
      stores: [
        {
          name: "metadataStore",
          path: "frontend/src/stores/metadataStore.ts",
          role: "Provides model CRUD operations",
        },
      ],
      apis: [
        {
          method: "POST",
          path: "/api/metadata/detection-models",
          role: "Creates new detection model",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "PUT",
          path: "/api/metadata/detection-models/{id}",
          role: "Updates existing detection model",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/detection_models/*.json",
          category: "metadata",
          role: "Target for model create/update saves",
        },
        {
          path: "workspace/metadata/calculations/**/*.json",
          category: "metadata",
          role: "Available calculations for step 2 selection",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Wizard steps driven by model JSON schema. Calculation selection from metadata. Scoring configuration references metadata-defined calculations.",
    },
    {
      id: "models.validation-panel",
      displayName: "Validation Panel",
      viewId: "models",
      description:
        "Validates detection model configuration against schema and business rules. Checks calculation references, scoring consistency, and required fields.",
      files: [
        { path: "frontend/src/views/ModelComposer/index.tsx", role: "Displays validation results" },
        { path: "backend/api/validation.py", role: "Performs model validation" },
      ],
      stores: [
        {
          name: "metadataStore",
          path: "frontend/src/stores/metadataStore.ts",
          role: "Provides model data for validation",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/metadata/detection_models/*.json",
          category: "metadata",
          role: "Model definitions to validate",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Validation checks metadata references (calculation IDs, field names) but some rules are code-driven.",
    },
    {
      id: "models.preview-panel",
      displayName: "Preview Panel",
      viewId: "models",
      description:
        "Preview of model configuration showing how the model will appear and behave once deployed. Read-only summary of all model settings.",
      files: [
        { path: "frontend/src/views/ModelComposer/index.tsx", role: "Renders model preview" },
      ],
      stores: [
        {
          name: "metadataStore",
          path: "frontend/src/stores/metadataStore.ts",
          role: "Provides model configuration for preview",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/metadata/detection_models/*.json",
          category: "metadata",
          role: "Model definition rendered in preview",
        },
      ],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Preview content comes from model metadata but display formatting is code-driven.",
    },
    {
      id: "models.dependency-dag",
      displayName: "Dependency DAG",
      viewId: "models",
      description:
        "Mini DAG showing the selected model's calculation dependency tree. Visualizes how calculations feed into the model's scoring logic.",
      files: [
        { path: "frontend/src/views/ModelComposer/index.tsx", role: "Integrates mini DAG" },
        {
          path: "frontend/src/components/DependencyMiniDAG.tsx",
          role: "Reusable mini DAG component",
        },
      ],
      stores: [
        {
          name: "metadataStore",
          path: "frontend/src/stores/metadataStore.ts",
          role: "Provides model calculation references",
        },
      ],
      apis: [],
      dataSources: [
        {
          path: "workspace/metadata/detection_models/*.json",
          category: "metadata",
          role: "Model calculation references for DAG edges",
        },
        {
          path: "workspace/metadata/calculations/**/*.json",
          category: "metadata",
          role: "Calculation definitions for DAG nodes",
        },
      ],
      technologies: [{ name: "React Flow", role: "Mini dependency graph rendering" }],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "DAG edges derive from model's calculation references and calculation depends_on arrays. All metadata.",
    },
    {
      id: "models.ai-chat",
      displayName: "AI Assistant",
      viewId: "models",
      description:
        "Chat panel for AI-assisted model composition. Can suggest calculations, scoring rules, and configuration improvements. Uses shared ChatPanel component.",
      files: [
        { path: "frontend/src/views/ModelComposer/index.tsx", role: "Integrates chat panel" },
        { path: "frontend/src/views/AIAssistant/ChatPanel.tsx", role: "Shared chat UI component" },
        { path: "backend/api/ai.py", role: "AI chat endpoint" },
      ],
      stores: [],
      apis: [
        {
          method: "POST",
          path: "/api/ai/chat",
          role: "Processes AI chat messages for model composition help",
          routerFile: "backend/api/ai.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/ai_mock_sequences.json",
          category: "config",
          role: "Mock AI responses for demo mode",
        },
      ],
      technologies: [],
      metadataMaturity: "mixed",
      maturityExplanation:
        "Mock sequences are metadata-like config; chat UI and AI interaction logic are code-driven.",
      metadataOpportunities: [
        "Feed model metadata context into AI prompts automatically",
        "Allow mock sequences to be model-specific",
      ],
    },
  ],
};
