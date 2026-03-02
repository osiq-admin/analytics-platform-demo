import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 5. Mapping Studio
// --------------------------------------------------------------------------
export const mappingsOperations: ViewOperations = {
  viewId: "mappings",
  label: "Mapping Studio",
  operations: [
    {
      id: "select_mapping",
      name: "Select or create a mapping",
      description:
        "Choose an existing mapping from the dropdown or click 'New Mapping' to create one. Select source and target entities.",
    },
    {
      id: "map_fields",
      name: "Map source to target fields",
      description:
        "For each row, select a source field, set the transform type, and choose the target field. Use 'Add Row' for new mappings.",
    },
    {
      id: "set_transform",
      name: "Set field transform type",
      description:
        "Change the transform type for a field mapping: direct (copy as-is), rename, cast (type conversion), uppercase, expression, etc.",
    },
    {
      id: "validate_mapping",
      name: "Validate mapping completeness",
      description:
        "Click 'Validate' to check the mapping against entity definitions. Shows errors, warnings, and unmapped fields.",
    },
    {
      id: "save_mapping",
      name: "Save mapping definition",
      description:
        "Click 'Save' to persist the mapping definition to disk. Changes the status from draft to saved.",
    },
    {
      id: "select_tier_pair",
      name: "Select Tier Pair",
      description:
        "Use the Source Tier and Target Tier dropdowns to filter mappings by medallion tier pair.",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "Mappings are persisted as JSON metadata in workspace/metadata/mappings/",
    "Validate after saving to check for unmapped fields",
    "The onboarding wizard auto-creates mappings when uploading data",
    "Transform types include: direct, rename, cast, uppercase, concat, expression",
    "Use tier pair selectors to filter Bronze-to-Silver or Silver-to-Gold mappings",
  ],
};
