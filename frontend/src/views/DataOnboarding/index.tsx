import { useEffect, useState } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";

interface ConnectorConfig {
  connector_id: string;
  connector_type: string;
  format: string;
  description: string;
}

interface DetectedColumn {
  name: string;
  inferred_type: string;
  nullable: boolean;
  sample_values: string[];
  pattern: string;
}

interface ColumnProfile {
  column: string;
  dtype: string;
  null_count: number;
  null_pct: number;
  distinct_count: number;
  min_value: string;
  max_value: string;
  mean_value: string;
}

interface OnboardingJob {
  job_id: string;
  status: string;
  filename: string;
  file_format: string;
  row_count: number;
  error: string;
  detected_schema: {
    columns: DetectedColumn[];
    row_count: number;
    file_format: string;
  } | null;
  profile: {
    total_rows: number;
    total_columns: number;
    completeness_pct: number;
    quality_score: number;
    columns: ColumnProfile[];
  } | null;
  target_entity: string;
}

const STEPS = ["Select Source", "Schema Detection", "Data Profile", "Map Entity", "Confirm"];

export default function DataOnboarding() {
  const [step, setStep] = useState(1);
  const [job, setJob] = useState<OnboardingJob | null>(null);
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [entities, setEntities] = useState<{ entity_id: string; name: string }[]>([]);
  const [selectedEntity, setSelectedEntity] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [entityFields, setEntityFields] = useState<{name: string; type: string}[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .get<ConnectorConfig[]>("/onboarding/connectors")
      .then(setConnectors)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 4) {
      api
        .get<{ entity_id: string; name: string }[]>("/metadata/entities")
        .then(setEntities)
        .catch(() => {});
    }
  }, [step]);

  useEffect(() => {
    if (!selectedEntity) {
      setEntityFields([]);
      setFieldMappings({});
      return;
    }
    api.get(`/metadata/entities/${selectedEntity}`).then((entity: any) => {
      const fields = entity.fields || [];
      setEntityFields(fields);
      // Auto-suggest mappings by matching field names
      if (job?.detected_schema?.columns) {
        const suggested: Record<string, string> = {};
        for (const col of job.detected_schema.columns) {
          const match = fields.find((f: any) =>
            f.name === col.name ||
            f.name.toLowerCase() === col.name.toLowerCase() ||
            f.name.replace(/_/g, "") === col.name.replace(/_/g, "")
          );
          if (match) {
            suggested[col.name] = match.name;
          }
        }
        setFieldMappings(suggested);
      }
    }).catch(() => {});
  }, [selectedEntity, job]);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/onboarding/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data: OnboardingJob = await res.json();
      setJob(data);
      setStep(2);
    } catch {
      // upload failed
    } finally {
      setLoading(false);
    }
  }

  async function handleProfile() {
    if (!job) return;
    setLoading(true);
    try {
      const data = await api.post<OnboardingJob>(`/onboarding/jobs/${job.job_id}/profile`);
      setJob(data);
      setStep(3);
    } catch {
      // profile failed
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmMapping() {
    if (!job || !selectedEntity) return;
    setLoading(true);
    try {
      // Save field mappings if any were configured
      if (Object.keys(fieldMappings).length > 0) {
        const mappingPayload = {
          mapping_id: `onboarding_${job.job_id}_${selectedEntity}`,
          source_entity: job.filename.replace(/\.[^/.]+$/, ""),
          target_entity: selectedEntity,
          source_tier: "landing",
          target_tier: "bronze",
          field_mappings: Object.entries(fieldMappings).map(([src, tgt]) => ({
            source_field: src,
            target_field: tgt,
            transform: "direct",
          })),
          status: "draft",
          description: `Auto-generated mapping from ${job.filename} to ${selectedEntity}`,
        };
        await api.post("/mappings/", mappingPayload);
      }
      // Confirm the onboarding job
      const data = await api.post<OnboardingJob>(`/onboarding/jobs/${job.job_id}/confirm`, {
        target_entity: selectedEntity,
      });
      setJob(data);
      setStep(5);
    } catch {
      // confirm failed
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep(1);
    setJob(null);
    setFile(null);
    setSelectedEntity("");
    setEntityFields([]);
    setFieldMappings({});
  }

  return (
    <div className="flex flex-col gap-4 h-full" data-tour="onboarding-wizard">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold" data-trace="onboarding.title">
          Data Onboarding
        </h2>
        <StatusBadge label={`Step ${step} of 5`} variant="info" />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2" data-trace="onboarding.steps">
        {STEPS.map((label, i) => {
          const num = i + 1;
          const active = num === step;
          const done = num < step;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-0.5 w-8 ${done ? "bg-[var(--color-success)]" : "bg-[var(--border-primary)]"}`}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    active
                      ? "bg-[var(--color-info)] text-white"
                      : done
                        ? "bg-[var(--color-success)] text-white"
                        : "bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-primary)]"
                  }`}
                >
                  {num}
                </div>
                <span
                  className={`text-xs ${active ? "font-semibold text-[var(--text-primary)]" : "text-muted"}`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Step 1: Select Source */}
            {step === 1 && (
              <Panel title="Select Source" dataTrace="onboarding.select-source" dataTour="onboarding-source">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Upload File
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-[var(--text-primary)] file:mr-4 file:py-1.5 file:px-3 file:rounded file:border file:border-[var(--border-primary)] file:text-sm file:font-medium file:bg-[var(--bg-primary)] file:text-[var(--text-primary)] hover:file:bg-[var(--color-surface-elevated)]"
                    />
                  </div>

                  {connectors.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Available Connectors
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {connectors.map((c) => (
                          <div
                            key={c.connector_id}
                            className="border border-[var(--border-primary)] rounded px-3 py-2 text-xs bg-[var(--bg-primary)]"
                          >
                            <p className="font-medium text-[var(--text-primary)]">{c.connector_type}</p>
                            <p className="text-muted">{c.format} &mdash; {c.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!file}
                    className="px-4 py-1.5 rounded text-sm font-medium bg-[var(--color-info)] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    Upload &amp; Detect
                  </button>
                </div>
              </Panel>
            )}

            {/* Step 2: Schema Detection */}
            {step === 2 && job?.detected_schema && (
              <Panel title="Schema Detection" dataTrace="onboarding.schema" dataTour="onboarding-schema">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                    <StatusBadge label={job.detected_schema.file_format} variant="info" />
                    <span>{job.detected_schema.row_count} rows detected</span>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-primary)] text-left text-muted">
                        <th className="py-1.5 pr-3 font-medium">Name</th>
                        <th className="py-1.5 pr-3 font-medium">Type</th>
                        <th className="py-1.5 pr-3 font-medium">Nullable</th>
                        <th className="py-1.5 pr-3 font-medium">Pattern</th>
                        <th className="py-1.5 font-medium">Samples</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.detected_schema.columns.map((col) => (
                        <tr
                          key={col.name}
                          className="border-b border-[var(--border-primary)] text-[var(--text-primary)]"
                        >
                          <td className="py-1.5 pr-3 font-medium">{col.name}</td>
                          <td className="py-1.5 pr-3">{col.inferred_type}</td>
                          <td className="py-1.5 pr-3">{col.nullable ? "Yes" : "No"}</td>
                          <td className="py-1.5 pr-3 text-muted">{col.pattern}</td>
                          <td className="py-1.5 text-muted truncate max-w-[200px]">
                            {col.sample_values.join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    onClick={handleProfile}
                    className="px-4 py-1.5 rounded text-sm font-medium bg-[var(--color-info)] text-white hover:opacity-90 transition-opacity"
                  >
                    Next: Profile Data
                  </button>
                </div>
              </Panel>
            )}

            {/* Step 3: Data Profile */}
            {step === 3 && job?.profile && (
              <Panel title="Data Profile" dataTrace="onboarding.profile" dataTour="onboarding-profile">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="border border-[var(--border-primary)] rounded p-3 bg-[var(--bg-primary)]">
                      <p className="text-muted text-xs">Total Rows</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {job.profile.total_rows.toLocaleString()}
                      </p>
                    </div>
                    <div className="border border-[var(--border-primary)] rounded p-3 bg-[var(--bg-primary)]">
                      <p className="text-muted text-xs">Total Columns</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {job.profile.total_columns}
                      </p>
                    </div>
                    <div className="border border-[var(--border-primary)] rounded p-3 bg-[var(--bg-primary)]">
                      <p className="text-muted text-xs">Completeness</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {job.profile.completeness_pct.toFixed(1)}%
                      </p>
                    </div>
                    <div className="border border-[var(--border-primary)] rounded p-3 bg-[var(--bg-primary)]">
                      <p className="text-muted text-xs">Quality Score</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {job.profile.quality_score.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-primary)] text-left text-muted">
                        <th className="py-1.5 pr-3 font-medium">Column</th>
                        <th className="py-1.5 pr-3 font-medium">Type</th>
                        <th className="py-1.5 pr-3 font-medium">Nulls</th>
                        <th className="py-1.5 pr-3 font-medium">Null%</th>
                        <th className="py-1.5 pr-3 font-medium">Distinct</th>
                        <th className="py-1.5 pr-3 font-medium">Min</th>
                        <th className="py-1.5 pr-3 font-medium">Max</th>
                        <th className="py-1.5 font-medium">Mean</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.profile.columns.map((col) => (
                        <tr
                          key={col.column}
                          className="border-b border-[var(--border-primary)] text-[var(--text-primary)]"
                        >
                          <td className="py-1.5 pr-3 font-medium">{col.column}</td>
                          <td className="py-1.5 pr-3">{col.dtype}</td>
                          <td className="py-1.5 pr-3">{col.null_count}</td>
                          <td className="py-1.5 pr-3">{col.null_pct.toFixed(1)}%</td>
                          <td className="py-1.5 pr-3">{col.distinct_count}</td>
                          <td className="py-1.5 pr-3 text-muted">{col.min_value}</td>
                          <td className="py-1.5 pr-3 text-muted">{col.max_value}</td>
                          <td className="py-1.5 text-muted">{col.mean_value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button
                    onClick={() => setStep(4)}
                    className="px-4 py-1.5 rounded text-sm font-medium bg-[var(--color-info)] text-white hover:opacity-90 transition-opacity"
                  >
                    Next: Map Entity
                  </button>
                </div>
              </Panel>
            )}

            {/* Step 4: Map to Entity */}
            {step === 4 && job && (
              <Panel title="Map to Entity" dataTrace="onboarding.map-entity" dataTour="onboarding-map">
                <div className="space-y-4">
                  {/* File info */}
                  <div className="text-sm text-[var(--text-primary)]">
                    <p><span className="text-muted">File:</span> {job.filename} — {job.row_count.toLocaleString()} rows</p>
                  </div>

                  {/* Entity selector */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Target Entity
                    </label>
                    <select
                      value={selectedEntity}
                      onChange={(e) => setSelectedEntity(e.target.value)}
                      className="w-full max-w-xs border border-[var(--border-primary)] rounded px-3 py-1.5 text-sm bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    >
                      <option value="">Select entity...</option>
                      {entities.map((e) => (
                        <option key={e.entity_id} value={e.entity_id}>
                          {e.name || e.entity_id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Field mapping table */}
                  {selectedEntity && job.detected_schema && entityFields.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">
                        Field Mappings
                        <span className="text-muted ml-2 font-normal">
                          ({Object.keys(fieldMappings).length} of {job.detected_schema.columns.length} mapped)
                        </span>
                      </h3>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border-primary)] text-left text-muted">
                            <th className="py-1.5 pr-3 font-medium">Source Column</th>
                            <th className="py-1.5 pr-3 font-medium">Type</th>
                            <th className="py-1.5 pr-3 font-medium">&rarr;</th>
                            <th className="py-1.5 font-medium">Target Field</th>
                          </tr>
                        </thead>
                        <tbody>
                          {job.detected_schema.columns.map((col) => (
                            <tr key={col.name} className="border-b border-[var(--border-primary)] text-[var(--text-primary)]">
                              <td className="py-1.5 pr-3 font-medium">{col.name}</td>
                              <td className="py-1.5 pr-3 text-muted">{col.inferred_type}</td>
                              <td className="py-1.5 pr-3 text-muted">&rarr;</td>
                              <td className="py-1.5">
                                <select
                                  value={fieldMappings[col.name] || ""}
                                  onChange={(e) => {
                                    setFieldMappings(prev => {
                                      const next = { ...prev };
                                      if (e.target.value) {
                                        next[col.name] = e.target.value;
                                      } else {
                                        delete next[col.name];
                                      }
                                      return next;
                                    });
                                  }}
                                  className="w-full border border-[var(--border-primary)] rounded px-2 py-1 text-xs bg-[var(--bg-primary)] text-[var(--text-primary)]"
                                >
                                  <option value="">— unmapped —</option>
                                  {entityFields.map((f) => (
                                    <option key={f.name} value={f.name}>{f.name} ({f.type})</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button
                    onClick={handleConfirmMapping}
                    disabled={!selectedEntity}
                    className="px-4 py-1.5 rounded text-sm font-medium bg-[var(--color-info)] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    Confirm Mapping
                  </button>
                </div>
              </Panel>
            )}

            {/* Step 5: Confirm */}
            {step === 5 && job && (
              <Panel title="Onboarding Complete" dataTrace="onboarding.confirm" dataTour="onboarding-confirm">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge label="Confirmed" variant="success" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-[var(--text-primary)]">
                    <div>
                      <p className="text-muted text-xs">Filename</p>
                      <p className="font-medium">{job.filename}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs">Format</p>
                      <p className="font-medium">{job.file_format}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs">Rows</p>
                      <p className="font-medium">{job.row_count.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs">Columns</p>
                      <p className="font-medium">{job.profile?.total_columns ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs">Quality Score</p>
                      <p className="font-medium">{job.profile?.quality_score.toFixed(1) ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs">Target Entity</p>
                      <p className="font-medium">{job.target_entity || selectedEntity}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleReset}
                    className="px-4 py-1.5 rounded text-sm font-medium bg-[var(--color-info)] text-white hover:opacity-90 transition-opacity"
                  >
                    Start New Upload
                  </button>
                </div>
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
