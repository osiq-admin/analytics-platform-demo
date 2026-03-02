import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { formatLabel } from "../../utils/format.ts";
import {
  useGovernanceStore,
  type RoleComparisonField,
  type AuditEntry,
  type AuditLogResponse,
  type RoleComparisonResponse,
} from "../../stores/governanceStore.ts";

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type ViewTab = "masking" | "roles" | "preview" | "audit";

const TABS: { key: ViewTab; label: string }[] = [
  { key: "masking", label: "Masking Policies" },
  { key: "roles", label: "Role Management" },
  { key: "preview", label: "Data Preview" },
  { key: "audit", label: "Audit Log" },
];

// ---------------------------------------------------------------------------
// Classification badge helpers
// ---------------------------------------------------------------------------

function classificationVariant(classification: string): "error" | "warning" | "success" | "muted" {
  switch (classification.toUpperCase()) {
    case "HIGH":
      return "error";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "success";
    default:
      return "muted";
  }
}

function maskingTypeVariant(maskingType: string): "info" | "warning" | "muted" {
  switch (maskingType.toLowerCase()) {
    case "full":
    case "hash":
      return "info";
    case "partial":
    case "redact":
      return "warning";
    default:
      return "muted";
  }
}

// ---------------------------------------------------------------------------
// Role icon map
// ---------------------------------------------------------------------------

const ROLE_ICONS: Record<string, string> = {
  shield: "\u{1F6E1}",
  eye: "\u{1F441}",
  lock: "\u{1F512}",
  user: "\u{1F464}",
  admin: "\u{1F6E1}",
  analyst: "\u{1F50D}",
  auditor: "\u{1F4CB}",
  viewer: "\u{1F441}",
};

function roleIcon(icon: string): string {
  return ROLE_ICONS[icon.toLowerCase()] ?? "\u{1F464}";
}

// ---------------------------------------------------------------------------
// Masking Policies Tab
// ---------------------------------------------------------------------------

function MaskingPoliciesTab() {
  const { policies, loading, fetchPolicies } = useGovernanceStore();

  useEffect(() => {
    if (policies.length === 0) fetchPolicies();
  }, [policies.length, fetchPolicies]);

  if (loading && policies.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <Panel
      title={`Masking Policies (${policies.length})`}
      dataTour="governance-masking-policies"
      dataTrace="governance.masking-policies"
    >
      {policies.length === 0 ? (
        <p className="text-muted text-xs">No masking policies configured.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left py-1.5 px-2">Entity</th>
                <th className="text-left py-1.5 px-2">Field</th>
                <th className="text-left py-1.5 px-2">Classification</th>
                <th className="text-left py-1.5 px-2">Masking Type</th>
                <th className="text-left py-1.5 px-2">Unmask Roles</th>
                <th className="text-left py-1.5 px-2">Audit Unmask</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr
                  key={p.policy_id}
                  className="border-b border-border/50 hover:bg-surface-hover"
                >
                  <td className="py-1.5 px-2 font-medium">{formatLabel(p.target_entity)}</td>
                  <td className="py-1.5 px-2 font-mono text-[10px]">{p.target_field}</td>
                  <td className="py-1.5 px-2">
                    <StatusBadge
                      label={p.classification}
                      variant={classificationVariant(p.classification)}
                    />
                  </td>
                  <td className="py-1.5 px-2">
                    <StatusBadge
                      label={p.masking_type}
                      variant={maskingTypeVariant(p.masking_type)}
                    />
                  </td>
                  <td className="py-1.5 px-2 text-muted">
                    {p.unmask_roles.join(", ")}
                  </td>
                  <td className="py-1.5 px-2">
                    <StatusBadge
                      label={p.audit_unmask ? "Yes" : "No"}
                      variant={p.audit_unmask ? "success" : "muted"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Role Management Tab
// ---------------------------------------------------------------------------

function RoleManagementTab() {
  const { roles, currentRole, loading, fetchRoles, switchRole } = useGovernanceStore();

  useEffect(() => {
    if (roles.length === 0) fetchRoles();
  }, [roles.length, fetchRoles]);

  if (loading && roles.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <Panel
      title={`Role Management (${roles.length} roles)`}
      dataTour="governance-role-management"
      dataTrace="governance.role-management"
    >
      {roles.length === 0 ? (
        <p className="text-muted text-xs">No roles configured.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {roles.map((role) => {
            const isActive = role.role_id === currentRole;
            return (
              <div
                key={role.role_id}
                className={`border rounded p-4 flex flex-col gap-2 transition-colors ${
                  isActive
                    ? "border-accent bg-accent/5"
                    : "border-border bg-surface hover:border-border-hover"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">
                    {roleIcon(role.icon)}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {role.display_name}
                    </h3>
                    <p className="text-[10px] text-muted">{role.description}</p>
                  </div>
                  {isActive ? (
                    <StatusBadge label="Active" variant="success" />
                  ) : (
                    <button
                      onClick={() => switchRole(role.role_id)}
                      className="px-2 py-1 text-[10px] rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
                    >
                      Switch
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted mr-1">Tiers:</span>
                  {role.tier_access.map((tier) => (
                    <StatusBadge key={tier} label={tier} variant="info" />
                  ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted mr-1">Classification:</span>
                  {role.classification_access.map((cls) => (
                    <StatusBadge
                      key={cls}
                      label={cls}
                      variant={classificationVariant(cls)}
                    />
                  ))}
                </div>

                <div className="flex gap-3 text-[10px] text-muted">
                  <span>
                    Export:{" "}
                    <span className={role.can_export ? "text-green-400" : "text-red-400"}>
                      {role.can_export ? "Yes" : "No"}
                    </span>
                  </span>
                  <span>
                    Audit:{" "}
                    <span className={role.can_view_audit ? "text-green-400" : "text-red-400"}>
                      {role.can_view_audit ? "Yes" : "No"}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Data Preview Tab
// ---------------------------------------------------------------------------

const PREVIEW_ENTITIES = ["trader", "account", "execution", "order"];

function DataPreviewTab() {
  const { roles } = useGovernanceStore();
  const [entity, setEntity] = useState("trader");
  const [fields, setFields] = useState<RoleComparisonField[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComparison = useCallback((selectedEntity: string) => {
    setLoading(true);
    api
      .get<RoleComparisonResponse>(`/governance/role-comparison/${selectedEntity}`)
      .then((data) => setFields(data.fields ?? []))
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchComparison(entity);
  }, [entity, fetchComparison]);

  const roleIds = roles.map((r) => r.role_id);

  return (
    <Panel
      title="Data Preview — Role Comparison"
      dataTour="governance-data-preview"
      dataTrace="governance.data-preview"
    >
      <div className="flex flex-col gap-3">
        {/* Entity selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Entity:</label>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
          >
            {PREVIEW_ENTITIES.map((e) => (
              <option key={e} value={e}>
                {formatLabel(e)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="md" />
          </div>
        ) : fields.length === 0 ? (
          <p className="text-muted text-xs">No comparison data available for {formatLabel(entity)}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted border-b border-border">
                  <th className="text-left py-1.5 px-2 sticky left-0 bg-surface">Field</th>
                  {roleIds.map((rid) => (
                    <th key={rid} className="text-left py-1.5 px-2">
                      {formatLabel(rid)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map((f) => (
                  <tr
                    key={f.field}
                    className="border-b border-border/50 hover:bg-surface-hover"
                  >
                    <td className="py-1.5 px-2 font-mono text-[10px] sticky left-0 bg-surface">
                      {f.field}
                    </td>
                    {roleIds.map((rid) => {
                      const cell = f.values[rid];
                      if (!cell) {
                        return (
                          <td key={rid} className="py-1.5 px-2 text-muted">
                            --
                          </td>
                        );
                      }
                      return (
                        <td
                          key={rid}
                          className={`py-1.5 px-2 ${
                            cell.masked
                              ? "bg-red-500/10"
                              : ""
                          }`}
                        >
                          <span className="font-mono text-[10px]">{cell.value}</span>
                          {cell.masked && cell.masking_type && (
                            <StatusBadge
                              label={cell.masking_type}
                              variant="error"
                              className="ml-1"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Audit Log Tab
// ---------------------------------------------------------------------------

function AuditLogTab() {
  const { currentRole } = useGovernanceStore();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<AuditLogResponse>("/governance/audit-log")
      .then((data) => {
        setEntries(data.entries ?? []);
        setMessage(data.message ?? null);
      })
      .catch(() => {
        setEntries([]);
        setMessage("Failed to load audit log.");
      })
      .finally(() => setLoading(false));
  }, [currentRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <Panel
      title={`Audit Log (${entries.length})`}
      dataTour="governance-audit-log"
      dataTrace="governance.audit-log"
    >
      {entries.length === 0 && message ? (
        <div className="border border-amber-500/30 bg-amber-500/10 rounded p-3 text-xs text-amber-400">
          {message}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-muted text-xs">No audit log entries.</p>
      ) : (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-border sticky top-0 bg-surface">
                <th className="text-left py-1.5 px-2">Timestamp</th>
                <th className="text-left py-1.5 px-2">Type</th>
                <th className="text-left py-1.5 px-2">Item ID</th>
                <th className="text-left py-1.5 px-2">Action</th>
                <th className="text-left py-1.5 px-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-surface-hover"
                >
                  <td className="py-1.5 px-2 text-muted text-[10px] whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="py-1.5 px-2">
                    <StatusBadge label={entry.type} variant="info" />
                  </td>
                  <td className="py-1.5 px-2 font-mono text-[10px]">
                    {entry.item_id}
                  </td>
                  <td className="py-1.5 px-2">
                    <StatusBadge
                      label={entry.action}
                      variant={
                        entry.action === "create"
                          ? "success"
                          : entry.action === "delete"
                          ? "error"
                          : "warning"
                      }
                    />
                  </td>
                  <td className="py-1.5 px-2 text-[10px] text-muted max-w-xs truncate">
                    {entry.new_value != null
                      ? typeof entry.new_value === "object"
                        ? Object.entries(entry.new_value as Record<string, unknown>)
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(", ")
                        : String(entry.new_value)
                      : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DataGovernance() {
  const [activeTab, setActiveTab] = useState<ViewTab>("masking");
  const { roles, policies, fetchRoles, fetchPolicies } = useGovernanceStore();

  // Load roles and policies on mount
  useEffect(() => {
    if (roles.length === 0) fetchRoles();
    if (policies.length === 0) fetchPolicies();
  }, [roles.length, policies.length, fetchRoles, fetchPolicies]);

  return (
    <div className="flex flex-col gap-4 h-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold" data-trace="governance.title">
          Data Governance
        </h2>
        <StatusBadge label={`${roles.length} roles`} variant="info" />
        <StatusBadge label={`${policies.length} policies`} variant="muted" />

        {/* Tab bar */}
        <div className="flex border-b border-border ml-auto shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-accent border-b-2 border-accent"
                  : "text-muted hover:text-foreground"
              }`}
              data-tour={`governance-tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "masking" && <MaskingPoliciesTab />}
        {activeTab === "roles" && <RoleManagementTab />}
        {activeTab === "preview" && <DataPreviewTab />}
        {activeTab === "audit" && <AuditLogTab />}
      </div>
    </div>
  );
}
