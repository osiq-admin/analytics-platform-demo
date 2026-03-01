"""Calculation result service — fingerprinting, skip detection, and audit logging.

Enables calculate-once architecture: Gold Iceberg tables store calc results,
input fingerprinting (SHA-256 of data + params) enables skip logic for immutable calcs.
"""

import hashlib
import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

import pyarrow as pa

from backend.models.calculation_optimization import CalcFingerprint, CalcResultLog

if TYPE_CHECKING:
    from backend.services.lakehouse_service import LakehouseService

log = logging.getLogger(__name__)

# Immutable calcs: never change for the same input data, regardless of params
IMMUTABLE_CALCS = {"value_calc", "adjusted_direction", "business_date_window", "cross_product_window"}


class CalcResultService:
    """Manages calculation fingerprinting, skip detection, and Gold Iceberg writes."""

    def __init__(self, workspace: Path, lakehouse: "LakehouseService | None" = None):
        self._workspace = workspace
        self._lakehouse = lakehouse
        self._log_path = workspace / "metadata" / "governance" / "calc_result_log.json"
        self._result_log: list[CalcResultLog] = []
        self._last_fingerprints: dict[str, CalcFingerprint] = {}
        self._load_log()

    def compute_fingerprint(self, calc_id: str, input_tables: list[str], params: dict) -> CalcFingerprint:
        """Compute SHA-256 fingerprint from input data references and parameters."""
        input_str = json.dumps(sorted(input_tables), sort_keys=True)
        input_hash = hashlib.sha256(input_str.encode()).hexdigest()[:16]

        param_str = json.dumps(params, sort_keys=True, default=str)
        param_hash = hashlib.sha256(param_str.encode()).hexdigest()[:16]

        combined = hashlib.sha256(f"{input_hash}:{param_hash}".encode()).hexdigest()[:16]

        return CalcFingerprint(
            calc_id=calc_id,
            input_hash=input_hash,
            param_hash=param_hash,
            combined_hash=combined,
        )

    def should_skip(self, calc_id: str, fingerprint: CalcFingerprint) -> tuple[bool, str]:
        """Check if a calculation can be skipped based on fingerprint match.

        Returns (should_skip, reason).
        """
        last = self._last_fingerprints.get(calc_id)
        if last is None:
            return False, "no_previous_run"

        if calc_id in IMMUTABLE_CALCS:
            if last.input_hash == fingerprint.input_hash:
                return True, "immutable_calc_same_input"

        if last.combined_hash == fingerprint.combined_hash:
            return True, "same_input_and_params"

        if last.input_hash == fingerprint.input_hash and last.param_hash != fingerprint.param_hash:
            return False, "params_changed"

        return False, "input_changed"

    def log_execution(
        self,
        run_id: str,
        calc_id: str,
        layer: str,
        fingerprint: CalcFingerprint,
        record_count: int = 0,
        duration_ms: int = 0,
        status: str = "success",
        skip_reason: str = "",
        output_table: str = "",
        params: dict | None = None,
    ) -> CalcResultLog:
        """Record a calculation execution in the audit log."""
        entry = CalcResultLog(
            run_id=run_id,
            calc_id=calc_id,
            layer=layer,
            input_fingerprint=fingerprint.input_hash,
            param_fingerprint=fingerprint.param_hash,
            output_hash=fingerprint.combined_hash,
            record_count=record_count,
            duration_ms=duration_ms,
            status=status,
            skip_reason=skip_reason,
            output_table=output_table,
            parameters_snapshot=params or {},
        )
        self._result_log.append(entry)
        self._last_fingerprints[calc_id] = fingerprint
        self._save_log()
        return entry

    def write_to_gold_iceberg(self, calc_id: str, table_name: str, arrow_data: pa.Table) -> None:
        """Write calculation results to Gold Iceberg tier."""
        if not self._lakehouse or not self._lakehouse.is_iceberg_tier("gold"):
            return
        try:
            if not self._lakehouse.table_exists("gold", table_name):
                self._lakehouse.create_table("gold", table_name, arrow_data.schema)
            self._lakehouse.overwrite("gold", table_name, arrow_data)
            log.info("Wrote %s to Gold Iceberg (%d rows)", table_name, len(arrow_data))
        except Exception:
            log.warning("Gold Iceberg write failed for %s", table_name, exc_info=True)

    def get_last_successful_run(self, calc_id: str) -> CalcResultLog | None:
        """Return the most recent successful execution for a calc."""
        for entry in reversed(self._result_log):
            if entry.calc_id == calc_id and entry.status == "success":
                return entry
        return None

    def get_execution_stats(self) -> dict:
        """Return execution statistics across all calcs."""
        total = len(self._result_log)
        if total == 0:
            return {"total_executions": 0, "skipped": 0, "success": 0, "error": 0, "skip_rate": 0.0}
        skipped = sum(1 for e in self._result_log if e.status == "skipped")
        success = sum(1 for e in self._result_log if e.status == "success")
        error = sum(1 for e in self._result_log if e.status == "error")
        total_duration = sum(e.duration_ms for e in self._result_log)
        return {
            "total_executions": total,
            "skipped": skipped,
            "success": success,
            "error": error,
            "skip_rate": round(skipped / total * 100, 1) if total else 0.0,
            "total_duration_ms": total_duration,
            "avg_duration_ms": round(total_duration / total) if total else 0,
        }

    def get_result_log(self) -> list[CalcResultLog]:
        return list(self._result_log)

    def get_lineage_chain(self, run_id: str) -> list[CalcResultLog]:
        """Return all calc executions for a given run, ordered by execution time."""
        return [e for e in self._result_log if e.run_id == run_id]

    def _load_log(self) -> None:
        if self._log_path.exists():
            with open(self._log_path) as f:
                data = json.load(f)
            self._result_log = [CalcResultLog(**item) for item in data]
            for entry in self._result_log:
                if entry.status == "success":
                    self._last_fingerprints[entry.calc_id] = CalcFingerprint(
                        calc_id=entry.calc_id,
                        input_hash=entry.input_fingerprint,
                        param_hash=entry.param_fingerprint,
                        combined_hash=entry.output_hash,
                    )

    def _save_log(self) -> None:
        self._log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._log_path, "w") as f:
            json.dump([e.model_dump(mode="json") for e in self._result_log], f, indent=2, default=str)
