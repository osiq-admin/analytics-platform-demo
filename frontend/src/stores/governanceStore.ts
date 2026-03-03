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

export interface PiiFieldInfo {
  field: string;
  classification: string;
  regulation: string[];
  currently_masked: boolean;
  masking_type: string | null;
  crypto_shred?: boolean;
  retention_years?: number;
  masking_strategy?: string;
}

export interface PiiEntityInfo {
  pii_fields: PiiFieldInfo[];
}

export interface PiiRegistry {
  entities: Record<string, PiiEntityInfo>;
  total_pii_fields: number;
  masked_count: number;
  current_role: string;
}

/* ---------- State ---------- */

interface GovernanceState {
  currentRole: string;
  roles: RoleDefinition[];
  policies: MaskingPolicy[];
  piiRegistry: PiiRegistry | null;
  maskingVersion: number;
  loading: boolean;
  error: string | null;
  fetchRoles: () => Promise<void>;
  fetchPolicies: () => Promise<void>;
  fetchPiiRegistry: () => Promise<void>;
  switchRole: (roleId: string) => Promise<void>;
}

export const useGovernanceStore = create<GovernanceState>((set, get) => ({
  currentRole: "",
  roles: [],
  policies: [],
  piiRegistry: null,
  maskingVersion: 0,
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

  fetchPiiRegistry: async () => {
    try {
      const data = await api.get<PiiRegistry>("/governance/pii-registry");
      set({ piiRegistry: data });
    } catch {
      // PII registry is supplementary — don't block on failure
    }
  },

  switchRole: async (roleId: string) => {
    try {
      await api.post<RoleDefinition>("/governance/switch-role", { role_id: roleId });
      set((s) => ({ currentRole: roleId, maskingVersion: s.maskingVersion + 1 }));
      // Re-fetch PII registry to reflect new role's masking status
      get().fetchPiiRegistry();
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
