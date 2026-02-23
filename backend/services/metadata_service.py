"""JSON metadata CRUD service for all metadata types."""
from pathlib import Path

from backend.models.calculations import CalculationDefinition
from backend.models.detection import DetectionModelDefinition
from backend.models.entities import EntityDefinition
from backend.models.settings import SettingDefinition


class MetadataService:
    def __init__(self, workspace_dir: Path):
        self._base = workspace_dir / "metadata"

    # -- Entities --

    def _entity_path(self, entity_id: str) -> Path:
        return self._base / "entities" / f"{entity_id}.json"

    def save_entity(self, entity: EntityDefinition) -> None:
        path = self._entity_path(entity.entity_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(entity.model_dump_json(indent=2))

    def load_entity(self, entity_id: str) -> EntityDefinition | None:
        path = self._entity_path(entity_id)
        if not path.exists():
            return None
        return EntityDefinition.model_validate_json(path.read_text())

    def list_entities(self) -> list[EntityDefinition]:
        folder = self._base / "entities"
        if not folder.exists():
            return []
        return [
            EntityDefinition.model_validate_json(f.read_text())
            for f in sorted(folder.glob("*.json"))
        ]

    def delete_entity(self, entity_id: str) -> bool:
        path = self._entity_path(entity_id)
        if path.exists():
            path.unlink()
            return True
        return False

    # -- Calculations --

    def _calc_dir(self) -> Path:
        return self._base / "calculations"

    def _calc_path(self, calc_id: str) -> Path | None:
        """Find a calculation file by calc_id across all layer subdirectories."""
        for f in self._calc_dir().rglob(f"{calc_id}.json"):
            return f
        return None

    def save_calculation(self, calc: CalculationDefinition) -> None:
        folder = self._calc_dir() / calc.layer.value
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{calc.calc_id}.json"
        path.write_text(calc.model_dump_json(indent=2))

    def load_calculation(self, calc_id: str) -> CalculationDefinition | None:
        path = self._calc_path(calc_id)
        if path is None:
            return None
        return CalculationDefinition.model_validate_json(path.read_text())

    def list_calculations(self, layer: str | None = None) -> list[CalculationDefinition]:
        base = self._calc_dir()
        if not base.exists():
            return []
        if layer:
            pattern_dir = base / layer
            files = sorted(pattern_dir.glob("*.json")) if pattern_dir.exists() else []
        else:
            files = sorted(base.rglob("*.json"))
        return [CalculationDefinition.model_validate_json(f.read_text()) for f in files]

    def delete_calculation(self, calc_id: str) -> bool:
        path = self._calc_path(calc_id)
        if path:
            path.unlink()
            return True
        return False

    # -- Settings --

    def _settings_dir(self) -> Path:
        return self._base / "settings"

    def _setting_path(self, setting_id: str) -> Path | None:
        for f in self._settings_dir().rglob(f"{setting_id}.json"):
            return f
        return None

    def save_setting(self, setting: SettingDefinition) -> None:
        if setting.value_type == "score_steps":
            folder = self._settings_dir() / "score_steps"
        else:
            folder = self._settings_dir() / "thresholds"
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{setting.setting_id}.json"
        path.write_text(setting.model_dump_json(indent=2))

    def load_setting(self, setting_id: str) -> SettingDefinition | None:
        path = self._setting_path(setting_id)
        if path is None:
            return None
        return SettingDefinition.model_validate_json(path.read_text())

    def list_settings(self, category: str | None = None) -> list[SettingDefinition]:
        base = self._settings_dir()
        if not base.exists():
            return []
        if category:
            cat_dir = base / category
            files = sorted(cat_dir.glob("*.json")) if cat_dir.exists() else []
        else:
            files = sorted(base.rglob("*.json"))
        return [SettingDefinition.model_validate_json(f.read_text()) for f in files]

    def delete_setting(self, setting_id: str) -> bool:
        path = self._setting_path(setting_id)
        if path:
            path.unlink()
            return True
        return False

    # -- Detection Models --

    def _detection_dir(self) -> Path:
        return self._base / "detection_models"

    def save_detection_model(self, model: DetectionModelDefinition) -> None:
        folder = self._detection_dir()
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{model.model_id}.json"
        path.write_text(model.model_dump_json(indent=2))

    def load_detection_model(self, model_id: str) -> DetectionModelDefinition | None:
        path = self._detection_dir() / f"{model_id}.json"
        if not path.exists():
            return None
        return DetectionModelDefinition.model_validate_json(path.read_text())

    def list_detection_models(self) -> list[DetectionModelDefinition]:
        folder = self._detection_dir()
        if not folder.exists():
            return []
        return [
            DetectionModelDefinition.model_validate_json(f.read_text())
            for f in sorted(folder.glob("*.json"))
        ]

    def delete_detection_model(self, model_id: str) -> bool:
        path = self._detection_dir() / f"{model_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False
