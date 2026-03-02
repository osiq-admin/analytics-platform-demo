import type { ScenarioDefinition } from "../../stores/tourStore.ts";

// Scenario Definitions — Governance (S31-S32, S34-S35)


// ==========================================================================
// S31: Data Quality Investigation
// ==========================================================================

const S31_DATA_QUALITY_INVESTIGATION: ScenarioDefinition = {
  id: "s31_data_quality_investigation",
  name: "Data Quality Investigation",
  description:
    "Explore quality scores, investigate dimension breakdowns, review quarantine queue, and profile entity data",
  category: "governance",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='quality-dashboard']",
      title: "Data Quality Dashboard",
      content:
        "The Data Quality view provides ISO 8000/25012-aligned quality scoring across all entities.",
      action: "navigate",
      route: "/quality",
      placement: "center",
      hint: "Navigate to Data Quality",
      delay: 500,
    },
    {
      target: "[data-tour='quality-scores']",
      title: "Quality Scorecards",
      content:
        "Each card shows the weighted quality score for a data contract. Click one to see the dimension breakdown.",
      action: "wait",
      placement: "bottom",
      hint: "Click a scorecard to drill in",
      delay: 1500,
    },
    {
      target: "[data-tour='quality-spider']",
      title: "Spider Chart",
      content:
        "The radar chart shows how quality distributes across 7 ISO dimensions. Look for dimensions below the warning threshold.",
      action: "wait",
      placement: "right",
      hint: "Examine the dimension balance",
      delay: 2000,
    },
    {
      target: "[data-tour='quality-quarantine']",
      title: "Quarantine Queue",
      content:
        "Records that failed quality gates appear here. You can retry processing or override with justification.",
      action: "wait",
      placement: "top",
      hint: "Review quarantined records",
      delay: 2000,
    },
    {
      target: "[data-tour='quality-profiling']",
      title: "Data Profiling",
      content:
        "Select an entity to see per-field statistics. High null rates or low distinct counts indicate data quality issues.",
      action: "wait",
      placement: "top",
      hint: "Profile an entity",
      delay: 2000,
    },
  ],
};


// ==========================================================================
// Scenario Definitions — Reference Data & MDM (S32)
// ==========================================================================

// --------------------------------------------------------------------------
// S32: Reference Data — Golden Record Reconciliation (Intermediate, 5 min)
// --------------------------------------------------------------------------
const S32_REFERENCE_DATA_RECONCILIATION: ScenarioDefinition = {
  id: "s32_reference_data_reconciliation",
  name: "Reference Data — Golden Record Reconciliation",
  description:
    "Explore master data golden records with field-level provenance and run reconciliation",
  category: "governance",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='reference-entity-tabs']",
      title: "Navigate to Reference Data",
      content:
        "Open the Reference Data / MDM view from the Define sidebar group.",
      action: "navigate",
      route: "/reference",
      placement: "bottom",
      hint: "Navigate to Reference Data using the sidebar.",
      delay: 500,
    },
    {
      target: "[data-tour='reference-entity-tabs'] button:first-child",
      title: "Select Product Entity",
      content:
        "Click the Product Master tab to view product golden records.",
      action: "click",
      actionTarget: "[data-tour='reference-entity-tabs'] button:first-child",
      placement: "bottom",
      hint: "Click the Product Master tab",
      delay: 1500,
    },
    {
      target: "[data-tour='reference-golden-list']",
      title: "Browse Golden Records",
      content:
        "View 25 deduplicated product golden records, each with unique ISIN key and confidence score.",
      action: "wait",
      placement: "right",
      hint: "Browse the golden record list",
      delay: 2000,
    },
    {
      target: "[data-tour='reference-golden-list'] button:first-child",
      title: "Select a Golden Record",
      content:
        "Click the first golden record to view its detail and field-level provenance.",
      action: "click",
      actionTarget: "[data-tour='reference-golden-list'] button:first-child",
      placement: "right",
      hint: "Click a golden record to select it",
      delay: 1500,
    },
    {
      target: "[data-tour='reference-detail']",
      title: "Examine Provenance",
      content:
        "Review field values with source tracking — each field shows the CSV source, confidence score, and last updated timestamp.",
      action: "wait",
      placement: "left",
      hint: "Examine the field-level provenance",
      delay: 2000,
    },
    {
      target: "[data-tour='reference-reconciliation'] button",
      title: "Run Reconciliation",
      content:
        "Click Reconcile to re-run match/merge against source data. Review results: golden record counts, updates, conflicts, and confidence distribution.",
      action: "click",
      actionTarget: "[data-tour='reference-reconciliation'] button",
      placement: "top",
      hint: "Click the Reconcile button",
      delay: 2000,
    },
  ],
};


// --------------------------------------------------------------------------
// S34: Role-Based Data Masking (Governance, Intermediate, 5 min)
// --------------------------------------------------------------------------
const S34_ROLE_BASED_DATA_MASKING: ScenarioDefinition = {
  id: "s34_role_based_data_masking",
  name: "Role-Based Data Masking",
  description:
    "Explore how PII fields are dynamically masked based on RBAC roles. Switch between analyst (masked) and compliance officer (unmasked) to see real-time masking differences across data preview and audit logs.",
  category: "governance",
  difficulty: "intermediate",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='governance-masking-policies']",
      title: "Review Masking Policies",
      content:
        "Start at the Data Governance view. The Masking Policies tab shows all 7 masking policies — each with entity, field, classification level, masking type, and which roles can bypass masking.",
      placement: "right",
      route: "/governance",
      action: "wait",
      hint: "Navigate to Data Governance and review the policies table.",
      delay: 3000,
    },
    {
      target: "[data-tour='governance-role-management']",
      title: "View Role Definitions",
      content:
        "Switch to the Role Management tab to see all 4 roles. Note which tiers each role can access and whether they can view audit logs or export data.",
      placement: "right",
      action: "click",
      actionTarget: "[data-tour='governance-role-management']",
      hint: "Click the 'Role Management' tab to see role definitions.",
      delay: 2000,
    },
    {
      target: "[data-tour='role-switcher']",
      title: "Switch to Compliance Officer",
      content:
        "Click the role switcher in the header and change to 'Compliance Officer'. This role has full PII access — all masked fields will become visible.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='role-switcher']",
      hint: "Click the role badge in the header to open the dropdown, then select Compliance Officer.",
      delay: 2000,
    },
    {
      target: "[data-tour='governance-data-preview']",
      title: "View Unmasked Data",
      content:
        "Switch to the Data Preview tab. As Compliance Officer, all PII fields are now unmasked — trader names, IDs, and account details are fully visible.",
      placement: "right",
      action: "click",
      actionTarget: "[data-tour='governance-data-preview']",
      hint: "Click 'Data Preview' tab to see unmasked entity data.",
      delay: 3000,
    },
    {
      target: "[data-tour='role-switcher']",
      title: "Switch Back to Analyst",
      content:
        "Switch back to 'Surveillance Analyst'. PII fields will be masked again — trader_name shows partial masking (A***e), trader_id shows tokenized hex values.",
      placement: "bottom",
      action: "click",
      actionTarget: "[data-tour='role-switcher']",
      hint: "Click the role switcher and select Surveillance Analyst.",
      delay: 2000,
    },
    {
      target: "[data-tour='governance-data-preview']",
      title: "Compare Masked vs Unmasked",
      content:
        "The Data Preview now shows masked values. Compare the role columns — masked fields are highlighted in red with the masking type badge. The same data, same API, different view based on who is looking.",
      placement: "left",
      action: "wait",
      hint: "Review the comparison table showing different masking levels per role.",
      delay: 3500,
    },
    {
      target: "[data-tour='governance-audit-log']",
      title: "Check Audit Log Access",
      content:
        "Switch to the Audit Log tab. As Analyst, you'll see an access-denied message — analysts cannot view audit logs. Switch to Compliance Officer to see masked-aware audit entries.",
      placement: "right",
      action: "click",
      actionTarget: "[data-tour='governance-audit-log']",
      hint: "Click 'Audit Log' tab. Note the access restriction for analyst role.",
      delay: 3000,
    },
    {
      target: "[data-tour='governance-audit-log']",
      title: "Audit PII Protection Complete",
      content:
        "Key takeaway: Even audit logs respect role-based access. Analysts see activity patterns without seeing personal data. Compliance officers see full PII for regulatory investigations. All masking is applied at read time — stored data remains intact.",
      placement: "top",
      action: "wait",
      hint: "Review how audit log PII masking varies by role.",
      delay: 3000,
    },
  ],
};


// ==========================================================================
// S35: Explore Business Glossary (Phase 23)
// ==========================================================================

const S35_EXPLORE_BUSINESS_GLOSSARY: ScenarioDefinition = {
  id: "s35_explore_business_glossary",
  name: "Explore Business Glossary",
  description:
    "Navigate the ISO 11179-compliant glossary, explore term definitions with FIBO alignment, review semantic metrics, and assess DAMA-DMBOK knowledge area coverage.",
  category: "governance",
  difficulty: "beginner",
  estimatedMinutes: 5,
  steps: [
    {
      target: "[data-tour='glossary-categories']",
      title: "Browse by Category",
      content:
        "Start by clicking the 'Market Abuse' category in the sidebar. This filters the term list to show only market abuse-related terms like Wash Trade, Spoofing, and Layering.",
      placement: "right",
      action: "click",
      hint: "Select Market Abuse to see surveillance-related terms.",
    },
    {
      target: "[data-tour='glossary-search']",
      title: "Search for a Term",
      content:
        "Type 'wash' in the search box. The list filters to show the Wash Trade term. Search checks term IDs, business names, definitions, and synonyms.",
      placement: "bottom",
      action: "type",
      hint: "Try searching for 'insider' or 'spoofing' too.",
    },
    {
      target: "[data-tour='glossary-term-list']",
      title: "Select a Term",
      content:
        "Click on the 'Wash Trade' row in the term list. Notice terms with 'planned' status have a blue dashed border — these represent future platform capabilities.",
      placement: "bottom",
      action: "click",
      hint: "Look for the dashed border on planned terms.",
    },
    {
      target: "[data-tour='glossary-term-detail']",
      title: "Review Term Detail",
      content:
        "The detail panel shows the full ISO 11179 decomposition: Object Class (Trade), Property (Wash Indicator), and Representation (Score). Below that: FIBO alignment, technical mappings to execution.trader_id, and regulatory references (MAR Art. 12, SEC Rule 10b-5).",
      placement: "left",
      action: "wait",
      delay: 3000,
      hint: "Scroll down to see FIBO, mappings, and regulatory references.",
    },
    {
      target: "[data-tour='glossary-metrics-list']",
      title: "Switch to Semantic Metrics",
      content:
        "Click the 'Semantic Metrics' tab. These are business-friendly computed metrics built from Gold and Platinum tier data. Click any metric to see its SQL formula, source tier, and sliceable dimensions.",
      placement: "bottom",
      action: "click",
      hint: "Try clicking 'Daily Alert Rate' for its formula.",
    },
    {
      target: "[data-tour='glossary-dmbok-grid']",
      title: "DAMA-DMBOK Coverage",
      content:
        "Click the 'DAMA-DMBOK' tab. All 11 knowledge areas are mapped to platform capabilities. 10 areas show 'high' coverage and 1 shows 'medium'. Each card shows the specific capabilities that deliver coverage.",
      placement: "bottom",
      action: "click",
      hint: "Review which phases implement each knowledge area.",
    },
    {
      target: "[data-tour='glossary-standards']",
      title: "Standards Compliance",
      content:
        "Click the 'Standards & Gaps' tab. Review the 18 compliant standards with their compliance levels (full/partial/reference). The Roadmap section shows 10 gap standards with suggested future phases. Below that, Entity Gap Analysis details 25 missing attributes across 8 entities.",
      placement: "top",
      action: "wait",
      delay: 3000,
      hint: "Key takeaway: The platform complies with 18 industry standards.",
    },
  ],
};

export const governanceScenarios: Record<string, ScenarioDefinition> = {
  s31_data_quality_investigation: S31_DATA_QUALITY_INVESTIGATION,
  s32_reference_data_reconciliation: S32_REFERENCE_DATA_RECONCILIATION,
  s34_role_based_data_masking: S34_ROLE_BASED_DATA_MASKING,
  s35_explore_business_glossary: S35_EXPLORE_BUSINESS_GLOSSARY,
};
