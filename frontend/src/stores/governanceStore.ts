import { create } from "zustand";
import { api } from "../api/client.ts";

/* ---------- Types ---------- */

export interface RoleDefinition {
  role_id: string;
  display_name: string;
  description: string;
  icon: string;
  tier_access: string[];
  classification_access: string[];
  can_export: boolean;
  can_view_audit: boolean;
}

export interface MaskingPolicy {
  policy_id: string;
  target_entity: string;
  target_field: string;
  classification: string;
  masking_type: string;
  algorithm: string;
  params: Record<string, unknown>;
  unmask_roles: string[];
  audit_unmask: boolean;
}

export interface RoleComparisonField {
  field: string;
  values: Record<string, { value: string; masked: boolean; masking_type: string | null }>;
}

export interface RoleComparisonResponse {
  entity: string;
  fields: RoleComparisonField[];
}

export interface AuditEntry {
  timestamp: string;
  type: string;
  item_id: string;
  action: string;
  old_value: unknown;
  new_value: unknown;
  user: string;
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  message?: string;
}

/* ---------- State ---------- */

interface GovernanceState {
  currentRole: string;
  roles: RoleDefinition[];
  policies: MaskingPolicy[];
  loading: boolean;
  error: string | null;
  fetchRoles: () => Promise<void>;
  fetchPolicies: () => Promise<void>;
  switchRole: (roleId: string) => Promise<void>;
}

export const useGovernanceStore = create<GovernanceState>((set) => ({
  currentRole: "",
  roles: [],
  policies: [],
  loading: false,
  error: null,

  fetchRoles: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<{ current_role: string; roles: RoleDefinition[] }>(
        "/governance/roles"
      );
      set({
        currentRole: data.current_role ?? "",
        roles: data.roles ?? [],
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchPolicies: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<{ policies: MaskingPolicy[] }>(
        "/governance/masking-policies"
      );
      set({ policies: data.policies ?? [], loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  switchRole: async (roleId: string) => {
    try {
      await api.post<RoleDefinition>("/governance/switch-role", { role_id: roleId });
      set({ currentRole: roleId });
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
