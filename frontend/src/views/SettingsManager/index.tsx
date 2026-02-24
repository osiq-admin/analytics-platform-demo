import { useEffect, useState } from "react";
import {
  useMetadataStore,
  type SettingDef,
} from "../../stores/metadataStore.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import ConfirmDialog from "../../components/ConfirmDialog.tsx";
import SettingsList from "./SettingsList.tsx";
import SettingDetail from "./SettingDetail.tsx";
import SettingForm from "./SettingForm.tsx";
import OverrideEditor from "./OverrideEditor.tsx";

export default function SettingsManager() {
  const {
    settings,
    loading,
    fetchSettings,
    saveSetting,
    deleteSetting,
    getSettingDependents,
  } = useMetadataStore();
  const [selected, setSelected] = useState<SettingDef | null>(null);
  const [mode, setMode] = useState<"browse" | "create" | "edit">("browse");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string>("");

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (setting: SettingDef) => {
    await saveSetting(setting);
    setMode("browse");
    setSelected(null);
  };

  const handleRequestDelete = async () => {
    if (!selected) return;
    try {
      const deps = await getSettingDependents(selected.setting_id);
      const warnings: string[] = [];
      if (deps.calculations.length > 0) {
        warnings.push(`Calculations: ${deps.calculations.join(", ")}`);
      }
      if (deps.detection_models.length > 0) {
        warnings.push(`Detection Models: ${deps.detection_models.join(", ")}`);
      }
      if (warnings.length > 0) {
        setDeleteWarning(
          `This setting has dependents that will be affected:\n\n${warnings.join("\n")}\n\nAre you sure you want to delete it?`
        );
      } else {
        setDeleteWarning(
          `Are you sure you want to delete setting "${selected.name}"? This action cannot be undone.`
        );
      }
      setConfirmDelete(true);
    } catch {
      setDeleteWarning(
        `Are you sure you want to delete setting "${selected.name}"? This action cannot be undone.`
      );
      setConfirmDelete(true);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteSetting(selected.setting_id);
    setConfirmDelete(false);
    setSelected(null);
    setMode("browse");
  };

  const emptySetting: SettingDef = {
    setting_id: "",
    name: "",
    description: "",
    value_type: "decimal",
    default: 0,
    match_type: "hierarchy",
    overrides: [],
  };

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
        <Panel
          title="Settings"
          className="w-[480px] shrink-0"
          noPadding
          dataTour="settings-list"
          tooltip="Browse system settings and their overrides"
          actions={
            <button
              onClick={() => {
                setSelected(null);
                setMode("create");
              }}
              className="px-2 py-0.5 text-xs rounded font-medium text-accent border border-dashed border-accent/30 hover:bg-accent/10 transition-colors"
            >
              + New Setting
            </button>
          }
        >
          {settings.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted text-sm p-4">
              No settings defined yet.
            </div>
          ) : (
            <SettingsList
              settings={settings}
              onSelect={(setting) => {
                setSelected(setting);
                setMode("browse");
              }}
            />
          )}
        </Panel>

        {/* Right: Detail + Override editor or Form */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {mode === "create" ? (
            <SettingForm
              setting={emptySetting}
              isNew
              onSave={handleSave}
              onCancel={() => setMode("browse")}
            />
          ) : mode === "edit" && selected ? (
            <SettingForm
              setting={selected}
              isNew={false}
              onSave={handleSave}
              onCancel={() => setMode("browse")}
            />
          ) : selected ? (
            <>
              <SettingDetail
                setting={selected as SettingDef & { match_type?: string; overrides?: Array<{ match: Record<string, string>; value: unknown; priority: number }> }}
                onEdit={() => setMode("edit")}
                onDelete={handleRequestDelete}
              />
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

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Setting"
        message={deleteWarning}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
