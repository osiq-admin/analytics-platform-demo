"""Tests for MetricsService — record, query, summary, SLA compliance."""

import json
from pathlib import Path

from backend.services.metrics_service import MetricsService


class TestMetricsServiceRecord:
    def test_record_creates_file(self, tmp_path):
        svc = MetricsService(tmp_path)
        svc.record("pipeline_execution_time", "execution_time", 450.0, unit="ms")
        path = tmp_path / "metrics" / "pipeline_execution_time.json"
        assert path.exists()

    def test_record_appends_points(self, tmp_path):
        svc = MetricsService(tmp_path)
        svc.record("m1", "execution_time", 100.0, timestamp="2026-03-01T10:00:00Z")
        svc.record("m1", "execution_time", 200.0, timestamp="2026-03-02T10:00:00Z")
        series = svc.get_series("m1")
        assert len(series.points) == 2

    def test_record_returns_point(self, tmp_path):
        svc = MetricsService(tmp_path)
        p = svc.record("m1", "throughput", 150.0, unit="rps")
        assert p.value == 150.0
        assert p.metric_type == "throughput"


class TestMetricsServiceQuery:
    def test_get_series(self, tmp_path):
        svc = MetricsService(tmp_path)
        svc.record("m1", "execution_time", 100.0, timestamp="2026-03-01T10:00:00Z")
        svc.record("m1", "execution_time", 200.0, timestamp="2026-03-02T10:00:00Z")
        series = svc.get_series("m1")
        assert series.metric_id == "m1"
        assert len(series.points) == 2

    def test_get_series_date_filter(self, tmp_path):
        svc = MetricsService(tmp_path)
        svc.record("m1", "execution_time", 100.0, timestamp="2026-03-01T10:00:00Z")
        svc.record("m1", "execution_time", 200.0, timestamp="2026-03-02T10:00:00Z")
        svc.record("m1", "execution_time", 300.0, timestamp="2026-03-03T10:00:00Z")
        series = svc.get_series("m1", start="2026-03-02T00:00:00Z")
        assert len(series.points) == 2

    def test_get_series_nonexistent(self, tmp_path):
        svc = MetricsService(tmp_path)
        assert svc.get_series("nonexistent") is None


class TestMetricsServiceSummary:
    def test_get_summary(self, tmp_path):
        svc = MetricsService(tmp_path)
        svc.record("m1", "execution_time", 100.0, timestamp="2026-03-01T10:00:00Z")
        svc.record("m1", "execution_time", 200.0, timestamp="2026-03-02T10:00:00Z")
        svc.record("m2", "quality_score", 95.0, timestamp="2026-03-01T10:00:00Z")
        summary = svc.get_summary()
        assert len(summary) == 2
        m1 = next(s for s in summary if s["metric_id"] == "m1")
        assert m1["latest_value"] == 200.0
        assert m1["point_count"] == 2


class TestMetricsServiceSLA:
    def test_sla_compliance(self, tmp_path):
        # Create metric definitions
        obs_dir = tmp_path / "metadata" / "observability"
        obs_dir.mkdir(parents=True)
        (obs_dir / "metric_definitions.json").write_text(json.dumps({
            "metrics": [
                {"id": "m1", "type": "execution_time", "unit": "ms", "sla_threshold": 150.0},
            ]
        }))
        svc = MetricsService(tmp_path)
        svc.record("m1", "execution_time", 100.0, timestamp="2026-03-01T10:00:00Z")
        svc.record("m1", "execution_time", 200.0, timestamp="2026-03-02T10:00:00Z")
        sla = svc.get_sla_compliance()
        assert len(sla) == 1
        assert sla[0]["compliance_pct"] == 50.0

    def test_sla_error_rate(self, tmp_path):
        obs_dir = tmp_path / "metadata" / "observability"
        obs_dir.mkdir(parents=True)
        (obs_dir / "metric_definitions.json").write_text(json.dumps({
            "metrics": [
                {"id": "err", "type": "error_rate", "unit": "percent", "sla_threshold": 5.0},
            ]
        }))
        svc = MetricsService(tmp_path)
        svc.record("err", "error_rate", 2.0, timestamp="2026-03-01T10:00:00Z")
        svc.record("err", "error_rate", 3.0, timestamp="2026-03-02T10:00:00Z")
        sla = svc.get_sla_compliance()
        assert sla[0]["compliance_pct"] == 100.0
        assert sla[0]["status"] == "met"
