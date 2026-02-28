"""Tests for data onboarding models, connectors, services, and API."""
import json
import pytest
import pyarrow as pa
from backend.models.onboarding import (
    ConnectorConfig, DetectedColumn, DetectedSchema,
    DataProfile, OnboardingJob,
)
from backend.connectors.local_file import LocalFileConnector
from backend.services.schema_detector import detect_schema
from backend.services.schema_detector import _detect_pattern
from backend.services.data_profiler import profile_data
from backend.services import onboarding_service
from backend import config
from backend.main import app
from starlette.testclient import TestClient


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




class TestSchemaDetector:
    def test_detect_csv_schema(self, tmp_path):
        f = tmp_path / "test.csv"
        f.write_text("id,name,amount\n1,Alice,100.5\n2,Bob,200.0\n")
        schema = detect_schema(f)
        assert len(schema.columns) == 3
        assert schema.row_count == 2
        assert schema.file_format == "csv"

    def test_detect_pattern_isin(self):
        assert _detect_pattern(["US0378331005", "GB0002634946"]) == "ISIN"

    def test_detect_pattern_mic(self):
        assert _detect_pattern(["XNYS", "XLON"]) == "MIC"

    def test_detect_pattern_empty(self):
        assert _detect_pattern([]) == ""

    def test_detect_pattern_no_match(self):
        assert _detect_pattern(["hello", "world"]) == ""


class TestDataProfiler:
    def test_profile_csv(self, tmp_path):
        f = tmp_path / "test.csv"
        f.write_text("id,name,amount\n1,Alice,100.5\n2,Bob,\n3,Carol,150.0\n")
        profile = profile_data(f)
        assert profile.total_rows == 3
        assert profile.total_columns == 3
        assert profile.completeness_pct < 100

    def test_profile_column_stats(self, tmp_path):
        f = tmp_path / "test.csv"
        f.write_text("val\n10\n20\n30\n")
        profile = profile_data(f)
        assert len(profile.columns) == 1
        assert profile.columns[0].distinct_count == 3

    def test_profile_all_complete(self, tmp_path):
        f = tmp_path / "test.csv"
        f.write_text("a,b\n1,2\n3,4\n")
        profile = profile_data(f)
        assert profile.completeness_pct == 100.0


class TestOnboardingAPI:
    @pytest.fixture(autouse=True)
    def clear_jobs(self):
        onboarding_service.clear_jobs()
        yield
        onboarding_service.clear_jobs()

    @pytest.fixture
    def workspace(self, tmp_path):
        ws = tmp_path / "workspace"
        for d in [
            "metadata/connectors", "metadata/entities",
            "metadata/calculations/transaction",
            "metadata/detection_models", "metadata/settings/thresholds",
            "metadata/medallion", "data/csv", "data/parquet", "data/uploads",
        ]:
            (ws / d).mkdir(parents=True, exist_ok=True)
        (ws / "metadata" / "connectors" / "local_csv.json").write_text(json.dumps({
            "connector_id": "local_csv", "connector_type": "local_file",
            "format": "csv", "config": {}, "description": "CSV connector",
        }))
        return ws

    @pytest.fixture
    def client(self, workspace, monkeypatch):
        monkeypatch.setattr(config.settings, "workspace_dir", workspace)
        import backend.api.onboarding as onb_mod
        monkeypatch.setattr(onb_mod, "UPLOAD_DIR", workspace / "data" / "uploads")
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc

    def test_list_connectors(self, client):
        resp = client.get("/api/onboarding/connectors")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["connector_id"] == "local_csv"

    def test_upload_and_detect(self, client):
        csv = b"id,name,value\n1,Alice,100\n2,Bob,200\n"
        resp = client.post("/api/onboarding/upload", files={"file": ("test.csv", csv, "text/csv")})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "schema_detected"
        assert data["row_count"] == 2
        assert len(data["detected_schema"]["columns"]) == 3

    def test_get_job(self, client):
        csv = b"id,name\n1,A\n"
        upload = client.post("/api/onboarding/upload", files={"file": ("t.csv", csv, "text/csv")})
        job_id = upload.json()["job_id"]
        resp = client.get(f"/api/onboarding/jobs/{job_id}")
        assert resp.status_code == 200
        assert resp.json()["job_id"] == job_id

    def test_get_job_not_found(self, client):
        resp = client.get("/api/onboarding/jobs/nonexistent")
        assert resp.status_code == 404

    def test_profile_job(self, client):
        csv = b"id,name,value\n1,Alice,100\n2,Bob,200\n"
        upload = client.post("/api/onboarding/upload", files={"file": ("t.csv", csv, "text/csv")})
        job_id = upload.json()["job_id"]
        resp = client.post(f"/api/onboarding/jobs/{job_id}/profile")
        assert resp.status_code == 200
        assert resp.json()["status"] == "profiled"
        assert resp.json()["profile"]["total_rows"] == 2

    def test_confirm_job(self, client):
        csv = b"id,name\n1,A\n"
        upload = client.post("/api/onboarding/upload", files={"file": ("t.csv", csv, "text/csv")})
        job_id = upload.json()["job_id"]
        resp = client.post(f"/api/onboarding/jobs/{job_id}/confirm", json={"target_entity": "execution"})
        assert resp.status_code == 200
        assert resp.json()["target_entity"] == "execution"
        assert resp.json()["status"] == "confirmed"

    def test_list_jobs(self, client):
        csv = b"id,name\n1,A\n"
        client.post("/api/onboarding/upload", files={"file": ("t.csv", csv, "text/csv")})
        resp = client.get("/api/onboarding/jobs")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
