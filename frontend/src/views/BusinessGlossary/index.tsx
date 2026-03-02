import { useEffect, useState, useCallback } from "react";
import { api } from "../../api/client.ts";
import Panel from "../../components/Panel.tsx";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { formatLabel } from "../../utils/format.ts";
import {
  useGlossaryStore,
  type GlossaryTerm,
  type SemanticMetric,
} from "../../stores/glossaryStore.ts";

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type ViewTab = "terms" | "metrics" | "dmbok" | "ownership" | "standards";

const TABS: { key: ViewTab; label: string }[] = [
  { key: "terms", label: "Business Terms" },
  { key: "metrics", label: "Semantic Metrics" },
  { key: "dmbok", label: "DAMA-DMBOK" },
  { key: "ownership", label: "Ownership" },
  { key: "standards", label: "Standards & Gaps" },
];

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

function statusVariant(status: string): "success" | "warning" | "muted" | "info" | "error" {
  switch (status) {
    case "approved":
      return "success";
    case "planned":
      return "info";
    case "draft":
    case "under_review":
      return "warning";
    case "deprecated":
      return "error";
    default:
      return "muted";
  }
}

function complianceVariant(level: string): "success" | "warning" | "info" | "muted" | "error" {
  switch (level) {
    case "full":
      return "success";
    case "partial":
      return "warning";
    case "reference":
      return "info";
    case "not_implemented":
      return "error";
    default:
      return "muted";
  }
}

function priorityVariant(priority: string): "error" | "warning" | "muted" {
  switch (priority) {
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "muted";
  }
}

function tierVariant(tier: string): "info" | "warning" | "success" | "muted" {
  switch (tier) {
    case "platinum":
      return "info";
    case "gold":
      return "success";
    case "silver":
      return "warning";
    default:
      return "muted";
  }
}

// ---------------------------------------------------------------------------
// Business Terms Tab
// ---------------------------------------------------------------------------

function TermsTab() {
  const { terms, categories, loading, fetchTerms, fetchCategories } = useGlossaryStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchTerms();
  }, [fetchCategories, fetchTerms]);

  const handleCategoryClick = useCallback(
    (catId: string | null) => {
      setSelectedCategory(catId);
      setSelectedTerm(null);
      fetchTerms(catId ?? undefined, search || undefined);
    },
    [fetchTerms, search]
  );

  const handleSearch = useCallback(
    (q: string) => {
      setSearch(q);
      fetchTerms(selectedCategory ?? undefined, q || undefined);
    },
    [fetchTerms, selectedCategory]
  );

  return (
    <div className="flex gap-4 h-full">
      {/* Category sidebar */}
      <div
        className="w-48 shrink-0 border-r border-border pr-3"
        data-tour="glossary-categories"
        data-trace="glossary.category-browser"
      >
        <h3 className="text-xs font-semibold text-muted uppercase mb-2">Categories</h3>
        <button
          className={`block w-full text-left text-xs py-1.5 px-2 rounded mb-0.5 ${
            selectedCategory === null ? "bg-accent/20 text-accent" : "hover:bg-surface-hover"
          }`}
          onClick={() => handleCategoryClick(null)}
        >
          All ({terms.length})
        </button>
        {categories
          .sort((a, b) => a.order - b.order)
          .map((cat) => (
            <button
              key={cat.category_id}
              className={`block w-full text-left text-xs py-1.5 px-2 rounded mb-0.5 ${
                selectedCategory === cat.category_id
                  ? "bg-accent/20 text-accent"
                  : "hover:bg-surface-hover"
              }`}
              onClick={() => handleCategoryClick(cat.category_id)}
            >
              {cat.display_name} ({cat.term_count})
            </button>
          ))}
      </div>

      {/* Term list */}
      <div className="flex-1 min-w-0">
        <div className="mb-3" data-tour="glossary-search">
          <input
            type="text"
            placeholder="Search terms, definitions, synonyms..."
            className="w-full bg-surface border border-border rounded px-3 py-1.5 text-xs focus:outline-none focus:border-accent"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {loading && terms.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <div
            className="overflow-y-auto max-h-[calc(100vh-220px)]"
            data-tour="glossary-term-list"
            data-trace="glossary.term-list"
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted border-b border-border sticky top-0 bg-surface-base">
                  <th className="text-left py-1.5 px-2">Term</th>
                  <th className="text-left py-1.5 px-2">Category</th>
                  <th className="text-left py-1.5 px-2">Status</th>
                  <th className="text-left py-1.5 px-2">Owner</th>
                  <th className="text-left py-1.5 px-2">Mappings</th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr
                    key={t.term_id}
                    className={`border-b border-border/50 cursor-pointer ${
                      selectedTerm?.term_id === t.term_id
                        ? "bg-accent/10"
                        : "hover:bg-surface-hover"
                    } ${t.status === "planned" ? "border-dashed border-l-2 border-l-blue-400/50" : ""}`}
                    onClick={() => setSelectedTerm(t)}
                  >
                    <td className="py-1.5 px-2 font-medium">{t.business_name}</td>
                    <td className="py-1.5 px-2 text-muted">{formatLabel(t.category)}</td>
                    <td className="py-1.5 px-2">
                      <StatusBadge label={t.status} variant={statusVariant(t.status)} />
                    </td>
                    <td className="py-1.5 px-2 text-muted">{formatLabel(t.owner)}</td>
                    <td className="py-1.5 px-2 text-muted">{t.technical_mappings.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Term detail panel */}
      {selectedTerm && (
        <div
          className="w-80 shrink-0 border-l border-border pl-3 overflow-y-auto max-h-[calc(100vh-180px)]"
          data-tour="glossary-term-detail"
          data-trace="glossary.term-detail"
        >
          <h3 className="text-sm font-semibold mb-1">{selectedTerm.business_name}</h3>
          <StatusBadge label={selectedTerm.status} variant={statusVariant(selectedTerm.status)} />
          <p className="text-xs text-muted mt-2 mb-3">{selectedTerm.definition}</p>

          {/* ISO 11179 decomposition */}
          {selectedTerm.iso_11179?.data_element_concept && (
            <div className="mb-3">
              <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">ISO 11179</h4>
              <div className="text-xs space-y-0.5">
                <div>
                  <span className="text-muted">Object Class: </span>
                  {selectedTerm.iso_11179.object_class}
                </div>
                <div>
                  <span className="text-muted">Property: </span>
                  {selectedTerm.iso_11179.property}
                </div>
                <div>
                  <span className="text-muted">Representation: </span>
                  {selectedTerm.iso_11179.representation}
                </div>
                <div className="font-mono text-[10px] text-accent">
                  {selectedTerm.iso_11179.data_element_concept}
                </div>
              </div>
            </div>
          )}

          {/* FIBO alignment */}
          {selectedTerm.fibo_alignment?.fibo_class && (
            <div className="mb-3">
              <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">FIBO</h4>
              <div className="text-xs font-mono text-[10px]">{selectedTerm.fibo_alignment.fibo_class}</div>
              {selectedTerm.fibo_alignment.fibo_description && (
                <p className="text-xs text-muted mt-0.5">{selectedTerm.fibo_alignment.fibo_description}</p>
              )}
            </div>
          )}

          {/* Technical mappings */}
          {selectedTerm.technical_mappings.length > 0 && (
            <div className="mb-3">
              <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Technical Mappings</h4>
              {selectedTerm.technical_mappings.map((m, i) => (
                <div key={i} className="text-xs mb-1 bg-surface rounded px-2 py-1">
                  <span className="font-mono text-[10px] text-accent">
                    {m.entity}.{m.field}
                  </span>
                  <span className="text-muted ml-1">({formatLabel(m.relationship)})</span>
                  {m.description && <p className="text-muted text-[10px] mt-0.5">{m.description}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Regulatory references */}
          {selectedTerm.regulatory_references.length > 0 && (
            <div className="mb-3">
              <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Regulatory</h4>
              <div className="flex flex-wrap gap-1">
                {selectedTerm.regulatory_references.map((r, i) => (
                  <span key={i} className="text-[10px] bg-surface rounded px-1.5 py-0.5">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Synonyms */}
          {selectedTerm.synonyms.length > 0 && (
            <div className="mb-3">
              <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Synonyms</h4>
              <div className="flex flex-wrap gap-1">
                {selectedTerm.synonyms.map((s, i) => (
                  <span key={i} className="text-[10px] bg-surface rounded px-1.5 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related terms */}
          {selectedTerm.related_terms.length > 0 && (
            <div className="mb-3">
              <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Related Terms</h4>
              <div className="flex flex-wrap gap-1">
                {selectedTerm.related_terms.map((r, i) => (
                  <span key={i} className="text-[10px] bg-accent/10 text-accent rounded px-1.5 py-0.5">
                    {formatLabel(r)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* BCBS 239 */}
          {selectedTerm.bcbs239_principle && (
            <div className="mb-3">
              <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">BCBS 239</h4>
              <span className="text-xs">{formatLabel(selectedTerm.bcbs239_principle)}</span>
            </div>
          )}

          {/* Metadata */}
          <div className="text-[10px] text-muted mt-3 pt-2 border-t border-border">
            <div>Domain: {formatLabel(selectedTerm.domain)}</div>
            <div>Steward: {formatLabel(selectedTerm.steward)}</div>
            {selectedTerm.last_updated && <div>Updated: {selectedTerm.last_updated}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Semantic Metrics Tab
// ---------------------------------------------------------------------------

function MetricsTab() {
  const { metrics, loading, fetchMetrics, fetchDimensions } = useGlossaryStore();
  const [selectedMetric, setSelectedMetric] = useState<SemanticMetric | null>(null);

  useEffect(() => {
    fetchMetrics();
    fetchDimensions();
  }, [fetchMetrics, fetchDimensions]);

  if (loading && metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      <div
        className="flex-1 min-w-0"
        data-tour="glossary-metrics-list"
        data-trace="glossary.semantic-metrics"
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left py-1.5 px-2">Metric</th>
              <th className="text-left py-1.5 px-2">Source Tier</th>
              <th className="text-left py-1.5 px-2">Unit</th>
              <th className="text-left py-1.5 px-2">Dimensions</th>
              <th className="text-left py-1.5 px-2">BCBS 239</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr
                key={m.metric_id}
                className={`border-b border-border/50 cursor-pointer ${
                  selectedMetric?.metric_id === m.metric_id ? "bg-accent/10" : "hover:bg-surface-hover"
                }`}
                onClick={() => setSelectedMetric(m)}
              >
                <td className="py-1.5 px-2 font-medium">{m.business_name}</td>
                <td className="py-1.5 px-2">
                  <StatusBadge label={m.source_tier} variant={tierVariant(m.source_tier)} />
                </td>
                <td className="py-1.5 px-2 text-muted">{m.unit}</td>
                <td className="py-1.5 px-2 text-muted">{m.dimensions.length}</td>
                <td className="py-1.5 px-2 text-muted">{formatLabel(m.bcbs239_principle)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedMetric && (
        <div className="w-72 shrink-0 border-l border-border pl-3">
          <h3 className="text-sm font-semibold mb-1">{selectedMetric.business_name}</h3>
          <p className="text-xs text-muted mb-3">{selectedMetric.definition}</p>

          <div className="mb-3">
            <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Formula</h4>
            <code className="text-[10px] bg-surface rounded px-2 py-1 block font-mono">
              {selectedMetric.formula}
            </code>
          </div>

          <div className="mb-3">
            <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Source</h4>
            <div className="text-xs">
              <StatusBadge label={selectedMetric.source_tier} variant={tierVariant(selectedMetric.source_tier)} />
              <span className="ml-2 text-muted">
                {selectedMetric.source_entities.map(formatLabel).join(", ")}
              </span>
            </div>
          </div>

          {selectedMetric.dimensions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-[10px] uppercase font-semibold text-muted mb-1">Dimensions</h4>
              <div className="flex flex-wrap gap-1">
                {selectedMetric.dimensions.map((d) => (
                  <span key={d} className="text-[10px] bg-surface rounded px-1.5 py-0.5">
                    {formatLabel(d)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-muted mt-3 pt-2 border-t border-border">
            <div>Owner: {formatLabel(selectedMetric.owner)}</div>
            <div>BCBS 239: {formatLabel(selectedMetric.bcbs239_principle)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DAMA-DMBOK Tab
// ---------------------------------------------------------------------------

function DMBOKTab() {
  const { dmbok, fetchDMBOK } = useGlossaryStore();

  useEffect(() => {
    if (dmbok.length === 0) fetchDMBOK();
  }, [dmbok.length, fetchDMBOK]);

  function coverageVariant(cov: string): "success" | "warning" | "muted" {
    switch (cov) {
      case "high":
        return "success";
      case "medium":
        return "warning";
      default:
        return "muted";
    }
  }

  return (
    <div data-tour="glossary-dmbok-grid" data-trace="glossary.dmbok-coverage">
      <p className="text-xs text-muted mb-3">
        DAMA-DMBOK 2.0 Knowledge Area Coverage — {dmbok.filter((a) => a.coverage === "high").length} of{" "}
        {dmbok.length} areas at high coverage.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {dmbok.map((area) => (
          <div
            key={area.area_id}
            className="bg-surface rounded-lg border border-border p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold">{area.name}</h4>
              <StatusBadge label={area.coverage} variant={coverageVariant(area.coverage)} />
            </div>
            {area.description && (
              <p className="text-[10px] text-muted mb-2 line-clamp-2">{area.description}</p>
            )}
            {area.platform_capabilities && area.platform_capabilities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {area.platform_capabilities.slice(0, 4).map((cap, i) => (
                  <span key={i} className="text-[10px] bg-surface-base rounded px-1 py-0.5 text-muted">
                    {cap}
                  </span>
                ))}
                {area.platform_capabilities.length > 4 && (
                  <span className="text-[10px] text-muted">
                    +{area.platform_capabilities.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ownership Tab
// ---------------------------------------------------------------------------

function OwnershipTab() {
  const [matrix, setMatrix] = useState<Record<string, Record<string, string[]>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Record<string, Record<string, string[]>>>("/glossary/ownership")
      .then((data) => {
        setMatrix(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div data-tour="glossary-ownership" data-trace="glossary.ownership-matrix">
      {Object.entries(matrix).map(([owner, domains]) => (
        <div key={owner} className="mb-4">
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" />
            {formatLabel(owner)}
            <span className="text-muted font-normal">
              ({Object.values(domains).flat().length} terms)
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-2 ml-4">
            {Object.entries(domains).map(([domain, termIds]) => (
              <div key={domain} className="bg-surface rounded border border-border p-2">
                <div className="text-[10px] font-semibold text-muted mb-1">
                  {formatLabel(domain)} ({termIds.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {termIds.map((id) => (
                    <span key={id} className="text-[10px] bg-surface-base rounded px-1 py-0.5">
                      {formatLabel(id)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standards & Gaps Tab
// ---------------------------------------------------------------------------

function StandardsTab() {
  const { standards, gapStandards, entityGaps, fetchStandards, fetchEntityGaps } =
    useGlossaryStore();

  useEffect(() => {
    if (standards.length === 0) fetchStandards();
    if (entityGaps.length === 0) fetchEntityGaps();
  }, [standards.length, entityGaps.length, fetchStandards, fetchEntityGaps]);

  return (
    <div className="space-y-6">
      {/* Standards compliance table */}
      <Panel
        title={`Standards Compliance (${standards.length})`}
        dataTour="glossary-standards"
        dataTrace="glossary.standards-compliance"
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left py-1.5 px-2">Standard</th>
              <th className="text-left py-1.5 px-2">Full Name</th>
              <th className="text-left py-1.5 px-2">Category</th>
              <th className="text-left py-1.5 px-2">Compliance</th>
              <th className="text-left py-1.5 px-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {standards.map((s) => (
              <tr key={s.standard_id} className="border-b border-border/50 hover:bg-surface-hover">
                <td className="py-1.5 px-2 font-medium">{s.name}</td>
                <td className="py-1.5 px-2 text-muted">{s.full_name}</td>
                <td className="py-1.5 px-2 text-muted">{formatLabel(s.category)}</td>
                <td className="py-1.5 px-2">
                  <StatusBadge
                    label={formatLabel(s.compliance_level)}
                    variant={complianceVariant(s.compliance_level)}
                  />
                </td>
                <td className="py-1.5 px-2 text-muted text-[10px]">{s.notes ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* Gap standards roadmap */}
      {gapStandards.length > 0 && (
        <Panel title={`Standards Roadmap (${gapStandards.length})`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted border-b border-border">
                <th className="text-left py-1.5 px-2">Standard</th>
                <th className="text-left py-1.5 px-2">Gap</th>
                <th className="text-left py-1.5 px-2">Suggested Phase</th>
              </tr>
            </thead>
            <tbody>
              {gapStandards.map((s) => (
                <tr key={s.standard_id} className="border-b border-border/50">
                  <td className="py-1.5 px-2 font-medium">{s.name}</td>
                  <td className="py-1.5 px-2 text-muted">{s.gap_description}</td>
                  <td className="py-1.5 px-2">
                    <StatusBadge label={`Phase ${s.suggested_phase}`} variant="muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Entity gap analysis */}
      <Panel
        title="Entity Gap Analysis"
        dataTour="glossary-entity-gaps"
        dataTrace="glossary.entity-gaps"
      >
        <div className="space-y-3">
          {entityGaps
            .filter((e) => e.gaps.length > 0)
            .map((entity) => (
              <div key={entity.entity_id} className="bg-surface rounded border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold">
                    {formatLabel(entity.entity_id)}
                    <span className="text-muted font-normal ml-2">
                      {entity.current_field_count} fields, {entity.gaps.length} gaps
                    </span>
                  </h4>
                </div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-muted border-b border-border/50">
                      <th className="text-left py-1 px-1.5">Field</th>
                      <th className="text-left py-1 px-1.5">Type</th>
                      <th className="text-left py-1 px-1.5">Standard</th>
                      <th className="text-left py-1 px-1.5">Priority</th>
                      <th className="text-left py-1 px-1.5">Regulatory Need</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entity.gaps.map((gap) => (
                      <tr key={gap.field_name} className="border-b border-border/30">
                        <td className="py-1 px-1.5 font-mono">{gap.field_name}</td>
                        <td className="py-1 px-1.5 text-muted">{gap.type}</td>
                        <td className="py-1 px-1.5 text-muted">{gap.standard}</td>
                        <td className="py-1 px-1.5">
                          <StatusBadge label={gap.priority} variant={priorityVariant(gap.priority)} />
                        </td>
                        <td className="py-1 px-1.5 text-muted">{gap.regulatory_need}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          {entityGaps.filter((e) => e.gaps.length === 0).length > 0 && (
            <p className="text-[10px] text-muted">
              {entityGaps.filter((e) => e.gaps.length === 0).length} entities have no attribute gaps:{" "}
              {entityGaps
                .filter((e) => e.gaps.length === 0)
                .map((e) => formatLabel(e.entity_id))
                .join(", ")}
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export default function BusinessGlossary() {
  const [activeTab, setActiveTab] = useState<ViewTab>("terms");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Business Glossary</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "terms" && <TermsTab />}
        {activeTab === "metrics" && <MetricsTab />}
        {activeTab === "dmbok" && <DMBOKTab />}
        {activeTab === "ownership" && <OwnershipTab />}
        {activeTab === "standards" && <StandardsTab />}
      </div>
    </div>
  );
}
