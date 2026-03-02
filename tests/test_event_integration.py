"""Tests for EventService integration with pipeline_orchestrator and contract_validator."""

from pathlib import Path
from unittest.mock import MagicMock

from backend.services.event_service import EventService
from backend.services.contract_validator import ContractValidator, ContractValidationResult
from backend.models.medallion import DataContract, QualityRule


class TestPipelineOrchestratorEventIntegration:
    def test_orchestrator_accepts_event_service(self, tmp_path):
        """PipelineOrchestrator accepts optional event_service parameter."""
        from backend.services.pipeline_orchestrator import PipelineOrchestrator
        db_mock = MagicMock()
        metadata_mock = MagicMock()
        es = EventService(tmp_path)
        orch = PipelineOrchestrator(tmp_path, db_mock, metadata_mock, event_service=es)
        assert orch._event_service is es

    def test_orchestrator_works_without_event_service(self, tmp_path):
        """PipelineOrchestrator works fine with event_service=None."""
        from backend.services.pipeline_orchestrator import PipelineOrchestrator
        db_mock = MagicMock()
        metadata_mock = MagicMock()
        orch = PipelineOrchestrator(tmp_path, db_mock, metadata_mock)
        assert orch._event_service is None

    def test_emit_stage_event(self, tmp_path):
        """_emit_stage_event emits pipeline_execution events."""
        from backend.services.pipeline_orchestrator import PipelineOrchestrator, StageResult
        db_mock = MagicMock()
        metadata_mock = MagicMock()
        es = EventService(tmp_path)
        orch = PipelineOrchestrator(tmp_path, db_mock, metadata_mock, event_service=es)

        result = StageResult(stage_id="test_stage", status="completed", duration_ms=500.0)
        orch._emit_stage_event(result)

        events = es.get_events(event_type="pipeline_execution")
        assert len(events) == 1
        assert events[0].entity == "test_stage"
        assert events[0].details["status"] == "completed"

    def test_emit_stage_event_noop_without_service(self, tmp_path):
        """_emit_stage_event is a no-op when event_service is None."""
        from backend.services.pipeline_orchestrator import PipelineOrchestrator, StageResult
        db_mock = MagicMock()
        metadata_mock = MagicMock()
        orch = PipelineOrchestrator(tmp_path, db_mock, metadata_mock, event_service=None)
        result = StageResult(stage_id="test_stage", status="completed")
        # Should not raise
        orch._emit_stage_event(result)


class TestContractValidatorEventIntegration:
    def test_validator_accepts_event_service(self):
        db_mock = MagicMock()
        es_mock = MagicMock()
        v = ContractValidator(db_mock, event_service=es_mock)
        assert v._event_service is es_mock

    def test_validator_works_without_event_service(self):
        db_mock = MagicMock()
        v = ContractValidator(db_mock)
        assert v._event_service is None

    def test_emit_quality_event(self, tmp_path):
        db_mock = MagicMock()
        es = EventService(tmp_path)
        v = ContractValidator(db_mock, event_service=es)

        result = ContractValidationResult(
            contract_id="test_contract", passed=True,
            rule_results=[], quality_score=100.0,
        )
        v._emit_quality_event("test_contract", "test_table", result)

        events = es.get_events(event_type="quality_check")
        assert len(events) == 1
        assert events[0].details["contract_id"] == "test_contract"
        assert events[0].details["passed"] is True

    def test_emit_quality_event_noop_without_service(self):
        db_mock = MagicMock()
        v = ContractValidator(db_mock, event_service=None)
        result = ContractValidationResult(
            contract_id="c1", passed=True, rule_results=[], quality_score=100.0,
        )
        # Should not raise
        v._emit_quality_event("c1", "table", result)
