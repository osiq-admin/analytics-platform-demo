import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


export const medallionOperations: ViewOperations = {
  viewId: "medallion",
  label: "Medallion Architecture",
  operations: [
    {
      id: "view_tier_graph",
      name: "View Tier Graph",
      description:
        "The React Flow diagram shows all 11 medallion tiers arranged left-to-right. Edges between tiers represent data contracts. The core flow is Landing → Bronze → Silver → Gold → Platinum, with side branches for Quarantine, Reference, Sandbox, Logging, Metrics, and Archive.",
    },
    {
      id: "inspect_tier",
      name: "Inspect Tier Details",
      description:
        "Click any tier node to see its properties in the detail panel: data state (raw, typed, canonical, aggregated, etc.), storage format, retention policy, quality gate, access level, and whether the tier is mutable or append-only.",
    },
    {
      id: "view_contracts",
      name: "View Data Contracts",
      description:
        "Select a tier to see its data contracts — agreements defining field mappings, quality rules, SLAs (freshness, completeness), ownership, and classification for data flowing between tiers.",
    },
    {
      id: "view_pipeline_stages",
      name: "View Pipeline Stages",
      description:
        "Select a tier to see related pipeline stages — the ordered execution steps that move data between tiers, including dependency chains and parallel execution flags.",
    },
    {
      id: "run_stage_from_tier",
      name: "Run Stage from Tier Detail",
      description:
        "Execute a pipeline stage directly from the Medallion Overview tier detail panel.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Toggle Architecture Traceability Mode (Ctrl+Shift+A) to see which sections of this view are metadata-driven. The tier graph and detail panel are fully metadata-driven from workspace/metadata/medallion/.",
    },
  ],
  tips: [
    "The medallion architecture defines 11 tiers for data lifecycle management — from raw ingestion to cold archive storage.",
    "Data contracts enforce quality rules and SLAs at each tier boundary.",
    "Pipeline stages define the ordered execution plan for moving data through tiers.",
    "Side tiers (Quarantine, Reference, Sandbox) handle special cases outside the main flow.",
    "Switch to the Lakehouse tab to explore Apache Iceberg tables, PII governance, and calculation audit data.",
  ],
};
