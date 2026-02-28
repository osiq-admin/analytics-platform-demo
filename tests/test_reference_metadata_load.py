"""Tests for reference metadata file loading and validation."""
import json
from pathlib import Path
import pytest

WORKSPACE = Path(__file__).parent.parent / "workspace"
REF_DIR = WORKSPACE / "metadata" / "reference"

ENTITIES = ["product", "venue", "account", "trader"]


class TestReferenceMetadataLoading:
    """Test that reference metadata JSON files load and validate correctly."""

    @pytest.mark.parametrize("entity", ENTITIES)
    def test_reference_config_loads(self, entity: str):
        """Each entity config file exists and is valid JSON."""
        path = REF_DIR / f"{entity}.json"
        assert path.exists(), f"Missing reference config: {path}"
        data = json.loads(path.read_text())
        assert data["entity"] == entity
        assert "golden_key" in data
        assert "match_rules" in data
        assert "merge_rules" in data

    def test_all_reference_configs_have_match_rules(self):
        """Every reference config has at least one match rule."""
        for entity in ENTITIES:
            data = json.loads((REF_DIR / f"{entity}.json").read_text())
            assert len(data["match_rules"]) > 0, f"{entity} has no match rules"

    def test_product_has_fuzzy_match_rule(self):
        """Product config includes fuzzy matching on name."""
        data = json.loads((REF_DIR / "product.json").read_text())
        strategies = [r["strategy"] for r in data["match_rules"]]
        assert "fuzzy" in strategies

    def test_venue_golden_key_is_mic(self):
        """Venue golden key is MIC code."""
        data = json.loads((REF_DIR / "venue.json").read_text())
        assert data["golden_key"] == "mic"

    def test_all_configs_have_display_name(self):
        """Every config has a non-empty display_name."""
        for entity in ENTITIES:
            data = json.loads((REF_DIR / f"{entity}.json").read_text())
            assert data.get("display_name"), f"{entity} missing display_name"
