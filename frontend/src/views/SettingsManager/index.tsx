import { useEffect, useState } from "react";
import {
  useMetadataStore,
  type SettingDef,
} from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import SettingsList from "./SettingsList.tsx";
import SettingDetail from "./SettingDetail.tsx";
import OverrideEditor from "./OverrideEditor.tsx";

export default function SettingsManager() {
  const { settings, loading, fetchSettings } = useMetadataStore();
  const [selected, setSelected] = useState<SettingDef | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <h2 className="text-lg font-semibold">Settings Manager</h2>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Settings list */}
        <Panel title="Settings" className="w-[420px] shrink-0" noPadding dataTour="settings-list" tooltip="Browse system settings and their overrides">
          {settings.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted text-sm p-4">
              No settings defined yet.
            </div>
          ) : (
            <SettingsList settings={settings} onSelect={setSelected} />
          )}
        </Panel>

        {/* Right: Detail + Override editor */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {selected ? (
            <>
              <SettingDetail setting={selected as SettingDef & { match_type?: string; overrides?: Array<{ match: Record<string, string>; value: unknown; priority: number }> }} />
              <OverrideEditor
                settingId={selected.setting_id}
                valueType={selected.value_type}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Select a setting to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
