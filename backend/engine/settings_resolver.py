"""Settings resolution engine with hierarchy, multi-dimensional matching, and score step evaluation."""
from dataclasses import dataclass
from typing import Any, Protocol

from backend.models.settings import ScoreStep, SettingDefinition, SettingOverride


@dataclass
class ResolutionResult:
    setting_id: str = ""
    value: Any = None
    matched_override: SettingOverride | None = None
    why: str = ""


# ---------------------------------------------------------------------------
# Module-level helpers (no instance state needed)
# ---------------------------------------------------------------------------

def _all_keys_match(match: dict[str, str], context: dict[str, str]) -> bool:
    return all(context.get(k) == v for k, v in match.items())


def _count_matching_dimensions(match: dict[str, str], context: dict[str, str]) -> int:
    count = sum(1 for k, v in match.items() if context.get(k) == v)
    # Only count if ALL dimensions of the override match
    if count == len(match):
        return count
    return 0


# ---------------------------------------------------------------------------
# Resolution Strategy Protocol & implementations
# ---------------------------------------------------------------------------

class ResolutionStrategy(Protocol):
    def resolve(self, overrides: list[SettingOverride], context: dict[str, str]) -> SettingOverride | None: ...


class HierarchyStrategy:
    """Hierarchy: all match keys must be present in context. Most specific (most keys) wins, tie-broken by priority."""

    def resolve(self, overrides: list[SettingOverride], context: dict[str, str]) -> SettingOverride | None:
        candidates = []
        for ov in overrides:
            if _all_keys_match(ov.match, context):
                candidates.append(ov)

        if not candidates:
            return None

        # Sort by: number of match keys descending, then priority descending
        candidates.sort(key=lambda o: (len(o.match), o.priority), reverse=True)
        return candidates[0]


class MultiDimensionalStrategy:
    """Multi-dimensional: count how many dimensions match. Most matches wins, tie-broken by priority."""

    def resolve(self, overrides: list[SettingOverride], context: dict[str, str]) -> SettingOverride | None:
        candidates = []
        for ov in overrides:
            match_count = _count_matching_dimensions(ov.match, context)
            if match_count > 0:
                candidates.append((match_count, ov))

        if not candidates:
            return None

        # Sort by: match count descending, then priority descending
        candidates.sort(key=lambda x: (x[0], x[1].priority), reverse=True)
        return candidates[0][1]


# ---------------------------------------------------------------------------
# Strategy registry — add new strategies here without modifying SettingsResolver
# ---------------------------------------------------------------------------

RESOLUTION_STRATEGIES: dict[str, ResolutionStrategy] = {
    "hierarchy": HierarchyStrategy(),
    "multi_dimensional": MultiDimensionalStrategy(),
}


# ---------------------------------------------------------------------------
# Resolver
# ---------------------------------------------------------------------------

class SettingsResolver:
    def resolve(self, setting: SettingDefinition, context: dict[str, str]) -> ResolutionResult:
        """Resolve a setting value for a given entity context.

        Resolution order:
        1. Product-specific (priority >= 100) always wins if context matches
        2. Hierarchy: most specific scope (all match keys present in context)
        3. Multi-dimensional: most matching dimensions, tie-broken by priority
        4. Default fallback
        """
        strategy = RESOLUTION_STRATEGIES.get(setting.match_type)
        if strategy is None:
            raise ValueError(f"Unknown resolution strategy: {setting.match_type}")
        matched = strategy.resolve(setting.overrides, context)

        if matched is not None:
            match_desc = ", ".join(f"{k}={v}" for k, v in matched.match.items())
            return ResolutionResult(
                setting_id=setting.setting_id,
                value=matched.value,
                matched_override=matched,
                why=f"Matched override: {{{match_desc}}} (priority {matched.priority})",
            )

        return ResolutionResult(
            setting_id=setting.setting_id,
            value=setting.default,
            matched_override=None,
            why="No matching override; using default value",
        )

    def evaluate_score(self, steps: list[ScoreStep], value: float) -> float:
        """Given a value and score steps, return the graduated score."""
        for step in steps:
            min_v = step.min_value if step.min_value is not None else float("-inf")
            max_v = step.max_value if step.max_value is not None else float("inf")
            if min_v <= value < max_v:
                return step.score
            # Handle the unbounded upper range (max_value is None/inf)
            if max_v == float("inf") and value >= min_v:
                return step.score
        return 0.0
