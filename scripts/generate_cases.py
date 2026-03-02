"""Generate seed case data from existing alerts."""
import json
import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from backend.models.cases import Case, CaseAnnotation, CaseSLAInfo

WORKSPACE = Path("workspace")
ALERTS_DIR = WORKSPACE / "alerts" / "traces"
CASES_DIR = WORKSPACE / "cases"


def generate():
    CASES_DIR.mkdir(parents=True, exist_ok=True)
    # Clear existing
    for f in CASES_DIR.glob("*.json"):
        f.unlink()

    alert_files = sorted(ALERTS_DIR.glob("*.json"))
    if alert_files:
        alert_ids = [f.stem for f in alert_files]
        print(f"Found {len(alert_ids)} alert traces on disk")
    else:
        # Generate synthetic alert IDs for seed data when traces are unavailable
        print("No alert traces on disk — generating synthetic alert IDs")
        alert_ids = [f"ALT-{uuid.uuid4().hex[:8].upper()}" for _ in range(30)]
    statuses = ["open", "investigating", "escalated", "resolved", "closed"]
    priorities = ["critical", "high", "medium", "low"]
    categories = ["market_abuse", "insider_trading", "spoofing", "wash_trading", "front_running"]
    assignees = ["analyst_1", "analyst_2", "compliance_officer", "senior_analyst"]
    sla_states = ["on_track", "on_track", "on_track", "at_risk", "breached"]

    random.seed(42)  # Reproducible
    cases_created = 0
    for i in range(min(15, len(alert_ids))):
        n_alerts = random.randint(1, min(3, len(alert_ids)))
        linked = random.sample(alert_ids, n_alerts)
        status = statuses[i % len(statuses)]
        now = datetime.now()
        created = now - timedelta(days=random.randint(1, 30))

        sla_status = random.choice(sla_states)
        due_date = (created + timedelta(hours=72)).isoformat()

        annotations = []
        if status != "open":
            annotations.append(CaseAnnotation(
                annotation_id=f"ANN-{uuid.uuid4().hex[:8].upper()}",
                author=random.choice(assignees),
                timestamp=(created + timedelta(hours=random.randint(1, 24))).isoformat(),
                type="note",
                content=f"Initial review of {linked[0][:20]} — patterns consistent with {random.choice(categories).replace('_', ' ')}.",
            ).model_dump())
        if status in ("escalated", "resolved", "closed"):
            annotations.append(CaseAnnotation(
                annotation_id=f"ANN-{uuid.uuid4().hex[:8].upper()}",
                author="compliance_officer",
                timestamp=(created + timedelta(hours=random.randint(24, 48))).isoformat(),
                type="escalation" if status == "escalated" else "disposition",
                content="Escalated for senior review." if status == "escalated" else "Investigation complete. Filing STOR.",
            ).model_dump())

        case = Case(
            case_id=f"CASE-{uuid.uuid4().hex[:8].upper()}",
            title=f"Investigation: {random.choice(categories).replace('_', ' ').title()} — {linked[0][:12]}",
            description=f"Automated case created from {len(linked)} alert(s).",
            status=status,
            priority=random.choice(priorities),
            category=random.choice(categories),
            assignee=random.choice(assignees),
            alert_ids=linked,
            annotations=annotations,
            sla=CaseSLAInfo(due_date=due_date, sla_status=sla_status),
            created_at=created.isoformat(),
            resolved_at=(created + timedelta(hours=48)).isoformat() if status in ("resolved", "closed") else None,
            closed_at=(created + timedelta(hours=72)).isoformat() if status == "closed" else None,
        )
        path = CASES_DIR / f"{case.case_id}.json"
        path.write_text(json.dumps(case.model_dump(), indent=2, default=str))
        cases_created += 1

    print(f"Generated {cases_created} cases in {CASES_DIR}")


if __name__ == "__main__":
    generate()
