"""Pipeline metrics service — records and queries time-series metric data."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.models.observability import MetricPoint, MetricSeries


class MetricsService:
    """Stores and queries metric time series as JSON files."""

    def __init__(self, workspace_dir: Path):
        self._dir = workspace_dir / "metrics"
        self._dir.mkdir(parents=True, exist_ok=True)

    def _series_path(self, metric_id: str) -> Path:
        return self._dir / f"{metric_id}.json"

    def _load_series(self, metric_id: str) -> MetricSeries | None:
        path = self._series_path(metric_id)
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        return MetricSeries.model_validate(data)

    def _save_series(self, series: MetricSeries) -> None:
        path = self._series_path(series.metric_id)
        path.write_text(series.model_dump_json(indent=2))

    def record(
        self,
        metric_id: str,
        metric_type: str,
        value: float,
        unit: str = "",
        entity: str = "",
        tier: str = "",
        tags: dict[str, str] | None = None,
        timestamp: str | None = None,
    ) -> MetricPoint:
        ts = timestamp or datetime.now(timezone.utc).isoformat()
        point = MetricPoint(
            metric_id=str(uuid.uuid4()),
            metric_type=metric_type,
            value=value,
            unit=unit,
            timestamp=ts,
            tags=tags or {},
        )

        series = self._load_series(metric_id)
        if series is None:
            series = MetricSeries(
                metric_id=metric_id,
                metric_type=metric_type,
                entity=entity,
                tier=tier,
            )
        series.points.append(point)
        self._save_series(series)
        return point

    def get_series(
        self,
        metric_id: str,
        start: str | None = None,
        end: str | None = None,
    ) -> MetricSeries | None:
        series = self._load_series(metric_id)
        if series is None:
            return None
        if start or end:
            filtered = []
            for p in series.points:
                if start and p.timestamp < start:
                    continue
                if end and p.timestamp > end:
                    continue
                filtered.append(p)
            series.points = filtered
        return series

    def get_summary(self) -> list[dict]:
        summaries = []
        for path in sorted(self._dir.glob("*.json")):
            series = MetricSeries.model_validate(json.loads(path.read_text()))
            if not series.points:
                continue
            latest = series.points[-1]
            summaries.append({
                "metric_id": series.metric_id,
                "metric_type": series.metric_type,
                "entity": series.entity,
                "tier": series.tier,
                "latest_value": latest.value,
                "latest_timestamp": latest.timestamp,
                "point_count": len(series.points),
            })
        return summaries

    def get_sla_compliance(self) -> list[dict]:
        results = []
        # Load metric definitions to get SLA thresholds
        defs_path = self._dir.parent / "metadata" / "observability" / "metric_definitions.json"
        thresholds: dict[str, float] = {}
        if defs_path.exists():
            defs = json.loads(defs_path.read_text())
            for m in defs.get("metrics", []):
                thresholds[m["id"]] = m.get("sla_threshold", 0)

        for path in sorted(self._dir.glob("*.json")):
            series = MetricSeries.model_validate(json.loads(path.read_text()))
            if not series.points:
                continue
            threshold = thresholds.get(series.metric_id)
            if threshold is None:
                continue
            # For error_rate, lower is better; for others, higher is better
            if series.metric_type == "error_rate":
                compliant = sum(1 for p in series.points if p.value <= threshold)
            else:
                compliant = sum(1 for p in series.points if p.value >= threshold)
            total = len(series.points)
            results.append({
                "metric_id": series.metric_id,
                "threshold": threshold,
                "compliant_points": compliant,
                "total_points": total,
                "compliance_pct": round(compliant / total * 100, 1) if total else 0,
                "status": "met" if compliant == total else ("warning" if compliant / total >= 0.9 else "breach"),
            })
        return results
