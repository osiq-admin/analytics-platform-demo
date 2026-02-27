# Phase 15: Data Onboarding & Connector Abstraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the hardcoded CSV reader with a metadata-driven connector abstraction layer and add a Data Onboarding wizard view for guided file ingestion with schema detection and data profiling.

**Architecture:** Abstract `BaseConnector` interface with `LocalFileConnector` implementation (CSV/JSON/Parquet/Excel) + FIX/streaming stubs. An `OnboardingService` orchestrates the upload→detect→profile→stage workflow, with in-memory job tracking (dict, not DB — demo only). A new 5-step wizard frontend view guides users through the onboarding process. All connector configs are metadata JSON on disk.

**Tech Stack:** Python FastAPI, DuckDB, PyArrow, Pydantic v2, React 19, TypeScript, Vite, Zustand (if needed), Tailwind CSS 4

---

## Context

Phase 14 added the Medallion Architecture view with 11 tiers, data contracts, and pipeline stages. The current data loading path (`backend/engine/data_loader.py`) reads CSV files directly from `workspace/data/csv/`, converts to Parquet, and loads into DuckDB — no format abstraction, no schema detection, no quality profiling. Phase 15 adds the connector layer that makes data ingestion metadata-driven and format-agnostic.

**Current state:** M0-M175 complete, 17 views, 732 tests (522 backend + 210 E2E), 970 modules, 77 architecture sections (83.1% metadata-driven).

---

## Task 1: Pydantic Models + Model Tests (M176)

**Files:**
- Create: `backend/models/onboarding.py`
- Create: `tests/test_onboarding.py`

**Step 1: Create Pydantic models**

Create `backend/models/onboarding.py` with these models:

```python
"""Data onboarding and connector models."""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Literal

class ConnectorConfig(BaseModel):
    connector_id: str
    connector_type: Literal["local_file", "fix_protocol", "streaming", "api"]
    format: str = ""  # csv, json, parquet, excel, xml, fix
    config: dict = Field(default_factory=dict)
    schema_detection: Literal["auto", "manual"] = "auto"
    quality_profile: bool = True
    landing_tier: str = "landing"
    target_entity: str = ""
    description: str = ""

class DetectedColumn(BaseModel):
    name: str
    inferred_type: str  # string, int64, float64, date, timestamp, boolean
    nullable: bool = True
    sample_values: list[str] = Field(default_factory=list)
    pattern: str = ""  # detected pattern (e.g., "ISIN", "ISO8601", "MIC")

class DetectedSchema(BaseModel):
    columns: list[DetectedColumn] = Field(default_factory=list)
    row_count: int = 0
    file_format: str = ""
    encoding: str = "utf-8"
    delimiter: str = ""
    has_header: bool = True

class ColumnProfile(BaseModel):
    column: str
    dtype: str
    null_count: int = 0
    null_pct: float = 0.0
    distinct_count: int = 0
    min_value: str = ""
    max_value: str = ""
    mean_value: str = ""
    top_values: list[dict] = Field(default_factory=list)  # [{value, count}]

class DataProfile(BaseModel):
    total_rows: int = 0
    total_columns: int = 0
    columns: list[ColumnProfile] = Field(default_factory=list)
    duplicate_rows: int = 0
    completeness_pct: float = 100.0
    quality_score: float = 0.0  # 0-100

class OnboardingJob(BaseModel):
    job_id: str
    status: Literal["uploaded", "schema_detected", "profiled", "mapped", "confirmed", "staged", "failed"] = "uploaded"
    filename: str = ""
    file_format: str = ""
    connector_id: str = ""
    detected_schema: DetectedSchema | None = None
    profile: DataProfile | None = None
    target_entity: str = ""
    row_count: int = 0
    error: str = ""
```

**Step 2: Write model tests**

Create `tests/test_onboarding.py` with `TestOnboardingModels` class:

```python
class TestOnboardingModels:
    def test_connector_config_defaults(self):
        cfg = ConnectorConfig(connector_id="test", connector_type="local_file")
        assert cfg.schema_detection == "auto"
        assert cfg.quality_profile is True
        assert cfg.landing_tier == "landing"

    def test_detected_schema_parses(self):
        schema = DetectedSchema(columns=[DetectedColumn(name="id", inferred_type="int64")], row_count=100, file_format="csv")
        assert len(schema.columns) == 1
        assert schema.row_count == 100

    def test_data_profile_parses(self):
        profile = DataProfile(total_rows=1000, total_columns=5, quality_score=95.0)
        assert profile.completeness_pct == 100.0

    def test_onboarding_job_lifecycle(self):
        job = OnboardingJob(job_id="j1", status="uploaded", filename="test.csv")
        assert job.detected_schema is None
        assert job.error == ""
```

**Step 3: Run tests**

```bash
uv run pytest tests/test_onboarding.py::TestOnboardingModels -v
```
Expected: 4 passed

**Step 4: Commit**

```bash
git add backend/models/onboarding.py tests/test_onboarding.py
git commit -m "feat(onboarding): add Pydantic models + tests (M176)"
```

---

## Task 2: Connector Metadata Files (M177)

**Files:**
- Create: `workspace/metadata/connectors/local_csv.json`
- Create: `workspace/metadata/connectors/local_json.json`
- Create: `workspace/metadata/connectors/local_parquet.json`
- Create: `workspace/metadata/connectors/local_excel.json`
- Create: `workspace/metadata/connectors/fix_stub.json`
- Create: `workspace/metadata/connectors/streaming_stub.json`

**Step 1: Create connector metadata directory and files**

Create 6 JSON files following the ConnectorConfig model:

```json
// local_csv.json
{
    "connector_id": "local_csv",
    "connector_type": "local_file",
    "format": "csv",
    "config": {
        "delimiter": ",",
        "encoding": "utf-8",
        "header_row": true,
        "date_format": "ISO8601"
    },
    "schema_detection": "auto",
    "quality_profile": true,
    "landing_tier": "landing",
    "target_entity": "",
    "description": "Local CSV file reader — comma-separated values with auto-detected schema"
}
```

Similar patterns for JSON (format: "json"), Parquet (format: "parquet"), Excel (format: "excel").

Stubs for FIX (connector_type: "fix_protocol", format: "fix") and streaming (connector_type: "streaming", format: "").

**Step 2: Commit**

```bash
git add workspace/metadata/connectors/
git commit -m "feat(onboarding): add connector metadata definitions (M177)"
```

---

## Task 3: Connector Abstraction + Local File Connector (M178)

**Files:**
- Create: `backend/connectors/__init__.py`
- Create: `backend/connectors/base.py`
- Create: `backend/connectors/local_file.py`
- Create: `backend/connectors/fix_stub.py`
- Create: `backend/connectors/streaming_stub.py`
- Add tests to: `tests/test_onboarding.py`

**Step 1: Create abstract base connector**

`backend/connectors/base.py`:
```python
"""Abstract connector interface."""
from abc import ABC, abstractmethod
from pathlib import Path
import pyarrow as pa

class BaseConnector(ABC):
    """Base class for all data connectors."""

    @abstractmethod
    def read(self, source: str | Path, **kwargs) -> pa.Table:
        """Read data from source, return Arrow table."""
        ...

    @abstractmethod
    def detect_schema(self, source: str | Path, sample_rows: int = 100) -> dict:
        """Detect schema from source, return {columns: [{name, type, nullable, samples}]}."""
        ...

    @abstractmethod
    def supported_formats(self) -> list[str]:
        """Return list of supported file formats."""
        ...
```

**Step 2: Create LocalFileConnector**

`backend/connectors/local_file.py`:
```python
"""Local file connector — CSV, JSON, Parquet, Excel."""
from pathlib import Path
import pyarrow as pa
import pyarrow.csv as pcsv
import pyarrow.parquet as pq
import pyarrow.json as pjson
from .base import BaseConnector

class LocalFileConnector(BaseConnector):
    def supported_formats(self) -> list[str]:
        return ["csv", "json", "parquet", "excel"]

    def read(self, source: str | Path, **kwargs) -> pa.Table:
        path = Path(source)
        fmt = kwargs.get("format", path.suffix.lstrip(".").lower())
        if fmt == "csv":
            return pcsv.read_csv(path)
        elif fmt == "json":
            return pjson.read_json(path)
        elif fmt == "parquet":
            return pq.read_table(path)
        elif fmt in ("excel", "xlsx", "xls"):
            import pandas as pd
            df = pd.read_excel(path)
            return pa.Table.from_pandas(df)
        raise ValueError(f"Unsupported format: {fmt}")

    def detect_schema(self, source: str | Path, sample_rows: int = 100) -> dict:
        table = self.read(source)
        sample = table.slice(0, min(sample_rows, len(table)))
        columns = []
        for i, field in enumerate(table.schema):
            col_data = sample.column(i)
            samples = [str(v) for v in col_data.to_pylist()[:5] if v is not None]
            columns.append({
                "name": field.name,
                "type": str(field.type),
                "nullable": field.nullable,
                "samples": samples,
            })
        return {"columns": columns, "row_count": len(table), "format": Path(source).suffix.lstrip(".")}
```

**Step 3: Create stubs**

`backend/connectors/fix_stub.py` and `backend/connectors/streaming_stub.py` — implement BaseConnector with methods that raise `NotImplementedError("FIX connector is a demo stub")`.

**Step 4: Add connector tests to test_onboarding.py**

```python
class TestConnectors:
    def test_local_file_supported_formats(self):
        conn = LocalFileConnector()
        assert "csv" in conn.supported_formats()

    def test_read_csv(self, tmp_path):
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("id,name,value\n1,Alice,100\n2,Bob,200\n")
        conn = LocalFileConnector()
        table = conn.read(csv_file)
        assert len(table) == 2
        assert "id" in table.column_names

    def test_detect_schema_csv(self, tmp_path):
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("id,name,value\n1,Alice,100\n2,Bob,200\n")
        conn = LocalFileConnector()
        result = conn.detect_schema(csv_file)
        assert len(result["columns"]) == 3
        assert result["row_count"] == 2

    def test_read_json(self, tmp_path):
        json_file = tmp_path / "test.json"
        json_file.write_text('[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]')
        conn = LocalFileConnector()
        table = conn.read(json_file)
        assert len(table) == 2

    def test_read_parquet(self, tmp_path):
        import pyarrow.parquet as pq
        table = pa.table({"id": [1, 2], "name": ["Alice", "Bob"]})
        path = tmp_path / "test.parquet"
        pq.write_table(table, path)
        conn = LocalFileConnector()
        result = conn.read(path)
        assert len(result) == 2

    def test_fix_stub_raises(self):
        from backend.connectors.fix_stub import FixStubConnector
        conn = FixStubConnector()
        with pytest.raises(NotImplementedError):
            conn.read("any")

    def test_streaming_stub_raises(self):
        from backend.connectors.streaming_stub import StreamingStubConnector
        conn = StreamingStubConnector()
        with pytest.raises(NotImplementedError):
            conn.read("any")
```

**Step 5: Run tests**

```bash
uv run pytest tests/test_onboarding.py -v
```
Expected: 11 passed (4 model + 7 connector)

**Step 6: Commit**

```bash
git add backend/connectors/ tests/test_onboarding.py
git commit -m "feat(onboarding): connector abstraction + local file connector (M178)"
```

---

## Task 4: Schema Detector + Data Profiler Services (M179)

**Files:**
- Create: `backend/services/schema_detector.py`
- Create: `backend/services/data_profiler.py`
- Add tests to: `tests/test_onboarding.py`

**Step 1: Create schema detector**

`backend/services/schema_detector.py`:
```python
"""Schema detection service — auto-detect column types, formats, patterns."""
from pathlib import Path
import pyarrow as pa
from backend.connectors.local_file import LocalFileConnector
from backend.models.onboarding import DetectedSchema, DetectedColumn

# Pattern detectors for common financial data formats
PATTERNS = {
    r"^[A-Z]{2}[A-Z0-9]{9}\d$": "ISIN",
    r"^[A-Z]{4}$": "MIC",
    r"^[A-Z]{3}$": "CCY",
    r"^\d{4}-\d{2}-\d{2}": "ISO8601",
    r"^[A-Z0-9]{20}$": "LEI",
}

def detect_schema(file_path: Path, sample_rows: int = 100) -> DetectedSchema:
    """Detect schema from a file using PyArrow inference."""
    connector = LocalFileConnector()
    table = connector.read(file_path)
    sample = table.slice(0, min(sample_rows, len(table)))
    columns = []
    for i, field in enumerate(table.schema):
        col_data = sample.column(i)
        samples = [str(v) for v in col_data.to_pylist()[:5] if v is not None]
        pattern = _detect_pattern(samples)
        columns.append(DetectedColumn(
            name=field.name,
            inferred_type=str(field.type),
            nullable=field.nullable,
            sample_values=samples,
            pattern=pattern,
        ))
    fmt = file_path.suffix.lstrip(".").lower()
    return DetectedSchema(
        columns=columns,
        row_count=len(table),
        file_format=fmt,
        delimiter="," if fmt == "csv" else "",
        has_header=True,
    )

def _detect_pattern(samples: list[str]) -> str:
    """Try to match samples against known financial data patterns."""
    import re
    if not samples:
        return ""
    for pat, label in PATTERNS.items():
        if all(re.match(pat, s) for s in samples if s):
            return label
    return ""
```

**Step 2: Create data profiler**

`backend/services/data_profiler.py`:
```python
"""Data quality profiling service."""
from pathlib import Path
import pyarrow as pa
from backend.connectors.local_file import LocalFileConnector
from backend.models.onboarding import DataProfile, ColumnProfile

def profile_data(file_path: Path) -> DataProfile:
    """Profile a data file for quality metrics."""
    connector = LocalFileConnector()
    table = connector.read(file_path)
    columns = []
    total_nulls = 0
    for i, field in enumerate(table.schema):
        col = table.column(i)
        null_count = col.null_count
        total_nulls += null_count
        distinct = len(pa.compute.unique(col))
        # min/max/mean for numeric types
        min_val = max_val = mean_val = ""
        try:
            min_val = str(pa.compute.min(col).as_py())
            max_val = str(pa.compute.max(col).as_py())
            mean_val = str(round(pa.compute.mean(col).as_py(), 4))
        except (pa.ArrowNotImplementedError, TypeError, AttributeError):
            pass
        # Top values
        value_counts = pa.compute.value_counts(col).to_pylist()
        top = sorted(value_counts, key=lambda x: x["counts"], reverse=True)[:5]
        top_values = [{"value": str(v["values"]), "count": v["counts"]} for v in top]
        columns.append(ColumnProfile(
            column=field.name,
            dtype=str(field.type),
            null_count=null_count,
            null_pct=round(null_count / len(table) * 100, 2) if len(table) > 0 else 0,
            distinct_count=distinct,
            min_value=min_val,
            max_value=max_val,
            mean_value=mean_val,
            top_values=top_values,
        ))
    total_cells = len(table) * len(table.schema)
    completeness = round((1 - total_nulls / total_cells) * 100, 2) if total_cells > 0 else 100.0
    quality_score = completeness  # Simple: quality = completeness for demo
    return DataProfile(
        total_rows=len(table),
        total_columns=len(table.schema),
        columns=columns,
        completeness_pct=completeness,
        quality_score=quality_score,
    )
```

**Step 3: Add service tests**

```python
class TestSchemaDetector:
    def test_detect_csv_schema(self, tmp_path):
        f = tmp_path / "test.csv"
        f.write_text("id,name,amount\n1,Alice,100.5\n2,Bob,200.0\n")
        schema = detect_schema(f)
        assert len(schema.columns) == 3
        assert schema.row_count == 2
        assert schema.file_format == "csv"

    def test_detect_pattern_isin(self):
        from backend.services.schema_detector import _detect_pattern
        assert _detect_pattern(["US0378331005", "GB0002634946"]) == "ISIN"

class TestDataProfiler:
    def test_profile_csv(self, tmp_path):
        f = tmp_path / "test.csv"
        f.write_text("id,name,amount\n1,Alice,100.5\n2,Bob,200.0\n3,,150.0\n")
        profile = profile_data(f)
        assert profile.total_rows == 3
        assert profile.total_columns == 3
        assert profile.completeness_pct < 100  # has a null

    def test_profile_column_stats(self, tmp_path):
        f = tmp_path / "test.csv"
        f.write_text("val\n10\n20\n30\n")
        profile = profile_data(f)
        assert len(profile.columns) == 1
        assert profile.columns[0].distinct_count == 3
```

**Step 4: Run tests**

```bash
uv run pytest tests/test_onboarding.py -v
```
Expected: 15 passed (4 model + 7 connector + 4 service)

**Step 5: Commit**

```bash
git add backend/services/schema_detector.py backend/services/data_profiler.py tests/test_onboarding.py
git commit -m "feat(onboarding): schema detection + data profiling services (M179)"
```

---

## Task 5: Onboarding Service + API + MetadataService Methods (M180)

**Files:**
- Create: `backend/services/onboarding_service.py`
- Create: `backend/api/onboarding.py`
- Modify: `backend/services/metadata_service.py` — add connector metadata methods
- Modify: `backend/main.py` — register router
- Add tests to: `tests/test_onboarding.py`

**Step 1: Add MetadataService methods for connectors**

Add to `backend/services/metadata_service.py` (after the medallion methods ~line 1097):

```python
def list_connectors(self) -> "list[ConnectorConfig]":
    from backend.models.onboarding import ConnectorConfig
    d = self._ws / "metadata" / "connectors"
    if not d.exists():
        return []
    return [ConnectorConfig.model_validate_json(f.read_text()) for f in sorted(d.glob("*.json"))]

def load_connector(self, connector_id: str) -> "ConnectorConfig | None":
    from backend.models.onboarding import ConnectorConfig
    p = self._ws / "metadata" / "connectors" / f"{connector_id}.json"
    if not p.exists():
        return None
    return ConnectorConfig.model_validate_json(p.read_text())
```

**Step 2: Create onboarding service**

`backend/services/onboarding_service.py`:
```python
"""Onboarding workflow orchestrator — manages upload→detect→profile→stage jobs."""
from pathlib import Path
import uuid
from backend.models.onboarding import OnboardingJob, DetectedSchema, DataProfile
from backend.services.schema_detector import detect_schema
from backend.services.data_profiler import profile_data

# In-memory job store (demo only — not persistent)
_jobs: dict[str, OnboardingJob] = {}

def create_job(filename: str, file_path: Path) -> OnboardingJob:
    job_id = str(uuid.uuid4())[:8]
    fmt = file_path.suffix.lstrip(".").lower()
    job = OnboardingJob(job_id=job_id, status="uploaded", filename=filename, file_format=fmt)
    # Auto-detect schema
    try:
        job.detected_schema = detect_schema(file_path)
        job.row_count = job.detected_schema.row_count
        job.status = "schema_detected"
    except Exception as e:
        job.error = str(e)
        job.status = "failed"
    _jobs[job_id] = job
    return job

def get_job(job_id: str) -> OnboardingJob | None:
    return _jobs.get(job_id)

def profile_job(job_id: str, file_path: Path) -> OnboardingJob | None:
    job = _jobs.get(job_id)
    if not job:
        return None
    try:
        job.profile = profile_data(file_path)
        job.status = "profiled"
    except Exception as e:
        job.error = str(e)
        job.status = "failed"
    return job

def confirm_job(job_id: str, target_entity: str) -> OnboardingJob | None:
    job = _jobs.get(job_id)
    if not job:
        return None
    job.target_entity = target_entity
    job.status = "confirmed"
    return job

def list_jobs() -> list[OnboardingJob]:
    return list(_jobs.values())
```

**Step 3: Create API router**

`backend/api/onboarding.py`:
```python
"""Data onboarding API — upload, detect, profile, stage."""
from pathlib import Path
from fastapi import APIRouter, Request, UploadFile, File
from fastapi.responses import JSONResponse
from backend.services import onboarding_service

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

UPLOAD_DIR = Path("workspace/data/uploads")

def _meta(request: Request):
    return request.app.state.metadata

@router.get("/connectors")
def list_connectors(request: Request):
    connectors = _meta(request).list_connectors()
    return [c.model_dump() for c in connectors]

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_DIR / file.filename
    content = await file.read()
    dest.write_bytes(content)
    job = onboarding_service.create_job(file.filename, dest)
    return job.model_dump()

@router.get("/jobs")
def list_jobs():
    return [j.model_dump() for j in onboarding_service.list_jobs()]

@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = onboarding_service.get_job(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, status_code=404)
    return job.model_dump()

@router.post("/jobs/{job_id}/profile")
def profile_job(job_id: str):
    job = onboarding_service.get_job(job_id)
    if not job:
        return JSONResponse({"error": "Job not found"}, status_code=404)
    file_path = UPLOAD_DIR / job.filename
    result = onboarding_service.profile_job(job_id, file_path)
    return result.model_dump()

@router.post("/jobs/{job_id}/confirm")
def confirm_job(job_id: str, request_body: dict):
    target_entity = request_body.get("target_entity", "")
    job = onboarding_service.confirm_job(job_id, target_entity)
    if not job:
        return JSONResponse({"error": "Job not found"}, status_code=404)
    return job.model_dump()
```

**Step 4: Register router in main.py**

Add to `backend/main.py`:
```python
from backend.api import onboarding
app.include_router(onboarding.router)
```

**Step 5: Add API tests**

```python
class TestOnboardingAPI:
    @pytest.fixture
    def workspace(self, tmp_path):
        ws = tmp_path / "workspace"
        for d in ["metadata/connectors", "metadata/entities", "metadata/calculations/transaction",
                   "metadata/detection_models", "metadata/settings/thresholds",
                   "metadata/medallion", "data/csv", "data/parquet", "data/uploads"]:
            (ws / d).mkdir(parents=True, exist_ok=True)
        # Write a connector JSON
        (ws / "metadata" / "connectors" / "local_csv.json").write_text(json.dumps({
            "connector_id": "local_csv", "connector_type": "local_file", "format": "csv",
            "config": {}, "description": "CSV connector"
        }))
        return ws

    @pytest.fixture
    def client(self, workspace, monkeypatch):
        monkeypatch.setattr(config.settings, "workspace_dir", workspace)
        with TestClient(app, raise_server_exceptions=False) as tc:
            yield tc

    def test_list_connectors(self, client):
        resp = client.get("/api/onboarding/connectors")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_upload_and_detect(self, client, workspace):
        csv = b"id,name,value\n1,Alice,100\n2,Bob,200\n"
        resp = client.post("/api/onboarding/upload", files={"file": ("test.csv", csv, "text/csv")})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "schema_detected"
        assert data["row_count"] == 2

    def test_get_job(self, client, workspace):
        csv = b"id,name\n1,A\n"
        upload = client.post("/api/onboarding/upload", files={"file": ("t.csv", csv, "text/csv")})
        job_id = upload.json()["job_id"]
        resp = client.get(f"/api/onboarding/jobs/{job_id}")
        assert resp.status_code == 200

    def test_get_job_not_found(self, client):
        resp = client.get("/api/onboarding/jobs/nonexistent")
        assert resp.status_code == 404

    def test_profile_job(self, client, workspace):
        csv = b"id,name,value\n1,Alice,100\n2,Bob,200\n"
        upload = client.post("/api/onboarding/upload", files={"file": ("t.csv", csv, "text/csv")})
        job_id = upload.json()["job_id"]
        resp = client.post(f"/api/onboarding/jobs/{job_id}/profile")
        assert resp.status_code == 200
        assert resp.json()["status"] == "profiled"

    def test_confirm_job(self, client, workspace):
        csv = b"id,name\n1,A\n"
        upload = client.post("/api/onboarding/upload", files={"file": ("t.csv", csv, "text/csv")})
        job_id = upload.json()["job_id"]
        resp = client.post(f"/api/onboarding/jobs/{job_id}/confirm", json={"target_entity": "execution"})
        assert resp.status_code == 200
        assert resp.json()["target_entity"] == "execution"

    def test_list_jobs(self, client, workspace):
        csv = b"id,name\n1,A\n"
        client.post("/api/onboarding/upload", files={"file": ("t.csv", csv, "text/csv")})
        resp = client.get("/api/onboarding/jobs")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
```

**Step 6: Run full backend tests**

```bash
uv run pytest tests/ --ignore=tests/e2e -v
```
Expected: 522 + ~22 new = 544+ passed

**Step 7: Commit**

```bash
git add backend/services/onboarding_service.py backend/api/onboarding.py backend/services/metadata_service.py backend/main.py tests/test_onboarding.py
git commit -m "feat(onboarding): onboarding service + API + MetadataService methods (M180)"
```

---

## Task 6: Navigation + Route + Frontend View (M181)

**Files:**
- Modify: `workspace/metadata/navigation/main.json` — add Data Onboarding under Operate
- Modify: `frontend/src/routes.tsx` — add route
- Create: `frontend/src/views/DataOnboarding/index.tsx` — 5-step wizard

**Step 1: Add navigation entry**

Add to `workspace/metadata/navigation/main.json` Operate group (order 4), after medallion:
```json
{"view_id": "onboarding", "label": "Onboarding", "path": "/onboarding", "icon": "Upload", "order": 4}
```

**Step 2: Add route**

Add to `frontend/src/routes.tsx`:
```typescript
const DataOnboarding = lazy(() => import("./views/DataOnboarding/index.tsx"));
// In routes array:
{ path: "onboarding", element: <Suspense fallback={null}><DataOnboarding /></Suspense> }
```

**Step 3: Create DataOnboarding view**

`frontend/src/views/DataOnboarding/index.tsx` — A 5-step wizard:

1. **Select Source**: File upload dropzone + connector type selector
2. **Detect Schema**: Table showing detected columns with types and sample values
3. **Profile Data**: Quality metrics — completeness, nulls, distinct counts, distributions
4. **Map to Entity**: Dropdown to select target entity from existing entities list
5. **Confirm & Ingest**: Summary panel with confirm button

**Key patterns to follow (from MedallionOverview):**
- `import { api } from "../../api/client.ts"`
- `import Panel from "../../components/Panel.tsx"`
- `import LoadingSpinner from "../../components/LoadingSpinner.tsx"`
- `import StatusBadge from "../../components/StatusBadge.tsx"`
- Use `data-tour` and `data-trace` attributes on panels
- useState for wizard step, job data, loading states
- Tailwind CSS for styling — no hardcoded colors, use CSS variables

**Wizard state machine:**
```typescript
const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
const [job, setJob] = useState<OnboardingJob | null>(null);
const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
const [entities, setEntities] = useState<Entity[]>([]);
const [loading, setLoading] = useState(false);
```

**Step 4: Build frontend**

```bash
cd frontend && npm run build
```
Expected: 0 errors, ~975+ modules

**Step 5: Commit**

```bash
git add workspace/metadata/navigation/main.json frontend/src/routes.tsx frontend/src/views/DataOnboarding/
git commit -m "feat(onboarding): navigation + route + 5-step wizard view (M181)"
```

---

## Task 7: Tours, Scenarios, Operations, Architecture Registry (M182)

**Files:**
- Modify: `frontend/src/data/tourDefinitions.ts` — add onboarding tour
- Modify: `frontend/src/layouts/AppLayout.tsx` — add tour ID mapping
- Modify: `frontend/src/data/operationScripts.ts` — add onboarding operations
- Modify: `frontend/src/data/scenarioDefinitions.ts` — add S28 onboarding scenario
- Modify: `frontend/src/data/architectureRegistry.ts` — add onboarding sections

**Step 1: Add tour**

In `tourDefinitions.ts`, add `onboarding` tour with 3 steps:
1. Wizard Step Indicator (data-tour="onboarding-wizard")
2. Schema Detection Panel (data-tour="onboarding-schema")
3. Data Profile Panel (data-tour="onboarding-profile")

**Step 2: Add tour ID mapping**

In `AppLayout.tsx` `getTourIdForPath()` map:
```typescript
onboarding: "onboarding",
```

**Step 3: Add operations**

In `operationScripts.ts`, add `onboarding` view with 5 operations:
- upload_file: "Upload a data file"
- detect_schema: "Auto-detect schema"
- profile_quality: "Profile data quality"
- map_entity: "Map to target entity"
- confirm_ingest: "Confirm and ingest"
Plus architecture_trace operation and 3-4 tips.

**Step 4: Add scenario S28**

In `scenarioDefinitions.ts`, add `S28_DATA_ONBOARDING`:
- category: "admin"
- difficulty: "beginner"
- estimatedMinutes: 5
- 4 steps: navigate → upload CSV → review schema → profile data
- Include in SCENARIOS export

**Step 5: Add architecture registry entries**

In `architectureRegistry.ts`, add `onboarding` ViewTrace with 3 sections:
- `onboarding.wizard-steps` — code-driven (wizard logic is in React)
- `onboarding.schema-detection` — fully-metadata-driven (schema from connector metadata + PyArrow)
- `onboarding.data-profile` — fully-metadata-driven (profile generated from data)

Update header comment: 80 sections across 18 views.

**Step 6: Build frontend**

```bash
cd frontend && npm run build
```
Expected: 0 errors

**Step 7: Commit**

```bash
git add frontend/src/data/tourDefinitions.ts frontend/src/layouts/AppLayout.tsx frontend/src/data/operationScripts.ts frontend/src/data/scenarioDefinitions.ts frontend/src/data/architectureRegistry.ts
git commit -m "feat(onboarding): tours, scenarios, operations, architecture registry (M182)"
```

---

## Task 8: Full Test Suite + Build Verification (M183)

**Step 1: Run all backend tests**

```bash
uv run pytest tests/ --ignore=tests/e2e -v
```
Expected: 544+ passed (522 + ~22 new onboarding tests)

**Step 2: Build frontend**

```bash
cd frontend && npm run build
```
Expected: 0 errors, ~975 modules

**Step 3: Start app and verify**

```bash
./start.sh
```
Verify app starts, navigate to /onboarding in browser.

---

## Task 9: Playwright Visual Verification

**MANDATORY — do not skip.**

Using Playwright MCP browser:
1. Navigate to http://localhost:8000/onboarding
2. Screenshot the wizard at each step
3. Upload a test CSV file
4. Verify schema detection table renders
5. Verify data profile metrics render
6. Screenshot in both dark and light themes
7. Verify sidebar shows "Onboarding" link with Upload icon
8. Verify (?) help button shows onboarding operations

---

## Task 10: Documentation Sweep (Tier 1+2)

Per `docs/development-workflow-protocol.md`:

**Tier 1 (per-task):**
- `docs/progress.md` — add M176-M183 milestone entries + Phase 15 row in Overall Status
- Architecture registry — already updated in Task 7
- `docs/architecture-traceability.md` — recalculate maturity % with 80 sections
- `docs/demo-guide.md` — add Data Onboarding section, update counts
- `workspace/metadata/tours/registry.json` — add onboarding tour, update scenario count to 28

**Tier 2 (per-stage):**
- Test Count Sync: update ALL locations (README, CLAUDE.md, progress.md, feature-checklist, roadmap, workflow-protocol)
- View count: 17 → 18
- Scenario count: 27 → 28
- Operation count: 98 → 104 (add 6 new onboarding ops)
- Tour count: 20 → 21
- Architecture section count: 77 → 80
- Milestone range: M0-M175 → M0-M183
- Module count: update to actual build output

---

## Task 11: Push, PR, Merge (Tier 3)

Per `docs/development-workflow-protocol.md` Tier 3:

**Step 1:** Full test suite verification (backend + E2E + frontend build)
**Step 2:** Update context-level MEMORY.md + in-repo .claude/memory/MEMORY.md
**Step 3:** Commit all docs
**Step 4:** Push branch, create PR, squash merge to main
**Step 5:** Run Phase D Tier 3 of Development Workflow Protocol

---

## Verification Plan

```bash
# Backend tests — expect ALL PASS
uv run pytest tests/ --ignore=tests/e2e -v 2>&1 | tail -1
# Expected: "544+ passed"

# Frontend build — expect 0 errors
cd frontend && npm run build 2>&1 | grep "modules transformed"
# Expected: "975+ modules transformed"

# Architecture sections
grep -c "metadataMaturity:" frontend/src/data/architectureRegistry.ts
# Expected: 80

# Test count sync — all files agree
grep -rn "544\|210\|754" CLAUDE.md README.md docs/progress.md docs/feature-development-checklist.md | grep -i "test\|backend"

# New API endpoints work
curl http://localhost:8000/api/onboarding/connectors
# Expected: JSON array of 6 connectors

# Playwright: navigate to /onboarding, screenshot wizard
```

---

## Dependencies

```
Task 1 (Models) → Task 3 (Connectors) → Task 4 (Services) → Task 5 (API)
Task 2 (Metadata) → Task 5 (API needs connector metadata to list)
Task 5 (API) → Task 6 (Frontend calls API)
Task 6 (Frontend) → Task 7 (Tours/scenarios need data-tour attributes)
Task 7 → Task 8 (Build verification)
Task 8 → Task 9 (Playwright)
Task 9 → Task 10 (Docs)
Task 10 → Task 11 (Push/merge)
```

**The plan's final task must always be**: "Run Phase D of the Development Workflow Protocol"
