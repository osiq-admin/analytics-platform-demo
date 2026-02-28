"""Tests for flaky test detection."""
import json
from pathlib import Path

import pytest

from qa.reporters.flaky import (
    update_flaky_history,
    detect_flaky_tests,
    compute_entropy,
    compute_flip_rate,
)


class TestMetrics:
    def test_entropy_all_pass(self):
        assert compute_entropy("PPPPPPPPPP") == 0.0

    def test_entropy_all_fail(self):
        assert compute_entropy("FFFFFFFFFF") == 0.0

    def test_entropy_balanced(self):
        e = compute_entropy("PFPFPFPFPF")
        assert 0.95 <= e <= 1.0

    def test_flip_rate_no_flips(self):
        assert compute_flip_rate("PPPPPPPPPP") == 0.0

    def test_flip_rate_every_flip(self):
        rate = compute_flip_rate("PFPFPFPFPF")
        assert rate == pytest.approx(1.0, abs=0.01)

    def test_flip_rate_single_flip(self):
        rate = compute_flip_rate("PPPPPFPPPP")
        assert rate == pytest.approx(0.2, abs=0.05)


class TestFlakyHistory:
    def test_update_creates_history(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        update_flaky_history(history_file, passed={"t::a", "t::b"}, failed={"t::c"}, window_size=20)
        data = json.loads(history_file.read_text())
        assert data["t::a"] == "P"
        assert data["t::c"] == "F"

    def test_update_appends_to_existing(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        history_file.write_text(json.dumps({"t::a": "PP", "t::b": "PF"}))
        update_flaky_history(history_file, passed={"t::a"}, failed={"t::b"}, window_size=20)
        data = json.loads(history_file.read_text())
        assert data["t::a"] == "PPP"
        assert data["t::b"] == "PFF"

    def test_window_truncation(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        history_file.write_text(json.dumps({"t::a": "P" * 20}))
        update_flaky_history(history_file, passed={"t::a"}, failed=set(), window_size=20)
        data = json.loads(history_file.read_text())
        assert len(data["t::a"]) == 20


class TestDetectFlaky:
    def test_detect_flaky_suspect(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        history_file.write_text(json.dumps({"t::flaky": "PFPFPFPFPFPFPFPFPFPF"}))
        suspects = detect_flaky_tests(history_file, flip_threshold=0.3, entropy_threshold=0.5)
        assert any(s["test"] == "t::flaky" for s in suspects)

    def test_stable_test_not_flagged(self, tmp_path):
        history_file = tmp_path / "flaky_history.json"
        history_file.write_text(json.dumps({"t::stable": "PPPPPPPPPPPPPPPPPPPP"}))
        suspects = detect_flaky_tests(history_file, flip_threshold=0.3, entropy_threshold=0.5)
        assert len(suspects) == 0
