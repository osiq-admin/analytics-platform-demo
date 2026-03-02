import type { TourDefinition } from "../../stores/tourStore.ts";


// --------------------------------------------------------------------------
// Governance Tour (7 steps)
// --------------------------------------------------------------------------
export const governanceTour: TourDefinition = {
  id: "governance",
  name: "Data Governance Tour",
  description: "Explore role-based data masking, RBAC controls, and audit-aware PII protection.",
  steps: [
    {
      target: "[data-tour='role-switcher']",
      title: "Role Switcher",
      content: "Switch between roles to see different data masking levels. Analyst sees masked PII, Compliance Officer sees full data, Admin has unrestricted access.",
      placement: "bottom",
      route: "/governance",
    },
    {
      target: "[data-tour='governance-masking-policies']",
      title: "Masking Policies",
      content: "View all 7 masking policies with classification levels (HIGH/MEDIUM/LOW), masking types (partial, tokenize, generalize), and which roles can see unmasked data.",
      placement: "right",
      route: "/governance",
    },
    {
      target: "[data-tour='governance-role-management']",
      title: "Role Management",
      content: "See all 4 role definitions with their tier access badges, classification access levels, and permissions (export, audit viewing).",
      placement: "right",
      route: "/governance",
    },
    {
      target: "[data-tour='governance-data-preview']",
      title: "Data Preview",
      content: "Compare how the same data appears to different roles. Select an entity and see masked vs unmasked values side by side.",
      placement: "right",
      route: "/governance",
    },
    {
      target: "[data-tour='governance-data-preview']",
      title: "Side-by-Side Comparison",
      content: "The comparison table shows each field with values from every role. Masked fields are highlighted in red — hover to see the masking type applied.",
      placement: "left",
      route: "/governance",
    },
    {
      target: "[data-tour='governance-audit-log']",
      title: "Audit Log",
      content: "View the audit trail with role-appropriate masking. If your role lacks audit access, you'll see an access-denied message instead.",
      placement: "right",
      route: "/governance",
    },
    {
      target: "[data-tour='role-switcher']",
      title: "Try It: Switch Roles",
      content: "Switch to Compliance Officer using the role dropdown in the header, then revisit the Data Preview and Audit Log tabs to see unmasked PII.",
      placement: "bottom",
      route: "/governance",
    },
  ],
};
