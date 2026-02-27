import { create } from "zustand";
import { api } from "../api/client.ts";

interface NavItem {
  view_id: string;
  label: string;
  path: string;
  icon: string;
  order: number;
}

interface NavGroup {
  title: string;
  order: number;
  items: NavItem[];
}

interface NavigationState {
  groups: NavGroup[];
  loading: boolean;
  error: string | null;
  fetchNavigation: () => Promise<void>;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  groups: [],
  loading: false,
  error: null,
  fetchNavigation: async () => {
    if (get().groups.length > 0) return; // Already loaded
    set({ loading: true, error: null });
    try {
      const data = await api.get<{ groups: NavGroup[] }>("/metadata/navigation");
      set({ groups: data.groups, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
}));
