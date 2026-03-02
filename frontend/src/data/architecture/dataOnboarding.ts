import type { ViewTrace } from "../architectureRegistryTypes";

export const dataOnboardingSections: ViewTrace = {
  viewId: "onboarding",
  viewName: "Data Onboarding",
  route: "/onboarding",
  sections: [
    {
      id: "onboarding.steps",
      displayName: "Onboarding Wizard Steps",
      viewId: "onboarding",
      description:
        "5-step wizard guiding the user through file upload, schema detection, quality profiling, entity mapping, and ingestion confirmation. Step transitions are managed by React state machine in the view component.",
      files: [
        { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders wizard steps and manages step state transitions" },
      ],
      stores: [],
      apis: [
        {
          method: "POST",
          path: "/api/onboarding/upload",
          role: "Accepts file upload and returns detected schema",
          routerFile: "backend/api/onboarding.py",
        },
      ],
      dataSources: [],
      technologies: [
        { name: "React", role: "Component state machine for wizard step progression" },
      ],
      metadataMaturity: "code-driven",
      maturityExplanation:
        "Wizard step sequence and transitions are hardcoded in the React component. Step definitions could be externalized to metadata in the future.",
      metadataOpportunities: [
        "Externalize wizard step definitions to metadata JSON",
        "Make connector types configurable via metadata",
      ],
    },
    {
      id: "onboarding.schema",
      displayName: "Schema Detection",
      viewId: "onboarding",
      description:
        "Auto-detects column names, data types, nullability, and domain patterns (ISIN, MIC, ISO8601, LEI) from uploaded file samples using PyArrow type inference and connector metadata.",
      files: [
        { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders detected schema table with column types and patterns" },
        { path: "backend/api/onboarding.py", role: "Runs PyArrow schema inference on uploaded files" },
      ],
      stores: [],
      apis: [
        {
          method: "POST",
          path: "/api/onboarding/upload",
          role: "Returns auto-detected schema with column types and patterns",
          routerFile: "backend/api/onboarding.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/standards/iso",
          category: "metadata",
          role: "ISO standard patterns used for column value recognition (ISIN, MIC, LEI, etc.)",
        },
      ],
      technologies: [
        { name: "PyArrow", role: "Schema inference engine for CSV, Parquet, and JSON files" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Schema detection uses PyArrow auto-inference combined with ISO standard pattern metadata for domain recognition. Column types and patterns are derived entirely from data and metadata — no hardcoded schema definitions.",
      metadataOpportunities: [],
    },
    {
      id: "onboarding.profile",
      displayName: "Data Quality Profile",
      viewId: "onboarding",
      description:
        "Profiles each column for completeness, null rates, distinct counts, min/max values, and computes an overall quality score. Uses PyArrow compute functions for statistics.",
      files: [
        { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders quality profile table with per-column statistics and overall score" },
        { path: "backend/api/onboarding.py", role: "Computes column-level quality statistics using PyArrow compute" },
      ],
      stores: [],
      apis: [
        {
          method: "POST",
          path: "/api/onboarding/profile",
          role: "Returns per-column quality statistics and overall quality score",
          routerFile: "backend/api/onboarding.py",
        },
      ],
      dataSources: [],
      technologies: [
        { name: "PyArrow", role: "Compute functions for column-level statistics (null counts, distinct, min/max)" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Quality profiling output is computed entirely from the uploaded data using PyArrow compute functions. Statistics and quality scores are derived from data — no hardcoded quality rules.",
      metadataOpportunities: [],
    },
    {
      id: "onboarding.title",
      displayName: "View Header",
      viewId: "onboarding",
      description:
        "Static header displaying 'Data Onboarding' title with a step counter badge showing current progress through the 5-step wizard.",
      files: [
        { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders view header with step badge" },
      ],
      stores: [],
      apis: [],
      dataSources: [],
      technologies: [],
      metadataMaturity: "code-driven",
      maturityExplanation:
        "Header text and step counter are hardcoded in the component.",
      metadataOpportunities: [
        "Load view title from view_config metadata",
      ],
    },
    {
      id: "onboarding.select-source",
      displayName: "Select Source",
      viewId: "onboarding",
      description:
        "Step 1 panel for file upload and connector selection. Shows available connectors loaded from the onboarding API and a file input for CSV/Parquet/JSON upload.",
      files: [
        { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders file upload and connector cards" },
        { path: "backend/api/onboarding.py", role: "Lists available connectors and handles file upload" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/onboarding/connectors",
          role: "Returns available data connectors",
          routerFile: "backend/api/onboarding.py",
        },
        {
          method: "POST",
          path: "/api/onboarding/upload",
          role: "Accepts file upload and returns detected schema",
          routerFile: "backend/api/onboarding.py",
        },
      ],
      dataSources: [],
      technologies: [],
      metadataMaturity: "mixed",
      maturityExplanation:
        "Connector list is loaded from the API (metadata-driven), but the upload UI and step flow are code-driven.",
      metadataOpportunities: [],
    },
    {
      id: "onboarding.map-entity",
      displayName: "Map to Entity",
      viewId: "onboarding",
      description:
        "Step 4 panel for mapping uploaded columns to a target entity. Entity selector loads available entities from metadata API; auto-suggests field mappings by matching column names.",
      files: [
        { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders entity selector and field mapping table" },
        { path: "backend/api/metadata.py", role: "Returns entity list and field definitions" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/entities",
          role: "Returns available entities for mapping target",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/entities/{id}",
          role: "Returns entity fields for mapping suggestions",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/entities/*.json",
          category: "metadata",
          role: "Entity definitions used as mapping targets",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Entity list and field definitions are loaded from metadata. Auto-mapping uses entity field names for suggestions. Mapping creates a draft mapping definition in the mappings API.",
      metadataOpportunities: [],
    },
    {
      id: "onboarding.confirm",
      displayName: "Confirmation",
      viewId: "onboarding",
      description:
        "Step 5 panel showing onboarding summary after confirmation: filename, format, row count, column count, quality score, and target entity. Includes a reset button to start a new upload.",
      files: [
        { path: "frontend/src/views/DataOnboarding/index.tsx", role: "Renders confirmation summary with job details" },
        { path: "backend/api/onboarding.py", role: "Confirms onboarding job and sets target entity" },
      ],
      stores: [],
      apis: [
        {
          method: "POST",
          path: "/api/onboarding/jobs/{job_id}/confirm",
          role: "Confirms the onboarding job with target entity",
          routerFile: "backend/api/onboarding.py",
        },
      ],
      dataSources: [],
      technologies: [],
      metadataMaturity: "mixed",
      maturityExplanation:
        "Confirmation summary data comes from the onboarding job result. Layout is code-driven.",
      metadataOpportunities: [],
    },
  ],
};
