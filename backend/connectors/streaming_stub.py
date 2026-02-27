"""Streaming connector stub — demonstrates extensibility."""
from pathlib import Path
import pyarrow as pa
from .base import BaseConnector


class StreamingStubConnector(BaseConnector):
    def supported_formats(self) -> list[str]:
        return ["streaming"]

    def read(self, source: str | Path, **kwargs) -> pa.Table:
        raise NotImplementedError("Streaming connector is a demo stub — not implemented for local demo")

    def detect_schema(self, source: str | Path, sample_rows: int = 100) -> dict:
        raise NotImplementedError("Streaming connector is a demo stub — not implemented for local demo")
