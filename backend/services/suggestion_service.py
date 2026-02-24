"""Suggestion service for regulatory coverage analysis."""
from __future__ import annotations

from backend.services.metadata_service import MetadataService


class SuggestionService:
    """Analyzes regulatory coverage and suggests improvements."""

    def __init__(self, metadata_service: MetadataService):
        self.meta = metadata_service

    def analyze_gaps(self) -> dict:
        """Analyze regulatory coverage gaps and return suggestions."""
        coverage = self.meta.get_regulatory_coverage_map()
        models = self.meta.list_detection_models()
        calcs = self.meta.list_calculations()

        # Build a lookup: article_key -> article dict (with regulation name)
        article_lookup: dict[str, dict] = {}
        for reg in coverage.get("regulations", []):
            for article in reg.get("articles", []):
                key = f"{reg['name']} {article['article']}"
                article_lookup[key] = {
                    "regulation": reg["name"],
                    "article": article["article"],
                    "title": article.get("title", ""),
                    "description": article.get("description", ""),
                }

        gaps = []
        improvements = []

        # 1. Find uncovered regulatory articles
        for article_key in coverage["coverage_summary"].get("uncovered_articles", []):
            article_info = article_lookup.get(article_key, {})
            suggestion = self._suggest_for_article(article_info, calcs)
            gaps.append({
                "regulation": article_info.get("regulation", ""),
                "article": article_info.get("article", article_key),
                "title": article_info.get("title", ""),
                "description": article_info.get("description", ""),
                "suggestion": suggestion,
            })

        # 2. Find models with few calculations (could be strengthened)
        for model in models:
            if len(model.calculations) < 2:
                relevant_calcs = self._find_relevant_calcs(model, calcs)
                if relevant_calcs:
                    improvements.append({
                        "model_id": model.model_id,
                        "model_name": model.name,
                        "current_calc_count": len(model.calculations),
                        "suggestion": f"Consider adding calculations: {', '.join(c.name for c in relevant_calcs)}",
                        "suggested_calcs": [c.calc_id for c in relevant_calcs],
                        "impact": "Improved detection precision with additional signal dimensions",
                    })

        # 3. Find calculations not used by any model
        used_calc_ids: set[str] = set()
        for model in models:
            for mc in model.calculations:
                used_calc_ids.add(mc.calc_id)

        unused = []
        for calc in calcs:
            if calc.calc_id not in used_calc_ids:
                unused.append({
                    "calc_id": calc.calc_id,
                    "name": calc.name,
                    "layer": calc.layer.value if hasattr(calc.layer, "value") else str(calc.layer),
                    "regulatory_tags": calc.regulatory_tags,
                })

        return {
            "gaps": gaps,
            "improvements": improvements,
            "unused_calcs": unused,
            "summary": {
                "gap_count": len(gaps),
                "improvement_count": len(improvements),
                "unused_calc_count": len(unused),
                "total_suggestions": len(gaps) + len(improvements),
            },
        }

    def _suggest_for_article(self, article: dict, calcs: list) -> str:
        """Suggest how to cover an uncovered article."""
        reg = article.get("regulation", "")
        art = article.get("article", "")
        article_key = f"{reg} {art}".strip()
        if not article_key:
            return "Define new calculations and a detection model for this regulation."

        matching_calcs = [c for c in calcs if article_key in c.regulatory_tags]
        if matching_calcs:
            calc_names = ", ".join(c.name for c in matching_calcs)
            return (
                f"Existing calculations ({calc_names}) have regulatory tags for {article_key}. "
                f"Create a new detection model using these calculations."
            )
        return (
            f"No existing calculations tagged for {article_key}. "
            f"Define new calculations targeting this regulation, then create a detection model."
        )

    def _find_relevant_calcs(self, model, calcs: list) -> list:
        """Find calculations that could strengthen a model based on regulatory tags."""
        model_tags: set[str] = set()
        for rc in model.regulatory_coverage:
            model_tags.add(f"{rc.regulation} {rc.article}")

        current_calc_ids = {mc.calc_id for mc in model.calculations}
        return [
            c for c in calcs
            if c.calc_id not in current_calc_ids
            and any(tag in model_tags for tag in c.regulatory_tags)
        ]
