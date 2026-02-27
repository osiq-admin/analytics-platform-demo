"""Tests for data onboarding models, connectors, services, and API."""
import json
import pytest
import pyarrow as pa
from backend.models.onboarding import (
    ConnectorConfig, DetectedColumn, DetectedSchema,
    ColumnProfile, DataProfile, OnboardingJob,
)
from backend.connectors.local_file import LocalFileConnector


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


class TestConnectors:
    def test_local_file_supported_formats(self):
        conn = LocalFileConnector()
        fmts = conn.supported_formats()
        assert "csv" in fmts
        assert "json" in fmts
        assert "parquet" in fmts
        assert "excel" in fmts

    def test_read_csv(self, tmp_path):
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("id,name,value\n1,Alice,100\n2,Bob,200\n")
        conn = LocalFileConnector()
        table = conn.read(csv_file)
        assert len(table) == 2
        assert "id" in table.column_names
        assert "name" in table.column_names

    def test_detect_schema_csv(self, tmp_path):
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("id,name,value\n1,Alice,100\n2,Bob,200\n")
        conn = LocalFileConnector()
        result = conn.detect_schema(csv_file)
        assert len(result["columns"]) == 3
        assert result["row_count"] == 2
        assert result["format"] == "csv"

    def test_read_json(self, tmp_path):
        json_file = tmp_path / "test.json"
        json_file.write_text('{"id": 1, "name": "Alice"}\n{"id": 2, "name": "Bob"}\n')
        conn = LocalFileConnector()
        table = conn.read(json_file)
        assert len(table) == 2

    def test_read_parquet(self, tmp_path):
        import pyarrow.parquet as pq_writer
        table = pa.table({"id": [1, 2], "name": ["Alice", "Bob"]})
        path = tmp_path / "test.parquet"
        pq_writer.write_table(table, path)
        conn = LocalFileConnector()
        result = conn.read(path)
        assert len(result) == 2

    def test_unsupported_format_raises(self):
        conn = LocalFileConnector()
        with pytest.raises(ValueError, match="Unsupported format"):
            conn.read("/fake/file.xyz", format="xyz")

    def test_fix_stub_raises(self):
        from backend.connectors.fix_stub import FixStubConnector
        conn = FixStubConnector()
        with pytest.raises(NotImplementedError):
            conn.read("any")
        with pytest.raises(NotImplementedError):
            conn.detect_schema("any")

    def test_streaming_stub_raises(self):
        from backend.connectors.streaming_stub import StreamingStubConnector
        conn = StreamingStubConnector()
        with pytest.raises(NotImplementedError):
            conn.read("any")
        with pytest.raises(NotImplementedError):
            conn.detect_schema("any")
