import type { ViewOperations } from "../../components/TourEngine/OperationScripts.tsx";


// --------------------------------------------------------------------------
// 22. Data Governance
// --------------------------------------------------------------------------
export const governanceOperations: ViewOperations = {
  viewId: "governance",
  label: "Data Governance",
  operations: [
    {
      id: "switch_role",
      name: "Switch RBAC Role",
      description:
        "Use the role switcher in the header to change between Analyst, Compliance Officer, Data Engineer, and Admin. Each role sees different masking levels.",
      scenarioId: "s34_role_based_data_masking",
    },
    {
      id: "view_masking_policies",
      name: "View Masking Policies",
      description:
        "Review all 7 masking policies showing entity, field, classification level (HIGH/MEDIUM/LOW), masking type (partial, tokenize, generalize), and which roles can bypass masking.",
    },
    {
      id: "preview_masked_data",
      name: "Preview Masked Data",
      description:
        "Select an entity on the Data Preview tab to see how its records look under the current role. Masked fields show asterisks (partial) or hex tokens (tokenize).",
    },
    {
      id: "compare_roles",
      name: "Compare Role Perspectives",
      description:
        "The Data Preview comparison table shows each field's value across all roles side by side. Masked cells are highlighted red with masking type badges.",
      scenarioId: "s34_role_based_data_masking",
    },
    {
      id: "view_audit_log",
      name: "View Audit Log",
      description:
        "Access the audit trail on the Audit Log tab. Only Compliance Officer and Admin roles can view audit entries. PII values in audit records are masked based on your role.",
    },
    {
      id: "explore_role_management",
      name: "Explore Role Management",
      description:
        "On the Role Management tab, view all 4 role definitions with tier access badges, classification access, export and audit permissions.",
    },
  ],
  tips: [
    "Masking is applied at API response time — stored data remains unmasked for regulatory compliance.",
    "The role switcher in the header affects all views, not just Data Governance.",
    "Analysts see masked PII (partial names, tokenized IDs); Compliance Officers and Admins see full data.",
    "Even audit log entries mask PII values based on your role — analysts see activity patterns without personal data.",
  ],
};
