"""Tests for domain comparators."""
import pytest

from qa.comparators.tabular import compare_tabular
from qa.comparators.calculation import compare_calculations
from qa.comparators.detection import compare_detection


class TestTabularComparator:
    def test_identical_data(self):
        prev = [{"id": "1", "name": "Alpha", "score": 0.95}]
        curr = [{"id": "1", "name": "Alpha", "score": 0.95}]
        result = compare_tabular(prev, curr, key="id")
        assert result["added"] == []
        assert result["removed"] == []
        assert result["changed"] == []

    def test_added_record(self):
        prev = [{"id": "1", "name": "Alpha"}]
        curr = [{"id": "1", "name": "Alpha"}, {"id": "2", "name": "Beta"}]
        result = compare_tabular(prev, curr, key="id")
        assert result["added"] == [{"id": "2", "name": "Beta"}]

    def test_removed_record(self):
        prev = [{"id": "1", "name": "Alpha"}, {"id": "2", "name": "Beta"}]
        curr = [{"id": "1", "name": "Alpha"}]
        result = compare_tabular(prev, curr, key="id")
        assert result["removed"] == [{"id": "2", "name": "Beta"}]

    def test_changed_field(self):
        prev = [{"id": "1", "name": "Alpha", "score": 0.90}]
        curr = [{"id": "1", "name": "Alpha", "score": 0.95}]
        result = compare_tabular(prev, curr, key="id")
        assert len(result["changed"]) == 1
        assert result["changed"][0]["key"] == "1"
        assert result["changed"][0]["diffs"]["score"]["old"] == 0.90
        assert result["changed"][0]["diffs"]["score"]["new"] == 0.95

    def test_within_tolerance(self):
        prev = [{"id": "1", "score": 0.950}]
        curr = [{"id": "1", "score": 0.955}]
        result = compare_tabular(prev, curr, key="id",
                                 tolerance={"score": {"absolute": 0.01}})
        assert result["changed"] == []
        assert result["within_tolerance"] == 1

    def test_beyond_tolerance(self):
        prev = [{"id": "1", "score": 0.90}]
        curr = [{"id": "1", "score": 0.95}]
        result = compare_tabular(prev, curr, key="id",
                                 tolerance={"score": {"absolute": 0.01}})
        assert len(result["changed"]) == 1

    def test_field_filter(self):
        prev = [{"id": "1", "name": "Alpha", "extra": "x"}]
        curr = [{"id": "1", "name": "Beta", "extra": "y"}]
        result = compare_tabular(prev, curr, key="id", fields=["id", "name"])
        assert len(result["changed"]) == 1
        # "extra" should not appear in diffs
        assert "extra" not in result["changed"][0]["diffs"]

    def test_summary_counts(self):
        prev = [{"id": "1", "v": 1}, {"id": "2", "v": 2}]
        curr = [{"id": "1", "v": 1}, {"id": "3", "v": 3}]
        result = compare_tabular(prev, curr, key="id")
        assert result["total_previous"] == 2
        assert result["total_current"] == 2
        assert len(result["added"]) == 1
        assert len(result["removed"]) == 1


class TestCalculationComparator:
    def test_identical_results(self):
        prev = [{"id": "p1", "vwap": 150.25}]
        curr = [{"id": "p1", "vwap": 150.25}]
        result = compare_calculations(prev, curr, key="id",
                                      value_fields=["vwap"],
                                      absolute_tol=0.01, relative_tol=0.001)
        assert result["drifted"] == 0

    def test_within_absolute_tolerance(self):
        prev = [{"id": "p1", "vwap": 150.250}]
        curr = [{"id": "p1", "vwap": 150.255}]
        result = compare_calculations(prev, curr, key="id",
                                      value_fields=["vwap"],
                                      absolute_tol=0.01, relative_tol=0.001)
        assert result["drifted"] == 0
        assert result["within_tolerance"] == 1

    def test_beyond_tolerance(self):
        prev = [{"id": "p1", "vwap": 150.00}]
        curr = [{"id": "p1", "vwap": 152.00}]
        result = compare_calculations(prev, curr, key="id",
                                      value_fields=["vwap"],
                                      absolute_tol=0.01, relative_tol=0.001)
        assert result["drifted"] == 1
        assert result["details"][0]["field"] == "vwap"

    def test_multiple_fields(self):
        prev = [{"id": "p1", "vwap": 150.0, "pnl": 1000.0}]
        curr = [{"id": "p1", "vwap": 150.0, "pnl": 1500.0}]
        result = compare_calculations(prev, curr, key="id",
                                      value_fields=["vwap", "pnl"],
                                      absolute_tol=0.01, relative_tol=0.001)
        assert result["drifted"] == 1


class TestDetectionComparator:
    def test_identical_distributions(self):
        prev = {"model_id": "wash", "count": 14, "avg_score": 0.75}
        curr = {"model_id": "wash", "count": 14, "avg_score": 0.75}
        result = compare_detection(prev, curr,
                                   tolerance={"count": {"absolute": 2}, "avg_score": {"absolute": 0.05}})
        assert result["significant_change"] is False

    def test_count_within_tolerance(self):
        prev = {"model_id": "wash", "count": 14}
        curr = {"model_id": "wash", "count": 15}
        result = compare_detection(prev, curr, tolerance={"count": {"absolute": 2}})
        assert result["significant_change"] is False

    def test_count_beyond_tolerance(self):
        prev = {"model_id": "wash", "count": 14}
        curr = {"model_id": "wash", "count": 20}
        result = compare_detection(prev, curr, tolerance={"count": {"absolute": 2}})
        assert result["significant_change"] is True
        assert any(d["field"] == "count" for d in result["metric_diffs"])

    def test_score_drift(self):
        prev = {"model_id": "wash", "avg_score": 0.75}
        curr = {"model_id": "wash", "avg_score": 0.90}
        result = compare_detection(prev, curr,
                                   tolerance={"avg_score": {"absolute": 0.05}})
        assert result["significant_change"] is True
