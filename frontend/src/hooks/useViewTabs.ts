import { useEffect, useState } from "react";
import { api } from "../api/client.ts";

interface TabMeta {
  id: string;
  label: string;
  icon?: string;
  default?: boolean;
}

interface ViewConfigResponse {
  view_id: string;
  tabs: TabMeta[];
}

export function useViewTabs<T extends string>(
  viewId: string,
  fallback: { key: T; label: string }[],
): { key: T; label: string }[] {
  const [tabs, setTabs] = useState(fallback);

  useEffect(() => {
    api
      .get<ViewConfigResponse>(`/metadata/view_config/${viewId}`)
      .then((config) => {
        if (config.tabs.length > 0) {
          setTabs(
            config.tabs.map((t) => ({ key: t.id as T, label: t.label })),
          );
        }
      })
      .catch(() => {
        // Fallback to hardcoded tabs
      });
  }, [viewId]);

  return tabs;
}
