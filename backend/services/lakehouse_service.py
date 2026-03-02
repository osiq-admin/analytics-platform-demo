"""Unified lakehouse interface — abstracts catalog, storage, and compute.

Wraps PyIceberg (writes/management) and DuckDB iceberg_scan() (reads/OLAP).
REST Catalog protocol is the lingua franca — starting with SQLite for demo,
config-swappable to Polaris/Nessie/Glue by changing lakehouse.yaml only.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import pyarrow as pa
from pyiceberg.catalog import load_catalog
from pyiceberg.exceptions import (
    NamespaceAlreadyExistsError,
    NoSuchNamespaceError,
    NoSuchTableError,
    TableAlreadyExistsError,
)
from pyiceberg.table import Table
from pyiceberg.types import StringType

from backend.models.lakehouse import (
    IcebergSnapshot,
    IcebergTableInfo,
    IcebergTierConfig,
    LakehouseConfig,
    SchemaEvolution,
    SchemaField,
)

log = logging.getLogger(__name__)


class LakehouseService:
    """Unified lakehouse interface — abstracts catalog, storage, and compute."""

    def __init__(
        self,
        workspace: Path,
        config: LakehouseConfig,
        tier_config: IcebergTierConfig,
    ):
        self._workspace = workspace
        self._config = config
        self._tier_config = tier_config
        self._catalog = self._init_catalog()
        self._ensure_namespaces()

    # ── Catalog ──────────────────────────────────────────────────────────

    def _init_catalog(self):
        cat_cfg = self._config.catalog
        props: dict[str, str] = {"type": cat_cfg.type}

        if cat_cfg.type == "sql":
            # Resolve relative paths for SQLite
            uri = cat_cfg.uri
            if "sqlite:///" in uri and not uri.startswith("sqlite:////"):
                db_path = self._workspace.parent / uri.replace("sqlite:///", "")
                db_path.parent.mkdir(parents=True, exist_ok=True)
                uri = f"sqlite:///{db_path}"
            props["uri"] = uri

            warehouse = cat_cfg.warehouse
            if not warehouse.startswith(("s3://", "gs://", "abfss://", "file://")):
                wh_path = self._workspace.parent / warehouse
                wh_path.mkdir(parents=True, exist_ok=True)
                warehouse = f"file://{wh_path}"
            props["warehouse"] = warehouse
        else:
            props["uri"] = cat_cfg.uri
            props["warehouse"] = cat_cfg.warehouse
            if cat_cfg.credential:
                props["credential"] = cat_cfg.credential

        props.update(cat_cfg.properties)
        return load_catalog("analytics", **props)

    def _ensure_namespaces(self) -> None:
        for ns in {
            self._tier_config.default_namespace,
            self._tier_config.shared_namespace,
            self._tier_config.platform_namespace,
        }:
            try:
                self._catalog.create_namespace(ns)
            except (NamespaceAlreadyExistsError, Exception):
                pass  # Namespace exists or catalog doesn't support create

    def _resolve_namespace(self, tier: str, tenant_id: str | None = None) -> str:
        mapping = self._tier_config.tier_namespace_mapping
        if tier in mapping:
            ns = mapping[tier]
        elif tier == "reference":
            ns = self._tier_config.shared_namespace
        elif tier == "logging":
            ns = self._tier_config.platform_namespace
        else:
            ns = self._tier_config.default_namespace

        if tenant_id:
            ns = f"tenant_{tenant_id}"
        return ns

    def _full_table_id(self, tier: str, table_name: str, tenant_id: str | None = None) -> str:
        ns = self._resolve_namespace(tier, tenant_id)
        return f"{ns}.{table_name}"

    # ── Table lifecycle ──────────────────────────────────────────────────

    def create_table(
        self,
        tier: str,
        table_name: str,
        arrow_schema: pa.Schema,
        tenant_id: str | None = None,
        properties: dict[str, str] | None = None,
    ) -> Table:
        ns = self._resolve_namespace(tier, tenant_id)
        try:
            self._catalog.create_namespace(ns)
        except (NamespaceAlreadyExistsError, Exception):
            pass

        props = dict(self._tier_config.default_properties)
        if properties:
            props.update(properties)
        props["tier"] = tier

        table_id = self._full_table_id(tier, table_name, tenant_id)
        try:
            return self._catalog.create_table(table_id, schema=arrow_schema, properties=props)
        except TableAlreadyExistsError:
            return self._catalog.load_table(table_id)

    def table_exists(self, tier: str, table_name: str, tenant_id: str | None = None) -> bool:
        table_id = self._full_table_id(tier, table_name, tenant_id)
        return self._catalog.table_exists(table_id)

    def get_table(self, tier: str, table_name: str, tenant_id: str | None = None) -> Table:
        table_id = self._full_table_id(tier, table_name, tenant_id)
        return self._catalog.load_table(table_id)

    def drop_table(self, tier: str, table_name: str, tenant_id: str | None = None) -> bool:
        table_id = self._full_table_id(tier, table_name, tenant_id)
        try:
            self._catalog.drop_table(table_id)
            return True
        except NoSuchTableError:
            return False

    # ── Data operations ──────────────────────────────────────────────────

    def append(self, tier: str, table_name: str, data: pa.Table, tenant_id: str | None = None) -> None:
        table = self.get_table(tier, table_name, tenant_id)
        table.append(data)

    def overwrite(self, tier: str, table_name: str, data: pa.Table, tenant_id: str | None = None) -> None:
        table = self.get_table(tier, table_name, tenant_id)
        table.overwrite(data)

    # ── Schema evolution ─────────────────────────────────────────────────

    def evolve_schema(
        self,
        tier: str,
        table_name: str,
        operations: list[SchemaEvolution],
        tenant_id: str | None = None,
    ) -> None:
        table = self.get_table(tier, table_name, tenant_id)
        with table.update_schema() as update:
            for op in operations:
                if op.operation == "add_column":
                    type_str = op.details.get("type", "string")
                    iceberg_type = StringType()  # Default; extend as needed
                    update.add_column(op.field_name, iceberg_type, doc=op.details.get("doc"))
                elif op.operation == "rename_column":
                    new_name = op.details.get("new_name", op.field_name)
                    update.rename_column(op.field_name, new_name)
                elif op.operation == "drop_column":
                    update.delete_column(op.field_name)
                elif op.operation == "set_optional":
                    update.update_column(op.field_name, required=False)
                elif op.operation == "set_required":
                    update.update_column(op.field_name, required=True)

    def get_schema(self, tier: str, table_name: str, tenant_id: str | None = None) -> list[SchemaField]:
        table = self.get_table(tier, table_name, tenant_id)
        schema = table.schema()
        return [
            SchemaField(
                field_id=field.field_id,
                name=field.name,
                type_str=str(field.field_type),
                required=field.required,
                doc=field.doc,
            )
            for field in schema.fields
        ]

    # ── Snapshots & time travel ──────────────────────────────────────────

    def list_snapshots(self, tier: str, table_name: str, tenant_id: str | None = None) -> list[IcebergSnapshot]:
        table = self.get_table(tier, table_name, tenant_id)
        result = []
        for snap in table.snapshots():
            summary_dict: dict[str, str] = {}
            operation = "unknown"
            if snap.summary:
                operation = str(snap.summary.operation.value) if snap.summary.operation else "unknown"
                # Extract summary fields safely (PyIceberg Summary is not a plain dict)
                for key in ("added-records", "total-records", "added-data-files",
                            "total-data-files", "added-files-size", "total-files-size"):
                    val = snap.summary.get(key)
                    if val is not None:
                        summary_dict[key] = str(val)
            result.append(
                IcebergSnapshot(
                    snapshot_id=snap.snapshot_id,
                    timestamp=datetime.fromtimestamp(snap.timestamp_ms / 1000, tz=timezone.utc),
                    operation=operation,
                    summary=summary_dict,
                )
            )
        return result

    def tag_snapshot(self, tier: str, table_name: str, tag_name: str, tenant_id: str | None = None) -> None:
        table = self.get_table(tier, table_name, tenant_id)
        current = table.current_snapshot()
        if current:
            table.manage_snapshots().create_tag(current.snapshot_id, tag_name).commit()

    # ── Branches (run versioning) ────────────────────────────────────────

    def create_branch(self, tier: str, table_name: str, branch_name: str, tenant_id: str | None = None) -> None:
        table = self.get_table(tier, table_name, tenant_id)
        current = table.current_snapshot()
        if current:
            table.manage_snapshots().create_branch(current.snapshot_id, branch_name).commit()

    def remove_branch(self, tier: str, table_name: str, branch_name: str, tenant_id: str | None = None) -> None:
        table = self.get_table(tier, table_name, tenant_id)
        # PyIceberg doesn't have a direct remove_branch — use the refs API
        try:
            table.manage_snapshots().remove_branch(branch_name).commit()
        except Exception:
            log.warning("Could not remove branch %s from %s", branch_name, table_name)

    # ── Properties (governance) ──────────────────────────────────────────

    def set_table_properties(
        self, tier: str, table_name: str, props: dict, tenant_id: str | None = None
    ) -> None:
        table = self.get_table(tier, table_name, tenant_id)
        with table.transaction() as txn:
            txn.set_properties(props)

    def get_table_properties(self, tier: str, table_name: str, tenant_id: str | None = None) -> dict:
        table = self.get_table(tier, table_name, tenant_id)
        return dict(table.properties)

    # ── Catalog queries ──────────────────────────────────────────────────

    def list_tables(self, tier: str, tenant_id: str | None = None) -> list[str]:
        ns = self._resolve_namespace(tier, tenant_id)
        try:
            return [t[1] for t in self._catalog.list_tables(ns)]
        except NoSuchNamespaceError:
            return []

    def list_namespaces(self) -> list[str]:
        return [ns[0] if isinstance(ns, tuple) else ns for ns in self._catalog.list_namespaces()]

    def list_all_tables(self) -> list[IcebergTableInfo]:
        result = []
        for tier in self._tier_config.iceberg_tiers:
            for table_name in self.list_tables(tier):
                try:
                    info = self.get_table_info(tier, table_name)
                    result.append(info)
                except Exception:
                    pass
        return result

    def get_table_info(self, tier: str, table_name: str, tenant_id: str | None = None) -> IcebergTableInfo:
        table = self.get_table(tier, table_name, tenant_id)
        schema_fields = self.get_schema(tier, table_name, tenant_id)
        snapshots = list(table.snapshots())
        current = table.current_snapshot()

        total_records = 0
        total_size = 0
        if current and current.summary:
            total_records = int(current.summary.get("total-records", 0))
            total_size = int(current.summary.get("total-files-size", 0))

        return IcebergTableInfo(
            namespace=self._resolve_namespace(tier, tenant_id),
            table_name=table_name,
            tier=tier,
            schema_fields=schema_fields,
            snapshot_count=len(snapshots),
            current_snapshot_id=current.snapshot_id if current else None,
            total_records=total_records,
            total_size_bytes=total_size,
            properties=dict(table.properties),
        )

    # ── DuckDB integration ───────────────────────────────────────────────

    def get_iceberg_scan_path(self, tier: str, table_name: str, tenant_id: str | None = None) -> str:
        table = self.get_table(tier, table_name, tenant_id)
        location = table.metadata_location
        return location

    def register_duckdb_view(
        self,
        tier: str,
        table_name: str,
        conn,
        tenant_id: str | None = None,
        view_name: str | None = None,
    ) -> str:
        vname = view_name or f"{tier}_{table_name}"
        metadata_path = self.get_iceberg_scan_path(tier, table_name, tenant_id)
        conn.execute(
            f"CREATE OR REPLACE VIEW {vname} AS SELECT * FROM iceberg_scan('{metadata_path}')"
        )
        return vname

    # ── Tier helpers ─────────────────────────────────────────────────────

    def is_iceberg_tier(self, tier: str) -> bool:
        return tier in self._tier_config.iceberg_tiers

    @property
    def config(self) -> LakehouseConfig:
        return self._config

    @property
    def tier_config(self) -> IcebergTierConfig:
        return self._tier_config


def load_lakehouse_config(workspace: Path, env: str = "local") -> tuple[LakehouseConfig, IcebergTierConfig]:
    """Load lakehouse configuration from YAML and JSON files."""
    import yaml

    yaml_path = workspace / "config" / "lakehouse.yaml"
    if yaml_path.exists():
        with open(yaml_path) as f:
            all_profiles = yaml.safe_load(f)
        profile = all_profiles.get(env, all_profiles.get("local", {}))
        config = LakehouseConfig(**profile)
    else:
        config = LakehouseConfig()

    tier_json = workspace / "metadata" / "medallion" / "iceberg_config.json"
    if tier_json.exists():
        with open(tier_json) as f:
            tier_data = json.load(f)
        tier_config = IcebergTierConfig(**tier_data)
    else:
        tier_config = IcebergTierConfig(
            iceberg_tiers=["bronze", "silver", "gold", "platinum", "reference", "logging", "archive"],
            non_iceberg_tiers=["landing", "quarantine", "sandbox", "metrics"],
        )

    return config, tier_config
