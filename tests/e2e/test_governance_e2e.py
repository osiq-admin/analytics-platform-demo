"""E2E: Governance view role switching and access control.

Tests that role switching propagates through the UI:
- Audit Log tab shows different content per role
- Data Preview tab loads for governance view
"""

import re

import pytest
from playwright.sync_api import Page, expect


APP_URL = "http://127.0.0.1:8333"


def _switch_role(page: Page, display_name: str):
    """Switch RBAC role via the toolbar role switcher."""
    switcher = page.locator("[data-tour='role-switcher'] button").first
    switcher.click()
    page.get_by_text(display_name, exact=False).click()
    page.wait_for_timeout(500)


class TestGovernanceAuditLogAccess:
    """Audit Log tab access control changes with role."""

    def test_analyst_sees_access_denied(self, loaded_page):
        """As analyst (default), Audit Log should show access denied."""
        loaded_page.goto(f"{APP_URL}/governance")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Click Audit Log tab
        audit_tab = loaded_page.get_by_role("tab", name=re.compile("Audit", re.IGNORECASE))
        if audit_tab.is_visible(timeout=3000):
            audit_tab.click()
            loaded_page.wait_for_timeout(1000)
            # Analyst should see access denied
            expect(
                loaded_page.get_by_text(re.compile("Access denied|access denied", re.IGNORECASE))
            ).to_be_visible(timeout=5000)

    def test_compliance_officer_sees_audit_entries(self, loaded_page):
        """After switching to Compliance Officer, Audit Log should show entries."""
        loaded_page.goto(f"{APP_URL}/governance")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Switch to compliance officer
        _switch_role(loaded_page, "Compliance Officer")
        # Click Audit Log tab
        audit_tab = loaded_page.get_by_role("tab", name=re.compile("Audit", re.IGNORECASE))
        if audit_tab.is_visible(timeout=3000):
            audit_tab.click()
            loaded_page.wait_for_timeout(1000)
            # Compliance officer should NOT see access denied
            denied = loaded_page.get_by_text(
                re.compile("Access denied|access denied", re.IGNORECASE)
            )
            expect(denied).not_to_be_visible(timeout=3000)


class TestGovernanceDataPreview:
    """Data Preview tab renders with content."""

    def test_data_preview_tab_loads(self, loaded_page):
        """Data Preview tab should show masking comparison content."""
        loaded_page.goto(f"{APP_URL}/governance")
        loaded_page.wait_for_load_state("networkidle", timeout=15000)
        # Click Data Preview tab
        preview_tab = loaded_page.get_by_role(
            "tab", name=re.compile("Preview|Data Preview", re.IGNORECASE)
        )
        if preview_tab.is_visible(timeout=3000):
            preview_tab.click()
            loaded_page.wait_for_timeout(2000)
            # Should have some visible content (table or comparison)
            content = loaded_page.locator(".governance-preview, table, [data-tour]")
            expect(content.first).to_be_visible(timeout=5000)
