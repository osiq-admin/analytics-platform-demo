# Phase 27: Investigation & Case Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full investigation case lifecycle — from alert triage through case creation, investigation annotations, STOR/SAR regulatory report generation, and a compliance officer dashboard — making this the #1 expert-recommended feature that converts the detection engine's analytical output into business-outcome tooling.

**Architecture:** Metadata-driven case management following existing patterns (Submissions view for list-detail layout, AuditService for append-only storage, workflow metadata for state machines). Cases stored as individual JSON files at `workspace/cases/{case_id}.json`, linked to existing alerts via `alert_ids`. New CaseService class registered in `backend/db.py` lifespan. 26th view with lazy-loaded routing. **Lakehouse integration**: Cases are Sandbox-tier entities referencing Gold-tier alerts, with archival to Archive tier for regulatory compliance. Data contracts, pipeline stages, lineage nodes, and materialized views ensure cases flow through the full 11-tier medallion architecture.

**Tech Stack:** FastAPI + Pydantic v2 (backend), React 19 + TypeScript + Zustand + AG Grid + Recharts (frontend), JSON metadata files (workflows, report templates, grid columns, medallion contracts, pipeline stages)

---

## Stage 1: Case Data Model & Backend Service (M327-M332)

### Task 1: Case Pydantic Models (M327)

**Files:**
- Create: `backend/models/cases.py`
- Test: `tests/test_case_models.py`

**Step 1: Write the failing tests**

```python
# tests/test_case_models.py
"""Tests for case management Pydantic models."""
import pytest
from backend.models.cases import Case, CaseAnnotation, CaseSLAInfo


class TestCaseAnnotation:
    def test_create_annotation_defaults(self):
        a = CaseAnnotation(annotation_id="ann-1", content="test note")
        assert a.author == "analyst_1"
        assert a.type == "note"
        assert a.metadata == {}

    def test_annotation_types(self):
        for t in ("note", "disposition", "escalation", "evidence"):
            a = CaseAnnotation(annotation_id="a1", content="x", type=t)
            assert a.type == t


class TestCaseSLAInfo:
    def test_sla_defaults(self):
        sla = CaseSLAInfo()
        assert sla.sla_hours == 72
        assert sla.sla_status == "on_track"
        assert sla.due_date is None


class TestCase:
    def test_create_case_minimal(self):
        c = Case(case_id="CASE-001", title="Test case")
        assert c.status == "open"
        assert c.priority == "medium"
        assert c.alert_ids == []
        assert c.annotations == []

    def test_case_round_trip(self):
        c = Case(
            case_id="CASE-002",
            title="MPR Alert Investigation",
            alert_ids=["ALT-001", "ALT-002"],
            priority="high",
            category="market_abuse",
        )
        data = c.model_dump()
        c2 = Case(**data)
        assert c2.case_id == c.case_id
        assert c2.alert_ids == ["ALT-001", "ALT-002"]
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_case_models.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'backend.models.cases'`

**Step 3: Write the models**

```python
# backend/models/cases.py
"""Case management models for investigation lifecycle."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CaseAnnotation(BaseModel):
    """An investigation annotation on a case."""
    annotation_id: str
    author: str = "analyst_1"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    type: Literal["note", "disposition", "escalation", "evidence"] = "note"
    content: str = ""
    metadata: dict = Field(default_factory=dict)


class CaseSLAInfo(BaseModel):
    """SLA tracking for a case."""
    due_date: str | None = None
    sla_hours: int = 72
    sla_status: Literal["on_track", "at_risk", "breached"] = "on_track"


class Case(BaseModel):
    """An investigation case linking one or more alerts."""
    case_id: str
    title: str
    description: str = ""
    status: Literal["open", "investigating", "escalated", "resolved", "closed"] = "open"
    priority: Literal["critical", "high", "medium", "low"] = "medium"
    category: str = "market_abuse"
    assignee: str = "analyst_1"
    alert_ids: list[str] = Field(default_factory=list)
    annotations: list[CaseAnnotation] = Field(default_factory=list)
    sla: CaseSLAInfo = Field(default_factory=CaseSLAInfo)
    disposition: str | None = None
    tags: list[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    resolved_at: str | None = None
    closed_at: str | None = None
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_case_models.py -v`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add backend/models/cases.py tests/test_case_models.py
git commit -m "feat(cases): add Case, CaseAnnotation, CaseSLAInfo Pydantic models (M327)"
```

---

### Task 2: Case Workflow Metadata (M328)

**Files:**
- Create: `workspace/metadata/workflows/case_management.json`
- Test: `tests/test_case_models.py` (extend)

**Step 1: Write the failing test**

Add to `tests/test_case_models.py`:

```python
import json
from pathlib import Path

class TestCaseWorkflow:
    def test_workflow_metadata_loads(self):
        path = Path("workspace/metadata/workflows/case_management.json")
        data = json.loads(path.read_text())
        assert data["workflow_id"] == "case_management"
        assert len(data["states"]) == 5

    def test_workflow_transitions_valid(self):
        path = Path("workspace/metadata/workflows/case_management.json")
        data = json.loads(path.read_text())
        state_ids = {s["id"] for s in data["states"]}
        for s in data["states"]:
            for t in s["transitions"]:
                assert t in state_ids, f"Invalid transition {t} from {s['id']}"
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_case_models.py::TestCaseWorkflow -v`
Expected: FAIL with `FileNotFoundError`

**Step 3: Write the metadata**

```json
{
    "workflow_id": "case_management",
    "description": "Investigation case lifecycle with SLA tracking",
    "states": [
        {"id": "open", "label": "Open", "badge_variant": "info", "transitions": ["investigating"]},
        {"id": "investigating", "label": "Investigating", "badge_variant": "warning", "transitions": ["escalated", "resolved"]},
        {"id": "escalated", "label": "Escalated", "badge_variant": "error", "transitions": ["investigating", "resolved"]},
        {"id": "resolved", "label": "Resolved", "badge_variant": "success", "transitions": ["closed", "investigating"]},
        {"id": "closed", "label": "Closed", "badge_variant": "secondary", "transitions": []}
    ]
}
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_case_models.py -v`
Expected: PASS (7 tests)

**Step 5: Commit**

```bash
git add workspace/metadata/workflows/case_management.json tests/test_case_models.py
git commit -m "feat(cases): add case_management workflow metadata (M328)"
```

---

### Task 3: CaseService Backend (M329)

**Files:**
- Create: `backend/services/case_service.py`
- Test: `tests/test_case_service.py`
- Reference: `backend/api/submissions.py:17-20` (file I/O pattern), `backend/services/audit_service.py` (append-only pattern)

**Step 1: Write the failing tests**

```python
# tests/test_case_service.py
"""Tests for CaseService."""
import pytest
from pathlib import Path
from backend.services.case_service import CaseService


@pytest.fixture
def svc(tmp_path):
    return CaseService(tmp_path)


class TestCaseServiceCRUD:
    def test_list_empty(self, svc):
        assert svc.list_cases() == []

    def test_create_and_get(self, svc):
        case = svc.create_case(title="Test", alert_ids=["ALT-001"])
        assert case["case_id"].startswith("CASE-")
        assert case["status"] == "open"
        fetched = svc.get_case(case["case_id"])
        assert fetched["title"] == "Test"

    def test_list_after_create(self, svc):
        svc.create_case(title="A", alert_ids=[])
        svc.create_case(title="B", alert_ids=[])
        assert len(svc.list_cases()) == 2

    def test_get_nonexistent(self, svc):
        assert svc.get_case("CASE-MISSING") is None

    def test_update_case(self, svc):
        case = svc.create_case(title="Old", alert_ids=[])
        updated = svc.update_case(case["case_id"], {"title": "New", "priority": "high"})
        assert updated["title"] == "New"
        assert updated["priority"] == "high"

    def test_delete_case(self, svc):
        case = svc.create_case(title="Del", alert_ids=[])
        assert svc.delete_case(case["case_id"]) is True
        assert svc.get_case(case["case_id"]) is None

    def test_delete_nonexistent(self, svc):
        assert svc.delete_case("CASE-NOPE") is False


class TestCaseServiceStatus:
    def test_update_status(self, svc):
        case = svc.create_case(title="Test", alert_ids=[])
        updated = svc.update_status(case["case_id"], "investigating")
        assert updated["status"] == "investigating"

    def test_resolve_sets_timestamp(self, svc):
        case = svc.create_case(title="Test", alert_ids=[])
        svc.update_status(case["case_id"], "investigating")
        resolved = svc.update_status(case["case_id"], "resolved")
        assert resolved["resolved_at"] is not None


class TestCaseServiceAnnotations:
    def test_add_annotation(self, svc):
        case = svc.create_case(title="Test", alert_ids=[])
        updated = svc.add_annotation(case["case_id"], {
            "type": "note", "content": "Initial review complete"
        })
        assert len(updated["annotations"]) == 1
        assert updated["annotations"][0]["content"] == "Initial review complete"

    def test_multiple_annotations(self, svc):
        case = svc.create_case(title="Test", alert_ids=[])
        svc.add_annotation(case["case_id"], {"content": "Note 1"})
        updated = svc.add_annotation(case["case_id"], {"content": "Note 2"})
        assert len(updated["annotations"]) == 2


class TestCaseServiceQueries:
    def test_get_cases_for_alert(self, svc):
        svc.create_case(title="A", alert_ids=["ALT-001", "ALT-002"])
        svc.create_case(title="B", alert_ids=["ALT-002", "ALT-003"])
        svc.create_case(title="C", alert_ids=["ALT-004"])
        result = svc.get_cases_for_alert("ALT-002")
        assert len(result) == 2

    def test_get_stats(self, svc):
        svc.create_case(title="A", alert_ids=["ALT-001"])
        svc.create_case(title="B", alert_ids=["ALT-002"])
        stats = svc.get_stats()
        assert stats["total_cases"] == 2
        assert "by_status" in stats
        assert "by_priority" in stats
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_case_service.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'backend.services.case_service'`

**Step 3: Write the service**

```python
# backend/services/case_service.py
"""Case management service — CRUD + annotations + lifecycle."""
import json
import uuid
from collections import Counter
from datetime import datetime
from pathlib import Path

from backend.models.cases import Case, CaseAnnotation


class CaseService:
    def __init__(self, workspace_dir: Path):
        self._dir = workspace_dir / "cases"
        self._dir.mkdir(parents=True, exist_ok=True)

    def _path(self, case_id: str) -> Path:
        return self._dir / f"{case_id}.json"

    def _load(self, case_id: str) -> dict | None:
        p = self._path(case_id)
        if not p.exists():
            return None
        return json.loads(p.read_text())

    def _save(self, data: dict) -> None:
        data["updated_at"] = datetime.now().isoformat()
        self._path(data["case_id"]).write_text(
            json.dumps(data, indent=2, default=str)
        )

    def list_cases(self) -> list[dict]:
        cases = []
        for f in sorted(self._dir.glob("*.json")):
            cases.append(json.loads(f.read_text()))
        return cases

    def get_case(self, case_id: str) -> dict | None:
        return self._load(case_id)

    def create_case(
        self,
        title: str,
        alert_ids: list[str],
        description: str = "",
        priority: str = "medium",
        category: str = "market_abuse",
        assignee: str = "analyst_1",
    ) -> dict:
        case = Case(
            case_id=f"CASE-{uuid.uuid4().hex[:8].upper()}",
            title=title,
            description=description,
            alert_ids=alert_ids,
            priority=priority,
            category=category,
            assignee=assignee,
        )
        data = case.model_dump()
        self._save(data)
        return data

    def update_case(self, case_id: str, updates: dict) -> dict | None:
        data = self._load(case_id)
        if data is None:
            return None
        for k, v in updates.items():
            if k != "case_id":
                data[k] = v
        self._save(data)
        return data

    def update_status(self, case_id: str, status: str) -> dict | None:
        data = self._load(case_id)
        if data is None:
            return None
        data["status"] = status
        now = datetime.now().isoformat()
        if status == "resolved":
            data["resolved_at"] = now
        elif status == "closed":
            data["closed_at"] = now
        self._save(data)
        return data

    def add_annotation(self, case_id: str, annotation: dict) -> dict | None:
        data = self._load(case_id)
        if data is None:
            return None
        ann = CaseAnnotation(
            annotation_id=f"ANN-{uuid.uuid4().hex[:8].upper()}",
            **annotation,
        )
        data.setdefault("annotations", []).append(ann.model_dump())
        self._save(data)
        return data

    def delete_case(self, case_id: str) -> bool:
        p = self._path(case_id)
        if not p.exists():
            return False
        p.unlink()
        return True

    def get_cases_for_alert(self, alert_id: str) -> list[dict]:
        return [
            c for c in self.list_cases() if alert_id in c.get("alert_ids", [])
        ]

    def get_stats(self) -> dict:
        cases = self.list_cases()
        statuses = Counter(c["status"] for c in cases)
        priorities = Counter(c["priority"] for c in cases)
        overdue = sum(
            1 for c in cases
            if c.get("sla", {}).get("sla_status") == "breached"
        )
        resolved = sum(1 for c in cases if c["status"] in ("resolved", "closed"))
        return {
            "total_cases": len(cases),
            "by_status": dict(statuses),
            "by_priority": dict(priorities),
            "overdue_sla": overdue,
            "resolution_rate": round(resolved / len(cases), 2) if cases else 0,
        }
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_case_service.py -v`
Expected: PASS (14 tests)

**Step 5: Commit**

```bash
git add backend/services/case_service.py tests/test_case_service.py
git commit -m "feat(cases): add CaseService with CRUD, annotations, stats (M329)"
```

---

### Task 4: Cases API Router (M330)

**Files:**
- Create: `backend/api/cases.py`
- Modify: `backend/main.py` — add `from backend.api import cases` + `app.include_router(cases.router)`
- Modify: `backend/db.py:50-80` — add `CaseService` to lifespan
- Test: `tests/test_case_api.py`
- Reference: `backend/api/submissions.py` (exact pattern)

**Step 1: Write the failing tests**

```python
# tests/test_case_api.py
"""Tests for cases API endpoints."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture(autouse=True)
def _setup_case_service(tmp_path):
    from backend.services.case_service import CaseService
    app.state.case_service = CaseService(tmp_path)
    yield


client = TestClient(app)


class TestCaseAPI:
    def test_list_empty(self):
        r = client.get("/api/cases")
        assert r.status_code == 200
        assert r.json()["cases"] == []

    def test_create_case(self):
        r = client.post("/api/cases", json={
            "title": "MPR Alert Review",
            "alert_ids": ["ALT-001"],
            "priority": "high",
        })
        assert r.status_code == 200
        assert r.json()["case_id"].startswith("CASE-")

    def test_get_case(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        r = client.get(f"/api/cases/{created['case_id']}")
        assert r.status_code == 200
        assert r.json()["title"] == "T"

    def test_get_case_404(self):
        r = client.get("/api/cases/CASE-MISSING")
        assert r.status_code == 404

    def test_update_status(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        r = client.put(f"/api/cases/{created['case_id']}/status", json={"status": "investigating"})
        assert r.status_code == 200
        assert r.json()["status"] == "investigating"

    def test_add_annotation(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        r = client.post(f"/api/cases/{created['case_id']}/annotate", json={
            "type": "note", "content": "Looks suspicious"
        })
        assert r.status_code == 200
        assert len(r.json()["annotations"]) == 1

    def test_delete_case(self):
        created = client.post("/api/cases", json={"title": "T", "alert_ids": []}).json()
        r = client.delete(f"/api/cases/{created['case_id']}")
        assert r.status_code == 200

    def test_stats(self):
        client.post("/api/cases", json={"title": "A", "alert_ids": []})
        r = client.get("/api/cases/stats")
        assert r.status_code == 200
        assert r.json()["total_cases"] == 1

    def test_for_alert(self):
        client.post("/api/cases", json={"title": "A", "alert_ids": ["ALT-X"]})
        r = client.get("/api/cases/for-alert/ALT-X")
        assert r.status_code == 200
        assert len(r.json()["cases"]) == 1
```

**Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_case_api.py -v`
Expected: FAIL (404 on all routes — router not registered)

**Step 3: Write the API router + register it**

Create `backend/api/cases.py`:
```python
"""Cases API endpoints."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


router = APIRouter(prefix="/api/cases", tags=["cases"])


def _svc(request: Request):
    return request.app.state.case_service


class CreateCaseRequest(BaseModel):
    title: str
    alert_ids: list[str] = []
    description: str = ""
    priority: str = "medium"
    category: str = "market_abuse"
    assignee: str = "analyst_1"


class UpdateStatusRequest(BaseModel):
    status: str


class AnnotationRequest(BaseModel):
    type: str = "note"
    content: str = ""
    metadata: dict = {}


# PUT /stats and /for-alert before /{case_id} to avoid path collision
@router.get("/stats")
def get_stats(request: Request):
    return _svc(request).get_stats()


@router.get("/for-alert/{alert_id}")
def get_cases_for_alert(alert_id: str, request: Request):
    return {"cases": _svc(request).get_cases_for_alert(alert_id)}


@router.get("")
@router.get("/")
def list_cases(request: Request):
    return {"cases": _svc(request).list_cases()}


@router.get("/{case_id}")
def get_case(case_id: str, request: Request):
    case = _svc(request).get_case(case_id)
    if case is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return case


@router.post("")
@router.post("/")
def create_case(body: CreateCaseRequest, request: Request):
    return _svc(request).create_case(**body.model_dump())


@router.put("/{case_id}")
def update_case(case_id: str, body: dict, request: Request):
    result = _svc(request).update_case(case_id, body)
    if result is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return result


@router.put("/{case_id}/status")
def update_status(case_id: str, body: UpdateStatusRequest, request: Request):
    result = _svc(request).update_status(case_id, body.status)
    if result is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return result


@router.post("/{case_id}/annotate")
def add_annotation(case_id: str, body: AnnotationRequest, request: Request):
    result = _svc(request).add_annotation(case_id, body.model_dump())
    if result is None:
        return JSONResponse({"error": "not found"}, status_code=404)
    return result


@router.delete("/{case_id}")
def delete_case(case_id: str, request: Request):
    deleted = _svc(request).delete_case(case_id)
    if not deleted:
        return JSONResponse({"error": "not found"}, status_code=404)
    return {"deleted": True}
```

Modify `backend/main.py` — add to imports and include router:
```python
from backend.api import cases
app.include_router(cases.router)
```

Modify `backend/db.py` lifespan — add after existing service registrations:
```python
from backend.services.case_service import CaseService
app.state.case_service = CaseService(settings.workspace_dir)
```

**Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_case_api.py -v`
Expected: PASS (9 tests)

**Step 5: Commit**

```bash
git add backend/api/cases.py tests/test_case_api.py backend/main.py backend/db.py
git commit -m "feat(cases): add cases API router with 9 endpoints (M330)"
```

---

### Task 5: Seed Case Data & Stage 1 Verification (M331-M332)

**Files:**
- Create: `scripts/generate_cases.py`
- Modify: `docs/progress.md`

**Step 1: Write seed data generator**

`scripts/generate_cases.py` — Generates ~15 demo cases from existing alerts in `workspace/alerts/traces/`. Assigns diverse statuses, priorities, categories, mock annotations, and SLA states. Uses `Case` and `CaseAnnotation` models for validation.

**Step 2: Run generator and verify**

Run: `uv run python -m scripts.generate_cases`
Expected: "Generated 15 cases in workspace/cases"

**Step 3: Run full backend test suite**

Run: `uv run python -m qa test backend`
Expected: ALL PASS (~1447 tests: 1418 existing + ~29 new)

**Step 4: Commit**

```bash
git add scripts/generate_cases.py workspace/cases/
git commit -m "feat(cases): add seed case data generator (M331)"
```

**Step 5: Update progress tracker**

Add M327-M332 entries to `docs/progress.md`.

```bash
git add docs/progress.md
git commit -m "docs(phase27): add Stage 1 progress entries M327-M332 (M332)"
```

---

## Stage 2: CaseManagement View — 26th View (M333-M340)

### Task 6: Case Zustand Store (M333)

**Files:**
- Create: `frontend/src/stores/caseStore.ts`
- Reference: `frontend/src/stores/submissionStore.ts` (exact pattern)

**Step 1: Write the store**

Create `frontend/src/stores/caseStore.ts` with types (`Case`, `CaseAnnotation`, `CaseSLAInfo`, `CaseStats`) and actions (`fetchCases`, `fetchCase`, `createCase`, `updateStatus`, `addAnnotation`, `deleteCase`, `fetchStats`, `selectCase`). Follows `submissionStore.ts` pattern exactly.

**Step 2: Build frontend to check for TypeScript errors**

Run: `cd frontend && npm run build`
Expected: Build succeeds (store not imported yet, tree-shaken out)

**Step 3: Commit**

```bash
git add frontend/src/stores/caseStore.ts
git commit -m "feat(cases): add caseStore Zustand store (M333)"
```

---

### Task 7: CaseManagement View Component (M334-M335)

**Files:**
- Create: `frontend/src/views/CaseManagement/index.tsx`
- Create: `frontend/src/views/CaseManagement/CaseDetail.tsx`
- Create: `frontend/src/views/CaseManagement/CaseTimeline.tsx`
- Create: `frontend/src/views/CaseManagement/LinkedAlerts.tsx`
- Reference: `frontend/src/views/Submissions/index.tsx` (list-detail layout), `frontend/src/views/Submissions/SubmissionDetail.tsx`

**Step 1: Create main view**

`frontend/src/views/CaseManagement/index.tsx` — two tabs: "Cases" (AG Grid list + detail) and "Dashboard" (placeholder for Stage 5). Grid columns: case_id, title, status (badge), priority (badge), assignee, alert count, SLA status, created_at. Uses `useWorkflowStates("case_management")` for badge variants. Click row -> `selectCase` -> shows CaseDetail below.

**Step 2: Create CaseDetail with tabs**

`frontend/src/views/CaseManagement/CaseDetail.tsx` — tabs: Summary (metadata + status action buttons), Timeline (CaseTimeline), Linked Alerts (LinkedAlerts), Reports (placeholder for Stage 4).

**Step 3: Create CaseTimeline**

`frontend/src/views/CaseManagement/CaseTimeline.tsx` — chronological list of annotations with type badge, author, timestamp, content.

**Step 4: Create LinkedAlerts**

`frontend/src/views/CaseManagement/LinkedAlerts.tsx` — AG Grid showing linked alert summaries (alert_id, model_name, score, timestamp). Click navigates to `/alerts/{alertId}`.

**Step 5: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds with 0 errors

**Step 6: Commit**

```bash
git add frontend/src/views/CaseManagement/
git commit -m "feat(cases): add CaseManagement view with detail, timeline, linked alerts (M334-M335)"
```

---

### Task 8: Route & Navigation Registration (M336-M337)

**Files:**
- Modify: `frontend/src/routes.tsx:22-31` — add lazy import for CaseManagement
- Modify: `frontend/src/routes.tsx:65-69` — add route in Investigate section
- Modify: `workspace/metadata/navigation/main.json:45-52` — add to Investigate group
- Create: `workspace/metadata/grids/case_management.json`

**Step 1: Add route**

Add to `frontend/src/routes.tsx` lazy imports (after line 31):
```typescript
const CaseManagement = lazy(() => import("./views/CaseManagement/index.tsx"));
```

Add route in Investigate section (after line 69, before submissions):
```typescript
{ path: "cases", element: <Suspense fallback={null}><CaseManagement /></Suspense> },
```

**Step 2: Add navigation entry**

Add to `workspace/metadata/navigation/main.json` in "Investigate" group items (before submissions):
```json
{"view_id": "cases", "label": "Case Management", "path": "/cases", "icon": "Briefcase", "order": 1}
```
Shift existing items: submissions order->2, regulatory order->3.

**Step 3: Create grid metadata**

Create `workspace/metadata/grids/case_management.json` with columns: case_id, title, status, priority, assignee, alert_count, sla_status, created_at.

**Step 4: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add frontend/src/routes.tsx workspace/metadata/navigation/main.json workspace/metadata/grids/case_management.json
git commit -m "feat(cases): register route, navigation, grid metadata (M336-M337)"
```

---

### Task 9: Architecture, Tours, Scenarios, Operations (M338-M339)

**Files:**
- Create: `frontend/src/data/architecture/caseManagement.ts`
- Create: `frontend/src/data/tours/cases.ts`
- Create: `frontend/src/data/operations/cases.ts`
- Modify: `frontend/src/data/architecture/index.ts` — add caseManagement export
- Modify: `frontend/src/data/tours/index.ts` — add cases tour
- Modify: `frontend/src/data/operations/index.ts` — add cases operations
- Modify: `frontend/src/data/scenarios/investigation.ts` — add S40
- Modify: `frontend/src/layouts/AppLayout.tsx` — add `cases` to `getTourIdForPath`
- Modify: `workspace/metadata/tours/registry.json` — add tour entry

Architecture sections: `cases.grid`, `cases.detail`, `cases.timeline`, `cases.linked-alerts`, `cases.status-actions` (5 new -> 126 total).

Tour: 5 steps covering grid, detail, timeline, status transitions, linked alerts. Follow `frontend/src/data/tours/submissions.ts` pattern.

Operations: browse_cases, view_case_detail, add_investigation_note, transition_status, view_timeline, view_linked_alerts. Follow `frontend/src/data/operations/submissions.ts` pattern.

Scenario S40: "Case Management Workflow" in investigation category. Add to `frontend/src/data/scenarios/investigation.ts`.

**Step 1: Create all supporting files following existing patterns**
**Step 2: Update barrel imports and AppLayout**
**Step 3: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add frontend/src/data/architecture/caseManagement.ts frontend/src/data/tours/cases.ts \
  frontend/src/data/operations/cases.ts frontend/src/data/architecture/index.ts \
  frontend/src/data/tours/index.ts frontend/src/data/operations/index.ts \
  frontend/src/data/scenarios/investigation.ts frontend/src/layouts/AppLayout.tsx \
  workspace/metadata/tours/registry.json
git commit -m "feat(cases): add architecture, tours, scenarios, operations (M338-M339)"
```

---

### Task 10: E2E Tests for CaseManagement (M340)

**Files:**
- Create: `tests/e2e/test_case_management_e2e.py`
- Reference: `tests/e2e/test_detect_views_e2e.py` (pattern)

**Step 1: Write E2E tests**

```python
# tests/e2e/test_case_management_e2e.py
"""E2E tests for CaseManagement view."""
import pytest
from playwright.sync_api import Page, expect

APP_URL = "http://localhost:8333"


@pytest.fixture(autouse=True)
def navigate(page: Page):
    page.goto(f"{APP_URL}/cases", wait_until="networkidle")


class TestCaseManagementE2E:
    def test_view_loads(self, page: Page):
        expect(page.locator("[data-tour='cases-grid']")).to_be_visible(timeout=10_000)

    def test_case_grid_shows_data(self, page: Page):
        grid = page.locator(".ag-body-viewport .ag-row")
        expect(grid.first).to_be_visible(timeout=10_000)

    def test_case_detail_opens_on_click(self, page: Page):
        page.locator(".ag-body-viewport .ag-row").first.click()
        expect(page.locator("[data-tour='cases-detail']")).to_be_visible(timeout=5_000)

    def test_case_timeline_tab(self, page: Page):
        page.locator(".ag-body-viewport .ag-row").first.click()
        page.get_by_role("tab", name="Timeline").click()
        expect(page.locator("[data-tour='cases-timeline']")).to_be_visible(timeout=5_000)

    def test_linked_alerts_tab(self, page: Page):
        page.locator(".ag-body-viewport .ag-row").first.click()
        page.get_by_role("tab", name="Linked Alerts").click()
        expect(page.locator("[data-tour='cases-linked-alerts']")).to_be_visible(timeout=5_000)

    def test_status_badge_renders(self, page: Page):
        badge = page.locator(".ag-body-viewport .ag-row").first.locator("[data-tour='status-badge']")
        expect(badge).to_be_visible(timeout=5_000)
```

**Step 2: Run E2E tests**

Run: `uv run python -m qa test e2e -- tests/e2e/test_case_management_e2e.py -v`
Expected: PASS (6 tests)

**Step 3: Verify with Playwright MCP browser**

Navigate to `http://localhost:8000/cases`, take screenshot, verify grid + detail + timeline render correctly.

**Step 4: Commit**

```bash
git add tests/e2e/test_case_management_e2e.py
git commit -m "test(cases): add E2E Playwright tests for CaseManagement view (M340)"
```

---

## Stage 3: Investigation Annotations on RiskCaseManager (M341-M346)

### Task 11: Alert-to-Case Creation Endpoint (M341)

**Files:**
- Modify: `backend/api/cases.py` — add `POST /api/cases/from-alert/{alert_id}`
- Test: `tests/test_case_api.py` (extend)

**Step 1: Write failing test**

Add to `tests/test_case_api.py`:
```python
def test_create_from_alert(self):
    r = client.post("/api/cases/from-alert/ALT-001")
    assert r.status_code == 200
    assert "ALT-001" in r.json()["alert_ids"]
```

**Step 2: Implement endpoint**

Add to `backend/api/cases.py` (before `/{case_id}` routes):
```python
@router.post("/from-alert/{alert_id}")
def create_case_from_alert(alert_id: str, request: Request):
    return _svc(request).create_case(
        title=f"Investigation: {alert_id}",
        alert_ids=[alert_id],
    )
```

**Step 3: Run tests, commit**

```bash
git add backend/api/cases.py tests/test_case_api.py
git commit -m "feat(cases): add from-alert case creation endpoint (M341)"
```

---

### Task 12: Investigation Actions in RiskCaseManager (M342-M344)

**Files:**
- Create: `frontend/src/views/RiskCaseManager/AlertDetail/InvestigationActions.tsx`
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/FooterActions.tsx` — import and render InvestigationActions
- Modify: `frontend/src/stores/alertStore.ts` — add `linkedCases` and `fetchLinkedCases`
- Modify: `frontend/src/views/RiskCaseManager/AlertSummary.tsx` — add case count column
- Reference: `frontend/src/views/RiskCaseManager/AlertDetail/FooterActions.tsx` (modification target)

**InvestigationActions component:** "Create Case" button (opens inline form: title, priority, category) + "Add Note" button (textarea with type selector). Uses `useCaseStore.createCase` and `useCaseStore.addAnnotation`.

**alertStore changes:** Add `linkedCases: Case[]` state and `fetchLinkedCases(alertId)` that calls `GET /api/cases/for-alert/{alertId}`.

**AlertSummary changes:** Add "Cases" column showing linked case count.

**Step 1: Create InvestigationActions component**
**Step 2: Update FooterActions to include it**
**Step 3: Update alertStore with linkedCases**
**Step 4: Update AlertSummary grid with case count**
**Step 5: Build frontend**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add frontend/src/views/RiskCaseManager/AlertDetail/InvestigationActions.tsx \
  frontend/src/views/RiskCaseManager/AlertDetail/FooterActions.tsx \
  frontend/src/stores/alertStore.ts \
  frontend/src/views/RiskCaseManager/AlertSummary.tsx
git commit -m "feat(cases): add investigation actions to RiskCaseManager (M342-M344)"
```

---

### Task 13: Stage 3 Tests (M345-M346)

**Files:**
- Modify: `tests/test_case_api.py` — add annotation round-trip tests (~3 tests)
- Modify: `tests/e2e/test_case_management_e2e.py` — add E2E tests (~2 tests)

**Backend tests:** annotation with each type, from-alert with missing alert, annotation ordering.

**E2E tests:** `test_create_case_from_alert_detail` (navigate to /alerts, click alert, click Create Case), `test_add_note_to_case` (open case, add note, verify in timeline).

**Commit:**

```bash
git add tests/test_case_api.py tests/e2e/test_case_management_e2e.py
git commit -m "test(cases): add annotation and investigation action tests (M345-M346)"
```

---

## Stage 4: STOR/SAR Auto-Generation (M347-M352)

### Task 14: Report Template Metadata (M347)

**Files:**
- Create: `workspace/metadata/report_templates/stor.json`
- Create: `workspace/metadata/report_templates/sar.json`

**STOR template** (UK MAR Article 16): sections for reporting_entity (static fields), suspected_person (from `alert.entity_context`), transaction_details (from alert), suspicion_details (from alert scores + case description). Each field has a `source` path like `"alert.entity_context.trader_id"` or `"case.description"`.

**SAR template** (US FinCEN): sections for filing_institution, subject, suspicious_activity, transaction_info. Same source path pattern.

**Commit:**

```bash
git add workspace/metadata/report_templates/
git commit -m "feat(cases): add STOR and SAR report template metadata (M347)"
```

---

### Task 15: Report Service & API (M348-M349)

**Files:**
- Create: `backend/services/report_service.py`
- Create: `backend/api/reports.py`
- Modify: `backend/main.py` — include reports router
- Modify: `backend/db.py` — register ReportService
- Test: `tests/test_report_service.py` (~6 tests)
- Test: `tests/test_report_api.py` (~4 tests)

**ReportService methods:** `list_templates()`, `generate_report(case_id, template_id, case_data, alert_data)`, `get_report(report_id)`, `list_reports(case_id)`. The `generate_report` method resolves `source` field paths against case/alert data using dot-notation traversal. Reports saved as JSON at `workspace/reports/{report_id}.json`.

**API endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/templates` | List available templates |
| POST | `/api/reports/generate` | Generate report from case+template |
| GET | `/api/reports` | List generated reports |
| GET | `/api/reports/{report_id}` | Get single report |

**Step 1: Write failing tests**
**Step 2: Implement ReportService**
**Step 3: Implement reports API router**
**Step 4: Register service and router in db.py/main.py**
**Step 5: Run tests**

Run: `uv run pytest tests/test_report_service.py tests/test_report_api.py -v`
Expected: PASS (~10 tests)

**Step 6: Commit**

```bash
git add backend/services/report_service.py backend/api/reports.py \
  tests/test_report_service.py tests/test_report_api.py \
  backend/main.py backend/db.py
git commit -m "feat(cases): add ReportService and reports API (M348-M349)"
```

---

### Task 16: Report Generation UI (M350)

**Files:**
- Create: `frontend/src/views/CaseManagement/ReportGenerator.tsx`
- Modify: `frontend/src/views/CaseManagement/CaseDetail.tsx` — add "Reports" tab

**ReportGenerator:** Template selector dropdown (from `/api/reports/templates`), "Generate" button, list of previously generated reports with timestamp, template name, and expandable JSON preview.

**Step 1: Create ReportGenerator**
**Step 2: Add Reports tab to CaseDetail**
**Step 3: Build frontend**

Run: `cd frontend && npm run build`

**Step 4: Commit**

```bash
git add frontend/src/views/CaseManagement/ReportGenerator.tsx \
  frontend/src/views/CaseManagement/CaseDetail.tsx
git commit -m "feat(cases): add STOR/SAR report generation tab (M350)"
```

---

### Task 17: Stage 4 Tests (M351-M352)

**E2E tests (~3):** `test_report_templates_load`, `test_generate_stor_from_case`, `test_report_preview_shows`.

**Commit:**

```bash
git add tests/e2e/test_case_management_e2e.py
git commit -m "test(cases): add E2E tests for STOR/SAR report generation (M351-M352)"
```

---

## Stage 5: Lakehouse & Medallion Integration (M353-M358)

### Task 18: Case Medallion Metadata — Pipeline Stages, Contracts, Lineage (M353-M354)

**Files:**
- Modify: `workspace/metadata/medallion/pipeline_stages.json` — add case-related stages
- Create: `workspace/metadata/medallion/contracts/gold_to_sandbox_cases.json`
- Create: `workspace/metadata/medallion/contracts/gold_to_archive_cases.json`
- Modify: `workspace/metadata/medallion/transformations.json` — add case transformation entries
- Test: `tests/test_case_medallion.py`
- Reference: `workspace/metadata/medallion/contracts/silver_to_gold_alerts.json` (contract pattern), `workspace/metadata/medallion/pipeline_stages.json` (stage pattern)

**Context:** Alerts are generated during Silver→Gold pipeline stage. Cases consume Gold-tier alerts and live in the Sandbox tier (mutable, user-driven investigation workspace). Resolved/closed cases archive to the Archive tier for regulatory retention (2555-day retention, immutable).

**Step 1: Add pipeline stages**

Add two new stages to `workspace/metadata/medallion/pipeline_stages.json`:
```json
{
    "stage_id": "gold_to_sandbox_case",
    "name": "Case Creation (Gold → Sandbox)",
    "source_tier": "gold",
    "target_tier": "sandbox",
    "entities": ["case"],
    "execution_type": "programmatic",
    "description": "Creates investigation cases from Gold-tier alert data into the mutable Sandbox workspace",
    "order": 9
},
{
    "stage_id": "gold_to_archive_case",
    "name": "Case Archival (Gold → Archive)",
    "source_tier": "gold",
    "target_tier": "archive",
    "entities": ["case"],
    "execution_type": "programmatic",
    "description": "Archives resolved/closed cases with full audit trail for regulatory retention",
    "order": 10
}
```

**Step 2: Create data contracts**

`workspace/metadata/medallion/contracts/gold_to_sandbox_cases.json`:
```json
{
    "contract_id": "gold_to_sandbox_cases",
    "source_tier": "gold",
    "target_tier": "sandbox",
    "entity": "case",
    "description": "Contract for case creation from alert data",
    "quality_rules": [
        {"rule": "not_null", "fields": ["case_id", "title", "status", "priority"]},
        {"rule": "enum_check", "field": "status", "values": ["open", "investigating", "escalated", "resolved", "closed"]},
        {"rule": "enum_check", "field": "priority", "values": ["critical", "high", "medium", "low"]},
        {"rule": "unique", "field": "case_id"},
        {"rule": "referential_integrity", "field": "alert_ids", "reference_entity": "alert", "reference_field": "alert_id"}
    ],
    "sla": {"freshness_hours": 1, "quality_threshold": 95}
}
```

`workspace/metadata/medallion/contracts/gold_to_archive_cases.json`:
```json
{
    "contract_id": "gold_to_archive_cases",
    "source_tier": "gold",
    "target_tier": "archive",
    "entity": "case",
    "description": "Regulatory archival of resolved/closed investigation cases",
    "quality_rules": [
        {"rule": "not_null", "fields": ["case_id", "title", "status", "disposition", "resolved_at"]},
        {"rule": "enum_check", "field": "status", "values": ["resolved", "closed"]},
        {"rule": "not_null", "fields": ["annotations"], "description": "Must have at least one annotation documenting investigation"}
    ],
    "sla": {"freshness_hours": 24, "quality_threshold": 100},
    "retention_days": 2555
}
```

**Step 3: Add transformation entries**

Add to `workspace/metadata/medallion/transformations.json`:
```json
{
    "transformation_id": "gold_to_sandbox_case",
    "description": "Create case workspace from Gold-tier alert data with entity context enrichment",
    "source": "gold.alerts",
    "target": "sandbox.cases",
    "logic": "programmatic",
    "enrichment": ["entity_context", "scoring_breakdown", "calculation_traces"]
},
{
    "transformation_id": "gold_to_archive_case",
    "description": "Archive resolved cases with full audit trail, annotations, and linked alert data",
    "source": "sandbox.cases",
    "target": "archive.cases",
    "logic": "programmatic",
    "filter": "status IN ('resolved', 'closed')"
}
```

**Step 4: Write tests**

```python
# tests/test_case_medallion.py
"""Tests for case management medallion integration."""
import json
import pytest
from pathlib import Path

MEDALLION_DIR = Path("workspace/metadata/medallion")
CONTRACTS_DIR = MEDALLION_DIR / "contracts"


class TestCasePipelineStages:
    def test_case_stages_registered(self):
        stages = json.loads((MEDALLION_DIR / "pipeline_stages.json").read_text())
        stage_ids = [s["stage_id"] for s in stages]
        assert "gold_to_sandbox_case" in stage_ids
        assert "gold_to_archive_case" in stage_ids

    def test_case_stages_reference_valid_tiers(self):
        tiers = json.loads((MEDALLION_DIR / "tiers.json").read_text())
        tier_ids = {t["tier_id"] for t in tiers}
        stages = json.loads((MEDALLION_DIR / "pipeline_stages.json").read_text())
        case_stages = [s for s in stages if "case" in s["stage_id"]]
        for s in case_stages:
            assert s["source_tier"] in tier_ids
            assert s["target_tier"] in tier_ids


class TestCaseContracts:
    def test_sandbox_contract_loads(self):
        data = json.loads((CONTRACTS_DIR / "gold_to_sandbox_cases.json").read_text())
        assert data["entity"] == "case"
        assert len(data["quality_rules"]) >= 4

    def test_archive_contract_loads(self):
        data = json.loads((CONTRACTS_DIR / "gold_to_archive_cases.json").read_text())
        assert data["entity"] == "case"
        assert data["retention_days"] == 2555

    def test_archive_contract_requires_resolved(self):
        data = json.loads((CONTRACTS_DIR / "gold_to_archive_cases.json").read_text())
        enum_rule = next(r for r in data["quality_rules"] if r.get("rule") == "enum_check" and r.get("field") == "status")
        assert "resolved" in enum_rule["values"]
        assert "open" not in enum_rule["values"]
```

**Step 5: Run tests**

Run: `uv run pytest tests/test_case_medallion.py -v`
Expected: PASS (5 tests)

**Step 6: Commit**

```bash
git add workspace/metadata/medallion/pipeline_stages.json \
  workspace/metadata/medallion/contracts/gold_to_sandbox_cases.json \
  workspace/metadata/medallion/contracts/gold_to_archive_cases.json \
  workspace/metadata/medallion/transformations.json \
  tests/test_case_medallion.py
git commit -m "feat(cases): add case medallion metadata — pipeline stages, contracts, transformations (M353-M354)"
```

---

### Task 19: Case Lineage Integration (M355-M356)

**Files:**
- Modify: `backend/services/lineage_service.py` — add case→alert lineage edges
- Modify: `backend/services/case_service.py` — emit lineage events on case create/status change
- Modify: `frontend/src/data/architecture/caseManagement.ts` — add `cases.lakehouse`, `cases.lineage` sections
- Test: `tests/test_case_service.py` (extend)

**Context:** The lineage service uses a 6-layer materialized adjacency list. Cases add a 7th layer: `case_link` — edges from case nodes to alert nodes and from case nodes to archive nodes.

**Step 1: Add case lineage edges**

When `CaseService.create_case()` is called, emit a lineage edge: `case:{case_id} → alert:{alert_id}` for each linked alert. When status transitions to "resolved"/"closed", emit: `case:{case_id} → archive:case:{case_id}`.

This integrates with the existing `EventService` append-only audit trail and the lineage graph visible in DataLineage view.

**Step 2: Add architecture sections**

Add to `frontend/src/data/architecture/caseManagement.ts`:
- `cases.lakehouse` — "Case data flows through Sandbox tier (mutable investigation workspace) and archives to regulatory Archive tier"
- `cases.lineage` — "Cases appear as nodes in the data lineage graph, linked to parent alert nodes and downstream archive nodes"
- `cases.contracts` — "Data contracts validate case quality: uniqueness, referential integrity to alerts, enum validation on status/priority"

**Step 3: Run tests, commit**

```bash
git add backend/services/lineage_service.py backend/services/case_service.py \
  frontend/src/data/architecture/caseManagement.ts tests/test_case_service.py
git commit -m "feat(cases): add case lineage edges and lakehouse architecture sections (M355-M356)"
```

---

### Task 20: Case Materialized Views & LakehouseExplorer Visibility (M357-M358)

**Files:**
- Modify: `workspace/metadata/lakehouse/materialized_views.json` (or equivalent) — add case_summary and case_resolution_time views
- Modify: `frontend/src/views/LakehouseExplorer/` — ensure case tables appear in sandbox tier listing
- Modify: `frontend/src/views/MedallionOverview/` — ensure case flow (Gold→Sandbox→Archive) appears in tier diagram
- Test: `tests/test_case_medallion.py` (extend)

**Materialized views:**
```json
{
    "view_id": "case_summary",
    "description": "Case counts by status, priority, assignee, and category",
    "source_tier": "sandbox",
    "entity": "case",
    "aggregation": "GROUP BY status, priority, assignee, category",
    "refresh_frequency": "on_demand"
},
{
    "view_id": "case_resolution_time",
    "description": "Average resolution time by priority and category",
    "source_tier": "sandbox",
    "entity": "case",
    "aggregation": "AVG(resolved_at - created_at) GROUP BY priority, category",
    "refresh_frequency": "on_demand"
}
```

**Step 1: Add materialized views metadata**
**Step 2: Verify LakehouseExplorer shows case tables in sandbox tier** (the view reads from `/api/lakehouse/tables` which auto-discovers JSON files by tier)
**Step 3: Verify MedallionOverview shows Gold→Sandbox and Gold→Archive case flow** (reads from pipeline_stages.json)
**Step 4: Add tests for materialized view metadata**

Run: `uv run pytest tests/test_case_medallion.py -v`

**Step 5: Build frontend**

Run: `cd frontend && npm run build`

**Step 6: Commit**

```bash
git add workspace/metadata/lakehouse/ \
  frontend/src/views/LakehouseExplorer/ frontend/src/views/MedallionOverview/ \
  tests/test_case_medallion.py
git commit -m "feat(cases): add materialized views, lakehouse/medallion visibility (M357-M358)"
```

---

## Stage 6: Compliance Dashboard (M359-M363)

### Task 21: Dashboard Statistics Enhancement (M359)

**Files:**
- Modify: `backend/services/case_service.py` — extend `get_stats()` with trend data and lakehouse-aware metrics
- Test: `tests/test_case_service.py` — add stats tests (~2 tests)

Extend `get_stats()` to return `trend_data` (list of `{date, opened, closed, escalated}` grouped by week), `pending_reports` count, and `archived_cases` count (cases in Archive tier). Leverage the materialized view definitions from Stage 5 for metric queries.

**Commit:**

```bash
git add backend/services/case_service.py tests/test_case_service.py
git commit -m "feat(cases): extend stats with trend data, SLA metrics, archive counts (M359)"
```

---

### Task 22: Compliance Dashboard UI (M360-M362)

**Files:**
- Create: `frontend/src/views/CaseManagement/ComplianceDashboard.tsx`
- Modify: `frontend/src/views/CaseManagement/index.tsx` — add "Dashboard" tab
- Modify: `frontend/src/data/architecture/caseManagement.ts` — add dashboard sections
- Reference: `frontend/src/views/Dashboard/index.tsx` (Recharts patterns), `frontend/src/constants/chartStyles.ts`, `docs/development-guidelines.md`

**Layout:**
1. **Summary Cards Row** — Open Cases, Overdue SLAs, Pending Reports, Resolution Rate, Archived Cases
2. **Case Volume Trend** — Recharts AreaChart (opened/closed/escalated per week)
3. **Priority Distribution** — Recharts PieChart by priority
4. **SLA Tracking** — AG Grid of at_risk/breached cases
5. **Lakehouse Status** — Shows case data tier distribution (Sandbox active vs Archive retained)

Add architecture sections: `cases.dashboard`, `cases.trend-chart`, `cases.sla-tracking` (3 new -> ~134 total).

**Step 1: Create ComplianceDashboard**
**Step 2: Add Dashboard tab to index.tsx**
**Step 3: Update architecture registry**
**Step 4: Build frontend**

Run: `cd frontend && npm run build`

**Step 5: Commit**

```bash
git add frontend/src/views/CaseManagement/ComplianceDashboard.tsx \
  frontend/src/views/CaseManagement/index.tsx \
  frontend/src/data/architecture/caseManagement.ts
git commit -m "feat(cases): add compliance dashboard with trend charts, SLA, and lakehouse status (M360-M362)"
```

---

### Task 23: Stage 6 E2E Tests (M363)

**E2E tests (~3):** `test_compliance_dashboard_loads`, `test_summary_cards_show_data`, `test_trend_chart_renders`.

**Commit:**

```bash
git add tests/e2e/test_case_management_e2e.py
git commit -m "test(cases): add E2E tests for compliance dashboard (M363)"
```

---

## Stage 7: AI Triage Enhancement (M364-M367)

### Task 24: AI Triage Backend (M364-M365)

**Files:**
- Modify: `backend/api/ai.py` — add `POST /api/ai/triage/{alert_id}`
- Modify: `backend/services/ai_assistant.py` — add `triage_alert()` method with mock mode
- Test: `tests/test_ai_triage.py` (~3 tests)

**Triage endpoint:** Takes alert_id, loads alert trace + case history, asks Claude (or mock) to classify: `suggested_priority`, `suggested_category`, `initial_notes`, `similar_case_ids`.

**Mock mode:** Returns pre-scripted triage based on model_id (MPR -> high priority, wash_trading -> medium, etc.).

**Step 1: Write failing tests**
**Step 2: Add triage_alert to ai_assistant.py**
**Step 3: Add endpoint to ai.py**
**Step 4: Run tests**

Run: `uv run pytest tests/test_ai_triage.py -v`

**Step 5: Commit**

```bash
git add backend/api/ai.py backend/services/ai_assistant.py tests/test_ai_triage.py
git commit -m "feat(cases): add AI triage endpoint with mock mode (M364-M365)"
```

---

### Task 25: AI Triage Frontend Integration (M366-M367)

**Files:**
- Modify: `frontend/src/views/RiskCaseManager/AlertDetail/InvestigationActions.tsx` — add "AI Triage" button

**"AI Triage" button:** Calls `/api/ai/triage/{alert_id}`, shows loading spinner, then pre-fills Create Case form with suggested priority, category, and initial_notes.

**Step 1: Add triage button to InvestigationActions**
**Step 2: Build frontend**

Run: `cd frontend && npm run build`

**Step 3: Commit**

```bash
git add frontend/src/views/RiskCaseManager/AlertDetail/InvestigationActions.tsx
git commit -m "feat(cases): add AI triage button to investigation actions (M366-M367)"
```

---

## Stage 8: Phase Completion — Documentation Sweep (M368)

### Task 26: Full Verification & Documentation (M368)

Execute **Tier 3 Milestone Completion Protocol** from `docs/development-workflow-protocol.md`.

**Step 1: Run full verification suite**

```bash
uv run python -m qa test backend          # Expected: ~1482 tests PASS
uv run python -m qa quality --python      # Expected: all checks pass
cd frontend && npm run build              # Expected: 0 errors
uv run python -m qa test e2e              # Expected: ~300 tests PASS
uv run python -m qa gate                  # Expected: PASS
```

**Step 2: Update ALL documentation with new counts**

Expected final counts: ~1482 backend + ~300 E2E = ~1782 total, 26 views, ~134 architecture sections, 40 scenarios, M0-M368.

| File | Updates |
|------|---------|
| `CLAUDE.md` | View count (26), test counts, milestone range (M0-M368), metadata types |
| `README.md` | Test counts, architecture sections, view count |
| `docs/progress.md` | All M327-M368 entries, header counts |
| `docs/development-workflow-protocol.md` | Full sync registry |
| `docs/feature-development-checklist.md` | Test counts, changelog |
| `docs/plans/2026-02-24-comprehensive-roadmap.md` | Mark Phase 27 COMPLETE |
| `docs/demo-guide.md` | Add Case Management + Lakehouse Integration sections |
| `docs/architecture-traceability.md` | Section count, maturity |
| `docs/requirements/bdd-scenarios.md` | Case management BDD scenarios |
| Memory `MEMORY.md` | Current state |

**Step 3: Save QA baseline**

```bash
uv run python -m qa baseline update
```

**Step 4: Commit**

```bash
git add -A
git commit -m "docs(phase27): complete Phase 27 documentation sweep and verification (M368)"
```

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Views | 25 | 26 |
| Backend tests | ~1418 | ~1482 |
| E2E tests | ~286 | ~300 |
| Total tests | ~1704 | ~1782 |
| Architecture sections | 121 | ~134 |
| Scenarios | 39 | 40 |
| Milestones | M0-M326 | M0-M368 |
| API route modules | 34 | 36 |
| Metadata types | 30+ | 32+ (report_templates, case contracts) |
| Medallion contracts | 14 | 16 (+gold_to_sandbox_cases, gold_to_archive_cases) |
| Pipeline stages | 8 | 10 (+gold_to_sandbox_case, gold_to_archive_case) |
| Materialized views | existing | +2 (case_summary, case_resolution_time) |

**New files: ~28** | **Modified files: ~18** | **8 stages** | **26 tasks** | **42 milestones**

---

## Verification Checklist

- [ ] All backend tests pass (`uv run python -m qa test backend`)
- [ ] Frontend builds clean (`cd frontend && npm run build`)
- [ ] All E2E tests pass (`uv run python -m qa test e2e`)
- [ ] Quality gate passes (`uv run python -m qa gate`)
- [ ] CaseManagement view loads at `/cases` with seed data
- [ ] Case detail shows timeline, linked alerts, reports tabs
- [ ] Create Case from alert detail in RiskCaseManager works
- [ ] STOR/SAR report generation produces valid JSON
- [ ] Compliance dashboard shows summary cards, trend charts, and lakehouse status
- [ ] AI Triage button pre-fills case creation form
- [ ] **Lakehouse**: Cases appear in LakehouseExplorer under sandbox tier
- [ ] **Medallion**: Case pipeline stages visible in MedallionOverview
- [ ] **Lineage**: Case nodes appear in DataLineage linked to parent alerts
- [ ] **Contracts**: Case data contracts validate in PipelineMonitor
- [ ] **Archive**: Resolved cases flow to Archive tier with regulatory retention
- [ ] All documentation counts synced
- [ ] Playwright visual verification of all new UI
