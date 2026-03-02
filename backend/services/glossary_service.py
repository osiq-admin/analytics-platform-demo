"""Business glossary service — ISO 11179 term management with search, reverse lookup, and CRUD."""

import json
import logging
from datetime import date
from pathlib import Path

from backend.models.glossary import (
    GlossaryCategoryRegistry,
    GlossaryRegistry,
    GlossaryTerm,
)

log = logging.getLogger(__name__)


class GlossaryService:
    """Manages ISO 11179-compliant business glossary terms with search and reverse lookup."""

    def __init__(self, workspace: Path):
        self._workspace = workspace
        self._terms_path = workspace / "metadata" / "glossary" / "terms.json"
        self._categories_path = workspace / "metadata" / "glossary" / "categories.json"
        self._registry: GlossaryRegistry | None = None
        self._categories: GlossaryCategoryRegistry | None = None

    def _load_registry(self) -> GlossaryRegistry:
        if self._registry is not None:
            return self._registry
        if not self._terms_path.exists():
            self._registry = GlossaryRegistry()
            return self._registry
        with open(self._terms_path) as f:
            data = json.load(f)
        self._registry = GlossaryRegistry(**data)
        return self._registry

    def _load_categories(self) -> GlossaryCategoryRegistry:
        if self._categories is not None:
            return self._categories
        if not self._categories_path.exists():
            self._categories = GlossaryCategoryRegistry()
            return self._categories
        with open(self._categories_path) as f:
            data = json.load(f)
        self._categories = GlossaryCategoryRegistry(**data)
        return self._categories

    def list_terms(
        self,
        category: str | None = None,
        search: str | None = None,
    ) -> list[GlossaryTerm]:
        """List terms, optionally filtered by category and/or search string."""
        registry = self._load_registry()
        terms = registry.terms

        if category:
            terms = [t for t in terms if t.category == category]

        if search:
            q = search.lower()
            terms = [
                t
                for t in terms
                if q in t.term_id.lower()
                or q in t.business_name.lower()
                or q in t.definition.lower()
                or any(q in s.lower() for s in t.synonyms)
            ]

        return terms

    def get_term(self, term_id: str) -> GlossaryTerm | None:
        """Get a single term by ID."""
        registry = self._load_registry()
        for term in registry.terms:
            if term.term_id == term_id:
                return term
        return None

    def reverse_lookup(self, entity: str, field: str) -> list[GlossaryTerm]:
        """Find all terms that map to a given entity.field."""
        registry = self._load_registry()
        result = []
        for term in registry.terms:
            for mapping in term.technical_mappings:
                if mapping.entity == entity and mapping.field == field:
                    result.append(term)
                    break
        return result

    def update_term(self, term_id: str, updates: dict) -> GlossaryTerm | None:
        """Update a term's fields and persist to disk."""
        registry = self._load_registry()
        for i, term in enumerate(registry.terms):
            if term.term_id == term_id:
                term_dict = term.model_dump()
                term_dict.update(updates)
                term_dict["last_updated"] = str(date.today())
                updated = GlossaryTerm(**term_dict)
                registry.terms[i] = updated
                self._save_registry(registry)
                return updated
        return None

    def _save_registry(self, registry: GlossaryRegistry) -> None:
        self._terms_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._terms_path, "w") as f:
            json.dump(registry.model_dump(), f, indent=2)
        self._registry = registry

    def list_categories(self) -> list[dict]:
        """Return all categories with term counts."""
        categories = self._load_categories()
        registry = self._load_registry()
        result = []
        for cat in categories.categories:
            count = sum(1 for t in registry.terms if t.category == cat.category_id)
            result.append({**cat.model_dump(), "term_count": count})
        return result

    def get_ownership_matrix(self) -> dict:
        """Return {owner: {domain: [term_ids]}} matrix."""
        registry = self._load_registry()
        matrix: dict[str, dict[str, list[str]]] = {}
        for term in registry.terms:
            owner = term.owner or "unassigned"
            domain = term.domain or "general"
            matrix.setdefault(owner, {}).setdefault(domain, []).append(term.term_id)
        return matrix

    def get_summary(self) -> dict:
        """Return summary statistics for the glossary."""
        registry = self._load_registry()
        categories = self._load_categories()
        by_status: dict[str, int] = {}
        by_category: dict[str, int] = {}
        for term in registry.terms:
            by_status[term.status] = by_status.get(term.status, 0) + 1
            by_category[term.category] = by_category.get(term.category, 0) + 1
        return {
            "total_terms": len(registry.terms),
            "by_status": by_status,
            "by_category": by_category,
            "category_count": len(categories.categories),
        }
