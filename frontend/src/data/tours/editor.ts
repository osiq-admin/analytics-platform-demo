import type { TourDefinition } from "../../stores/tourStore.ts";


export const editorTour: TourDefinition = {
  id: "editor",
  name: "Metadata Editor Tour",
  description: "Edit metadata with side-by-side JSON and visual editors.",
  steps: [
    {
      target: "[data-tour='editor-type-selector']",
      title: "Metadata Type Selector",
      content: "Switch between Entities, Calculations, Settings, and Detection Models. Each type has its own visual editor.",
      placement: "bottom",
      route: "/editor",
    },
    {
      target: "[data-tour='editor-json']",
      title: "JSON Editor",
      content: "Edit raw JSON directly with Monaco Editor — full syntax highlighting, validation, and auto-format.",
      placement: "right",
    },
    {
      target: "[data-tour='editor-visual']",
      title: "Visual Editor",
      content: "The visual editor syncs bidirectionally with JSON. Changes in either panel update the other in real-time.",
      placement: "left",
    },
    {
      target: "[data-tour='editor-save']",
      title: "Save & Validate",
      content: "The status indicator shows JSON validity. Click Save to persist changes to the backend.",
      placement: "top",
    },
  ],
};
