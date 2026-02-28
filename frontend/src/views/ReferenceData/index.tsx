import { useEffect, useState } from "react";
import Panel from "../../components/Panel.tsx";
import { formatLabel } from "../../utils/format.ts";

interface FieldProvenance {
  value: string | number | boolean | null;
  source: string;
  confidence: number;
  last_updated: string;
}

interface GoldenRecord {
  golden_id: string;
  entity: string;
  natural_key: string;
  data: Record<string, unknown>;
  provenance: Record<string, FieldProvenance>;
  source_records: string[];
  confidence_score: number;
  last_reconciled: string;
  status: string;
  version: number;
  notes: string;
}

interface GoldenRecordSet {
  entity: string;
  golden_key: string;
  record_count: number;
  records: GoldenRecord[];
  last_reconciled: string;
}

interface ReferenceConfig {
  entity: string;
  golden_key: string;
  display_name: string;
  description: string;
  match_rules: { strategy: string; fields: string[]; threshold: number; weight: number }[];
  merge_rules: { field: string; strategy: string; source_priority: string[] }[];
  external_sources: { source_id: string; field: string; validation_type: string; description: string }[];
  auto_reconcile: boolean;
  reconciliation_schedule: string;
}

interface CrossReference {
  golden_id: string;
  entity: string;
  referencing_entity: string;
  referencing_field: string;
  reference_count: number;
}

interface ReconciliationResult {
  entity: string;
  total_source_records: number;
  total_golden_records: number;
  new_records: number;
  updated_records: number;
  conflicts: number;
  unmatched: number;
  confidence_distribution: Record<string, number>;
  timestamp: string;
  duration_ms: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  pending_review: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  manual_override: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  superseded: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-400",
  medium: "text-amber-400",
  low: "text-red-400",
};

function confidenceLabel(score: number): string {
  if (score >= 0.9) return "high";
  if (score >= 0.7) return "medium";
  return "low";
}

export default function ReferenceData() {
  const [configs, setConfigs] = useState<ReferenceConfig[]>([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [recordSet, setRecordSet] = useState<GoldenRecordSet | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<GoldenRecord | null>(null);
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [reconcileResult, setReconcileResult] = useState<ReconciliationResult | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load configs on mount
  useEffect(() => {
    fetch("/api/reference/configs")
      .then((r) => r.json())
      .then((data) => {
        setConfigs(data);
        if (data.length > 0) setSelectedEntity(data[0].entity);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load golden records when entity changes
  useEffect(() => {
    if (!selectedEntity) return;
    setSelectedRecord(null);
    setCrossRefs([]);
    fetch(`/api/reference/${selectedEntity}`)
      .then((r) => r.json())
      .then(setRecordSet);
  }, [selectedEntity]);

  // Load cross-references when record is selected
  useEffect(() => {
    if (!selectedRecord) {
      setCrossRefs([]);
      return;
    }
    fetch(`/api/reference/${selectedEntity}/${selectedRecord.golden_id}/cross-references`)
      .then((r) => r.json())
      .then(setCrossRefs);
  }, [selectedRecord, selectedEntity]);

  const handleReconcile = () => {
    if (!selectedEntity || reconciling) return;
    setReconciling(true);
    fetch(`/api/reference/${selectedEntity}/reconcile`, { method: "POST" })
      .then((r) => r.json())
      .then((result) => {
        setReconcileResult(result);
        // Reload records
        fetch(`/api/reference/${selectedEntity}`)
          .then((r) => r.json())
          .then(setRecordSet);
      })
      .finally(() => setReconciling(false));
  };

  const currentConfig = configs.find((c) => c.entity === selectedEntity);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted">
        Loading reference data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3 p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">
          Reference Data / Master Data Management
        </h1>
        {currentConfig && (
          <span className="text-xs text-muted">{currentConfig.description}</span>
        )}
      </div>

      {/* Entity Tabs */}
      <div className="flex gap-2" data-tour="reference-entity-tabs" data-trace="reference.entity-tabs">
        {configs.map((cfg) => (
          <button
            key={cfg.entity}
            onClick={() => setSelectedEntity(cfg.entity)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              selectedEntity === cfg.entity
                ? "bg-accent/20 border-accent text-accent"
                : "border-border text-muted hover:text-foreground hover:border-border-hover"
            }`}
          >
            {cfg.display_name}
            {recordSet && selectedEntity === cfg.entity && recordSet.record_count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-accent/20">
                {recordSet.record_count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main content: List + Detail */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Golden Record List */}
        <Panel title="Golden Records" className="w-80 shrink-0" noPadding dataTour="reference-golden-list" dataTrace="reference.golden-list">
          <div className="overflow-auto h-full">
            {!recordSet || recordSet.record_count === 0 ? (
              <div className="p-4 text-xs text-muted text-center">
                No golden records. Click Reconcile to generate.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recordSet.records.map((rec) => (
                  <button
                    key={rec.golden_id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-hover transition-colors ${
                      selectedRecord?.golden_id === rec.golden_id ? "bg-accent/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-foreground">{rec.golden_id}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${STATUS_COLORS[rec.status] ?? "text-muted"}`}
                      >
                        {formatLabel(rec.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-muted">{rec.natural_key}</span>
                      <span
                        className={`text-[10px] ${CONFIDENCE_COLORS[confidenceLabel(rec.confidence_score)]}`}
                      >
                        {(rec.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Detail Panel */}
        <Panel
          title={selectedRecord ? `${selectedRecord.golden_id} — Detail` : "Select a Record"}
          className="flex-1"
          dataTour="reference-detail"
          dataTrace="reference.detail-panel"
        >
          {!selectedRecord ? (
            <div className="text-xs text-muted text-center mt-8">
              Select a golden record from the list to view details
            </div>
          ) : (
            <div className="space-y-4">
              {/* Record metadata */}
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted">Entity</span>
                  <div className="text-foreground">{formatLabel(selectedRecord.entity)}</div>
                </div>
                <div>
                  <span className="text-muted">Natural Key</span>
                  <div className="font-mono text-foreground">{selectedRecord.natural_key}</div>
                </div>
                <div>
                  <span className="text-muted">Version</span>
                  <div className="text-foreground">v{selectedRecord.version}</div>
                </div>
                <div>
                  <span className="text-muted">Last Reconciled</span>
                  <div className="text-foreground">
                    {selectedRecord.last_reconciled
                      ? new Date(selectedRecord.last_reconciled).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Field values with provenance */}
              <div>
                <h3 className="text-xs font-medium text-foreground mb-2">
                  Field Values &amp; Provenance
                </h3>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted border-b border-border">
                      <th className="text-left py-1 px-2">Field</th>
                      <th className="text-left py-1 px-2">Value</th>
                      <th className="text-left py-1 px-2">Source</th>
                      <th className="text-right py-1 px-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedRecord.data).map(([field, value]) => {
                      const prov = selectedRecord.provenance[field];
                      return (
                        <tr
                          key={field}
                          className="border-b border-border/50 hover:bg-surface-hover"
                        >
                          <td className="py-1 px-2 text-muted">{formatLabel(field)}</td>
                          <td className="py-1 px-2 font-mono text-foreground">
                            {String(value ?? "—")}
                          </td>
                          <td className="py-1 px-2 text-muted">{prov?.source ?? "—"}</td>
                          <td className="py-1 px-2 text-right">
                            {prov ? (
                              <span
                                className={
                                  CONFIDENCE_COLORS[confidenceLabel(prov.confidence)]
                                }
                              >
                                {(prov.confidence * 100).toFixed(0)}%
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Source Records */}
              <div>
                <h3 className="text-xs font-medium text-foreground mb-2">
                  Source Records ({selectedRecord.source_records.length})
                </h3>
                <div className="flex flex-wrap gap-1">
                  {selectedRecord.source_records.map((src) => (
                    <span
                      key={src}
                      className="px-2 py-0.5 text-[10px] bg-surface border border-border rounded text-muted"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              </div>

              {/* Cross-References */}
              <div>
                <h3 className="text-xs font-medium text-foreground mb-2">
                  Cross-References ({crossRefs.length})
                </h3>
                {crossRefs.length === 0 ? (
                  <span className="text-[10px] text-muted">
                    No downstream references found
                  </span>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {crossRefs.map((ref) => (
                      <div
                        key={`${ref.referencing_entity}-${ref.referencing_field}`}
                        className="px-3 py-2 bg-surface border border-border rounded text-xs"
                      >
                        <div className="text-foreground font-medium">
                          {formatLabel(ref.referencing_entity)}
                        </div>
                        <div className="text-muted">
                          {ref.referencing_field}: {ref.reference_count} references
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Reconciliation Dashboard */}
      <Panel title="Reconciliation" dataTour="reference-reconciliation" dataTrace="reference.reconciliation" noPadding>
        <div className="p-3">
          <div className="flex items-center gap-4">
            <button
              onClick={handleReconcile}
              disabled={reconciling || !selectedEntity}
              className="px-4 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50 transition-colors"
            >
              {reconciling ? "Reconciling..." : "Reconcile"}
            </button>

            {reconcileResult && (
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-muted">Source</span>
                  <div className="text-foreground font-medium">
                    {reconcileResult.total_source_records}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Golden</span>
                  <div className="text-foreground font-medium">
                    {reconcileResult.total_golden_records}
                  </div>
                </div>
                <div>
                  <span className="text-muted">New</span>
                  <div className="text-green-400 font-medium">
                    {reconcileResult.new_records}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Updated</span>
                  <div className="text-amber-400 font-medium">
                    {reconcileResult.updated_records}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Conflicts</span>
                  <div className="text-red-400 font-medium">
                    {reconcileResult.conflicts}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Duration</span>
                  <div className="text-foreground">{reconcileResult.duration_ms}ms</div>
                </div>
                {/* Confidence distribution */}
                {Object.entries(reconcileResult.confidence_distribution).map(
                  ([level, count]) => (
                    <div key={level}>
                      <span className="text-muted">{formatLabel(level)}</span>
                      <div className={CONFIDENCE_COLORS[level] ?? "text-foreground"}>
                        {count}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {!reconcileResult && recordSet && recordSet.record_count > 0 && (
              <span className="text-xs text-muted">
                {recordSet.record_count} golden records · Last reconciled:{" "}
                {recordSet.last_reconciled
                  ? new Date(recordSet.last_reconciled).toLocaleDateString()
                  : "never"}
              </span>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
