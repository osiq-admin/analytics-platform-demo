import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 16. AI Assistant
// --------------------------------------------------------------------------
export const assistantOperations: ViewOperations = {
  viewId: "assistant",
  label: "AI Assistant",
  operations: [
    {
      id: "ask_questions",
      name: "Ask Questions",
      description:
        "Ask the AI assistant about the platform, detection models, data schema, regulatory requirements, or investigation workflows.",
    },
    {
      id: "use_scenarios",
      name: "Use Guided Scenarios",
      description:
        "Select from pre-built conversation scenarios that walk through common tasks like model building, alert investigation, or settings configuration.",
      scenarioId: "s25_full_platform_walkthrough",
    },
    {
      id: "explore_analysis",
      name: "Explore AI Analysis",
      description:
        "Let the assistant analyze alerts, suggest detection improvements, or explain complex calculation logic in plain language.",
    },
    {
      id: "generate_sql",
      name: "Generate SQL Queries",
      description:
        "Describe what data you need in natural language and the assistant will generate optimized DuckDB SQL queries.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "The assistant understands the full platform schema — ask about any entity or field",
    "Try 'Explain this alert' with an alert ID for a plain-language investigation summary",
    "Use 'Suggest improvements' to get AI-powered recommendations for detection models",
    "The assistant can generate complex SQL including joins, aggregations, and window functions",
  ],
};
