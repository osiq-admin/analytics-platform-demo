"""Tests for OobVersionService — version tracking and upgrade simulation."""

import json
from pathlib import Path

import pytest

from backend.services.oob_version_service import OobVersionService, UpgradeReport


@pytest.fixture()
def version_workspace(tmp_path: Path) -> Path:
    meta = tmp_path / "metadata"
    meta.mkdir()

    # Create OOB manifest
    manifest = {
        "oob_version": "1.0.0",
        "description": "Test OOB manifest",
        "items": {
            "entities": {
                "product": {"checksum": "aaa111", "version": "1.0.0", "path": "entities/product.json"},
                "order": {"checksum": "bbb222", "version": "1.0.0", "path": "entities/order.json"},
            },
            "calculations": {
                "wash_detection": {"checksum": "ccc333", "version": "1.0.0", "path": "calculations/derived/wash_detection.json"},
            },
            "settings": {
                "threshold_a": {"checksum": "ddd444", "version": "1.0.0", "path": "settings/thresholds/threshold_a.json"},
            },
            "detection_models": {},
        },
    }
    (meta / "oob_manifest.json").write_text(json.dumps(manifest, indent=2))

    # Create user_overrides directory
    overrides = meta / "user_overrides"
    overrides.mkdir()
    (overrides / "entities").mkdir()
    (overrides / "calculations" / "derived").mkdir(parents=True)
    (overrides / "settings" / "thresholds").mkdir(parents=True)

    return meta


def test_get_version(version_workspace: Path) -> None:
    svc = OobVersionService(version_workspace)
    assert svc.get_version() == "1.0.0"


def test_get_summary(version_workspace: Path) -> None:
    svc = OobVersionService(version_workspace)
    summary = svc.get_summary()
    assert summary["oob_version"] == "1.0.0"
    assert summary["oob_item_count"] == 4  # 2 entities + 1 calc + 1 setting
    assert summary["user_override_count"] == 0


def test_compare_no_changes(version_workspace: Path) -> None:
    svc = OobVersionService(version_workspace)
    current = json.loads((version_workspace / "oob_manifest.json").read_text())
    same = json.loads(json.dumps(current))
    same["oob_version"] = "1.0.1"
    report = svc.compare_manifests(current, same)
    assert report.from_version == "1.0.0"
    assert report.to_version == "1.0.1"
    assert len(report.added) == 0
    assert len(report.removed) == 0
    assert len(report.modified) == 0
    assert len(report.conflicts) == 0


def test_compare_added_items(version_workspace: Path) -> None:
    svc = OobVersionService(version_workspace)
    current = json.loads((version_workspace / "oob_manifest.json").read_text())
    new = json.loads(json.dumps(current))
    new["oob_version"] = "1.1.0"
    new["items"]["entities"]["venue"] = {"checksum": "new111", "version": "1.1.0", "path": "entities/venue.json"}
    report = svc.compare_manifests(current, new)
    assert len(report.added) == 1
    assert report.added[0]["id"] == "venue"


def test_compare_removed_items(version_workspace: Path) -> None:
    svc = OobVersionService(version_workspace)
    current = json.loads((version_workspace / "oob_manifest.json").read_text())
    new = json.loads(json.dumps(current))
    new["oob_version"] = "1.1.0"
    del new["items"]["settings"]["threshold_a"]
    report = svc.compare_manifests(current, new)
    assert len(report.removed) == 1
    assert report.removed[0]["id"] == "threshold_a"


def test_compare_modified_items(version_workspace: Path) -> None:
    svc = OobVersionService(version_workspace)
    current = json.loads((version_workspace / "oob_manifest.json").read_text())
    new = json.loads(json.dumps(current))
    new["oob_version"] = "1.1.0"
    new["items"]["entities"]["product"]["checksum"] = "zzz999"
    new["items"]["entities"]["product"]["version"] = "1.1.0"
    report = svc.compare_manifests(current, new)
    assert len(report.modified) == 1
    assert report.modified[0]["id"] == "product"
    assert report.modified[0]["new_version"] == "1.1.0"


def test_compare_conflicts(version_workspace: Path) -> None:
    svc = OobVersionService(version_workspace)
    # Create a user override for product
    override = version_workspace / "user_overrides" / "entities" / "product.json"
    override.write_text('{"entity_id": "product", "name": "Modified Product"}')

    current = json.loads((version_workspace / "oob_manifest.json").read_text())
    new = json.loads(json.dumps(current))
    new["oob_version"] = "1.1.0"
    new["items"]["entities"]["product"]["checksum"] = "zzz999"
    report = svc.compare_manifests(current, new)
    # product has user override + OOB changed => conflict
    assert len(report.conflicts) == 1
    assert report.conflicts[0]["id"] == "product"
    assert len(report.modified) == 0


def test_simulate_upgrade(version_workspace: Path) -> None:
    svc = OobVersionService(version_workspace)
    new_manifest = {
        "oob_version": "2.0.0",
        "items": {
            "entities": {
                "product": {"checksum": "aaa111", "version": "1.0.0"},
                "order": {"checksum": "changed", "version": "2.0.0"},
                "account": {"checksum": "new111", "version": "2.0.0"},
            },
            "calculations": {},
            "settings": {
                "threshold_a": {"checksum": "ddd444", "version": "1.0.0"},
            },
            "detection_models": {},
        },
    }
    report = svc.simulate_upgrade(new_manifest)
    assert isinstance(report, UpgradeReport)
    assert report.from_version == "1.0.0"
    assert report.to_version == "2.0.0"
    assert len(report.added) == 1  # account
    assert len(report.removed) == 1  # wash_detection
    assert len(report.modified) == 1  # order (checksum changed)
