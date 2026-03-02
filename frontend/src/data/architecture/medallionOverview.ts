import type { ViewTrace } from "../architectureRegistryTypes";

export const medallionOverviewSections: ViewTrace = {
  viewId: "medallion",
  viewName: "Medallion Overview",
  route: "/medallion",
  sections: [
    {
      id: "medallion.title",
      displayName: "View Header",
      viewId: "medallion",
      description:
        "Static header text rendered in code. Could be loaded from view_config metadata in the future.",
      files: [
        { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders view header" },
      ],
      stores: [],
      apis: [],
      dataSources: [],
      technologies: [],
      metadataMaturity: "code-driven",
      maturityExplanation:
        "Static header text rendered in code",
      metadataOpportunities: [
        "Load view title from view_config metadata",
      ],
    },
    {
      id: "medallion.tier-graph",
      displayName: "Tier Architecture Graph",
      viewId: "medallion",
      description:
        "React Flow diagram showing all 11 tiers of the medallion architecture. Tiers are arranged left-to-right from raw data (Landing) through processed (Gold/Platinum) to operational tiers (Logging, Metrics, Archive). Edges show data contracts between tiers. Layout is computed dynamically with dagre auto-layout.",
      files: [
        { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders React Flow graph with tier nodes and contract edges" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/medallion/tiers",
          role: "Returns all 11 tier definitions",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/medallion/contracts",
          role: "Returns data contracts between tiers",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/medallion/tiers.json",
          category: "metadata",
          role: "Tier definitions with data state, storage format, retention, quality gate, access level",
        },
        {
          path: "workspace/metadata/medallion/contracts",
          category: "metadata",
          role: "Data contract JSON files defining field mappings, quality rules, and SLAs between tiers",
        },
      ],
      technologies: [
        { name: "React Flow", role: "Interactive graph rendering with dagre auto-layout" },
        { name: "dagre", role: "Directed graph layout algorithm" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "All 11 tiers, edges, and contract counts are loaded from medallion metadata JSON files. Layout is computed dynamically from the data.",
      metadataOpportunities: [],
    },
    {
      id: "medallion.tier-detail",
      displayName: "Tier Detail Panel",
      viewId: "medallion",
      description:
        "Detail panel showing properties of the selected tier: data state, storage format, retention policy, quality gate, access level, mutability. Related data contracts and pipeline stages are displayed below, with a Run Stage action button to execute pipeline stages directly from the tier detail.",
      files: [
        { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders tier detail panel with contracts and pipeline stages" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/metadata/medallion/tiers",
          role: "Returns tier definitions for detail display",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/medallion/contracts",
          role: "Returns contracts related to the selected tier",
          routerFile: "backend/api/metadata.py",
        },
        {
          method: "GET",
          path: "/api/metadata/medallion/pipeline-stages",
          role: "Returns pipeline stages for the selected tier",
          routerFile: "backend/api/metadata.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/medallion/tiers.json",
          category: "metadata",
          role: "Tier properties displayed in the detail panel",
        },
        {
          path: "workspace/metadata/medallion/contracts",
          category: "metadata",
          role: "Data contracts shown for the selected tier",
        },
        {
          path: "workspace/metadata/medallion/pipeline_stages.json",
          category: "metadata",
          role: "Pipeline stages related to the selected tier",
        },
      ],
      technologies: [],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Tier properties, data contracts, and pipeline stages are all loaded from medallion metadata. No hardcoded data.",
      metadataOpportunities: [],
    },
    {
      id: "medallion.lakehouse.iceberg-tables",
      displayName: "Iceberg Tables",
      viewId: "medallion",
      description:
        "Panel displaying all Iceberg tables grouped by tier (Silver, Gold, Platinum, Reference, Logging, Archive). Tables are fetched from the Lakehouse API which queries the PyIceberg catalog. Each table supports ACID transactions, time travel via snapshots, and schema evolution.",
      files: [
        { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders IcebergTablesPanel component" },
        { path: "backend/api/lakehouse.py", role: "API endpoint returning tier-grouped table lists" },
        { path: "backend/services/lakehouse_service.py", role: "LakehouseService wrapping PyIceberg catalog operations" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/lakehouse/tables",
          role: "Returns all Iceberg tables grouped by tier",
          routerFile: "backend/api/lakehouse.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/config/lakehouse.yaml",
          category: "config",
          role: "Lakehouse deployment profiles (catalog URI, storage, compute)",
        },
        {
          path: "workspace/metadata/medallion/iceberg_config.json",
          category: "metadata",
          role: "Tier mapping configuration (which tiers use Iceberg)",
        },
      ],
      technologies: [
        { name: "PyIceberg", role: "Apache Iceberg table management (SQL catalog, SQLite)" },
        { name: "DuckDB", role: "OLAP reads via iceberg_scan()" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Table lists come from the Iceberg catalog queried at runtime. Tier configuration is metadata-driven from iceberg_config.json.",
      metadataOpportunities: [],
    },
    {
      id: "medallion.lakehouse.schema-evolution",
      displayName: "Schema Evolution",
      viewId: "medallion",
      description:
        "Timeline of schema evolution events — column additions and removals detected by comparing entity JSON definitions against Iceberg table schemas. History is persisted in schema_history.json and applied via PyIceberg's update_schema() API.",
      files: [
        { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders SchemaEvolutionPanel component" },
        { path: "backend/services/schema_evolution_service.py", role: "Detects drift and applies schema evolutions" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/lakehouse/tables/{tier}/{table}/schema-history",
          role: "Returns schema evolution history for a table",
          routerFile: "backend/api/lakehouse.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/governance/schema_history.json",
          category: "metadata",
          role: "Persisted schema evolution audit trail",
        },
        {
          path: "workspace/metadata/entities/",
          category: "metadata",
          role: "Entity JSON definitions — source of truth for schema",
        },
      ],
      technologies: [
        { name: "PyIceberg", role: "Schema evolution via update_schema() API" },
        { name: "PyArrow", role: "Schema representation and type mapping" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Schema evolution is derived from entity metadata definitions compared against Iceberg table schemas. History is metadata-persisted.",
      metadataOpportunities: [],
    },
    {
      id: "medallion.lakehouse.pii-governance",
      displayName: "PII Governance Dashboard",
      viewId: "medallion",
      description:
        "Dashboard showing PII field classifications, GDPR-regulated entities, crypto-shredding requirements, and retention policies. Dual-layer governance: metadata registry (pii_registry.json) + Iceberg table properties.",
      files: [
        { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders PIIGovernancePanel component" },
        { path: "backend/services/governance_service.py", role: "Loads PII registry, classifies tables, tags Iceberg properties" },
        { path: "backend/models/governance.py", role: "Pydantic models for PIIField, PIIRegistry, DataClassification" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/lakehouse/governance/pii-registry",
          role: "Returns the full PII registry with field classifications",
          routerFile: "backend/api/lakehouse.py",
        },
        {
          method: "GET",
          path: "/api/lakehouse/governance/classification",
          role: "Returns data classification per table",
          routerFile: "backend/api/lakehouse.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/governance/pii_registry.json",
          category: "metadata",
          role: "PII field registry with classification, regulation, crypto-shred, retention",
        },
      ],
      technologies: [
        { name: "PyIceberg", role: "Table properties for governance tags" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "All PII classifications, regulations, and governance tags are loaded from the pii_registry.json metadata file. Iceberg table properties store machine-readable tags.",
      metadataOpportunities: [],
    },
    {
      id: "medallion.lakehouse.calc-audit",
      displayName: "Calculation Audit",
      viewId: "medallion",
      description:
        "Panel showing calculation execution statistics (total, skipped, skip rate) and a result log table with per-calculation status, record counts, and durations. Fingerprint-based skip detection avoids redundant recalculation.",
      files: [
        { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders CalcAuditPanel component" },
        { path: "backend/services/calc_result_service.py", role: "Fingerprinting, skip detection, result logging" },
        { path: "backend/models/calculation_optimization.py", role: "Pydantic models for CalcFingerprint, CalcResultLog" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/lakehouse/calc/stats",
          role: "Returns execution statistics with skip rate",
          routerFile: "backend/api/lakehouse.py",
        },
        {
          method: "GET",
          path: "/api/lakehouse/calc/result-log",
          role: "Returns calculation result log entries",
          routerFile: "backend/api/lakehouse.py",
        },
      ],
      dataSources: [],
      technologies: [],
      metadataMaturity: "mixed",
      maturityExplanation:
        "Calculation definitions are metadata-driven, but the result log and skip logic are computed at runtime by the CalcResultService.",
      metadataOpportunities: [
        "Persist calc result log to Iceberg table for time-travel audit",
      ],
    },
    {
      id: "medallion.lakehouse.pipeline-runs",
      displayName: "Pipeline Runs",
      viewId: "medallion",
      description:
        "Panel showing pipeline run history with run types (daily, backfill, rerun, correction), Iceberg branch/tag references, status (running, published, failed, rolled_back), and affected entities and tiers. Uses Write-Audit-Publish pattern with Iceberg branches.",
      files: [
        { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders PipelineRunsPanel component" },
        { path: "backend/services/run_versioning_service.py", role: "Run lifecycle, branch/tag management" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/lakehouse/runs",
          role: "Returns pipeline run history",
          routerFile: "backend/api/lakehouse.py",
        },
      ],
      dataSources: [],
      technologies: [
        { name: "PyIceberg", role: "Branch creation, tag management, snapshot references" },
      ],
      metadataMaturity: "mixed",
      maturityExplanation:
        "Run history is tracked by the RunVersioningService at runtime. Branch/tag operations delegate to PyIceberg.",
      metadataOpportunities: [
        "Persist run history to Iceberg logging table for time-travel audit",
      ],
    },
    {
      id: "medallion.lakehouse.materialized-views",
      displayName: "Materialized Views",
      viewId: "medallion",
      description:
        "Panel showing materialized view status with refresh controls. MVs pre-compute aggregations from Iceberg tables into DuckDB in-memory tables for fast dashboard queries. Configuration is metadata-driven from materialized_views.json.",
      files: [
        { path: "frontend/src/views/MedallionOverview/index.tsx", role: "Renders MaterializedViewsPanel component with refresh button" },
        { path: "backend/services/materialized_view_service.py", role: "MV refresh, status tracking, DuckDB table management" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/lakehouse/materialized-views",
          role: "Returns MV status list",
          routerFile: "backend/api/lakehouse.py",
        },
        {
          method: "POST",
          path: "/api/lakehouse/materialized-views/refresh",
          role: "Triggers refresh of all materialized views",
          routerFile: "backend/api/lakehouse.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/medallion/materialized_views.json",
          category: "metadata",
          role: "MV definitions with source tables, SQL templates, refresh strategies",
        },
      ],
      technologies: [
        { name: "DuckDB", role: "Executes MV SQL templates and stores results in-memory" },
        { name: "PyIceberg", role: "Source data reads via iceberg_scan()" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "MV definitions (source tables, SQL templates, refresh strategies) are loaded from materialized_views.json metadata. Refresh is triggered via API.",
      metadataOpportunities: [],
    },
  ],
};
