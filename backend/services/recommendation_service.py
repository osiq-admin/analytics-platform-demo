"""Recommendation engine for submission review."""
import logging
from pathlib import Path
from backend.services.metadata_service import MetadataService

log = logging.getLogger(__name__)


class Recommendation:
    def __init__(self, category: str, title: str, description: str, severity: str = "info", action: str | None = None):
        self.category = category
        self.title = title
        self.description = description
        self.severity = severity  # "info", "warning", "critical"
        self.action = action  # suggested action

    def to_dict(self) -> dict:
        return {
            "category": self.category,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "action": self.action,
        }


class RecommendationService:
    def __init__(self, workspace_dir: Path, metadata: MetadataService):
        self._workspace = workspace_dir
        self._metadata = metadata

    def analyze_submission(self, submission_data: dict) -> list[dict]:
        """Generate recommendations for a submission."""
        recs: list[Recommendation] = []
        recs.extend(self._check_change_classification(submission_data))
        recs.extend(self._check_similarity(submission_data))
        recs.extend(self._check_consistency(submission_data))
        recs.extend(self._check_best_practices(submission_data))
        return [r.to_dict() for r in recs]

    def _check_change_classification(self, submission: dict) -> list[Recommendation]:
        """Classify the type of changes in the submission."""
        recs = []
        components = submission.get("components", [])

        new_components = [c for c in components if c.get("action") == "create"]
        ref_components = [c for c in components if c.get("action") == "reference"]

        if new_components:
            types = set(c.get("type", "") for c in new_components)
            recs.append(Recommendation(
                "change_classification",
                f"New components: {', '.join(sorted(types))}",
                f"This submission creates {len(new_components)} new component(s). New components require thorough testing before deployment.",
                "info"
            ))

        if ref_components and not new_components:
            recs.append(Recommendation(
                "change_classification",
                "Reference-only submission",
                "All components reference existing metadata. This is a low-risk configuration change.",
                "info"
            ))

        # Check if any detection model components exist
        model_components = [c for c in components if c.get("type") == "detection_model"]
        if not model_components:
            recs.append(Recommendation(
                "change_classification",
                "No detection model",
                "This submission doesn't include a detection model. Consider adding one to make the use case testable.",
                "warning",
                "Add a detection_model component"
            ))

        return recs

    def _check_similarity(self, submission: dict) -> list[Recommendation]:
        """Check for similarity with existing detection models."""
        recs = []
        components = submission.get("components", [])

        # Get calc IDs from submission
        submission_calc_ids = set()
        for c in components:
            if c.get("type") == "calculation":
                submission_calc_ids.add(c.get("id", ""))

        if not submission_calc_ids:
            return recs

        # Compare with existing models
        existing_models = self._metadata.list_detection_models()
        for model in existing_models:
            model_calc_ids = {mc.calc_id for mc in model.calculations}
            overlap = submission_calc_ids & model_calc_ids
            if overlap and len(overlap) >= 2:
                overlap_pct = len(overlap) / max(len(submission_calc_ids), len(model_calc_ids)) * 100
                recs.append(Recommendation(
                    "similarity",
                    f"Similar to '{model.name}'",
                    f"Shares {len(overlap)} calculations ({overlap_pct:.0f}% overlap): {', '.join(sorted(overlap))}. Consider whether this duplicates existing coverage.",
                    "warning" if overlap_pct > 70 else "info"
                ))

        return recs

    def _check_consistency(self, submission: dict) -> list[Recommendation]:
        """Check for internal consistency issues."""
        recs = []
        components = submission.get("components", [])

        # Check that referenced components exist
        for c in components:
            if c.get("action") == "reference":
                comp_type = c.get("type", "")
                comp_id = c.get("id", "")
                exists = False

                if comp_type == "calculation":
                    exists = any(calc.calc_id == comp_id for calc in self._metadata.list_calculations())
                elif comp_type == "setting":
                    exists = self._metadata.load_setting(comp_id) is not None
                elif comp_type == "detection_model":
                    exists = any(m.model_id == comp_id for m in self._metadata.list_detection_models())
                elif comp_type == "entity":
                    exists = any(e.entity_id == comp_id for e in self._metadata.list_entities())

                if not exists:
                    recs.append(Recommendation(
                        "consistency",
                        f"Missing {comp_type}: {comp_id}",
                        f"Referenced {comp_type} '{comp_id}' does not exist in the current metadata.",
                        "critical",
                        f"Create the {comp_type} or change the reference"
                    ))

        return recs

    def _check_best_practices(self, submission: dict) -> list[Recommendation]:
        """Check against best practices."""
        recs = []

        # Check description
        if not submission.get("description"):
            recs.append(Recommendation(
                "best_practices",
                "Missing description",
                "Add a description explaining what this use case detects and why it's needed.",
                "warning",
                "Add a description"
            ))

        # Check tags
        if not submission.get("tags", []):
            recs.append(Recommendation(
                "best_practices",
                "No tags",
                "Add tags to make this use case searchable and categorizable.",
                "info",
                "Add relevant tags (e.g., wash_trading, market_abuse)"
            ))

        # Check expected results
        if not submission.get("expected_results"):
            recs.append(Recommendation(
                "best_practices",
                "No expected results defined",
                "Define expected alert outcomes to enable automated testing and validation.",
                "warning",
                "Add expected_results with should_fire and expected alert count"
            ))

        return recs
