import json
import pytest
from pathlib import Path
from backend.services.metadata_service import MetadataService
from backend.models.entities import EntityDefinition
from backend.models.calculations import CalculationDefinition, CalculationLayer
from backend.models.settings import SettingDefinition


@pytest.fixture
def tmp_workspace(tmp_path):
    """Create a temporary workspace with metadata directories."""
    for d in ["entities", "calculations/transaction", "settings/thresholds"]:
        (tmp_path / "metadata" / d).mkdir(parents=True)
    return tmp_path


@pytest.fixture
def service(tmp_workspace):
    return MetadataService(tmp_workspace)


def test_save_and_load_entity(service, tmp_workspace):
    entity = EntityDefinition(
        entity_id="execution",
        name="Execution",
        description="Trade execution",
        fields=[],
    )
    service.save_entity(entity)

    path = tmp_workspace / "metadata" / "entities" / "execution.json"
    assert path.exists()

    loaded = service.load_entity("execution")
    assert loaded.entity_id == "execution"
    assert loaded.name == "Execution"


def test_list_entities(service):
    for eid in ["execution", "order", "product"]:
        service.save_entity(EntityDefinition(entity_id=eid, name=eid.title()))

    result = service.list_entities()
    assert len(result) == 3
    ids = {e.entity_id for e in result}
    assert ids == {"execution", "order", "product"}


def test_delete_entity(service):
    service.save_entity(EntityDefinition(entity_id="to_delete", name="Delete Me"))
    assert service.load_entity("to_delete") is not None

    service.delete_entity("to_delete")
    assert service.load_entity("to_delete") is None


def test_save_and_load_calculation(service):
    calc = CalculationDefinition(
        calc_id="value_calc",
        name="Value Calculation",
        layer=CalculationLayer.TRANSACTION,
        description="Test",
        inputs=[],
        output={"table_name": "t", "fields": []},
    )
    service.save_calculation(calc)

    loaded = service.load_calculation("value_calc")
    assert loaded.calc_id == "value_calc"
    assert loaded.layer == CalculationLayer.TRANSACTION


def test_save_and_load_setting(service):
    setting = SettingDefinition(
        setting_id="threshold_1",
        name="Threshold",
        description="Test",
        value_type="decimal",
        default=0.5,
        match_type="hierarchy",
    )
    service.save_setting(setting)

    loaded = service.load_setting("threshold_1")
    assert loaded.setting_id == "threshold_1"
    assert loaded.default == 0.5


def test_load_nonexistent_returns_none(service):
    assert service.load_entity("nope") is None
    assert service.load_calculation("nope") is None
    assert service.load_setting("nope") is None
