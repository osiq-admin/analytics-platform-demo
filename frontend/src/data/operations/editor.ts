import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 6. Metadata Editor
// --------------------------------------------------------------------------
export const editorOperations: ViewOperations = {
  viewId: "editor",
  label: "Metadata Editor",
  operations: [
    {
      id: "switch_types",
      name: "Switch Metadata Types",
      description:
        "Toggle between different metadata types: calculations, settings, models, entities, and mappings to edit their JSON definitions.",
      scenarioId: "s24_oob_metadata_review",
    },
    {
      id: "edit_json",
      name: "Edit JSON Definitions",
      description:
        "Use the Monaco code editor to directly edit metadata JSON with syntax highlighting, validation, and auto-complete.",
    },
    {
      id: "use_visual_editor",
      name: "Use Visual Editor",
      description:
        "Switch to the visual editor for a form-based editing experience — easier for non-technical users to modify metadata.",
    },
    {
      id: "compare_layers",
      name: "Compare Metadata Layers",
      description:
        "View differences between OOB and Custom layers side-by-side to understand what has been customized.",
    },
    {
      id: "reset_oob",
      name: "Reset to OOB Defaults",
      description:
        "Revert a custom metadata item back to its original out-of-box definition.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "The visual editor and JSON editor stay in sync — changes in one appear in the other",
    "Use Ctrl+S / Cmd+S to save from the JSON editor",
    "The diff view highlights exactly which fields changed between OOB and Custom",
    "Resetting to OOB removes all custom overrides for that item",
  ],
};
