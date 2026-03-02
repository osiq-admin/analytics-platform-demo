"""Tests for EventService — emit, read, hash chain verification, tamper detection."""

import json
from pathlib import Path

from backend.services.event_service import EventService


class TestEventServiceEmit:
    def test_emit_creates_file(self, tmp_path):
        svc = EventService(tmp_path)
        record = svc.emit("pipeline_execution", actor="test", entity="execution", tier="bronze")
        date_str = record.timestamp[:10]
        path = tmp_path / "logging" / "events" / f"events_{date_str}.jsonl"
        assert path.exists()

    def test_emit_returns_event_record(self, tmp_path):
        svc = EventService(tmp_path)
        record = svc.emit("quality_check", details={"score": 95.0})
        assert record.event_type == "quality_check"
        assert record.details["score"] == 95.0
        assert len(record.event_hash) == 64
        assert len(record.event_id) > 0

    def test_emit_hash_chain(self, tmp_path):
        svc = EventService(tmp_path)
        r1 = svc.emit("pipeline_execution", timestamp="2026-03-01T10:00:00Z")
        r2 = svc.emit("quality_check", timestamp="2026-03-01T10:01:00Z")
        assert r1.prev_hash == "0" * 64
        assert r2.prev_hash == r1.event_hash

    def test_emit_with_custom_timestamp(self, tmp_path):
        svc = EventService(tmp_path)
        record = svc.emit("data_access", timestamp="2026-02-15T08:00:00Z")
        assert record.timestamp == "2026-02-15T08:00:00Z"
        path = tmp_path / "logging" / "events" / "events_2026-02-15.jsonl"
        assert path.exists()


class TestEventServiceRead:
    def test_get_events_by_date(self, tmp_path):
        svc = EventService(tmp_path)
        svc.emit("pipeline_execution", timestamp="2026-03-01T10:00:00Z")
        svc.emit("quality_check", timestamp="2026-03-01T11:00:00Z")
        svc.emit("data_access", timestamp="2026-03-02T10:00:00Z")
        events = svc.get_events(date="2026-03-01")
        assert len(events) == 2

    def test_get_events_by_type(self, tmp_path):
        svc = EventService(tmp_path)
        svc.emit("pipeline_execution", timestamp="2026-03-01T10:00:00Z")
        svc.emit("pipeline_execution", timestamp="2026-03-01T11:00:00Z")
        svc.emit("quality_check", timestamp="2026-03-01T12:00:00Z")
        events = svc.get_events(event_type="pipeline_execution")
        assert len(events) == 2

    def test_get_events_by_entity(self, tmp_path):
        svc = EventService(tmp_path)
        svc.emit("pipeline_execution", entity="execution", timestamp="2026-03-01T10:00:00Z")
        svc.emit("pipeline_execution", entity="order", timestamp="2026-03-01T11:00:00Z")
        events = svc.get_events(entity="execution")
        assert len(events) == 1

    def test_get_events_empty(self, tmp_path):
        svc = EventService(tmp_path)
        events = svc.get_events(date="2026-01-01")
        assert events == []

    def test_get_all_events(self, tmp_path):
        svc = EventService(tmp_path)
        svc.emit("pipeline_execution", timestamp="2026-03-01T10:00:00Z")
        svc.emit("quality_check", timestamp="2026-03-02T10:00:00Z")
        events = svc.get_events()
        assert len(events) == 2


class TestEventServiceHashChain:
    def test_verify_valid_chain(self, tmp_path):
        svc = EventService(tmp_path)
        svc.emit("pipeline_execution", timestamp="2026-03-01T10:00:00Z")
        svc.emit("quality_check", timestamp="2026-03-01T11:00:00Z")
        svc.emit("data_access", timestamp="2026-03-01T12:00:00Z")
        assert svc.verify_chain("2026-03-01") is True

    def test_verify_empty_chain(self, tmp_path):
        svc = EventService(tmp_path)
        assert svc.verify_chain("2026-01-01") is True

    def test_detect_tamper(self, tmp_path):
        svc = EventService(tmp_path)
        svc.emit("pipeline_execution", timestamp="2026-03-01T10:00:00Z")
        svc.emit("quality_check", timestamp="2026-03-01T11:00:00Z")
        # Tamper with file
        path = tmp_path / "logging" / "events" / "events_2026-03-01.jsonl"
        lines = path.read_text().strip().split("\n")
        record = json.loads(lines[0])
        record["details"] = {"tampered": True}
        lines[0] = json.dumps(record)
        path.write_text("\n".join(lines) + "\n")
        assert svc.verify_chain("2026-03-01") is False

    def test_get_stats(self, tmp_path):
        svc = EventService(tmp_path)
        svc.emit("pipeline_execution", timestamp="2026-03-01T10:00:00Z")
        svc.emit("pipeline_execution", timestamp="2026-03-01T11:00:00Z")
        svc.emit("quality_check", timestamp="2026-03-01T12:00:00Z")
        stats = svc.get_stats()
        assert stats["pipeline_execution"] == 2
        assert stats["quality_check"] == 1
