"""Alert generation service — persists alert traces as JSON and summary as Parquet."""
import json
import logging
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

from backend.db import DuckDBManager
from backend.engine.detection_engine import DetectionEngine
from backend.models.alerts import AlertTrace

log = logging.getLogger(__name__)


class AlertService:
    def __init__(self, workspace_dir: Path, db: DuckDBManager, detection: DetectionEngine):
        self._workspace = workspace_dir
        self._db = db
        self._detection = detection
        self._traces_dir = workspace_dir / "alerts" / "traces"
        self._summary_path = workspace_dir / "alerts" / "summary.parquet"

    def generate_alerts(self, model_id: str) -> list[AlertTrace]:
        """Evaluate a model, save fired alerts as traces and summary."""
        alerts = self._detection.evaluate_model(model_id)
        fired = [a for a in alerts if a.alert_fired]

        if not fired:
            log.info("Model %s: no alerts fired", model_id)
            return []

        log.info("Model %s: %d alerts fired", model_id, len(fired))

        # Save individual trace files
        self._save_traces(fired)

        # Save/append summary Parquet
        self._save_summary(fired)

        # Register in DuckDB
        self._register_duckdb()

        return fired

    def generate_all_alerts(self) -> list[AlertTrace]:
        """Evaluate all detection models and save alerts."""
        all_alerts = self._detection.evaluate_all()
        fired = [a for a in all_alerts if a.alert_fired]

        if fired:
            self._save_traces(fired)
            self._save_summary(fired)
            self._register_duckdb()

        return fired

    def _save_traces(self, alerts: list[AlertTrace]) -> None:
        """Write one JSON file per alert in traces/."""
        self._traces_dir.mkdir(parents=True, exist_ok=True)
        for alert in alerts:
            path = self._traces_dir / f"{alert.alert_id}.json"
            path.write_text(alert.model_dump_json(indent=2))

    def _save_summary(self, alerts: list[AlertTrace]) -> None:
        """Write alert summary to Parquet (append if exists)."""
        rows = []
        for a in alerts:
            rows.append({
                "alert_id": a.alert_id,
                "model_id": a.model_id,
                "timestamp": str(a.timestamp),
                "product_id": a.entity_context.get("product_id", ""),
                "account_id": a.entity_context.get("account_id", ""),
                "asset_class": a.entity_context.get("asset_class", ""),
                "accumulated_score": a.accumulated_score,
                "score_threshold": a.score_threshold,
                "trigger_path": a.trigger_path,
                "alert_fired": a.alert_fired,
                "num_calculations": len(a.calculation_scores),
            })

        new_table = pa.table({
            "alert_id": [r["alert_id"] for r in rows],
            "model_id": [r["model_id"] for r in rows],
            "timestamp": [r["timestamp"] for r in rows],
            "product_id": [r["product_id"] for r in rows],
            "account_id": [r["account_id"] for r in rows],
            "asset_class": [r["asset_class"] for r in rows],
            "accumulated_score": [r["accumulated_score"] for r in rows],
            "score_threshold": [r["score_threshold"] for r in rows],
            "trigger_path": [r["trigger_path"] for r in rows],
            "alert_fired": [r["alert_fired"] for r in rows],
            "num_calculations": [r["num_calculations"] for r in rows],
        })

        # Append to existing if present
        if self._summary_path.exists():
            existing = pq.read_table(self._summary_path)
            combined = pa.concat_tables([existing, new_table])
            pq.write_table(combined, self._summary_path)
        else:
            self._summary_path.parent.mkdir(parents=True, exist_ok=True)
            pq.write_table(new_table, self._summary_path)

    def _register_duckdb(self) -> None:
        """Register alerts summary as a DuckDB table."""
        if not self._summary_path.exists():
            return
        cursor = self._db.cursor()
        cursor.execute('DROP TABLE IF EXISTS "alerts_summary"')
        cursor.execute(
            f"CREATE TABLE alerts_summary AS SELECT * FROM read_parquet('{self._summary_path}')"
        )
        cursor.close()
