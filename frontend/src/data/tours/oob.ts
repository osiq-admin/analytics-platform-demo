import type { TourDefinition } from "../../stores/tourStore.ts";


export const oobTour: TourDefinition = {
  id: "oob",
  name: "OOB vs Custom Metadata Tour",
  description: "Learn how out-of-box metadata is separated from user customizations.",
  steps: [
    {
      target: "[data-tour='editor-type-selector']",
      title: "Metadata Types",
      content: "All metadata types (Entities, Calculations, Settings, Models) support OOB/User layer separation.",
      placement: "bottom",
      route: "/editor",
    },
    {
      target: "[data-tour='editor-layer-badge']",
      title: "Layer Badge",
      content: "The layer badge shows the item's provenance: OOB (shipped with the platform), Modified (OOB with your edits), or Custom (user-created).",
      placement: "bottom",
    },
    {
      target: "[data-tour='editor-oob-banner']",
      title: "OOB Info Banner",
      content: "When you select an out-of-box item, this banner reminds you that editing will create a user override — the original is preserved.",
      placement: "bottom",
    },
    {
      target: "[data-tour='editor-json']",
      title: "Edit an OOB Item",
      content: "Try editing a field in the JSON editor. When you save, your changes are stored as a user override. The original OOB definition stays untouched.",
      placement: "right",
    },
    {
      target: "[data-tour='editor-reset-oob']",
      title: "Reset to OOB",
      content: "After modifying an OOB item, the Reset button appears. Click it to discard your override and restore the original out-of-box definition.",
      placement: "top",
    },
    {
      target: "[data-tour='oob-version-panel']",
      title: "OOB Version & Upgrade",
      content: "The version panel shows which OOB package is installed, how many items are included, and how many you've customized.",
      placement: "right",
    },
    {
      target: "[data-tour='oob-upgrade-btn']",
      title: "Simulate Upgrade",
      content: "Click 'Simulate Upgrade' to preview what would happen if a new OOB version were installed — added items, modified items, and potential conflicts with your overrides.",
      placement: "bottom",
    },
  ],
};
