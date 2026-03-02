import type { TourDefinition } from "../../stores/tourStore.ts";


export const mappingsTour: TourDefinition = {
  id: "mappings",
  name: "Mapping Studio Tour",
  description: "Create and validate source-to-target field mappings between entities.",
  steps: [
    {
      target: "[data-tour='mapping-selector']",
      title: "Mapping Selector",
      content: "Select an existing mapping definition from the dropdown, or click 'New Mapping' to create one. Choose source and target entities to define the mapping scope.",
      placement: "right",
      route: "/mappings",
    },
    {
      target: "[data-tour='mapping-canvas']",
      title: "Field Mapping Canvas",
      content: "Edit source-to-target field mappings in the table. Each row maps a source field to a target field with a transform type (direct, rename, cast, uppercase, expression). Use 'Add Row' for new mappings.",
      placement: "bottom",
    },
    {
      target: "[data-tour='mapping-tier-source']",
      title: "Source Tier Selector",
      content: "Filter mappings by source tier. The default is Bronze — change to Silver to see Silver-to-Gold mappings for calculation inputs.",
      placement: "bottom",
    },
    {
      target: "[data-tour='mapping-tier-target']",
      title: "Target Tier Selector",
      content: "Filter by target tier. Set Source to Silver and Target to Gold to view the calculation input mappings.",
      placement: "bottom",
    },
    {
      target: "[data-tour='mapping-validation']",
      title: "Validation Panel",
      content: "Click 'Validate' to check mapping completeness against entity definitions. Shows errors, warnings, and unmapped fields that need attention.",
      placement: "top",
    },
  ],
};
