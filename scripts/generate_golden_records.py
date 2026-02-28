"""Generate golden records for all reference data entities.

Usage:
    uv run python -m scripts.generate_golden_records
"""
from pathlib import Path

from backend.db import DuckDBManager
from backend.engine.data_loader import DataLoader
from backend.services.metadata_service import MetadataService
from backend.services.reference_service import ReferenceService


def main():
    workspace = Path("workspace")
    print("Generating golden records...")

    # Set up DuckDB and load CSV data
    db = DuckDBManager()
    db.connect(str(workspace / "analytics.duckdb"))
    loader = DataLoader(workspace, db)
    loaded = loader.load_all()
    print(f"  Loaded {len(loaded)} tables: {', '.join(loaded)}")

    # Set up services
    metadata = MetadataService(workspace)
    service = ReferenceService(workspace, db, metadata)

    # Generate golden records for each entity with a reference config
    configs = metadata.list_reference_configs()
    total = 0

    for config in configs:
        entity = config.entity
        result = service.generate_golden_records(entity)
        total += result.total_golden_records
        print(f"  {entity}: {result.total_golden_records} golden records "
              f"(from {result.total_source_records} source records, "
              f"{result.duration_ms}ms)")

    print(f"\nTotal: {total} golden records across {len(configs)} entities")
    print("Output: workspace/reference/")

    db.close()


if __name__ == "__main__":
    main()
