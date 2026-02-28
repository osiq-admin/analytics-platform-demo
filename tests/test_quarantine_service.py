"""Tests for quarantine service."""
import pytest
from pathlib import Path
from backend.services.quarantine_service import QuarantineService


@pytest.fixture
def service(tmp_path):
    return QuarantineService(tmp_path)


class TestQuarantineCapture:
    def test_capture_creates_record(self, service):
        rec = service.capture(
            source_tier="bronze", target_tier="silver", entity="execution",
            failed_rules=[{"rule": "not_null", "field": "order_id", "error": "NULL value"}],
            original_data={"execution_id": "E1", "order_id": None},
        )
        assert rec.record_id
        assert rec.status == "pending"
        assert rec.entity == "execution"
        assert len(rec.failed_rules) == 1

    def test_capture_persists_to_disk(self, service):
        rec = service.capture(
            source_tier="bronze", target_tier="silver", entity="order",
            failed_rules=[], original_data={"order_id": "O1"},
        )
        loaded = service.get_record(rec.record_id)
        assert loaded is not None
        assert loaded.entity == "order"


class TestQuarantineList:
    def test_list_empty(self, service):
        assert service.list_records() == []

    def test_list_all(self, service):
        service.capture("bronze", "silver", "execution", [], {})
        service.capture("bronze", "silver", "order", [], {})
        assert len(service.list_records()) == 2

    def test_list_filter_by_entity(self, service):
        service.capture("bronze", "silver", "execution", [], {})
        service.capture("bronze", "silver", "order", [], {})
        assert len(service.list_records(entity="execution")) == 1

    def test_list_filter_by_status(self, service):
        rec = service.capture("bronze", "silver", "execution", [], {})
        service.override(rec.record_id, "test override")
        assert len(service.list_records(status="overridden")) == 1
        assert len(service.list_records(status="pending")) == 0


class TestQuarantineActions:
    def test_retry_increments_count(self, service):
        rec = service.capture("bronze", "silver", "execution", [], {})
        updated = service.retry(rec.record_id)
        assert updated.retry_count == 1
        assert updated.status == "retried"
        # Retry again
        updated2 = service.retry(rec.record_id)
        assert updated2.retry_count == 2

    def test_override_with_notes(self, service):
        rec = service.capture("bronze", "silver", "execution", [{"rule": "not_null"}], {})
        updated = service.override(rec.record_id, notes="Data corrected upstream")
        assert updated.status == "overridden"
        assert updated.notes == "Data corrected upstream"

    def test_discard(self, service):
        rec = service.capture("bronze", "silver", "execution", [], {})
        assert service.discard(rec.record_id) is True
        loaded = service.get_record(rec.record_id)
        assert loaded.status == "discarded"

    def test_retry_nonexistent(self, service):
        assert service.retry("nonexistent") is None

    def test_override_nonexistent(self, service):
        assert service.override("nonexistent") is None

    def test_discard_nonexistent(self, service):
        assert service.discard("nonexistent") is False


class TestQuarantineSummary:
    def test_empty_summary(self, service):
        s = service.summary()
        assert s.total_records == 0

    def test_summary_counts(self, service):
        service.capture("bronze", "silver", "execution",
                        [{"rule": "not_null"}, {"rule": "referential_integrity"}], {})
        service.capture("bronze", "silver", "execution", [{"rule": "not_null"}], {})
        service.capture("silver", "gold", "order", [{"rule": "range_check"}], {})
        s = service.summary()
        assert s.total_records == 3
        assert s.by_entity["execution"] == 2
        assert s.by_entity["order"] == 1
        assert "bronze" in str(s.by_tier_transition)  # tier transition key contains "bronze"
        assert s.by_rule_type["not_null"] == 2
        assert s.by_status["pending"] == 3
