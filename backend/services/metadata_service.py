"""JSON metadata CRUD service for all metadata types."""
from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING, Any

from backend.models.calculations import CalculationDefinition
from backend.models.detection import DetectionModelDefinition
from backend.models.entities import EntityDefinition
from backend.models.match_patterns import MatchPattern
from backend.models.query_presets import QueryPresetGroup
from backend.models.score_templates import ScoreTemplate
from backend.models.settings import SettingDefinition
from backend.models.view_config import ThemePalette, ViewConfig
from backend.models.widgets import ViewWidgetConfig
from backend.models.workflow import DemoConfig, TourRegistry, WorkflowConfig

if TYPE_CHECKING:
    from backend.models.analytics_tiers import (
        ArchiveConfig, ArchiveManifest, KPIDataset, PlatinumConfig, SandboxRegistry,
    )
    from backend.models.medallion import DataContract, MedallionConfig, PipelineConfig, TransformationStep
    from backend.models.onboarding import ConnectorConfig
    from backend.models.quality import QualityDimensionsConfig
    from backend.services.audit_service import AuditService


class MetadataService:
    def __init__(self, workspace_dir: Path):
        self._base = workspace_dir / "metadata"
        self._audit: AuditService | None = None

    def set_audit(self, audit) -> None:
        self._audit = audit

    def _record_audit(self, metadata_type: str, item_id: str, action: str,
                      new_value: dict | None = None, previous_value: dict | None = None) -> None:
        if self._audit:
            self._audit.record(metadata_type, item_id, action, new_value, previous_value)

    # -- OOB Manifest & User Overrides --

    def _oob_manifest_path(self) -> Path:
        return self._base / "oob_manifest.json"

    def _user_overrides_base(self) -> Path:
        return self._base / "user_overrides"

    def load_oob_manifest(self) -> dict:
        path = self._oob_manifest_path()
        if path.exists():
            return json.loads(path.read_text())
        return {"oob_version": "0.0.0", "items": {}}

    def is_oob_item(self, item_type: str, item_id: str) -> bool:
        manifest = self.load_oob_manifest()
        return item_id in manifest.get("items", {}).get(item_type, {})

    # -- User Override Path Helpers --

    def _user_entity_path(self, entity_id: str) -> Path:
        return self._user_overrides_base() / "entities" / f"{entity_id}.json"

    def _user_calc_path(self, calc_id: str) -> Path | None:
        base = self._user_overrides_base() / "calculations"
        if not base.exists():
            return None
        for f in base.rglob(f"{calc_id}.json"):
            return f
        return None

    def _user_setting_path(self, setting_id: str) -> Path | None:
        base = self._user_overrides_base() / "settings"
        if not base.exists():
            return None
        for f in base.rglob(f"{setting_id}.json"):
            return f
        return None

    def _user_detection_model_path(self, model_id: str) -> Path:
        return self._user_overrides_base() / "detection_models" / f"{model_id}.json"

    # -- Entities --

    def _entity_path(self, entity_id: str) -> Path:
        return self._base / "entities" / f"{entity_id}.json"

    def save_entity(self, entity: EntityDefinition) -> None:
        if self.is_oob_item("entities", entity.entity_id):
            path = self._user_entity_path(entity.entity_id)
        else:
            path = self._entity_path(entity.entity_id)
        prev = None
        existed = path.exists()
        if existed:
            prev = json.loads(path.read_text())
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(entity.model_dump_json(indent=2))
        self._record_audit("entity", entity.entity_id, "updated" if existed else "created",
                           new_value=entity.model_dump(), previous_value=prev)

    def load_entity(self, entity_id: str) -> EntityDefinition | None:
        user_path = self._user_entity_path(entity_id)
        if user_path.exists():
            entity = EntityDefinition.model_validate_json(user_path.read_text())
            entity.metadata_layer = "user"
            return entity
        path = self._entity_path(entity_id)
        if not path.exists():
            return None
        entity = EntityDefinition.model_validate_json(path.read_text())
        entity.metadata_layer = "oob"
        return entity

    def list_entities(self) -> list[EntityDefinition]:
        items: dict[str, EntityDefinition] = {}
        folder = self._base / "entities"
        if folder.exists():
            for f in sorted(folder.glob("*.json")):
                ent = EntityDefinition.model_validate_json(f.read_text())
                ent.metadata_layer = "oob"
                items[ent.entity_id] = ent
        user_folder = self._user_overrides_base() / "entities"
        if user_folder.exists():
            for f in sorted(user_folder.glob("*.json")):
                ent = EntityDefinition.model_validate_json(f.read_text())
                ent.metadata_layer = "user"
                items[ent.entity_id] = ent
        return sorted(items.values(), key=lambda e: e.entity_id)

    def delete_entity(self, entity_id: str) -> bool:
        user_path = self._user_entity_path(entity_id)
        if user_path.exists():
            prev = json.loads(user_path.read_text())
            user_path.unlink()
            self._record_audit("entity", entity_id, "deleted", previous_value=prev)
            return True
        if not self.is_oob_item("entities", entity_id):
            path = self._entity_path(entity_id)
            if path.exists():
                prev = json.loads(path.read_text())
                path.unlink()
                self._record_audit("entity", entity_id, "deleted", previous_value=prev)
                return True
        return False

    # -- Calculations --

    def _calc_dir(self) -> Path:
        return self._base / "calculations"

    def _calc_path(self, calc_id: str) -> Path | None:
        """Find a calculation file by calc_id across all layer subdirectories."""
        for f in self._calc_dir().rglob(f"{calc_id}.json"):
            if "user_overrides" not in str(f):
                return f
        return None

    def save_calculation(self, calc: CalculationDefinition) -> None:
        if self.is_oob_item("calculations", calc.calc_id):
            folder = self._user_overrides_base() / "calculations" / calc.layer.value
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / f"{calc.calc_id}.json"
        else:
            folder = self._calc_dir() / calc.layer.value
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / f"{calc.calc_id}.json"
        prev = None
        existed = path.exists()
        if existed:
            prev = json.loads(path.read_text())
        path.write_text(calc.model_dump_json(indent=2))
        self._record_audit("calculation", calc.calc_id, "updated" if existed else "created",
                           new_value=calc.model_dump(), previous_value=prev)

    def load_calculation(self, calc_id: str) -> CalculationDefinition | None:
        user_path = self._user_calc_path(calc_id)
        if user_path is not None:
            calc = CalculationDefinition.model_validate_json(user_path.read_text())
            calc.metadata_layer = "user"
            return calc
        path = self._calc_path(calc_id)
        if path is None:
            return None
        calc = CalculationDefinition.model_validate_json(path.read_text())
        calc.metadata_layer = "oob"
        return calc

    def list_calculations(self, layer: str | None = None) -> list[CalculationDefinition]:
        items: dict[str, CalculationDefinition] = {}
        base = self._calc_dir()
        if base.exists():
            if layer:
                pattern_dir = base / layer
                files = sorted(pattern_dir.glob("*.json")) if pattern_dir.exists() else []
            else:
                files = sorted(base.rglob("*.json"))
            for f in files:
                if "user_overrides" not in str(f):
                    calc = CalculationDefinition.model_validate_json(f.read_text())
                    calc.metadata_layer = "oob"
                    items[calc.calc_id] = calc
        user_base = self._user_overrides_base() / "calculations"
        if user_base.exists():
            if layer:
                pattern_dir = user_base / layer
                files = sorted(pattern_dir.glob("*.json")) if pattern_dir.exists() else []
            else:
                files = sorted(user_base.rglob("*.json"))
            for f in files:
                if f.suffix == ".json" and f.stem != ".gitkeep":
                    calc = CalculationDefinition.model_validate_json(f.read_text())
                    calc.metadata_layer = "user"
                    items[calc.calc_id] = calc
        return sorted(items.values(), key=lambda c: c.calc_id)

    def delete_calculation(self, calc_id: str) -> bool:
        user_path = self._user_calc_path(calc_id)
        if user_path is not None:
            prev = json.loads(user_path.read_text())
            user_path.unlink()
            self._record_audit("calculation", calc_id, "deleted", previous_value=prev)
            return True
        if not self.is_oob_item("calculations", calc_id):
            path = self._calc_path(calc_id)
            if path:
                prev = json.loads(path.read_text())
                path.unlink()
                self._record_audit("calculation", calc_id, "deleted", previous_value=prev)
                return True
        return False

    # -- Settings --

    def _settings_dir(self) -> Path:
        return self._base / "settings"

    def _setting_path(self, setting_id: str) -> Path | None:
        for f in self._settings_dir().rglob(f"{setting_id}.json"):
            if "user_overrides" not in str(f):
                return f
        return None

    def save_setting(self, setting: SettingDefinition) -> None:
        if self.is_oob_item("settings", setting.setting_id):
            if setting.value_type == "score_steps":
                folder = self._user_overrides_base() / "settings" / "score_steps"
            elif setting.setting_id.endswith("_score_threshold") or setting.setting_id.endswith("score_threshold"):
                folder = self._user_overrides_base() / "settings" / "score_thresholds"
            else:
                folder = self._user_overrides_base() / "settings" / "thresholds"
        else:
            if setting.value_type == "score_steps":
                folder = self._settings_dir() / "score_steps"
            else:
                folder = self._settings_dir() / "thresholds"
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{setting.setting_id}.json"
        prev = None
        existed = path.exists()
        if existed:
            prev = json.loads(path.read_text())
        path.write_text(setting.model_dump_json(indent=2))
        self._record_audit("setting", setting.setting_id, "updated" if existed else "created",
                           new_value=setting.model_dump(), previous_value=prev)

    def load_setting(self, setting_id: str) -> SettingDefinition | None:
        user_path = self._user_setting_path(setting_id)
        if user_path is not None:
            setting = SettingDefinition.model_validate_json(user_path.read_text())
            setting.metadata_layer = "user"
            return setting
        path = self._setting_path(setting_id)
        if path is None:
            return None
        setting = SettingDefinition.model_validate_json(path.read_text())
        setting.metadata_layer = "oob"
        return setting

    def list_settings(self, category: str | None = None) -> list[SettingDefinition]:
        items: dict[str, SettingDefinition] = {}
        base = self._settings_dir()
        if base.exists():
            if category:
                cat_dir = base / category
                files = sorted(cat_dir.glob("*.json")) if cat_dir.exists() else []
            else:
                files = sorted(base.rglob("*.json"))
            for f in files:
                if "user_overrides" not in str(f):
                    setting = SettingDefinition.model_validate_json(f.read_text())
                    setting.metadata_layer = "oob"
                    items[setting.setting_id] = setting
        user_base = self._user_overrides_base() / "settings"
        if user_base.exists():
            if category:
                cat_dir = user_base / category
                files = sorted(cat_dir.glob("*.json")) if cat_dir.exists() else []
            else:
                files = sorted(user_base.rglob("*.json"))
            for f in files:
                if f.suffix == ".json" and f.stem != ".gitkeep":
                    setting = SettingDefinition.model_validate_json(f.read_text())
                    setting.metadata_layer = "user"
                    items[setting.setting_id] = setting
        return sorted(items.values(), key=lambda s: s.setting_id)

    def delete_setting(self, setting_id: str) -> bool:
        user_path = self._user_setting_path(setting_id)
        if user_path is not None:
            prev = json.loads(user_path.read_text())
            user_path.unlink()
            self._record_audit("setting", setting_id, "deleted", previous_value=prev)
            return True
        if not self.is_oob_item("settings", setting_id):
            path = self._setting_path(setting_id)
            if path:
                prev = json.loads(path.read_text())
                path.unlink()
                self._record_audit("setting", setting_id, "deleted", previous_value=prev)
                return True
        return False

    # -- Detection Models --

    def _detection_dir(self) -> Path:
        return self._base / "detection_models"

    def save_detection_model(self, model: DetectionModelDefinition) -> None:
        if self.is_oob_item("detection_models", model.model_id):
            folder = self._user_overrides_base() / "detection_models"
        else:
            folder = self._detection_dir()
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{model.model_id}.json"
        prev = None
        existed = path.exists()
        if existed:
            prev = json.loads(path.read_text())
        path.write_text(model.model_dump_json(indent=2))
        self._record_audit("detection_model", model.model_id, "updated" if existed else "created",
                           new_value=model.model_dump(), previous_value=prev)

    def load_detection_model(self, model_id: str) -> DetectionModelDefinition | None:
        user_path = self._user_detection_model_path(model_id)
        if user_path.exists():
            model = DetectionModelDefinition.model_validate_json(user_path.read_text())
            model.metadata_layer = "user"
            return model
        path = self._detection_dir() / f"{model_id}.json"
        if not path.exists():
            return None
        model = DetectionModelDefinition.model_validate_json(path.read_text())
        model.metadata_layer = "oob"
        return model

    def list_detection_models(self) -> list[DetectionModelDefinition]:
        items: dict[str, DetectionModelDefinition] = {}
        folder = self._detection_dir()
        if folder.exists():
            for f in sorted(folder.glob("*.json")):
                model = DetectionModelDefinition.model_validate_json(f.read_text())
                model.metadata_layer = "oob"
                items[model.model_id] = model
        user_folder = self._user_overrides_base() / "detection_models"
        if user_folder.exists():
            for f in sorted(user_folder.glob("*.json")):
                if f.suffix == ".json" and f.stem != ".gitkeep":
                    model = DetectionModelDefinition.model_validate_json(f.read_text())
                    model.metadata_layer = "user"
                    items[model.model_id] = model
        return sorted(items.values(), key=lambda m: m.model_id)

    def delete_detection_model(self, model_id: str) -> bool:
        user_path = self._user_detection_model_path(model_id)
        if user_path.exists():
            prev = json.loads(user_path.read_text())
            user_path.unlink()
            self._record_audit("detection_model", model_id, "deleted", previous_value=prev)
            return True
        if not self.is_oob_item("detection_models", model_id):
            path = self._detection_dir() / f"{model_id}.json"
            if path.exists():
                prev = json.loads(path.read_text())
                path.unlink()
                self._record_audit("detection_model", model_id, "deleted", previous_value=prev)
                return True
        return False

    # -- Layer Info Helpers --

    def _has_user_override(self, item_type: str, item_id: str) -> bool:
        if item_type == "entities":
            return self._user_entity_path(item_id).exists()
        elif item_type == "calculations":
            return self._user_calc_path(item_id) is not None
        elif item_type == "settings":
            return self._user_setting_path(item_id) is not None
        elif item_type == "detection_models":
            return self._user_detection_model_path(item_id).exists()
        return False

    def get_item_layer_info(self, item_type: str, item_id: str) -> dict:
        is_oob = self.is_oob_item(item_type, item_id)
        has_override = self._has_user_override(item_type, item_id)
        manifest = self.load_oob_manifest()
        oob_info = manifest.get("items", {}).get(item_type, {}).get(item_id)
        return {
            "layer": "user" if has_override else ("oob" if is_oob else "user"),
            "is_oob": is_oob,
            "has_override": has_override,
            "oob_version": oob_info.get("version") if oob_info else None,
        }

    def delete_user_override(self, item_type: str, item_id: str) -> bool:
        if not self.is_oob_item(item_type, item_id):
            return False
        path = None
        if item_type == "entities":
            path = self._user_entity_path(item_id)
        elif item_type == "calculations":
            path = self._user_calc_path(item_id)
        elif item_type == "settings":
            path = self._user_setting_path(item_id)
        elif item_type == "detection_models":
            path = self._user_detection_model_path(item_id)
        if path and path.exists():
            path.unlink()
            return True
        return False

    def load_oob_version(self, item_type: str, item_id: str) -> dict | None:
        if not self.is_oob_item(item_type, item_id):
            return None
        path = None
        if item_type == "entities":
            path = self._entity_path(item_id)
        elif item_type == "calculations":
            path = self._calc_path(item_id)
        elif item_type == "settings":
            path = self._setting_path(item_id)
        elif item_type == "detection_models":
            path = self._detection_dir() / f"{item_id}.json"
        if path and path.exists():
            return json.loads(path.read_text())
        return None

    # -- Dependency Analysis --

    def get_calculation_dependents(self, calc_id: str) -> dict[str, list[str]]:
        """Find all calculations and detection models that reference a given calc_id.

        Returns {"calculations": [...], "detection_models": [...]}.
        """
        dependent_calcs = []
        for calc in self.list_calculations():
            if calc_id in calc.depends_on:
                dependent_calcs.append(calc.calc_id)

        dependent_models = []
        for model in self.list_detection_models():
            for mc in model.calculations:
                if mc.calc_id == calc_id:
                    dependent_models.append(model.model_id)
                    break

        return {"calculations": dependent_calcs, "detection_models": dependent_models}

    def get_setting_dependents(self, setting_id: str) -> dict[str, list[str]]:
        """Find all calculations and detection models that reference a given setting_id.

        Returns {"calculations": [...], "detection_models": [...]}.
        """
        dependent_calcs = []
        for calc in self.list_calculations():
            for inp in calc.inputs:
                if inp.get("source_type") == "setting" and inp.get("setting_id") == setting_id:
                    dependent_calcs.append(calc.calc_id)
                    break

        dependent_models = []
        for model in self.list_detection_models():
            if model.score_threshold_setting == setting_id:
                dependent_models.append(model.model_id)
                continue
            for mc in model.calculations:
                if mc.threshold_setting == setting_id or mc.score_steps_setting == setting_id:
                    dependent_models.append(model.model_id)
                    break

        return {"calculations": dependent_calcs, "detection_models": dependent_models}

    def validate_calculation(self, calc: CalculationDefinition) -> list[str]:
        """Validate a calculation definition. Returns list of error strings (empty = valid)."""
        errors: list[str] = []
        if not calc.calc_id:
            errors.append("calc_id is required")
        if not calc.name:
            errors.append("name is required")
        if not calc.layer:
            errors.append("layer is required")

        # Check for dependency cycle
        for dep_id in calc.depends_on:
            if dep_id == calc.calc_id:
                errors.append(f"Self-dependency: {calc.calc_id} depends on itself")
            dep = self.load_calculation(dep_id)
            if dep is None:
                errors.append(f"Missing dependency: {dep_id} not found")

        return errors

    def validate_detection_model(self, model: DetectionModelDefinition) -> list[str]:
        """Validate a detection model definition. Returns list of error strings."""
        errors: list[str] = []
        if not model.model_id:
            errors.append("model_id is required")
        if not model.name:
            errors.append("name is required")

        # Check referenced settings exist
        setting = self.load_setting(model.score_threshold_setting)
        if setting is None:
            errors.append(f"Score threshold setting not found: {model.score_threshold_setting}")

        for mc in model.calculations:
            if mc.score_steps_setting:
                ss = self.load_setting(mc.score_steps_setting)
                if ss is None:
                    errors.append(f"Score steps setting not found: {mc.score_steps_setting}")
            if mc.threshold_setting:
                ts = self.load_setting(mc.threshold_setting)
                if ts is None:
                    errors.append(f"Threshold setting not found: {mc.threshold_setting}")

        return errors

    def get_dependency_graph(self) -> dict[str, Any]:
        """Build full dependency graph: calc → model → settings."""
        calcs = self.list_calculations()
        models = self.list_detection_models()

        nodes: list[dict] = []
        edges: list[dict] = []

        for calc in calcs:
            nodes.append({"id": calc.calc_id, "type": "calculation", "label": calc.name, "layer": calc.layer})
            for dep in calc.depends_on:
                edges.append({"source": dep, "target": calc.calc_id, "type": "depends_on"})
            for inp in calc.inputs:
                if inp.get("source_type") == "entity":
                    entity_id = inp.get("entity_id", "")
                    edges.append({"source": entity_id, "target": calc.calc_id, "type": "entity_input"})

        for model in models:
            nodes.append({"id": model.model_id, "type": "detection_model", "label": model.name})
            for mc in model.calculations:
                edges.append({"source": mc.calc_id, "target": model.model_id, "type": "model_uses_calc"})

        entities = self.list_entities()
        for entity in entities:
            nodes.append({"id": entity.entity_id, "type": "entity", "label": entity.name})

        return {"nodes": nodes, "edges": edges}

    # -- Domain Values --

    @staticmethod
    def _cardinality_tier(count: int) -> str:
        """Classify count into small/medium/large cardinality tier."""
        if count <= 50:
            return "small"
        if count <= 500:
            return "medium"
        return "large"

    def _get_metadata_values(self, entity_id: str, field_name: str) -> list:
        """Extract domain values from entity field metadata definition."""
        entity = self.load_entity(entity_id)
        if not entity:
            return []
        field_def = next(
            (f for f in (entity.fields or []) if f.name == field_name), None
        )
        if field_def and field_def.domain_values:
            return list(field_def.domain_values)
        return []

    @staticmethod
    def _merge_values(metadata_values: list, data_values: list) -> list:
        """Merge metadata and data values, preserving metadata order, deduplicating."""
        seen = set(metadata_values)
        combined = list(metadata_values)
        for v in data_values:
            if v not in seen:
                combined.append(v)
                seen.add(v)
        return combined

    @staticmethod
    def _filter_by_search(values: list, search: str | None) -> list:
        """Filter values by case-insensitive search term."""
        if not search:
            return values
        search_lower = search.lower()
        return [v for v in values if search_lower in str(v).lower()]

    def get_domain_values(self, entity_id: str, field_name: str, db=None,
                          search: str | None = None, limit: int = 50) -> dict:
        """Get domain values for an entity field from metadata and live data."""
        metadata_values = self._get_metadata_values(entity_id, field_name)

        data_values, total_count = (
            self._query_distinct_values(db, entity_id, field_name, search, limit)
            if db else ([], 0)
        )

        combined = self._merge_values(metadata_values, data_values)
        combined = self._filter_by_search(combined, search)

        effective_count = total_count or len(combined)

        return {
            "entity_id": entity_id,
            "field_name": field_name,
            "metadata_values": self._filter_by_search(metadata_values, search),
            "data_values": data_values,
            "combined": combined[:limit],
            "total_count": effective_count,
            "cardinality": self._cardinality_tier(effective_count),
        }

    def _query_distinct_values(self, db, table: str, field: str,
                               search: str | None, limit: int) -> tuple[list, int]:
        """Query distinct values from DuckDB."""
        try:
            cursor = db.cursor()

            # Count total distinct
            count_sql = f'SELECT COUNT(DISTINCT "{field}") FROM "{table}" WHERE "{field}" IS NOT NULL'  # nosec B608
            total = cursor.execute(count_sql).fetchone()[0]

            # Fetch values with optional search
            sql = f'SELECT DISTINCT "{field}" FROM "{table}" WHERE "{field}" IS NOT NULL'  # nosec B608
            if search:
                sql += f" AND CAST(\"{field}\" AS VARCHAR) ILIKE '%{search}%'"
            sql += f' ORDER BY "{field}" LIMIT {limit}'

            rows = cursor.execute(sql).fetchall()
            cursor.close()
            return [str(r[0]) for r in rows], total
        except Exception:
            return [], 0

    def get_match_keys(self) -> list[dict]:
        """Get all entity fields usable as match keys."""
        keys = []
        for entity in self.list_entities():
            for field in (entity.fields or []):
                if field.type in ("string", "varchar"):
                    keys.append({
                        "key": field.name,
                        "entity": entity.entity_id,
                        "type": field.type,
                        "domain_values": list(field.domain_values) if field.domain_values else None,
                        "description": field.description or f"{entity.entity_id}.{field.name}",
                    })
        return keys

    def get_setting_ids(self, value_type: str | None = None) -> list[dict]:
        """Get setting IDs with metadata, optionally filtered by value_type."""
        settings = self.list_settings()
        result = []
        for s in settings:
            if value_type and s.value_type != value_type:
                continue
            result.append({
                "setting_id": s.setting_id,
                "name": s.name,
                "value_type": s.value_type,
                "default": s.default,
            })
        return result

    def get_calculation_ids(self, layer: str | None = None) -> list[dict]:
        """Get calculation IDs with metadata, optionally filtered by layer."""
        calcs = self.list_calculations(layer=layer)
        result = []
        for c in calcs:
            result.append({
                "calc_id": c.calc_id,
                "name": c.name,
                "layer": c.layer.value if hasattr(c.layer, 'value') else str(c.layer),
                "value_field": c.value_field,
                "description": c.description or "",
            })
        return result

    # -- Regulation Registry --

    def load_regulation_registry(self) -> dict:
        """Load the regulation registry from workspace/metadata/regulations/registry.json."""
        path = self._base / "regulations" / "registry.json"
        if not path.exists():
            return {"regulations": []}
        return json.loads(path.read_text())

    @staticmethod
    def _build_models_by_article(models) -> dict[str, list[str]]:
        """Build reverse index of 'RegName Article' to model IDs."""
        result: dict[str, list[str]] = {}
        for model in models:
            for rc in model.regulatory_coverage:
                key = f"{rc.regulation} {rc.article}"
                result.setdefault(key, [])
                if model.model_id not in result[key]:
                    result[key].append(model.model_id)
        return result

    @staticmethod
    def _build_entities_by_calc(calcs) -> dict[str, list[str]]:
        """Build calc_id to entity_ids mapping from calculation inputs."""
        result: dict[str, list[str]] = {}
        for calc in calcs:
            entity_ids: list[str] = []
            for inp in calc.inputs:
                if inp.get("source_type") == "entity" and inp.get("entity_id"):
                    eid = inp["entity_id"]
                    if eid not in entity_ids:
                        entity_ids.append(eid)
            result[calc.calc_id] = entity_ids
        return result

    def get_regulatory_coverage_map(self) -> dict:
        """Build a comprehensive regulatory coverage map.

        Returns a structure with:
        - regulations: the full registry
        - models_by_article: reverse index of "RegName Article" -> [model_ids]
        - calcs_by_model: model_id -> [calc_ids]
        - entities_by_calc: calc_id -> [entity_ids] (from calc inputs)
        - coverage_summary: total/covered/uncovered articles and coverage percentage
        """
        registry = self.load_regulation_registry()
        models = self.list_detection_models()
        calcs = self.list_calculations()

        models_by_article = self._build_models_by_article(models)
        calcs_by_model = {m.model_id: [mc.calc_id for mc in m.calculations] for m in models}
        entities_by_calc = self._build_entities_by_calc(calcs)

        # Classify registry articles as covered or uncovered
        all_article_keys = [
            f"{reg['name']} {article['article']}"
            for reg in registry.get("regulations", [])
            for article in reg.get("articles", [])
        ]
        covered_articles = [k for k in all_article_keys if k in models_by_article]
        uncovered_articles = [k for k in all_article_keys if k not in models_by_article]

        total = len(all_article_keys)
        coverage_pct = round((len(covered_articles) / total * 100), 1) if total > 0 else 0.0

        return {
            "regulations": registry.get("regulations", []),
            "models_by_article": models_by_article,
            "calcs_by_model": calcs_by_model,
            "entities_by_calc": entities_by_calc,
            "coverage_summary": {
                "total_articles": total,
                "covered": len(covered_articles),
                "uncovered": len(uncovered_articles),
                "coverage_pct": coverage_pct,
                "covered_articles": covered_articles,
                "uncovered_articles": uncovered_articles,
            },
        }

    # -- Match Patterns --

    def _match_patterns_dir(self) -> Path:
        return self._base / "match_patterns"

    def save_match_pattern(self, pattern: MatchPattern) -> None:
        folder = self._match_patterns_dir()
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{pattern.pattern_id}.json"
        path.write_text(pattern.model_dump_json(indent=2))

    def load_match_pattern(self, pattern_id: str) -> MatchPattern | None:
        path = self._match_patterns_dir() / f"{pattern_id}.json"
        if not path.exists():
            return None
        return MatchPattern.model_validate_json(path.read_text())

    def list_match_patterns(self) -> list[MatchPattern]:
        folder = self._match_patterns_dir()
        if not folder.exists():
            return []
        patterns = []
        for f in sorted(folder.glob("*.json")):
            patterns.append(MatchPattern.model_validate_json(f.read_text()))
        return patterns

    def delete_match_pattern(self, pattern_id: str) -> bool:
        path = self._match_patterns_dir() / f"{pattern_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def get_match_pattern_usage_count(self, pattern_id: str) -> int:
        """Count how many settings overrides use this pattern's match criteria."""
        pattern = self.load_match_pattern(pattern_id)
        if not pattern:
            return 0
        target_match = pattern.match
        count = 0
        for setting in self.list_settings():
            for override in (setting.overrides or []):
                override_match = override.match if hasattr(override, "match") else {}
                if override_match == target_match:
                    count += 1
        return count

    # -- Score Templates --

    def _score_templates_dir(self) -> Path:
        return self._base / "score_templates"

    def save_score_template(self, template: ScoreTemplate) -> None:
        folder = self._score_templates_dir()
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{template.template_id}.json"
        path.write_text(template.model_dump_json(indent=2))

    def load_score_template(self, template_id: str) -> ScoreTemplate | None:
        path = self._score_templates_dir() / f"{template_id}.json"
        if not path.exists():
            return None
        return ScoreTemplate.model_validate_json(path.read_text())

    def list_score_templates(self, value_category: str | None = None) -> list[ScoreTemplate]:
        folder = self._score_templates_dir()
        if not folder.exists():
            return []
        templates = []
        for f in sorted(folder.glob("*.json")):
            t = ScoreTemplate.model_validate_json(f.read_text())
            if value_category and t.value_category != value_category:
                continue
            templates.append(t)
        return templates

    def delete_score_template(self, template_id: str) -> bool:
        path = self._score_templates_dir() / f"{template_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    @staticmethod
    def _normalize_step(step) -> tuple:
        """Normalize a score step to a comparable tuple of (min_value, max_value, score)."""
        if isinstance(step, dict):
            d = step
        elif hasattr(step, "model_dump"):
            d = step.model_dump()
        else:
            d = {}
        return (d.get("min_value"), d.get("max_value"), d.get("score"))

    def _steps_match(self, setting_steps: list, template_steps: list[dict]) -> bool:
        """Check if a setting's score steps match template steps."""
        if len(setting_steps) != len(template_steps):
            return False
        template_tuples = [(t["min_value"], t["max_value"], t["score"]) for t in template_steps]
        return all(
            self._normalize_step(s) == t
            for s, t in zip(setting_steps, template_tuples)
        )

    def get_score_template_usage_count(self, template_id: str) -> int:
        """Count how many score_steps settings reference this template's steps."""
        template = self.load_score_template(template_id)
        if not template:
            return 0
        template_steps = [s.model_dump() for s in template.steps]
        return sum(
            1 for setting in self.list_settings()
            if setting.value_type == "score_steps"
            and isinstance(setting.default, list)
            and self._steps_match(setting.default, template_steps)
        )

    # -- Format Rules --

    def load_format_rules(self) -> dict:
        """Load format rules from metadata."""
        fmt_dir = self._base / "format_rules"
        if not fmt_dir.exists():
            return {"format_group_id": "default", "rules": {}, "field_mappings": {}}
        files = sorted(fmt_dir.glob("*.json"))
        if not files:
            return {"format_group_id": "default", "rules": {}, "field_mappings": {}}
        from backend.models.format_rules import FormatRulesConfig
        data = json.loads(files[0].read_text())
        config = FormatRulesConfig.model_validate(data)
        return config.model_dump()

    # -- Navigation --

    def load_navigation(self) -> dict:
        """Load navigation configuration from metadata."""
        nav_dir = self._base / "navigation"
        if not nav_dir.exists():
            return {"navigation_id": "main", "groups": []}
        files = sorted(nav_dir.glob("*.json"))
        if not files:
            return {"navigation_id": "main", "groups": []}
        data = json.loads(files[0].read_text())
        from backend.models.navigation import NavigationConfig
        config = NavigationConfig.model_validate(data)
        # Sort groups by order, items by order within each group
        result = config.model_dump()
        result["groups"].sort(key=lambda g: g["order"])
        for group in result["groups"]:
            group["items"].sort(key=lambda i: i["order"])
        return result

    # -- Query Presets --

    def _query_presets_dir(self) -> Path:
        return self._base / "query_presets"

    def list_query_presets(self) -> list[dict]:
        """Load all query preset groups from JSON, flatten and sort by order."""
        folder = self._query_presets_dir()
        if not folder.exists():
            return []
        presets = []
        for f in sorted(folder.glob("*.json")):
            group = QueryPresetGroup.model_validate_json(f.read_text())
            for p in group.presets:
                presets.append(p.model_dump())
        presets.sort(key=lambda p: p["order"])
        return presets

    # -- Widget Configurations --

    def _widgets_dir(self) -> Path:
        return self._base / "widgets"

    def load_widget_config(self, view_id: str) -> dict | None:
        """Load widget configuration for a view. Returns model_dump() or None."""
        path = self._widgets_dir() / f"{view_id}.json"
        if not path.exists():
            return None
        config = ViewWidgetConfig.model_validate_json(path.read_text())
        # Sort widgets by grid order
        config.widgets.sort(key=lambda w: w.grid.order)
        return config.model_dump()

    def save_widget_config(self, config: dict) -> None:
        """Validate and save a widget configuration."""
        validated = ViewWidgetConfig.model_validate(config)
        folder = self._widgets_dir()
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{validated.view_id}.json"
        path.write_text(validated.model_dump_json(indent=2))

    # -- Standards Registries --

    def load_iso_registry(self) -> dict:
        """Load the ISO standards registry from workspace/metadata/standards/iso_mapping.json."""
        path = self._base / "standards" / "iso_mapping.json"
        if not path.exists():
            return {"registry_id": "iso_standards", "iso_mappings": []}
        from backend.models.standards import ISORegistry
        config = ISORegistry.model_validate_json(path.read_text())
        return config.model_dump()

    def load_fix_registry(self) -> dict:
        """Load the FIX protocol registry from workspace/metadata/standards/fix_protocol.json."""
        path = self._base / "standards" / "fix_protocol.json"
        if not path.exists():
            return {"registry_id": "fix_protocol", "fix_fields": []}
        from backend.models.standards import FIXRegistry
        config = FIXRegistry.model_validate_json(path.read_text())
        return config.model_dump()

    def load_compliance_registry(self) -> dict:
        """Load the compliance requirements from workspace/metadata/standards/compliance_requirements.json."""
        path = self._base / "standards" / "compliance_requirements.json"
        if not path.exists():
            return {"registry_id": "compliance_requirements", "requirements": []}
        from backend.models.standards import ComplianceRegistry
        config = ComplianceRegistry.model_validate_json(path.read_text())
        return config.model_dump()

    # -- Grid Configurations --

    def load_grid_config(self, view_id: str) -> dict | None:
        """Load grid column config for a view."""
        path = self._base / "grids" / f"{view_id}.json"
        if not path.exists():
            return None
        from backend.models.grids import GridConfig
        config = GridConfig.model_validate_json(path.read_text())
        return config.model_dump()

    # -- View Configurations --

    def _view_config_dir(self) -> Path:
        return self._base / "view_config"

    def load_view_config(self, view_id: str) -> dict | None:
        """Load view configuration (tabs, etc.) for a view. Returns model_dump() or None."""
        folder = self._view_config_dir()
        if not folder.exists():
            return None
        for f in folder.glob("*.json"):
            data = json.loads(f.read_text())
            if data.get("view_id") == view_id:
                config = ViewConfig.model_validate(data)
                return config.model_dump()
        return None

    # -- Theme Palettes --

    def load_theme_palette(self, palette_id: str = "default") -> dict | None:
        """Load a theme palette by palette_id. Scans workspace/metadata/theme/ directory."""
        theme_dir = self._base / "theme"
        if not theme_dir.exists():
            return None
        for f in theme_dir.glob("*.json"):
            data = json.loads(f.read_text())
            if data.get("palette_id") == palette_id:
                config = ThemePalette.model_validate(data)
                return config.model_dump()
        return None

    # -- Workflow Configurations --

    def load_workflow_config(self, workflow_id: str) -> dict | None:
        """Load a workflow configuration by workflow_id. Scans workspace/metadata/workflows/ directory."""
        workflows_dir = self._base / "workflows"
        if not workflows_dir.exists():
            return None
        for f in workflows_dir.glob("*.json"):
            data = json.loads(f.read_text())
            if data.get("workflow_id") == workflow_id:
                config = WorkflowConfig.model_validate(data)
                return config.model_dump()
        return None

    # -- Demo Configurations --

    def load_demo_config(self, demo_id: str) -> dict | None:
        """Load a demo checkpoint configuration by demo_id. Scans workspace/metadata/demo/ directory."""
        demo_dir = self._base / "demo"
        if not demo_dir.exists():
            return None
        for f in demo_dir.glob("*.json"):
            data = json.loads(f.read_text())
            if data.get("demo_id") == demo_id:
                config = DemoConfig.model_validate(data)
                return config.model_dump()
        return None

    # -- Tour Registry --

    def load_tour_registry(self) -> dict | None:
        """Load the tour/scenario registry from workspace/metadata/tours/registry.json."""
        path = self._base / "tours" / "registry.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        registry = TourRegistry.model_validate(data)
        return registry.model_dump()

    # --- Medallion Architecture ---

    def load_medallion_tiers(self) -> MedallionConfig:
        from backend.models.medallion import MedallionConfig
        path = self._base / "medallion" / "tiers.json"
        if not path.exists():
            return MedallionConfig()
        return MedallionConfig.model_validate_json(path.read_text())

    def load_data_contract(self, contract_id: str) -> DataContract | None:
        from backend.models.medallion import DataContract
        path = self._base / "medallion" / "contracts" / f"{contract_id}.json"
        if not path.exists():
            return None
        return DataContract.model_validate_json(path.read_text())

    def list_data_contracts(self) -> list[DataContract]:
        from backend.models.medallion import DataContract
        folder = self._base / "medallion" / "contracts"
        items: list[DataContract] = []
        if folder.exists():
            for f in sorted(folder.glob("*.json")):
                items.append(DataContract.model_validate_json(f.read_text()))
        return items

    def load_quality_dimensions(self) -> QualityDimensionsConfig:
        from backend.models.quality import QualityDimensionsConfig
        path = self._base / "quality" / "dimensions.json"
        if not path.exists():
            return QualityDimensionsConfig()
        return QualityDimensionsConfig.model_validate_json(path.read_text())

    def load_transformation(self, transformation_id: str) -> TransformationStep | None:
        from backend.models.medallion import TransformationStep
        path = self._base / "medallion" / "transformations" / f"{transformation_id}.json"
        if not path.exists():
            return None
        return TransformationStep.model_validate_json(path.read_text())

    def list_transformations(self) -> list[TransformationStep]:
        from backend.models.medallion import TransformationStep
        folder = self._base / "medallion" / "transformations"
        items: list[TransformationStep] = []
        if folder.exists():
            for f in sorted(folder.glob("*.json")):
                items.append(TransformationStep.model_validate_json(f.read_text()))
        return items

    def load_pipeline_stages(self) -> PipelineConfig:
        from backend.models.medallion import PipelineConfig
        path = self._base / "medallion" / "pipeline_stages.json"
        if not path.exists():
            return PipelineConfig()
        return PipelineConfig.model_validate_json(path.read_text())

    # --- Connectors ---

    def list_connectors(self) -> list[ConnectorConfig]:
        from backend.models.onboarding import ConnectorConfig
        d = self._base / "connectors"
        if not d.exists():
            return []
        return [ConnectorConfig.model_validate_json(f.read_text()) for f in sorted(d.glob("*.json"))]

    def load_connector(self, connector_id: str) -> ConnectorConfig | None:
        from backend.models.onboarding import ConnectorConfig
        p = self._base / "connectors" / f"{connector_id}.json"
        if not p.exists():
            return None
        return ConnectorConfig.model_validate_json(p.read_text())

    # --- Mappings ---

    def list_mappings(self) -> list:
        from backend.models.mapping import MappingDefinition
        d = self._base / "mappings"
        if not d.exists():
            return []
        results = []
        for f in sorted(d.glob("*.json")):
            if f.name == ".gitkeep":
                continue
            results.append(MappingDefinition.model_validate_json(f.read_text()))
        return results

    def load_mapping(self, mapping_id: str):
        from backend.models.mapping import MappingDefinition
        p = self._base / "mappings" / f"{mapping_id}.json"
        if not p.exists():
            return None
        return MappingDefinition.model_validate_json(p.read_text())

    def save_mapping(self, mapping) -> None:
        d = self._base / "mappings"
        d.mkdir(parents=True, exist_ok=True)
        p = d / f"{mapping.mapping_id}.json"
        p.write_text(mapping.model_dump_json(indent=2))

    def delete_mapping(self, mapping_id: str) -> bool:
        p = self._base / "mappings" / f"{mapping_id}.json"
        if not p.exists():
            return False
        p.unlink()
        return True

    # --- Reference Data / MDM ---

    def load_reference_config(self, entity: str):
        """Load a reference config for an entity."""
        from backend.models.reference import ReferenceConfig
        p = self._base / "reference" / f"{entity}.json"
        if not p.exists():
            return None
        return ReferenceConfig.model_validate_json(p.read_text())

    def list_reference_configs(self) -> list:
        """List all reference configs."""
        from backend.models.reference import ReferenceConfig
        d = self._base / "reference"
        if not d.exists():
            return []
        results = []
        for f in sorted(d.glob("*.json")):
            if f.name == ".gitkeep":
                continue
            results.append(ReferenceConfig.model_validate_json(f.read_text()))
        return results

    def save_reference_config(self, config) -> None:
        """Save a reference config."""
        d = self._base / "reference"
        d.mkdir(parents=True, exist_ok=True)
        p = d / f"{config.entity}.json"
        p.write_text(config.model_dump_json(indent=2))

    def load_golden_records(self, entity: str):
        """Load all golden records for an entity."""
        from backend.models.reference import GoldenRecordSet
        p = self._base.parent / "reference" / f"{entity}_golden.json"
        if not p.exists():
            return None
        return GoldenRecordSet.model_validate_json(p.read_text())

    def save_golden_records(self, entity: str, record_set) -> None:
        """Save golden records for an entity."""
        d = self._base.parent / "reference"
        d.mkdir(parents=True, exist_ok=True)
        p = d / f"{entity}_golden.json"
        p.write_text(record_set.model_dump_json(indent=2))

    def load_golden_record(self, entity: str, golden_id: str):
        """Load a single golden record by ID."""
        record_set = self.load_golden_records(entity)
        if not record_set:
            return None
        for rec in record_set.records:
            if rec.golden_id == golden_id:
                return rec
        return None

    # --- Platinum KPI ---

    def load_platinum_config(self) -> PlatinumConfig | None:
        """Load all KPI definitions from workspace/metadata/medallion/platinum/*.json.

        Scans the directory, loads each JSON as a KPIDefinition, wraps in PlatinumConfig.
        """
        from backend.models.analytics_tiers import KPIDefinition, PlatinumConfig
        folder = self._base / "medallion" / "platinum"
        if not folder.exists():
            return None
        definitions: list[KPIDefinition] = []
        for f in sorted(folder.glob("*.json")):
            definitions.append(KPIDefinition.model_validate_json(f.read_text()))
        if not definitions:
            return None
        return PlatinumConfig(kpi_definitions=definitions)

    def load_kpi_dataset(self, kpi_id: str) -> KPIDataset | None:
        """Load pre-generated KPI dataset from workspace/platinum/{kpi_id}.json."""
        from backend.models.analytics_tiers import KPIDataset
        p = self._base.parent / "platinum" / f"{kpi_id}.json"
        if not p.exists():
            return None
        return KPIDataset.model_validate_json(p.read_text())

    def save_kpi_dataset(self, kpi_id: str, dataset: KPIDataset) -> None:
        """Save KPI dataset to workspace/platinum/{kpi_id}.json."""
        d = self._base.parent / "platinum"
        d.mkdir(parents=True, exist_ok=True)
        p = d / f"{kpi_id}.json"
        p.write_text(dataset.model_dump_json(indent=2))

    def list_kpi_datasets(self) -> list[KPIDataset]:
        """List all KPI datasets from workspace/platinum/*.json."""
        from backend.models.analytics_tiers import KPIDataset
        folder = self._base.parent / "platinum"
        if not folder.exists():
            return []
        items: list[KPIDataset] = []
        for f in sorted(folder.glob("*.json")):
            items.append(KPIDataset.model_validate_json(f.read_text()))
        return items

    # --- Sandbox ---

    def load_sandbox_registry(self) -> SandboxRegistry:
        """Load from workspace/sandbox/registry.json. Return empty registry if missing."""
        from backend.models.analytics_tiers import SandboxRegistry
        p = self._base.parent / "sandbox" / "registry.json"
        if not p.exists():
            return SandboxRegistry()
        return SandboxRegistry.model_validate_json(p.read_text())

    def save_sandbox_registry(self, registry: SandboxRegistry) -> None:
        """Save to workspace/sandbox/registry.json."""
        d = self._base.parent / "sandbox"
        d.mkdir(parents=True, exist_ok=True)
        p = d / "registry.json"
        p.write_text(registry.model_dump_json(indent=2))

    def load_sandbox_template(self) -> dict | None:
        """Load from workspace/metadata/medallion/sandbox/template.json."""
        p = self._base / "medallion" / "sandbox" / "template.json"
        if not p.exists():
            return None
        return json.loads(p.read_text())

    # --- Archive ---

    def load_archive_config(self) -> ArchiveConfig | None:
        """Load from workspace/metadata/medallion/archive/policies.json."""
        from backend.models.analytics_tiers import ArchiveConfig
        p = self._base / "medallion" / "archive" / "policies.json"
        if not p.exists():
            return None
        return ArchiveConfig.model_validate_json(p.read_text())

    def load_archive_manifest(self) -> ArchiveManifest:
        """Load from workspace/archive/manifest.json. Return empty manifest if missing."""
        from backend.models.analytics_tiers import ArchiveManifest
        p = self._base.parent / "archive" / "manifest.json"
        if not p.exists():
            return ArchiveManifest()
        return ArchiveManifest.model_validate_json(p.read_text())

    def save_archive_manifest(self, manifest: ArchiveManifest) -> None:
        """Save to workspace/archive/manifest.json."""
        d = self._base.parent / "archive"
        d.mkdir(parents=True, exist_ok=True)
        p = d / "manifest.json"
        p.write_text(manifest.model_dump_json(indent=2))
