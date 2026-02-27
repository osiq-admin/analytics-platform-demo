"""Local file connector — CSV, JSON, Parquet, Excel."""
from pathlib import Path
import pyarrow as pa
import pyarrow.csv as pcsv
import pyarrow.parquet as pq
import pyarrow.json as pjson
from .base import BaseConnector


class LocalFileConnector(BaseConnector):
    def supported_formats(self) -> list[str]:
        return ["csv", "json", "parquet", "excel"]

    def read(self, source: str | Path, **kwargs) -> pa.Table:
        path = Path(source)
        fmt = kwargs.get("format", path.suffix.lstrip(".").lower())
        if fmt == "csv":
            return pcsv.read_csv(path)
        elif fmt == "json":
            return pjson.read_json(path)
        elif fmt == "parquet":
            return pq.read_table(path)
        elif fmt in ("excel", "xlsx", "xls"):
            import pandas as pd
            df = pd.read_excel(path)
            return pa.Table.from_pandas(df)
        raise ValueError(f"Unsupported format: {fmt}")

    def detect_schema(self, source: str | Path, sample_rows: int = 100) -> dict:
        table = self.read(source)
        sample = table.slice(0, min(sample_rows, len(table)))
        columns = []
        for i, field in enumerate(table.schema):
            col_data = sample.column(i)
            samples = [str(v) for v in col_data.to_pylist()[:5] if v is not None]
            columns.append({
                "name": field.name,
                "type": str(field.type),
                "nullable": field.nullable,
                "samples": samples,
            })
        return {"columns": columns, "row_count": len(table), "format": Path(source).suffix.lstrip(".")}
