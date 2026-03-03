import type { ViewTrace } from "../architectureRegistryTypes";

export const dataGovernanceSections: ViewTrace = {
  viewId: "governance",
  viewName: "Data Governance",
  route: "/governance",
  sections: [
    {
      id: "governance.masking-policies",
      displayName: "Masking Policies Table",
      viewId: "governance",
      description:
        "Table of field-level masking policies loaded from governance metadata. Each policy maps entity+field to a masking type (partial, tokenize, generalize, redact) with classification levels (HIGH/MEDIUM/LOW) and unmask roles.",
      files: [
        { path: "frontend/src/views/DataGovernance/index.tsx", role: "Renders masking policies table with type/classification badges" },
      ],
      stores: [
        {
          name: "governanceStore",
          path: "frontend/src/stores/governanceStore.ts",
          role: "Fetches and caches masking policies from API",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/governance/masking-policies",
          role: "Returns field-level masking policy definitions",
          routerFile: "backend/api/governance.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/governance/masking_policies.json",
          category: "metadata",
          role: "Field-level masking policy definitions (entity, field, type, algorithm, params, unmask roles)",
        },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
        { name: "Zustand", role: "State management" },
        { name: "Tailwind CSS", role: "Styling and layout" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Masking policies are entirely metadata-driven — policies JSON defines entity, field, masking type, algorithm, params, unmask roles. Adding a new policy requires only editing masking_policies.json.",
      metadataOpportunities: [],
    },
    {
      id: "governance.role-management",
      displayName: "Role Management Cards",
      viewId: "governance",
      description:
        "Grid of role definition cards showing tier access badges, classification access levels, and permissions. Active role highlighted with accent styling and 'Switch' buttons on inactive roles.",
      files: [
        { path: "frontend/src/views/DataGovernance/index.tsx", role: "Renders role cards with tier/classification badges and switch buttons" },
      ],
      stores: [
        {
          name: "governanceStore",
          path: "frontend/src/stores/governanceStore.ts",
          role: "Fetches roles and manages active role state",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/governance/roles",
          role: "Returns role definitions with tier access and permissions",
          routerFile: "backend/api/governance.py",
        },
        {
          method: "POST",
          path: "/api/governance/switch-role",
          role: "Switches the active governance role for the session",
          routerFile: "backend/api/governance.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/governance/roles.json",
          category: "metadata",
          role: "Role definitions with tier access, classification access, and permissions",
        },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
        { name: "Zustand", role: "State management" },
        { name: "Tailwind CSS", role: "Styling and layout" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Role definitions are fully metadata-driven from roles.json. Tier access, classification access, export/audit permissions — all configured via metadata. Adding a new role requires only editing roles.json.",
      metadataOpportunities: [],
    },
    {
      id: "governance.data-preview",
      displayName: "Data Preview Comparison",
      viewId: "governance",
      description:
        "Multi-role data comparison table showing how entity records appear to each role. Fetches role-comparison data showing masked vs unmasked values per field per role, with masking type badges on masked cells.",
      files: [
        { path: "frontend/src/views/DataGovernance/index.tsx", role: "Renders multi-role data comparison table with masking badges" },
      ],
      stores: [
        {
          name: "governanceStore",
          path: "frontend/src/stores/governanceStore.ts",
          role: "Fetches role-comparison data for selected entity",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/governance/role-comparison/{entity}",
          role: "Returns entity data as seen by each role with masking applied",
          routerFile: "backend/api/governance.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/governance/masking_policies.json",
          category: "metadata",
          role: "Masking policies applied at response time per role",
        },
        {
          path: "workspace/metadata/governance/roles.json",
          category: "metadata",
          role: "Role definitions determining field visibility per role",
        },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
        { name: "Zustand", role: "State management" },
        { name: "Tailwind CSS", role: "Styling and layout" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Data preview is fully metadata-driven — masking policies and role definitions determine what each role sees. The backend MaskingService applies masking at response time based on policy configuration.",
      metadataOpportunities: [],
    },
    {
      id: "governance.audit-log",
      displayName: "Audit Log (Role-Aware)",
      viewId: "governance",
      description:
        "Audit trail viewer with role-based PII masking. Entries are stored unmasked (regulatory requirement) but masked at read time based on the requesting role. Unauthorized roles see access-denied message.",
      files: [
        { path: "frontend/src/views/DataGovernance/index.tsx", role: "Renders audit log entries with role-based PII masking" },
        { path: "backend/api/governance.py", role: "Audit log endpoint with role-based access control" },
        { path: "backend/services/audit_service.py", role: "Audit trail storage and retrieval" },
      ],
      stores: [
        {
          name: "governanceStore",
          path: "frontend/src/stores/governanceStore.ts",
          role: "Fetches audit log entries for the active role",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/governance/audit-log",
          role: "Returns audit log entries with PII masking based on requesting role",
          routerFile: "backend/api/governance.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/governance/masking_policies.json",
          category: "metadata",
          role: "Masking policies applied to audit log PII fields",
        },
        {
          path: "workspace/metadata/governance/roles.json",
          category: "metadata",
          role: "Role permissions determining audit log access (can_view_audit)",
        },
      ],
      technologies: [
        { name: "React 19", role: "UI rendering" },
        { name: "Zustand", role: "State management" },
        { name: "Tailwind CSS", role: "Styling and layout" },
        { name: "FastAPI", role: "Backend API with role-based access control" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Audit log access and PII masking are fully metadata-driven. Role permissions (can_view_audit) and masking policies determine what each role sees in audit entries.",
      metadataOpportunities: [],
    },
    {
      id: "governance.cross-view-masking",
      displayName: "Cross-View Masking Enforcement",
      viewId: "governance",
      description:
        "Backend masking wrapper that enforces PII masking across all data-serving API endpoints (data preview, SQL query, alerts). Entity auto-detection infers entity type from column signatures. GDPR Art. 25 compliant — masking is applied at the API layer before data reaches the frontend.",
      files: [
        { path: "backend/services/masking_wrapper.py", role: "Cross-view masking orchestrator — entity inference, PII detection, masking dispatch, audit logging" },
        { path: "backend/api/data.py", role: "Data preview and orders endpoints with masking integration" },
        { path: "backend/api/query.py", role: "SQL query endpoint with auto-detect masking" },
        { path: "backend/api/alerts.py", role: "Alert trace endpoint with PII masking" },
        { path: "frontend/src/layouts/AppLayout.tsx", role: "Toolbar masking count indicator next to role name" },
      ],
      stores: [
        {
          name: "governanceStore",
          path: "frontend/src/stores/governanceStore.ts",
          role: "PII registry state + maskingVersion counter for re-render triggers on role switch",
        },
      ],
      apis: [
        {
          method: "GET",
          path: "/api/governance/pii-registry",
          role: "Returns per-entity PII field registry with role-aware masking status",
          routerFile: "backend/api/governance.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/governance/pii_registry.json",
          category: "metadata",
          role: "PII field definitions per entity (field, classification, regulation, masking type)",
        },
        {
          path: "workspace/metadata/governance/masking_policies.json",
          category: "metadata",
          role: "Masking algorithm configuration per field",
        },
      ],
      technologies: [
        { name: "FastAPI", role: "API-layer masking enforcement" },
        { name: "MaskingService", role: "5 masking algorithms (partial, tokenize, hash, generalize, redact)" },
        { name: "RBACService", role: "Role-based access control for masking decisions" },
        { name: "React 19", role: "Toolbar PII indicator rendering" },
        { name: "Zustand", role: "PII registry state management" },
      ],
      metadataMaturity: "fully-metadata-driven",
      maturityExplanation:
        "Cross-view masking is entirely metadata-driven. PII registry JSON defines which fields are PII per entity. Masking policies JSON defines algorithms. Roles JSON defines unmask permissions. Adding a new PII field requires only editing pii_registry.json and masking_policies.json.",
      metadataOpportunities: [],
    },
    {
      id: "governance.pii-access-audit",
      displayName: "PII Access Audit Trail",
      viewId: "governance",
      description:
        "Audit logging for every PII data access event. Records entity, row count, role, endpoint, and timestamp. Implements MAR Art. 16 (complete surveillance audit trail) and ISO 27001 A.12.4 (logging and monitoring). Fire-and-forget — never blocks data access.",
      files: [
        { path: "backend/services/masking_wrapper.py", role: "log_pii_access function — records audit events on PII access" },
        { path: "backend/services/audit_service.py", role: "Append-only audit trail storage" },
      ],
      stores: [],
      apis: [
        {
          method: "GET",
          path: "/api/governance/audit-log",
          role: "Returns audit log including PII access events",
          routerFile: "backend/api/governance.py",
        },
      ],
      dataSources: [
        {
          path: "workspace/metadata/_audit/",
          category: "metadata",
          role: "Append-only audit trail files with PII access events",
        },
      ],
      technologies: [
        { name: "AuditService", role: "Append-only audit event recording" },
        { name: "FastAPI", role: "Request context for endpoint and role extraction" },
      ],
      metadataMaturity: "mostly-metadata-driven",
      maturityExplanation:
        "PII access audit events are recorded via the existing AuditService. Event structure and storage are metadata-driven. The log_pii_access function is code that orchestrates audit recording based on PII detection results.",
      metadataOpportunities: [
        "Could make audit event types configurable via metadata (which events to log, retention policies)",
      ],
    },
  ],
};
