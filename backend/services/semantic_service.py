"""Semantic layer service — business-friendly metric and dimension queries."""

import json
import logging
from pathlib import Path

from backend.models.glossary import (
    DimensionRegistry,
    SemanticDimension,
    SemanticMetric,
    SemanticRegistry,
)

log = logging.getLogger(__name__)


class SemanticLayerService:
    """Manages business-friendly semantic metrics and reusable dimensions."""

    def __init__(self, workspace: Path):
        self._workspace = workspace
        self._metrics_path = workspace / "metadata" / "semantic" / "metrics.json"
        self._dimensions_path = workspace / "metadata" / "semantic" / "dimensions.json"
        self._metrics: SemanticRegistry | None = None
        self._dimensions: DimensionRegistry | None = None

    def _load_metrics(self) -> SemanticRegistry:
        if self._metrics is not None:
            return self._metrics
        if not self._metrics_path.exists():
            self._metrics = SemanticRegistry()
            return self._metrics
        with open(self._metrics_path) as f:
            data = json.load(f)
        self._metrics = SemanticRegistry(**data)
        return self._metrics

    def _load_dimensions(self) -> DimensionRegistry:
        if self._dimensions is not None:
            return self._dimensions
        if not self._dimensions_path.exists():
            self._dimensions = DimensionRegistry()
            return self._dimensions
        with open(self._dimensions_path) as f:
            data = json.load(f)
        self._dimensions = DimensionRegistry(**data)
        return self._dimensions

    def list_metrics(self, tier: str | None = None) -> list[SemanticMetric]:
        """List all metrics, optionally filtered by source tier."""
        registry = self._load_metrics()
        metrics = registry.metrics
        if tier:
            metrics = [m for m in metrics if m.source_tier == tier]
        return metrics

    def get_metric(self, metric_id: str) -> SemanticMetric | None:
        """Get a single metric by ID."""
        registry = self._load_metrics()
        for metric in registry.metrics:
            if metric.metric_id == metric_id:
                return metric
        return None

    def list_dimensions(self) -> list[SemanticDimension]:
        """Return all dimensions."""
        return self._load_dimensions().dimensions

    def get_dimension(self, dimension_id: str) -> SemanticDimension | None:
        """Get a single dimension by ID."""
        for dim in self._load_dimensions().dimensions:
            if dim.dimension_id == dimension_id:
                return dim
        return None

    def get_metrics_by_dimension(self, dimension_id: str) -> list[SemanticMetric]:
        """Find metrics that are sliceable by a given dimension."""
        registry = self._load_metrics()
        return [m for m in registry.metrics if dimension_id in m.dimensions]

    def get_summary(self) -> dict:
        """Return summary statistics for the semantic layer."""
        registry = self._load_metrics()
        dimensions = self._load_dimensions()
        by_tier: dict[str, int] = {}
        for m in registry.metrics:
            by_tier[m.source_tier] = by_tier.get(m.source_tier, 0) + 1
        return {
            "total_metrics": len(registry.metrics),
            "by_tier": by_tier,
            "total_dimensions": len(dimensions.dimensions),
        }
