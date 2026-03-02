import { useEffect, useState } from "react";
import { api } from "../../api/client.ts";

interface ReportTemplate {
  template_id: string;
  name: string;
  regulation: string;
  sections: { section_id: string; label: string; fields: unknown[] }[];
}

interface GeneratedReport {
  report_id: string;
  template_id: string;
  case_id: string;
  generated_at: string;
  sections: {
    section_id: string;
    label: string;
    fields: { field_id: string; label: string; value: string }[];
  }[];
}

interface ReportGeneratorProps {
  caseId: string;
}

export default function ReportGenerator({ caseId }: ReportGeneratorProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ templates: ReportTemplate[] }>("/reports/templates")
      .then((d) => {
        setTemplates(d.templates);
        if (d.templates.length > 0) setSelectedTemplate(d.templates[0].template_id);
      });
    loadReports();
  }, [caseId]);

  function loadReports() {
    api
      .get<{ reports: GeneratedReport[] }>(`/reports?case_id=${caseId}`)
      .then((d) => setReports(d.reports));
  }

  async function handleGenerate() {
    if (!selectedTemplate) return;
    setGenerating(true);
    setError(null);
    try {
      await api.post("/reports/generate", {
        template_id: selectedTemplate,
        case_id: caseId,
      });
      loadReports();
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  }

  function formatTimestamp(ts: string) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }

  return (
    <div className="space-y-4" data-tour="cases-reports">
      {/* Generate controls */}
      <div className="flex items-center gap-2">
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="px-2 py-1 text-xs rounded border border-border bg-surface text-foreground"
        >
          {templates.map((t) => (
            <option key={t.template_id} value={t.template_id}>
              {t.name} — {t.regulation}
            </option>
          ))}
        </select>
        <button
          onClick={handleGenerate}
          disabled={generating || !selectedTemplate}
          className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Generated reports list */}
      {reports.length === 0 ? (
        <p className="text-xs text-muted">No reports generated yet for this case.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const tpl = templates.find((t) => t.template_id === r.template_id);
            const expanded = expandedId === r.report_id;
            return (
              <div
                key={r.report_id}
                className="border border-border rounded p-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted">
                      {r.report_id}
                    </span>
                    <span className="font-medium">
                      {tpl?.name ?? r.template_id}
                    </span>
                    <span className="text-muted">
                      {formatTimestamp(r.generated_at)}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedId(expanded ? null : r.report_id)}
                    className="text-[10px] text-blue-400 hover:text-blue-300"
                  >
                    {expanded ? "Collapse" : "Preview"}
                  </button>
                </div>
                {expanded && (
                  <div className="mt-2 space-y-2">
                    {r.sections.map((s) => (
                      <div key={s.section_id}>
                        <div className="font-medium text-muted mb-1">
                          {s.label}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-2">
                          {s.fields.map((f) => (
                            <div key={f.field_id} className="flex gap-1">
                              <span className="text-muted">{f.label}:</span>
                              <span className="truncate">{f.value || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
