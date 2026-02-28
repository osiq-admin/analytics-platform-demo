"""Tests for field mapping models and API."""
import pytest
from backend.models.mapping import FieldMapping, MappingDefinition, MappingValidationResult


class TestMappingModels:
    def test_field_mapping_defaults(self):
        fm = FieldMapping(source_field="src", target_field="tgt")
        assert fm.transform == "direct"
        assert fm.expression == ""
        assert fm.default_value == ""

    def test_mapping_definition_defaults(self):
        md = MappingDefinition(mapping_id="m1", source_entity="execution", target_entity="execution")
        assert md.source_tier == "bronze"
        assert md.target_tier == "silver"
        assert md.status == "draft"
        assert len(md.field_mappings) == 0
        assert md.created_by == "system"

    def test_mapping_with_fields(self):
        md = MappingDefinition(
            mapping_id="m1",
            source_entity="execution",
            target_entity="execution",
            field_mappings=[
                FieldMapping(source_field="exec_id", target_field="execution_id", transform="rename"),
                FieldMapping(source_field="price", target_field="price", transform="direct"),
            ],
        )
        assert len(md.field_mappings) == 2
        assert md.field_mappings[0].transform == "rename"

    def test_validation_result_defaults(self):
        vr = MappingValidationResult()
        assert vr.valid is True
        assert vr.errors == []

    def test_validation_result_with_errors(self):
        vr = MappingValidationResult(valid=False, errors=["Missing required field"], warnings=["Type mismatch"])
        assert not vr.valid
        assert len(vr.errors) == 1
        assert len(vr.warnings) == 1
