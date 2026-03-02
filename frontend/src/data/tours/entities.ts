import type { TourDefinition } from "../../stores/tourStore.ts";


export const entitiesTour: TourDefinition = {
  id: "entities",
  name: "Entity Designer Tour",
  description: "Learn about the data model and entity definitions.",
  steps: [
    {
      target: "[data-tour='entity-list']",
      title: "Entity List",
      content:
        "All data entities in the system. Each entity represents a table (execution, order, product, market data). Use the tab switcher above to toggle between Entity Details and the Relationship Graph.",
      placement: "bottom",
      route: "/entities",
    },
    {
      target: "[data-tour='entity-fields']",
      title: "Field Definitions",
      content:
        "Each entity has typed fields with nullability, keys, and domain values — shown in the Fields tab. The Domain column shows how many values are defined. Click any field row to open the Domain Values pane, where you can view, add, and remove metadata-defined values, and see data-only values from the database. Switch to the Relationships tab to see foreign key connections.",
      placement: "top",
    },
    {
      target: "[data-tour='entity-relationships']",
      title: "Relationships",
      content:
        "Switch to the Relationship Graph tab to see the full entity graph with dagre auto-layout, minimap, and zoom controls. Click a node to select that entity across both tabs.",
      placement: "top",
    },
  ],
};
