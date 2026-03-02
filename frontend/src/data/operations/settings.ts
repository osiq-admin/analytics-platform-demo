import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 4. Settings Manager
// --------------------------------------------------------------------------
export const settingsOperations: ViewOperations = {
  viewId: "settings",
  label: "Settings Manager",
  operations: [
    {
      id: "browse_settings",
      name: "Browse Settings",
      description:
        "Explore all detection thresholds, score steps, and configuration parameters. Filter by type, model, or search by name.",
      scenarioId: "s1_view_settings",
    },
    {
      id: "view_score_steps",
      name: "View Score Steps",
      description:
        "For score_steps settings, see the visual range bar and editable table showing how metric values map to risk scores.",
      scenarioId: "s4_score_steps",
    },
    {
      id: "test_resolution",
      name: "Test Setting Resolution",
      description:
        "Use the Resolution Tester to check how a setting resolves for a specific asset class, product, or account context.",
      scenarioId: "s6_multi_dim_resolution",
    },
    {
      id: "manage_overrides",
      name: "Manage Overrides",
      description:
        "Create product-specific or hierarchy-based overrides that take priority over default values.",
      scenarioId: "s3_create_override",
    },
    {
      id: "use_pattern_library",
      name: "Use Pattern Library",
      description:
        "Browse the pattern library for common threshold configurations and apply them as templates.",
      scenarioId: "s5_match_patterns",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Product-specific overrides always win over hierarchy and default values",
    "The Resolution Tester shows exactly which value applies and why — great for debugging",
    "Score steps settings have a visual bar chart showing the score-to-value mapping",
    "Use the search bar to quickly find settings by name or ID",
  ],
};
