"""AI context builder — creates metadata summaries for LLM context."""
from pathlib import Path

from backend.db import DuckDBManager
from backend.services.metadata_service import MetadataService


class AIContextBuilder:
    def __init__(
        self,
        workspace_dir: Path,
        metadata: MetadataService,
        db: DuckDBManager,
    ):
        self._workspace = workspace_dir
        self._metadata = metadata
        self._db = db

    def build_calc_context(self) -> str:
        """Build context string describing existing calculations for AI calc generation."""
        lines = ["# Available Calculations\n"]

        calcs = self._metadata.list_calculations()
        for calc in calcs:
            lines.append(f"## {calc.name} ({calc.calc_id})")
            lines.append(f"Layer: {calc.layer.value}")
            lines.append(f"Description: {calc.description}")
            if calc.depends_on:
                lines.append(f"Depends on: {', '.join(calc.depends_on)}")
            lines.append(f"Value field: {calc.value_field}")
            lines.append(f"Output table: {calc.output.get('table_name', 'N/A')}")
            lines.append("")

        return "\n".join(lines)

    def build_entity_context(self) -> str:
        """Build context string describing entities and their schemas."""
        lines = ["# Available Entities\n"]

        entities = self._metadata.list_entities()
        for entity in entities:
            lines.append(f"## {entity.name} ({entity.entity_id})")
            if entity.description:
                lines.append(f"Description: {entity.description}")
            lines.append("Fields:")
            for field in entity.fields:
                nullable = " (nullable)" if field.nullable else ""
                key = " [KEY]" if field.is_key else ""
                lines.append(f"  - {field.name}: {field.type}{key}{nullable}")
            lines.append("")

        return "\n".join(lines)

    def build_settings_context(self) -> str:
        """Build context describing available settings."""
        lines = ["# Available Settings\n"]

        settings = self._metadata.list_settings()
        for s in settings:
            lines.append(
                f"- {s.name} ({s.setting_id}): type={s.value_type}, default={s.default}"
            )
        lines.append("")

        return "\n".join(lines)

    def build_table_schema_context(self) -> str:
        """Build DuckDB table schema context from registered tables."""
        lines = ["# DuckDB Table Schemas\n"]

        cursor = self._db.cursor()
        try:
            tables = cursor.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'main'"
            ).fetchall()
            for (table_name,) in tables:
                lines.append(f"## {table_name}")
                cols = cursor.execute(
                    f"SELECT column_name, data_type FROM information_schema.columns "
                    f"WHERE table_name = '{table_name}'"
                ).fetchall()
                for col_name, col_type in cols:
                    lines.append(f"  - {col_name}: {col_type}")
                lines.append("")
        except Exception:
            lines.append("(No tables available)")
        finally:
            cursor.close()

        return "\n".join(lines)

    def build_full_context(self) -> str:
        """Build complete context for AI calc generation."""
        parts = [
            self.build_entity_context(),
            self.build_calc_context(),
            self.build_settings_context(),
            self.build_table_schema_context(),
        ]
        return "\n---\n\n".join(parts)

    def suggest_calculation(self, description: str) -> dict:
        """Generate a calculation suggestion based on natural language description.

        This is a MOCK implementation (no actual LLM call) that returns a template
        based on common patterns in the description.
        """
        # Determine likely layer and pattern from description keywords
        desc_lower = description.lower()

        if any(w in desc_lower for w in ["ratio", "percentage", "proportion"]):
            layer = "derived"
            template_type = "ratio"
        elif any(
            w in desc_lower
            for w in ["aggregate", "sum", "average", "total", "count"]
        ):
            layer = "aggregation"
            template_type = "aggregation"
        elif any(w in desc_lower for w in ["window", "period", "range", "time"]):
            layer = "time_window"
            template_type = "time_window"
        else:
            layer = "derived"
            template_type = "derived"

        # Generate a calc_id from description
        calc_id = description.lower().replace(" ", "_")[:40]
        calc_id = "".join(c for c in calc_id if c.isalnum() or c == "_")

        # Build template based on type
        if template_type == "ratio":
            logic = (
                f"SELECT\n"
                f"    product_id,\n"
                f"    account_id,\n"
                f"    -- TODO: Replace with actual numerator/denominator\n"
                f"    CAST(numerator AS DOUBLE) / NULLIF(CAST(denominator AS DOUBLE), 0)"
                f" AS {calc_id}_value\n"
                f"FROM calc_trading_activity_aggregation"
            )
        elif template_type == "aggregation":
            logic = (
                f"SELECT\n"
                f"    product_id,\n"
                f"    account_id,\n"
                f"    business_date,\n"
                f"    -- TODO: Replace with actual aggregation\n"
                f"    SUM(value) AS {calc_id}_value,\n"
                f"    COUNT(*) AS {calc_id}_count\n"
                f"FROM execution\n"
                f"GROUP BY product_id, account_id, business_date"
            )
        elif template_type == "time_window":
            logic = (
                f"SELECT\n"
                f"    product_id,\n"
                f"    account_id,\n"
                f"    -- TODO: Define window boundaries\n"
                f"    MIN(execution_date) AS window_start,\n"
                f"    MAX(execution_date) AS window_end,\n"
                f"    COUNT(*) AS {calc_id}_count\n"
                f"FROM execution\n"
                f"GROUP BY product_id, account_id"
            )
        else:
            logic = (
                f"SELECT\n"
                f"    product_id,\n"
                f"    account_id,\n"
                f"    -- TODO: Implement custom logic\n"
                f"    0.0 AS {calc_id}_value\n"
                f"FROM calc_trading_activity_aggregation"
            )

        return {
            "calc_id": calc_id,
            "name": description.title(),
            "description": description,
            "layer": layer,
            "logic": logic,
            "value_field": f"{calc_id}_value",
            "depends_on": (
                ["trading_activity_aggregation"] if layer != "transaction" else []
            ),
            "output": {"table_name": f"calc_{calc_id}"},
            "parameters": {},
            "display": {"format": "decimal", "precision": 4},
            "storage": "parquet",
            "inputs": [],
            "regulatory_tags": [],
            "template_type": template_type,
            "ai_generated": True,
            "confidence": "medium",
            "suggestions": [
                "Review and customize the SQL logic for your specific use case",
                "Add appropriate parameters via $param placeholders",
                "Set correct depends_on based on which tables the SQL references",
                "Consider adding regulatory_tags if this calculation supports compliance",
            ],
        }
