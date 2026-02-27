"""Schema detection service — auto-detect column types, formats, patterns."""
from __future__ import annotations
import re
from pathlib import Path
from backend.connectors.local_file import LocalFileConnector
from backend.models.onboarding import DetectedSchema, DetectedColumn

PATTERNS: dict[str, str] = {
    r"^[A-Z]{2}[A-Z0-9]{9}\d$": "ISIN",
    r"^[A-Z]{4}$": "MIC",
    r"^[A-Z]{3}$": "CCY",
    r"^\d{4}-\d{2}-\d{2}": "ISO8601",
    r"^[A-Z0-9]{20}$": "LEI",
}


def detect_schema(file_path: Path, sample_rows: int = 100) -> DetectedSchema:
    connector = LocalFileConnector()
    table = connector.read(file_path)
    sample = table.slice(0, min(sample_rows, len(table)))
    columns: list[DetectedColumn] = []
    for i, field in enumerate(table.schema):
        col_data = sample.column(i)
        samples = [str(v) for v in col_data.to_pylist()[:5] if v is not None]
        pattern = _detect_pattern(samples)
        columns.append(DetectedColumn(
            name=field.name,
            inferred_type=str(field.type),
            nullable=field.nullable,
            sample_values=samples,
            pattern=pattern,
        ))
    fmt = file_path.suffix.lstrip(".").lower()
    return DetectedSchema(
        columns=columns,
        row_count=len(table),
        file_format=fmt,
        delimiter="," if fmt == "csv" else "",
        has_header=True,
    )


def _detect_pattern(samples: list[str]) -> str:
    if not samples:
        return ""
    for pat, label in PATTERNS.items():
        if all(re.match(pat, s) for s in samples if s):
            return label
    return ""
