"""Data quality profiling service."""
from __future__ import annotations
from pathlib import Path
import pyarrow as pa
import pyarrow.compute as pc
from backend.connectors.local_file import LocalFileConnector
from backend.models.onboarding import DataProfile, ColumnProfile


def profile_data(file_path: Path) -> DataProfile:
    connector = LocalFileConnector()
    table = connector.read(file_path)
    columns: list[ColumnProfile] = []
    total_nulls = 0
    for i, field in enumerate(table.schema):
        col = table.column(i)
        null_count = col.null_count
        total_nulls += null_count
        distinct = len(pc.unique(col))
        min_val = max_val = mean_val = ""
        try:
            min_val = str(pc.min(col).as_py())
            max_val = str(pc.max(col).as_py())
            mean_val = str(round(pc.mean(col).as_py(), 4))
        except (pa.ArrowNotImplementedError, TypeError, AttributeError):
            pass
        try:
            value_counts = pc.value_counts(col).to_pylist()
            top = sorted(value_counts, key=lambda x: x["counts"], reverse=True)[:5]
            top_values = [{"value": str(v["values"]), "count": v["counts"]} for v in top]
        except Exception:
            top_values = []
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
    quality_score = completeness
    return DataProfile(
        total_rows=len(table),
        total_columns=len(table.schema),
        columns=columns,
        completeness_pct=completeness,
        quality_score=quality_score,
    )
