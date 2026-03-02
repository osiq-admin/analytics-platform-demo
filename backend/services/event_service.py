"""Observability event service with tamper-evident hash chain (JSONL storage)."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.models.observability import EventRecord


class EventService:
    """Append-only event log with SHA-256 hash chain per date file."""

    def __init__(self, workspace_dir: Path):
        self._dir = workspace_dir / "logging" / "events"
        self._dir.mkdir(parents=True, exist_ok=True)
        self._last_hash: dict[str, str] = {}  # date_str → last hash

    def _date_file(self, date_str: str) -> Path:
        return self._dir / f"events_{date_str}.jsonl"

    def _get_last_hash(self, date_str: str) -> str:
        if date_str in self._last_hash:
            return self._last_hash[date_str]
        path = self._date_file(date_str)
        if path.exists():
            lines = path.read_text().strip().split("\n")
            if lines and lines[-1]:
                last = json.loads(lines[-1])
                self._last_hash[date_str] = last.get("event_hash", "0" * 64)
                return self._last_hash[date_str]
        return "0" * 64

    @staticmethod
    def compute_hash(prev_hash: str, event_type: str, timestamp: str, details: dict) -> str:
        payload = prev_hash + event_type + timestamp + json.dumps(details, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()

    def emit(
        self,
        event_type: str,
        actor: str = "system",
        entity: str = "",
        tier: str = "",
        details: dict | None = None,
        timestamp: str | None = None,
    ) -> EventRecord:
        details = details or {}
        ts = timestamp or datetime.now(timezone.utc).isoformat()
        date_str = ts[:10]

        prev_hash = self._get_last_hash(date_str)
        event_hash = self.compute_hash(prev_hash, event_type, ts, details)

        record = EventRecord(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            timestamp=ts,
            actor=actor,
            entity=entity,
            tier=tier,
            details=details,
            prev_hash=prev_hash,
            event_hash=event_hash,
        )

        path = self._date_file(date_str)
        with open(path, "a") as f:
            f.write(record.model_dump_json() + "\n")

        self._last_hash[date_str] = event_hash
        return record

    def get_events(
        self,
        date: str | None = None,
        event_type: str | None = None,
        entity: str | None = None,
    ) -> list[EventRecord]:
        results: list[EventRecord] = []
        if date:
            files = [self._date_file(date)]
        else:
            files = sorted(self._dir.glob("events_*.jsonl"))

        for path in files:
            if not path.exists():
                continue
            for line in path.read_text().strip().split("\n"):
                if not line:
                    continue
                record = EventRecord.model_validate_json(line)
                if event_type and record.event_type != event_type:
                    continue
                if entity and record.entity != entity:
                    continue
                results.append(record)
        return results

    def verify_chain(self, date: str) -> bool:
        path = self._date_file(date)
        if not path.exists():
            return True  # empty chain is valid

        prev_hash = "0" * 64
        for line in path.read_text().strip().split("\n"):
            if not line:
                continue
            record = json.loads(line)
            expected = self.compute_hash(
                prev_hash, record["event_type"], record["timestamp"], record["details"],
            )
            if record["event_hash"] != expected:
                return False
            if record["prev_hash"] != prev_hash:
                return False
            prev_hash = record["event_hash"]
        return True

    def get_stats(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for path in self._dir.glob("events_*.jsonl"):
            for line in path.read_text().strip().split("\n"):
                if not line:
                    continue
                record = json.loads(line)
                et = record.get("event_type", "unknown")
                counts[et] = counts.get(et, 0) + 1
        return counts
