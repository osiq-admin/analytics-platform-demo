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
