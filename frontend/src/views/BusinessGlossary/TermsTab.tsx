import { useEffect, useState, useCallback } from "react";
import LoadingSpinner from "../../components/LoadingSpinner.tsx";
import StatusBadge from "../../components/StatusBadge.tsx";
import { formatLabel } from "../../utils/format.ts";
import {
  useGlossaryStore,
  type GlossaryTerm,
} from "../../stores/glossaryStore.ts";

// ---------------------------------------------------------------------------
// Helpers
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TermsTab() {
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
