import type { ViewTrace } from "../architectureRegistryTypes";

export const regulatoryMapSections: ViewTrace = {
  viewId: "regulatory",
  viewName: "Regulatory Map",
  route: "/regulatory",
  sections: [
    {
      id: "regulatory.summary-cards",
      displayName: "Coverage Summary",
      viewId: "regulatory",
      description:
        "Four KPI cards showing regulation coverage metrics: Total Requirements, Covered, Uncovered, and Coverage %. All derived from regulatory metadata.",
      files: [
        { path: "frontend/src/views/RegulatoryMap/index.tsx", role: "Summary cards rendering" },
        { path: "frontend/src/stores/regulatoryStore.ts", role: "Fetches regulatory coverage data" },
        { path: "backend/api/metadata.py", role: "Calculates regulatory coverage" },
      ],
      stores: [
        {
          name: "regulatoryStore",
          path: "frontend/src/stores/regulatoryStore.ts",
          role: "Provides coverage statistics",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/regulatory/coverage",
          role: "Returns regulatory coverage summary metrics",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/iso",
          role: "Returns ISO standards registry with field mappings",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/fix",
          role: "Returns FIX protocol field mappings",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/compliance",
          role: "Returns compliance requirements with implementation mappings",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/regulations/*.json",
          category: "metadata",
          role: "Regulation definition files with article and model mappings",
        },
        {
          path: "workspace/metadata/standards/iso_mapping.json",
          category: "metadata",
          role: "ISO standards registry with field mappings and validation rules",
        },
        {
          path: "workspace/metadata/standards/fix_protocol.json",
          category: "metadata",
          role: "FIX protocol field mappings with regulatory relevance",
        },
        {
          path: "workspace/metadata/standards/compliance_requirements.json",
          category: "metadata",
          role: "Granular compliance requirements mapped to implementations",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "All coverage metrics computed from regulation metadata files and their references to detection models.",
    },
    {
      id: "regulatory.traceability-graph",
      displayName: "Traceability Graph",
      viewId: "regulatory",
      description:
        "React Flow graph showing the full regulatory traceability chain: regulations -> articles -> detection models -> calculations. The core visualization of metadata-driven regulatory coverage.",
      files: [
        { path: "frontend/src/views/RegulatoryMap/index.tsx", role: "Traceability graph rendering" },
        { path: "frontend/src/stores/regulatoryStore.ts", role: "Provides traceability graph data" },
        { path: "backend/api/metadata.py", role: "Builds traceability graph from metadata" },
      ],
      stores: [
        {
          name: "regulatoryStore",
          path: "frontend/src/stores/regulatoryStore.ts",
          role: "Provides graph nodes and edges from API",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/regulatory/traceability-graph",
          role: "Returns traceability graph (nodes + edges) for React Flow",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/iso",
          role: "Returns ISO standards registry with field mappings",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/fix",
          role: "Returns FIX protocol field mappings",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/compliance",
          role: "Returns compliance requirements with implementation mappings",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/regulations/*.json",
          category: "metadata",
          role: "Regulation definitions with article-to-model mappings",
        },
        {
          path: "workspace/metadata/detection_models/*.json",
          category: "metadata",
          role: "Detection model definitions referenced by regulations",
        },
        {
          path: "workspace/metadata/calculations/**/*.json",
          category: "metadata",
          role: "Calculation definitions referenced by models",
        },
        {
          path: "workspace/metadata/standards/iso_mapping.json",
          category: "metadata",
          role: "ISO standards with field-level mappings to entity fields",
        },
        {
          path: "workspace/metadata/standards/fix_protocol.json",
          category: "metadata",
          role: "FIX protocol fields with regulatory relevance tags",
        },
        {
          path: "workspace/metadata/standards/compliance_requirements.json",
          category: "metadata",
          role: "Compliance requirements linked to detection models and calculations",
        },
      ],
      technologies: [
        { name: "React Flow", role: "Interactive traceability graph rendering" },
        { name: "Dagre", role: "Automatic hierarchical graph layout" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Graph is derived entirely from metadata relationships: regulations reference articles, articles map to models, models reference calculations. All metadata.",
    },
    {
      id: "regulatory.coverage-grid",
      displayName: "Coverage Grid",
      viewId: "regulatory",
      description:
        "AG Grid showing regulation details with columns: Regulation, Jurisdiction, Article, Title, and Coverage status badge. Tabular view of regulatory compliance.",
      files: [
        { path: "frontend/src/views/RegulatoryMap/index.tsx", role: "Coverage grid rendering" },
        { path: "frontend/src/stores/regulatoryStore.ts", role: "Provides regulation registry data" },
        { path: "backend/api/metadata.py", role: "Returns regulatory registry" },
      ],
      stores: [
        {
          name: "regulatoryStore",
          path: "frontend/src/stores/regulatoryStore.ts",
          role: "Provides regulation registry with coverage details",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/regulatory/registry",
          role: "Returns full regulatory registry with coverage status",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/iso",
          role: "Returns ISO standards registry with field mappings",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/fix",
          role: "Returns FIX protocol field mappings",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/compliance",
          role: "Returns compliance requirements with implementation mappings",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/regulations/*.json",
          category: "metadata",
          role: "Regulation definitions for registry display",
        },
        {
          path: "workspace/metadata/standards/iso_mapping.json",
          category: "metadata",
          role: "ISO standards referenced by regulation field requirements",
        },
        {
          path: "workspace/metadata/standards/fix_protocol.json",
          category: "metadata",
          role: "FIX protocol fields with regulatory relevance",
        },
        {
          path: "workspace/metadata/standards/compliance_requirements.json",
          category: "metadata",
          role: "Compliance requirements with coverage status",
        },
      ],
      technologies: [{ name: "AG Grid", role: "Regulatory coverage table" }],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Grid content populated entirely from regulation metadata. Adding a regulation JSON file automatically updates the grid.",
    },
    {
      id: "regulatory.suggestions",
      displayName: "Suggestions",
      viewId: "regulatory",
      description:
        "Coverage gap analysis and improvement suggestions. Identifies unmapped regulatory articles and suggests which detection models could address them.",
      files: [
        { path: "frontend/src/views/RegulatoryMap/index.tsx", role: "Suggestions panel rendering" },
        { path: "frontend/src/stores/regulatoryStore.ts", role: "Provides suggestions data" },
        { path: "backend/api/metadata.py", role: "Analyzes coverage gaps" },
      ],
      stores: [
        {
          name: "regulatoryStore",
          path: "frontend/src/stores/regulatoryStore.ts",
          role: "Provides coverage gap suggestions",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/regulatory/suggestions",
          role: "Returns coverage gap analysis and suggestions",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/iso",
          role: "Returns ISO standards registry with field mappings",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/fix",
          role: "Returns FIX protocol field mappings",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/compliance",
          role: "Returns compliance requirements with implementation mappings",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/regulations/*.json",
          category: "metadata",
          role: "Regulation metadata for gap analysis",
        },
        {
          path: "workspace/metadata/detection_models/*.json",
          category: "metadata",
          role: "Available models for mapping suggestions",
        },
        {
          path: "workspace/metadata/standards/iso_mapping.json",
          category: "metadata",
          role: "ISO standards for compliance gap identification",
        },
        {
          path: "workspace/metadata/standards/fix_protocol.json",
          category: "metadata",
          role: "FIX protocol mappings for regulatory gap analysis",
        },
        {
          path: "workspace/metadata/standards/compliance_requirements.json",
          category: "metadata",
          role: "Compliance requirements for gap analysis and suggestions",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Suggestions are computed by analyzing metadata relationships. Gap detection is purely metadata-based.",
    },
    {
      id: "regulatory.standards-compliance",
      displayName: "Standards Compliance",
      viewId: "regulatory",
      description:
        "Standards compliance matrix with BCBS 239 principle mapping, evidence links, and gap analysis. Shows how the platform aligns with 18 international standards across 48 controls.",
      files: [
        { path: "frontend/src/views/RegulatoryMap/index.tsx", role: "Standards compliance tab rendering" },
        { path: "frontend/src/stores/regulatoryStore.ts", role: "Fetches compliance matrix and BCBS 239 data" },
        { path: "backend/api/metadata.py", role: "Serves compliance matrix and BCBS 239 endpoints" },
        { path: "backend/services/metadata_service.py", role: "Loads compliance matrix and BCBS 239 JSON files" },
      ],
      stores: [
        {
          name: "regulatoryStore",
          path: "frontend/src/stores/regulatoryStore.ts",
          role: "Provides compliance matrix and BCBS 239 data via lazy loading",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/standards/compliance-matrix",
          role: "Returns the standards compliance matrix with controls and evidence links",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/standards/bcbs239",
          role: "Returns the BCBS 239 principle mapping with compliance scores",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/standards/compliance_matrix.json",
          category: "metadata",
          role: "Standards compliance matrix with 18 standards and 48 controls",
        },
        {
          path: "workspace/metadata/standards/bcbs239_mapping.json",
          category: "metadata",
          role: "BCBS 239 full 11-principle mapping with evidence links",
        },
      ],
      technologies: [{ name: "AG Grid", role: "Compliance matrix table with evidence links" }],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Compliance matrix and BCBS 239 mapping are entirely JSON-driven. Adding a control or principle automatically updates the UI.",
    },
  ],
};
