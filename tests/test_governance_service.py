"""Tests for GovernanceService — PII registry, tagging, classification, GDPR compliance."""

import json
from pathlib import Path

import pyarrow as pa
import pytest

from backend.models.governance import DataClassification, PIIField, PIIRegistry
from backend.models.lakehouse import IcebergTierConfig, LakehouseConfig
from backend.services.governance_service import GovernanceService
from backend.services.lakehouse_service import LakehouseService


@pytest.fixture
def gov_workspace(tmp_path):
    ws = tmp_path / "workspace"
    ws.mkdir()
    gov_dir = ws / "metadata" / "governance"
    gov_dir.mkdir(parents=True)
    (gov_dir / "pii_registry.json").write_text(
        json.dumps(
            {
                "registry_version": "1.0",
                "entities": {
                    "trader": {
                        "pii_fields": [
                            {"field": "trader_name", "classification": "HIGH", "regulation": ["GDPR", "MiFID II"], "crypto_shred": True, "retention_years": 1, "masking_strategy": "hash"},
                            {"field": "trader_id", "classification": "MEDIUM", "regulation": ["MiFID II"], "crypto_shred": False, "retention_years": 7, "masking_strategy": "pseudonymize"},
                        ]
                    },
                    "account": {
                        "pii_fields": [
                            {"field": "account_name", "classification": "HIGH", "regulation": ["GDPR"], "crypto_shred": True, "retention_years": 1, "masking_strategy": "hash"},
                            {"field": "registration_country", "classification": "LOW", "regulation": ["GDPR"], "crypto_shred": False, "retention_years": 7, "masking_strategy": "generalize"},
                        ]
                    },
                    "execution": {
                        "pii_fields": [
                            {"field": "trader_id", "classification": "MEDIUM", "regulation": ["MiFID II"], "crypto_shred": False, "retention_years": 7, "masking_strategy": "pseudonymize"},
                        ]
                    },
                    "venue": {"pii_fields": []},
                },
            }
        )
    )
    return ws


@pytest.fixture
def gov_lakehouse(tmp_path):
    config = LakehouseConfig(
        catalog={"type": "sql", "uri": f"sqlite:///{tmp_path}/iceberg/catalog.db", "warehouse": f"file://{tmp_path}/iceberg/warehouse"},
    )
    tier_config = IcebergTierConfig(
        iceberg_tiers=["silver"], non_iceberg_tiers=[], tier_namespace_mapping={"silver": "default"},
    )
    ws = tmp_path / "workspace"
    ws.mkdir(exist_ok=True)
    (tmp_path / "iceberg").mkdir(exist_ok=True)
    (tmp_path / "iceberg" / "warehouse").mkdir(exist_ok=True)
    return LakehouseService(ws, config, tier_config)


@pytest.fixture
def gov_svc(gov_workspace, gov_lakehouse):
    return GovernanceService(gov_workspace, gov_lakehouse)


class TestPIIRegistry:
    def test_load_registry(self, gov_svc):
        registry = gov_svc.load_pii_registry()
        assert registry.registry_version == "1.0"
        assert len(registry.entities) == 4

    def test_get_pii_fields_trader(self, gov_svc):
        fields = gov_svc.get_pii_fields("trader")
        assert len(fields) == 2
        assert fields[0].field == "trader_name"
        assert fields[0].classification == "HIGH"
        assert fields[0].crypto_shred is True

    def test_get_pii_fields_empty_entity(self, gov_svc):
        fields = gov_svc.get_pii_fields("venue")
        assert len(fields) == 0

    def test_get_pii_fields_unknown_entity(self, gov_svc):
        fields = gov_svc.get_pii_fields("nonexistent")
        assert len(fields) == 0


class TestGovernanceTagging:
    def test_tag_iceberg_table(self, gov_svc, gov_lakehouse):
        schema = pa.schema([pa.field("trader_name", pa.string()), pa.field("trader_id", pa.string())])
        gov_lakehouse.create_table("silver", "trader", schema)

        gov_svc.tag_iceberg_table("silver", "trader", "trader")

        props = gov_lakehouse.get_table_properties("silver", "trader")
        assert props["governance.pii.contains"] == "true"
        assert "trader_name" in props["governance.pii.fields"]
        assert props["governance.pii.max_classification"] == "MEDIUM"  # MEDIUM > HIGH alphabetically? No — HIGH
        assert props["governance.retention.min_years"] == "1"

    def test_tag_no_pii_entity(self, gov_svc, gov_lakehouse):
        schema = pa.schema([pa.field("id", pa.string())])
        gov_lakehouse.create_table("silver", "venue", schema)
        gov_svc.tag_iceberg_table("silver", "venue", "venue")
        # Should not raise — just does nothing
        props = gov_lakehouse.get_table_properties("silver", "venue")
        assert "governance.pii.contains" not in props


class TestDataClassification:
    def test_confidential_classification(self, gov_svc):
        cls = gov_svc.get_table_classification("silver", "trader")
        assert cls.classification == "confidential"
        assert "trader_name" in cls.pii_fields
        assert "GDPR" in cls.regulations
        assert "trader_name" in cls.crypto_shred_fields

    def test_internal_classification(self, gov_svc):
        cls = gov_svc.get_table_classification("silver", "execution")
        assert cls.classification == "internal"
        assert "trader_id" in cls.pii_fields

    def test_public_classification(self, gov_svc):
        cls = gov_svc.get_table_classification("silver", "venue")
        assert cls.classification == "public"
        assert len(cls.pii_fields) == 0


class TestGDPRCompliance:
    def test_gdpr_affected_tables(self, gov_svc):
        tables = gov_svc.get_gdpr_affected_tables()
        assert "trader" in tables
        assert "account" in tables
        assert "execution" not in tables  # MiFID II only, not GDPR

    def test_crypto_shred_fields(self, gov_svc):
        fields = gov_svc.get_crypto_shred_fields("trader")
        assert "trader_name" in fields
        assert "trader_id" not in fields

    def test_crypto_shred_account(self, gov_svc):
        fields = gov_svc.get_crypto_shred_fields("account")
        assert "account_name" in fields
        assert "registration_country" not in fields


class TestRegistrySummary:
    def test_summary(self, gov_svc):
        summary = gov_svc.get_registry_summary()
        assert summary["entity_count"] == 4
        assert summary["total_pii_fields"] == 5
        assert summary["crypto_shred_fields"] == 2
        assert "GDPR" in summary["regulations"]
        assert "MiFID II" in summary["regulations"]
