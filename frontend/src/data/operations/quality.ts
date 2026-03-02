import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


export const qualityOperations: ViewOperations = {
  viewId: "quality",
  label: "Data Quality",
  operations: [
    {
      id: "view_scores",
      name: "View Quality Scores",
      description:
        "See quality scores by entity and contract, calculated using ISO/IEC 25012 weighted dimensions.",
    },
    {
      id: "drill_dimensions",
      name: "Drill into Dimensions",
      description:
        "Click a scorecard to see the ISO dimension breakdown across completeness, accuracy, consistency, timeliness, uniqueness, validity, and currentness.",
    },
    {
      id: "review_quarantine",
      name: "Review Quarantine Queue",
      description:
        "Investigate records that failed quality validation during pipeline execution.",
    },
    {
      id: "retry_record",
      name: "Retry Quarantined Record",
      description:
        "Retry processing a failed record through the quality pipeline.",
    },
    {
      id: "override_record",
      name: "Override Quarantined Record",
      description:
        "Force-accept a quarantined record with justification.",
    },
    {
      id: "profile_entity",
      name: "Profile Entity Data",
      description:
        "View per-field null rates, distinct counts, min/max for any entity and medallion tier.",
      scenarioId: "s31_data_quality_investigation",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Quality scores use ISO/IEC 25012 dimensions with configurable weights per data contract",
    "Click a scorecard to see the spider chart update with per-dimension breakdown",
    "Quarantined records can be retried or overridden with justification — both actions are audited",
    "Data profiling works across all medallion tiers — compare Bronze vs Silver quality",
  ],
};
