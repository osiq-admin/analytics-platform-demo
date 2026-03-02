import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 3. Metadata Explorer (Calculations)
// --------------------------------------------------------------------------
export const metadataOperations: ViewOperations = {
  viewId: "metadata",
  label: "Metadata Explorer",
  operations: [
    {
      id: "browse_calcs",
      name: "Browse Calculations",
      description:
        "Explore all detection calculations organized by metadata layer (OOB, Custom). View SQL, description, and parameters for each.",
      scenarioId: "s7_explore_calc_dag",
    },
    {
      id: "view_dag",
      name: "View Calculation DAG",
      description:
        "Visualize the directed acyclic graph showing how calculations depend on each other and flow through the detection pipeline.",
      scenarioId: "s7_explore_calc_dag",
    },
    {
      id: "filter_by_layer",
      name: "Filter by Metadata Layer",
      description:
        "Switch between OOB (out-of-box) and Custom layers to see which calculations are system-provided vs. user-defined.",
    },
    {
      id: "check_dependencies",
      name: "Check Dependencies",
      description:
        "Select a calculation to see its upstream inputs and downstream consumers — essential for impact analysis before changes.",
    },
    {
      id: "create_calculation",
      name: "Create a Calculation",
      description:
        "Define a new calculation with SQL, parameters, and input mappings. Use AI assistance for complex expressions.",
      scenarioId: "s8_create_manual_calc",
    },
    {
      id: "architecture_trace",
      name: "Explore Architecture Trace",
      description:
        "Enable Trace mode from the toolbar to see info icons on each section. Click an icon to view which files, APIs, metadata, and technologies control that section, plus metadata-maturity analysis.",
    },
  ],
  tips: [
    "The DAG view auto-highlights the selected calculation and its dependency chain",
    "Double-click a DAG node to navigate directly to that calculation's detail panel",
    "Filter by layer to quickly find customizable vs. locked calculations",
  ],
};
