"""Tests for dashboard widget configuration metadata."""
import json
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def widget_workspace(tmp_path):
    """Create a workspace with widgets metadata and minimal dirs for app boot."""
    ws = tmp_path / "workspace"
    ws.mkdir()

    real_ws = Path("workspace")

    # Copy metadata subdirectories needed for lifespan boot
    for subdir in [
        "entities",
        "calculations",
        "settings",
        "detection_models",
    ]:
        src = real_ws / "metadata" / subdir
        if src.exists():
            shutil.copytree(src, ws / "metadata" / subdir)

    # Copy widgets metadata
    src = real_ws / "metadata" / "widgets"
    if src.exists():
        shutil.copytree(src, ws / "metadata" / "widgets")

    # Create data/csv directory (needed by data loader)
    (ws / "data" / "csv").mkdir(parents=True)

    return ws


@pytest.fixture
def client(widget_workspace, monkeypatch):
    """Test client with lifespan-managed app state."""
    from backend import config

    monkeypatch.setattr(config.settings, "workspace_dir", widget_workspace)

    with TestClient(app, raise_server_exceptions=False) as tc:
        yield tc


def test_widgets_endpoint_returns_config(client):
    """GET /api/metadata/widgets/dashboard returns config with view_id and widgets."""
    resp = client.get("/api/metadata/widgets/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["view_id"] == "dashboard"
    assert isinstance(data["widgets"], list)
    assert len(data["widgets"]) == 8


def test_widget_has_required_fields(client):
    """Each widget has widget_id, widget_type, title."""
    resp = client.get("/api/metadata/widgets/dashboard")
    data = resp.json()
    for widget in data["widgets"]:
        assert "widget_id" in widget
        assert "widget_type" in widget
        assert "title" in widget


def test_chart_widget_has_chart_config(client):
    """Chart-type widgets have chart_config with default_chart_type."""
    resp = client.get("/api/metadata/widgets/dashboard")
    data = resp.json()
    chart_widgets = [w for w in data["widgets"] if w["widget_type"] == "chart"]
    assert len(chart_widgets) > 0
    for widget in chart_widgets:
        assert widget["chart_config"] is not None
        assert "default_chart_type" in widget["chart_config"]


def test_widgets_ordered_by_grid_order(client):
    """Widgets returned sorted by grid.order."""
    resp = client.get("/api/metadata/widgets/dashboard")
    data = resp.json()
    orders = [w["grid"]["order"] for w in data["widgets"]]
    assert orders == sorted(orders)
    assert orders == [1, 2, 3, 4, 5, 6, 7, 8]


def test_nonexistent_view_returns_404(client):
    """GET /api/metadata/widgets/nonexistent returns 404."""
    resp = client.get("/api/metadata/widgets/nonexistent")
    assert resp.status_code == 404


def test_widget_update_persists(client):
    """PUT updates a widget title, GET confirms it persisted."""
    # Get current config
    resp = client.get("/api/metadata/widgets/dashboard")
    assert resp.status_code == 200
    config = resp.json()

    # Change the title of the first widget
    config["widgets"][0]["title"] = "Updated Total Alerts"

    # Save via PUT
    resp = client.put("/api/metadata/widgets/dashboard", json=config)
    assert resp.status_code == 200
    assert resp.json()["saved"] is True

    # Verify it persisted
    resp = client.get("/api/metadata/widgets/dashboard")
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["widgets"][0]["title"] == "Updated Total Alerts"
