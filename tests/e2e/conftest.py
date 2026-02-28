"""Playwright E2E test configuration and fixtures."""
import subprocess
import time
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright, Page


APP_PORT = 8333
APP_URL = f"http://127.0.0.1:{APP_PORT}"

# Project root: two levels up from tests/e2e/
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.fixture(scope="session")
def app_server():
    """Start the FastAPI server for E2E tests."""
    # Kill any existing process on the port
    subprocess.run(f"lsof -ti:{APP_PORT} | xargs kill 2>/dev/null", shell=True, capture_output=True)
    time.sleep(0.5)

    import sys
    python = sys.executable
    proc = subprocess.Popen(
        [python, "-m", "uvicorn", "backend.main:app", "--port", str(APP_PORT), "--host", "127.0.0.1"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=str(PROJECT_ROOT),
    )
    # Wait for server to be ready
    import urllib.request
    for _ in range(40):
        try:
            urllib.request.urlopen(f"{APP_URL}/api/health", timeout=1)
            break
        except Exception:
            time.sleep(0.5)
    else:
        stderr = proc.stderr.read().decode() if proc.stderr else ""
        proc.kill()
        raise RuntimeError(f"Server failed to start. stderr: {stderr[:500]}")

    yield proc

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture(scope="session")
def browser_instance():
    """Create a shared browser instance for the test session."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()


@pytest.fixture
def page(app_server, browser_instance) -> Page:
    """Create a fresh page for each test."""
    context = browser_instance.new_context(viewport={"width": 1280, "height": 900})
    pg = context.new_page()
    pg.set_default_timeout(15000)
    pg.set_default_navigation_timeout(30000)
    yield pg
    pg.close()
    context.close()


@pytest.fixture
def loaded_page(page) -> Page:
    """Navigate to app and dismiss onboarding, then load full demo data."""
    page.goto(APP_URL, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=15000)

    # Dismiss onboarding modal if present
    skip_btn = page.locator("text=Skip")
    try:
        if skip_btn.is_visible(timeout=3000):
            skip_btn.click()
            page.wait_for_timeout(500)
    except Exception:
        pass  # No onboarding modal — that's fine

    # Load full demo data
    end_btn = page.locator("button:has-text('End')")
    try:
        if end_btn.is_visible(timeout=3000):
            end_btn.click()
            page.wait_for_timeout(2000)
    except Exception:
        pass  # Already loaded or no tour active

    return page
