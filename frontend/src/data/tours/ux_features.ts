import type { TourDefinition } from "../../stores/tourStore.ts";


export const ux_featuresTour: TourDefinition = {
  id: "ux_features",
  name: "Grid & Layout Features",
  description: "Explore the data grid features — resize columns, view tooltips, and navigate between views.",
  steps: [
    {
      target: "[data-tour='entity-list']",
      title: "Resizable Columns",
      content: "Drag column borders to resize. Columns auto-fit to the available space but you can adjust them.",
      placement: "right",
      route: "/entities",
    },
    {
      target: "[data-tour='entity-relationships']",
      title: "Relationship Graph",
      content: "Switch to the Relationship Graph tab to see the full entity graph with dagre auto-layout, minimap, and zoom controls. Click nodes to navigate between entities. Drag the divider to resize.",
      placement: "top",
    },
    {
      target: "[data-tour='calc-layer-badge']",
      title: "Layer Badges",
      content: "Color-coded badges indicate item provenance — OOB (shipped) vs Custom (user-created).",
      placement: "right",
      route: "/metadata",
    },
    {
      target: "[data-tour='editor-json']",
      title: "Dual Editors",
      content: "The Metadata Editor provides both JSON and Visual editing modes side by side.",
      placement: "bottom",
      route: "/editor",
    },
    {
      target: "[data-tour='alert-filters']",
      title: "Alert Grid",
      content: "The Risk Case Manager shows all alerts with sortable columns. Hover truncated cells to see full content in tooltips.",
      placement: "bottom",
      route: "/alerts",
    },
  ],
};
