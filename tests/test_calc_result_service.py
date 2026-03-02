"""Tests for CalcResultService — fingerprinting, skip detection, Gold Iceberg writes."""

import json
from pathlib import Path

import pyarrow as pa
import pytest

from backend.models.calculation_optimization import CalcFingerprint, CalcResultLog
from backend.models.lakehouse import IcebergTierConfig, LakehouseConfig
from backend.services.calc_result_service import CalcResultService, IMMUTABLE_CALCS
from backend.services.lakehouse_service import LakehouseService


@pytest.fixture
def calc_workspace(tmp_path):
    ws = tmp_path / "workspace"
    ws.mkdir()
    (ws / "metadata" / "governance").mkdir(parents=True)
    return ws


@pytest.fixture
def calc_lakehouse(tmp_path):
    config = LakehouseConfig(
        catalog={"type": "sql", "uri": f"sqlite:///{tmp_path}/iceberg/catalog.db", "warehouse": f"file://{tmp_path}/iceberg/warehouse"},
    )
    tier_config = IcebergTierConfig(
        iceberg_tiers=["gold"], non_iceberg_tiers=[], tier_namespace_mapping={"gold": "default"},
    )
    ws = tmp_path / "workspace"
    ws.mkdir(exist_ok=True)
    (tmp_path / "iceberg").mkdir(exist_ok=True)
    (tmp_path / "iceberg" / "warehouse").mkdir(exist_ok=True)
    return LakehouseService(ws, config, tier_config)


@pytest.fixture
def calc_svc(calc_workspace):
    return CalcResultService(calc_workspace)


@pytest.fixture
def calc_svc_with_lakehouse(calc_workspace, calc_lakehouse):
    return CalcResultService(calc_workspace, lakehouse=calc_lakehouse)


class TestFingerprinting:
    def test_compute_fingerprint(self, calc_svc):
        fp = calc_svc.compute_fingerprint("value_calc", ["execution", "product"], {"window": 30})
        assert fp.calc_id == "value_calc"
        assert len(fp.input_hash) == 16
        assert len(fp.param_hash) == 16
        assert len(fp.combined_hash) == 16

    def test_same_inputs_same_hash(self, calc_svc):
        fp1 = calc_svc.compute_fingerprint("calc_a", ["t1", "t2"], {"p": 1})
        fp2 = calc_svc.compute_fingerprint("calc_a", ["t1", "t2"], {"p": 1})
        assert fp1.combined_hash == fp2.combined_hash

    def test_different_params_different_hash(self, calc_svc):
        fp1 = calc_svc.compute_fingerprint("calc_a", ["t1"], {"window": 30})
        fp2 = calc_svc.compute_fingerprint("calc_a", ["t1"], {"window": 60})
        assert fp1.input_hash == fp2.input_hash
        assert fp1.param_hash != fp2.param_hash
        assert fp1.combined_hash != fp2.combined_hash

    def test_different_inputs_different_hash(self, calc_svc):
        fp1 = calc_svc.compute_fingerprint("calc_a", ["t1"], {})
        fp2 = calc_svc.compute_fingerprint("calc_a", ["t1", "t2"], {})
        assert fp1.input_hash != fp2.input_hash


class TestSkipDetection:
    def test_no_skip_on_first_run(self, calc_svc):
        fp = calc_svc.compute_fingerprint("value_calc", ["execution"], {})
        skip, reason = calc_svc.should_skip("value_calc", fp)
        assert skip is False
        assert reason == "no_previous_run"

    def test_skip_immutable_same_input(self, calc_svc):
        fp = calc_svc.compute_fingerprint("value_calc", ["execution"], {"p": 1})
        calc_svc.log_execution("run-1", "value_calc", "transaction", fp, status="success")

        fp2 = calc_svc.compute_fingerprint("value_calc", ["execution"], {"p": 2})
        skip, reason = calc_svc.should_skip("value_calc", fp2)
        assert skip is True
        assert reason == "immutable_calc_same_input"

    def test_skip_same_input_and_params(self, calc_svc):
        fp = calc_svc.compute_fingerprint("trend_window", ["execution"], {"window": 30})
        calc_svc.log_execution("run-1", "trend_window", "time_window", fp, status="success")

        fp2 = calc_svc.compute_fingerprint("trend_window", ["execution"], {"window": 30})
        skip, reason = calc_svc.should_skip("trend_window", fp2)
        assert skip is True
        assert reason == "same_input_and_params"

    def test_no_skip_params_changed(self, calc_svc):
        fp = calc_svc.compute_fingerprint("trend_window", ["execution"], {"window": 30})
        calc_svc.log_execution("run-1", "trend_window", "time_window", fp, status="success")

        fp2 = calc_svc.compute_fingerprint("trend_window", ["execution"], {"window": 60})
        skip, reason = calc_svc.should_skip("trend_window", fp2)
        assert skip is False
        assert reason == "params_changed"

    def test_no_skip_input_changed(self, calc_svc):
        fp = calc_svc.compute_fingerprint("value_calc", ["execution"], {})
        calc_svc.log_execution("run-1", "value_calc", "transaction", fp, status="success")

        fp2 = calc_svc.compute_fingerprint("value_calc", ["execution", "product"], {})
        skip, reason = calc_svc.should_skip("value_calc", fp2)
        assert skip is False
        assert reason == "input_changed"

    def test_immutable_calcs_list(self):
        assert "value_calc" in IMMUTABLE_CALCS
        assert "adjusted_direction" in IMMUTABLE_CALCS
        assert "trend_window" not in IMMUTABLE_CALCS


class TestExecutionLog:
    def test_log_execution(self, calc_svc):
        fp = calc_svc.compute_fingerprint("calc_a", ["t1"], {})
        entry = calc_svc.log_execution("run-1", "calc_a", "transaction", fp, record_count=100, duration_ms=50)
        assert entry.status == "success"
        assert entry.record_count == 100

    def test_log_persisted(self, calc_svc, calc_workspace):
        fp = calc_svc.compute_fingerprint("calc_a", ["t1"], {})
        calc_svc.log_execution("run-1", "calc_a", "transaction", fp)

        log_path = calc_workspace / "metadata" / "governance" / "calc_result_log.json"
        assert log_path.exists()
        with open(log_path) as f:
            data = json.load(f)
        assert len(data) == 1

    def test_get_last_successful_run(self, calc_svc):
        fp = calc_svc.compute_fingerprint("calc_a", ["t1"], {})
        calc_svc.log_execution("run-1", "calc_a", "transaction", fp, status="success")
        calc_svc.log_execution("run-2", "calc_a", "transaction", fp, status="error")

        last = calc_svc.get_last_successful_run("calc_a")
        assert last is not None
        assert last.run_id == "run-1"

    def test_get_last_successful_run_none(self, calc_svc):
        assert calc_svc.get_last_successful_run("nonexistent") is None

    def test_get_result_log(self, calc_svc):
        fp = calc_svc.compute_fingerprint("a", ["t"], {})
        calc_svc.log_execution("r1", "a", "tx", fp)
        calc_svc.log_execution("r2", "b", "tx", fp)
        log = calc_svc.get_result_log()
        assert len(log) == 2


class TestExecutionStats:
    def test_empty_stats(self, calc_svc):
        stats = calc_svc.get_execution_stats()
        assert stats["total_executions"] == 0
        assert stats["skip_rate"] == 0.0

    def test_stats_with_executions(self, calc_svc):
        fp = calc_svc.compute_fingerprint("a", ["t"], {})
        calc_svc.log_execution("r1", "a", "tx", fp, status="success", duration_ms=100)
        calc_svc.log_execution("r2", "b", "tx", fp, status="skipped", duration_ms=0)
        calc_svc.log_execution("r3", "c", "tx", fp, status="success", duration_ms=200)

        stats = calc_svc.get_execution_stats()
        assert stats["total_executions"] == 3
        assert stats["skipped"] == 1
        assert stats["success"] == 2
        assert stats["skip_rate"] == 33.3
        assert stats["total_duration_ms"] == 300


class TestGoldIcebergWrite:
    def test_write_to_gold(self, calc_svc_with_lakehouse, calc_lakehouse):
        data = pa.table({"id": [1, 2], "score": [0.8, 0.9]})
        calc_svc_with_lakehouse.write_to_gold_iceberg("test_calc", "gold_test", data)

        assert calc_lakehouse.table_exists("gold", "gold_test")
        table = calc_lakehouse.get_table("gold", "gold_test")
        result = table.scan().to_arrow()
        assert len(result) == 2

    def test_overwrite_gold(self, calc_svc_with_lakehouse, calc_lakehouse):
        data1 = pa.table({"id": [1, 2], "score": [0.8, 0.9]})
        data2 = pa.table({"id": [3], "score": [0.7]})

        calc_svc_with_lakehouse.write_to_gold_iceberg("test_calc", "gold_ow", data1)
        calc_svc_with_lakehouse.write_to_gold_iceberg("test_calc", "gold_ow", data2)

        table = calc_lakehouse.get_table("gold", "gold_ow")
        result = table.scan().to_arrow()
        assert len(result) == 1

    def test_write_without_lakehouse(self, calc_svc):
        data = pa.table({"id": [1]})
        # Should not raise
        calc_svc.write_to_gold_iceberg("test", "test", data)
