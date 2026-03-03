"""Tests for cross-view masking wrapper — GDPR Art. 25 compliant."""
from pathlib import Path

from backend.services.masking_service import MaskingService


def test_infer_entity_trader():
    from backend.services.masking_wrapper import infer_entity_from_columns

    assert infer_entity_from_columns(["trader_id", "trader_name", "desk"]) == "trader"


def test_infer_entity_account():
    from backend.services.masking_wrapper import infer_entity_from_columns

    assert infer_entity_from_columns(["account_id", "account_name", "type"]) == "account"


def test_infer_entity_execution():
    from backend.services.masking_wrapper import infer_entity_from_columns

    assert infer_entity_from_columns(["execution_id", "order_id", "trader_id", "exec_type"]) == "execution"


def test_infer_entity_order():
    from backend.services.masking_wrapper import infer_entity_from_columns

    assert infer_entity_from_columns(["order_id", "trader_id", "order_type", "limit_price"]) == "order"


def test_infer_entity_unknown():
    from backend.services.masking_wrapper import infer_entity_from_columns

    assert infer_entity_from_columns(["product_id", "isin"]) is None


def test_has_pii_fields_true():
    from backend.services.masking_wrapper import has_pii_fields

    assert has_pii_fields(["trader_name", "desk"]) is True


def test_has_pii_fields_false():
    from backend.services.masking_wrapper import has_pii_fields

    assert has_pii_fields(["product_id", "isin"]) is False


def test_has_pii_fields_execution():
    from backend.services.masking_wrapper import has_pii_fields

    assert has_pii_fields(["execution_id", "trader_id", "venue_mic"]) is True


def test_masking_applies_for_analyst():
    svc = MaskingService(Path("workspace"))
    rows = [{"trader_name": "John Smith", "trader_id": "TRD-001", "desk": "Equities"}]
    masked = svc.mask_records("trader", rows, "analyst")
    assert masked[0]["trader_name"] != "John Smith"
    assert masked[0]["trader_id"] != "TRD-001"
    assert masked[0]["desk"] == "Equities"


def test_masking_unmasked_for_compliance():
    svc = MaskingService(Path("workspace"))
    rows = [{"trader_name": "John Smith", "trader_id": "TRD-001"}]
    masked = svc.mask_records("trader", rows, "compliance_officer")
    assert masked[0]["trader_name"] == "John Smith"


def test_get_pii_columns_trader():
    from backend.services.masking_wrapper import get_pii_columns

    cols = get_pii_columns(["trader_name", "trader_id", "desk"])
    assert "trader_name" in cols
    assert cols["trader_name"]["classification"] == "HIGH"
    assert "desk" not in cols


def test_get_pii_columns_empty_for_product():
    from backend.services.masking_wrapper import get_pii_columns

    cols = get_pii_columns(["product_id", "isin", "asset_class"])
    assert cols == {}


def test_mask_entity_rows():
    from backend.services.masking_wrapper import mask_entity_rows

    rows = [{"trader_name": "Jane Doe", "trader_id": "TRD-002"}]
    masked = mask_entity_rows("trader", rows, role_id="analyst")
    assert masked[0]["trader_name"] != "Jane Doe"


def test_mask_entity_rows_compliance():
    from backend.services.masking_wrapper import mask_entity_rows

    rows = [{"trader_name": "Jane Doe", "trader_id": "TRD-002"}]
    masked = mask_entity_rows("trader", rows, role_id="compliance_officer")
    assert masked[0]["trader_name"] == "Jane Doe"


def test_mask_query_rows_auto_detect():
    from backend.services.masking_wrapper import mask_query_rows

    rows = [{"trader_name": "Alice", "trader_id": "TRD-003", "desk": "FX"}]
    masked = mask_query_rows(rows, role_id="analyst")
    assert masked[0]["trader_name"] != "Alice"
    assert masked[0]["desk"] == "FX"


def test_mask_query_rows_no_pii():
    from backend.services.masking_wrapper import mask_query_rows

    rows = [{"product_id": "P-001", "isin": "US1234567890"}]
    masked = mask_query_rows(rows, role_id="analyst")
    assert masked[0]["product_id"] == "P-001"
