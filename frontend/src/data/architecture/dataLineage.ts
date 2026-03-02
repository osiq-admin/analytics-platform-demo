import type { ViewTrace } from "../architectureRegistryTypes";

export const dataLineageSections: ViewTrace = {
  viewId: "lineage",
  viewName: "Data Lineage",
  route: "/lineage",
  sections: [
    {
      id: "lineage.explorer-hero-graph",
      displayName: "Lineage Explorer Hero Graph",
      viewId: "lineage",
      description:
        "End-to-end pipeline visualization with tier swim lanes (Landing→Bronze→Silver→Gold), animated data flow edges, calculation→alert chain overlay, and composable 6-layer display. Uses React Flow + dagre for LR layout with TB overlay for the detection pipeline.",
      files: [
        { path: "frontend/src/views/DataLineage/LineageExplorerTab.tsx", role: "Hero graph with tier swim lanes, calc chain, animated edges" },
        { path: "frontend/src/views/DataLineage/index.tsx", role: "View shell with entity/layer toolbar, 3-tab layout" },
      ],
      stores: [
        {
          name: "lineageStore",
          path: "frontend/src/stores/lineageStore.ts",
          role: "Manages unified graph, entity/layer selection, alert lineage state",
        },
      ],
      apis: [
        { method: "GET", path: "/api/lineage/graph", role: "Composable unified graph (entities + layers filter)", routerFile: "backend/api/lineage.py" },
        { method: "GET", path: "/api/lineage/tiers/{entity}", role: "Single entity tier flow", routerFile: "backend/api/lineage.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/medallion/pipeline_stages.json", category: "metadata", role: "Tier flow graph source (8 stages, entity lists)" },
        { path: "workspace/metadata/calculations/", category: "metadata", role: "Calc DAG source (10 calcs, 4 layers, depends_on)" },
        { path: "workspace/metadata/detection_models/", category: "metadata", role: "Model→calc links (5 models, strictness, regulatory_coverage)" },
      ],
      technologies: [
        { name: "React Flow", role: "Graph rendering with custom nodes, animated edges" },
        { name: "dagre", role: "Automatic LR graph layout" },
        { name: "Zustand", role: "State management for graph data and UI state" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Graph built from pipeline_stages, calculations, detection_models metadata with composable 6-layer rendering",
    },
    {
      id: "lineage.quality-overlay",
      displayName: "ISO 8000 Quality Overlay",
      viewId: "lineage",
      description:
        "Quality scores (ISO 8000-61) at every lineage node across 6 ISO 25012 dimensions: completeness, validity, accuracy, consistency, timeliness, uniqueness. Color badges: green >95%, amber 80-95%, red <80%.",
      files: [
        { path: "frontend/src/views/DataLineage/LineageExplorerTab.tsx", role: "Quality badges on tier nodes" },
      ],
      stores: [
        { name: "lineageStore", path: "frontend/src/stores/lineageStore.ts", role: "Manages quality overlay data per node" },
      ],
      apis: [
        { method: "GET", path: "/api/lineage/tiers/{entity}/quality", role: "ISO 8000 quality overlay per entity tier nodes", routerFile: "backend/api/lineage.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/observability/lineage_standards.json", category: "metadata", role: "ISO 8000/25012 standards alignment reference" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Quality scores derived from contract_validator and quality_engine metadata with ISO 8000/25012 dimension mappings",
    },
    {
      id: "lineage.regulatory-overlay",
      displayName: "Regulatory Compliance Overlay",
      viewId: "lineage",
      description:
        "Toggle to show regulation badges on nodes/fields: MAR Art.16 (blue), MiFID II RTS 25 (green), Dodd-Frank (red), FINRA (orange). Shows which regulations require which data fields and detection capabilities.",
      files: [
        { path: "frontend/src/views/DataLineage/index.tsx", role: "Regulatory toggle button in toolbar" },
        { path: "frontend/src/views/DataLineage/LineageExplorerTab.tsx", role: "Renders regulatory badges on nodes" },
      ],
      stores: [
        { name: "lineageStore", path: "frontend/src/stores/lineageStore.ts", role: "Manages showRegulatoryOverlay state" },
      ],
      apis: [],
      dataSources: [
        { path: "workspace/metadata/standards/compliance/", category: "metadata", role: "Regulatory requirements (MAR, MiFID II, Dodd-Frank, FINRA, EMIR, SEC)" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Regulatory badges sourced from compliance standards metadata (MAR, MiFID II, Dodd-Frank, FINRA, EMIR, SEC)",
    },
    {
      id: "lineage.coverage-matrix",
      displayName: "Surveillance Coverage Matrix",
      viewId: "lineage",
      description:
        "Products × abuse types matrix with regulatory gap analysis. Cross-references 50 products × 5 abuse types × 5 models × 6 regulations. Green = covered, Red = gap, Amber = partial. Modal overlay with gap detail.",
      files: [
        { path: "frontend/src/views/DataLineage/index.tsx", role: "CoverageModal component with matrix grid" },
      ],
      stores: [
        { name: "lineageStore", path: "frontend/src/stores/lineageStore.ts", role: "Manages coverage data state" },
      ],
      apis: [
        { method: "GET", path: "/api/lineage/coverage", role: "Products × abuse types coverage matrix with regulatory gaps", routerFile: "backend/api/lineage.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/observability/coverage_config.json", category: "metadata", role: "Coverage config (abuse types, product groupings, regulatory mappings)" },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Coverage matrix cross-references products, detection_models, abuse types, and regulatory requirements from metadata",
    },
    {
      id: "lineage.field-tracing",
      displayName: "Field Tracing",
      viewId: "lineage",
      description:
        "Field-level provenance explorer. Select entity + field → horizontal chain graph showing field transformation through each tier with data type, expression, quality score per hop, and regulatory badges.",
      files: [
        { path: "frontend/src/views/DataLineage/FieldTracingTab.tsx", role: "Field chain graph with entity/field dropdowns" },
      ],
      stores: [
        { name: "lineageStore", path: "frontend/src/stores/lineageStore.ts", role: "Manages fieldTraces and selectedField state" },
      ],
      apis: [
        { method: "GET", path: "/api/lineage/fields/{entity}", role: "All field traces for entity", routerFile: "backend/api/lineage.py" },
        { method: "GET", path: "/api/lineage/fields/{entity}/{field}", role: "Single field end-to-end trace", routerFile: "backend/api/lineage.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/mappings/", category: "metadata", role: "47+ field mapping definitions (4 files: execution/order/product bronze→silver + silver→gold)" },
      ],
      technologies: [
        { name: "React Flow", role: "Field chain graph visualization" },
        { name: "dagre", role: "LR layout for chain graph" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Field traces built from mapping metadata (47+ field_mappings) and calculation inputs/output arrays",
    },
    {
      id: "lineage.impact-analysis",
      displayName: "Impact Analysis + What-If",
      viewId: "lineage",
      description:
        "Weighted BFS impact analysis with MUST_PASS (hard, red) and OPTIONAL (soft, amber) edge propagation. Includes what-if threshold simulator: preview alert count changes before modifying detection settings.",
      files: [
        { path: "frontend/src/views/DataLineage/ImpactAnalysisTab.tsx", role: "Impact graph with hard/soft distinction, what-if slider" },
      ],
      stores: [
        { name: "lineageStore", path: "frontend/src/stores/lineageStore.ts", role: "Manages impactResult, impactDirection, settingsPreview state" },
      ],
      apis: [
        { method: "GET", path: "/api/lineage/impact/{node_id}", role: "Weighted BFS impact from any node", routerFile: "backend/api/lineage.py" },
        { method: "POST", path: "/api/lineage/settings/preview", role: "What-if threshold change preview", routerFile: "backend/api/lineage.py" },
      ],
      dataSources: [
        { path: "workspace/metadata/settings/", category: "metadata", role: "Detection settings for what-if simulation" },
      ],
      technologies: [
        { name: "React Flow", role: "Impact graph with highlighting" },
        { name: "React 19", role: "Slider and preview panel" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Impact analysis uses weighted BFS on metadata-derived graph; what-if simulator reads settings metadata for threshold preview",
    },
    {
      id: "lineage.alert-explainability",
      displayName: "Alert Explainability Tunnel",
      viewId: "lineage",
      description:
        "Full data-to-alert provenance chain for any alert. Click alert → see exact path: source entity data → tier flow → Gold tier → calculation inputs → calc DAG → detection model → this specific alert. Click-through from Risk Case Manager.",
      files: [
        { path: "frontend/src/views/DataLineage/index.tsx", role: "Reads alert query param, auto-fetches and highlights provenance chain" },
        { path: "frontend/src/views/RiskCaseManager/AlertDetail/CalculationTrace.tsx", role: "View Full Lineage button navigating to /lineage?alert={id}" },
      ],
      stores: [
        { name: "lineageStore", path: "frontend/src/stores/lineageStore.ts", role: "Manages alertLineage and selectedAlertId state" },
      ],
      apis: [
        { method: "GET", path: "/api/lineage/alert/{alert_id}", role: "Full data-to-alert provenance chain", routerFile: "backend/api/lineage.py" },
      ],
      dataSources: [
        { path: "workspace/alerts/traces/", category: "data", role: "82 alert traces with calculation scores and settings resolution" },
      ],
      technologies: [
        { name: "React Router", role: "Query param navigation from Risk Case Manager" },
        { name: "React Flow", role: "Highlighted provenance chain graph" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Alert provenance chain built from alert traces, calculation scores, detection model definitions, and tier flow metadata",
    },
    {
      id: "lineage.store",
      displayName: "Lineage Store",
      viewId: "lineage",
      description:
        "Zustand store managing 6-layer composable lineage graph state: unified graph, tier graph, field traces, impact analysis, what-if preview, surveillance coverage, alert lineage, quality overlay, and UI state (active tab, layers, regulatory toggle).",
      files: [
        { path: "frontend/src/stores/lineageStore.ts", role: "Central state management for all lineage features" },
      ],
      stores: [],
      apis: [],
      dataSources: [],
      technologies: [
        { name: "Zustand", role: "State management with API integration" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation: "Store fetches all data from metadata-driven APIs; no hardcoded graph data",
    },
  ],
};
