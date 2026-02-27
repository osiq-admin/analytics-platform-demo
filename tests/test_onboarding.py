"""Tests for data onboarding models, connectors, services, and API."""
import json
import pytest
from backend.models.onboarding import (
    ConnectorConfig, DetectedColumn, DetectedSchema,
    ColumnProfile, DataProfile, OnboardingJob,
)


class TestOnboardingModels:
    def test_connector_config_defaults(self):
        cfg = ConnectorConfig(connector_id="test", connector_type="local_file")
        assert cfg.schema_detection == "auto"
        assert cfg.quality_profile is True
        assert cfg.landing_tier == "landing"
        assert cfg.format == ""
        assert cfg.config == {}

    def test_detected_schema_parses(self):
        schema = DetectedSchema(
            columns=[DetectedColumn(name="id", inferred_type="int64")],
            row_count=100,
            file_format="csv",
        )
        assert len(schema.columns) == 1
        assert schema.columns[0].name == "id"
        assert schema.row_count == 100

    def test_data_profile_parses(self):
        profile = DataProfile(total_rows=1000, total_columns=5, quality_score=95.0)
        assert profile.completeness_pct == 100.0
        assert profile.duplicate_rows == 0

    def test_onboarding_job_lifecycle(self):
        job = OnboardingJob(job_id="j1", status="uploaded", filename="test.csv")
        assert job.detected_schema is None
        assert job.profile is None
        assert job.error == ""
        assert job.row_count == 0
