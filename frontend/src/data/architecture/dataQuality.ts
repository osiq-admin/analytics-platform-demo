import type { ViewTrace } from "../architectureRegistryTypes";

export const dataQualitySections: ViewTrace = {
  viewId: "quality",
  viewName: "Data Quality",
  route: "/quality",
  sections: [
    {
      id: "quality.entity-scores",
      displayName: "Quality Scores",
      viewId: "quality",
      description:
        "Weighted quality scores per entity and data contract using ISO 8000/25012 dimensions",
      files: [
        { path: "frontend/src/views/DataQuality/index.tsx", role: "Renders quality scorecards with per-contract weighted scores" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/quality/scores",
          role: "Returns quality scores for all entities and data contracts",
          routerFile: "backend/api/quality.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/quality/dimensions.json",
          category: "metadata",
          role: "Quality dimension definitions and weights for ISO 25012 scoring",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Quality dimensions and rule-to-dimension mapping both loaded from metadata",
      metadataOpportunities: [],
    },
    {
      id: "quality.spider-chart",
      displayName: "Quality Spider Chart",
      viewId: "quality",
      description:
        "Radar chart showing per-dimension quality scores for selected entity",
      files: [
        { path: "frontend/src/views/DataQuality/index.tsx", role: "Renders Recharts radar chart for quality dimension breakdown" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/quality/scores/{contract_id}",
          role: "Returns per-dimension quality scores for a specific data contract",
          routerFile: "backend/api/quality.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/quality/dimensions.json",
          category: "metadata",
          role: "Dimension definitions, thresholds, and weight configuration",
        },
      ],
      technologies: [
        { name: "Recharts", role: "RadarChart component for spider/radar visualization" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Dimension definitions, thresholds, and scores all from metadata/API",
      metadataOpportunities: [],
    },
    {
      id: "quality.quarantine-queue",
      displayName: "Quarantine Queue",
      viewId: "quality",
      description:
        "Queue of records that failed quality validation with retry and override actions",
      files: [
        { path: "frontend/src/views/DataQuality/index.tsx", role: "Renders quarantine table with retry/override action buttons" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/quality/quarantine",
          role: "Returns quarantined records with failure details",
          routerFile: "backend/api/quality.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/quarantine/*.json",
          category: "data",
          role: "Quarantined record files with failure reasons and metadata",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "All quarantine records and actions managed through JSON files and API",
      metadataOpportunities: [],
    },
    {
      id: "quality.data-profiling",
      displayName: "Data Profiling",
      viewId: "quality",
      description:
        "Per-field data profiling statistics with entity and tier selection",
      files: [
        { path: "frontend/src/views/DataQuality/index.tsx", role: "Renders per-field profiling table with null counts, distinct values, min/max" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/quality/profile/{entity}",
          role: "Returns per-field profiling statistics for an entity",
          routerFile: "backend/api/quality.py",
        },
      ],
      dataSources: [],
      technologies: [],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "Profiling computed from DuckDB tables, entity list is hardcoded",
      metadataOpportunities: [
        "Entity list could be loaded from metadata instead of hardcoded",
      ],
    },
  ],
};
