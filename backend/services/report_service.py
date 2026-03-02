"""Report generation service — STOR/SAR from case + alert data."""
import json
import uuid
from datetime import datetime
from pathlib import Path


class ReportService:
    def __init__(self, workspace_dir: Path):
        self._templates_dir = workspace_dir / "metadata" / "report_templates"
        self._reports_dir = workspace_dir / "reports"
        self._reports_dir.mkdir(parents=True, exist_ok=True)

    def list_templates(self) -> list[dict]:
        templates = []
        if self._templates_dir.exists():
            for f in sorted(self._templates_dir.glob("*.json")):
                templates.append(json.loads(f.read_text()))
        return templates

    def get_template(self, template_id: str) -> dict | None:
        p = self._templates_dir / f"{template_id}.json"
        if not p.exists():
            return None
        return json.loads(p.read_text())

    def generate_report(
        self,
        template_id: str,
        case_data: dict,
        alert_data: dict | None = None,
    ) -> dict:
        template = self.get_template(template_id)
        if template is None:
            raise ValueError(f"Template not found: {template_id}")

        report_id = f"RPT-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now().isoformat()

        # Resolve fields from source paths
        sections = []
        for section in template["sections"]:
            resolved_fields = []
            for field in section["fields"]:
                value = self._resolve_field(field, case_data, alert_data, now)
                resolved_fields.append({
                    "field_id": field["field_id"],
                    "label": field["label"],
                    "value": value,
                })
            sections.append({
                "section_id": section["section_id"],
                "label": section["label"],
                "fields": resolved_fields,
            })

        report = {
            "report_id": report_id,
            "template_id": template_id,
            "template_name": template["name"],
            "regulation": template.get("regulation", ""),
            "case_id": case_data.get("case_id", ""),
            "generated_at": now,
            "sections": sections,
        }

        # Persist
        (self._reports_dir / f"{report_id}.json").write_text(
            json.dumps(report, indent=2, default=str)
        )
        return report

    def get_report(self, report_id: str) -> dict | None:
        p = self._reports_dir / f"{report_id}.json"
        if not p.exists():
            return None
        return json.loads(p.read_text())

    def list_reports(self, case_id: str | None = None) -> list[dict]:
        reports = []
        for f in sorted(self._reports_dir.glob("*.json")):
            data = json.loads(f.read_text())
            if case_id is None or data.get("case_id") == case_id:
                reports.append(data)
        return reports

    def _resolve_field(
        self,
        field: dict,
        case_data: dict,
        alert_data: dict | None,
        timestamp: str,
    ) -> str:
        source = field.get("source", "")

        if source == "static":
            return field.get("default", "")

        if source == "generated.timestamp":
            return timestamp

        # Dot-notation traversal
        parts = source.split(".")
        if parts[0] == "case":
            return self._traverse(case_data, parts[1:])
        elif parts[0] == "alert" and alert_data:
            return self._traverse(alert_data, parts[1:])

        return ""

    @staticmethod
    def _traverse(data: dict, parts: list[str]) -> str:
        current = data
        for part in parts:
            if part == "length" and isinstance(current, list):
                return str(len(current))
            if isinstance(current, dict):
                current = current.get(part, "")
            else:
                return ""
        return str(current) if current is not None else ""
