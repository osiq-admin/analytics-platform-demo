"""Abstract connector interface."""
from abc import ABC, abstractmethod
from pathlib import Path
import pyarrow as pa


class BaseConnector(ABC):
    """Base class for all data connectors."""

    @abstractmethod
    def read(self, source: str | Path, **kwargs) -> pa.Table:
        """Read data from source, return Arrow table."""
        ...

    @abstractmethod
    def detect_schema(self, source: str | Path, sample_rows: int = 100) -> dict:
        """Detect schema from source, return {columns: [{name, type, nullable, samples}]}."""
        ...

    @abstractmethod
    def supported_formats(self) -> list[str]:
        """Return list of supported file formats."""
        ...
