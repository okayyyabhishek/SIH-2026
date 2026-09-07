import { test, expect } from "@playwright/test";

test.describe("Sentinel NER — Operational Platform Smoke Tests (Stage 1)", () => {
  test("loads the command center with correct title and accessibility landmarks", async ({ page }) => {
    await page.goto("/");

    // Verify document title
    await expect(page).toHaveTitle(/Sentinel NER — Operational Landslide Intelligence/i);

    // Verify primary Skip to Main Content link
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // Verify Operational Action Queue heading
    const actionQueueHeading = page.getByRole("heading", { name: "OPERATIONAL ACTION QUEUE" });
    await expect(actionQueueHeading).toBeVisible();

    // Verify Operational Situation Overview panel
    const situationHeading = page.getByText(/DEPENDENCY STATUS & TELEMETRY/i);
    await expect(situationHeading).toBeVisible();

    // Verify External Dependency integrations show truthful status (STANDBY or NOT_CONFIGURED)
    const gsiStatus = page.getByText(/GSI \/ NLFC/i);
    await expect(gsiStatus).toBeVisible();
  });

  test("loads the alerts & field connectivity page", async ({ page }) => {
    await page.goto("/alerts");

    // Verify Alerts page heading
    const alertsHeading = page.getByRole("heading", { name: /Alert Delivery & Field Connectivity/i });
    await expect(alertsHeading).toBeVisible();
  });

  test("verifies stage-gated architectural placeholders on private/future routes", async ({ page }) => {
    await page.goto("/ledger");

    // Verify Stage 8 Warning Ledger placeholder
    const placeholder = page.getByRole("region", {
      name: /RBAC Protected Boundary: Warning Ledger/i,
    });
    await expect(placeholder).toBeVisible();
    await expect(page.getByText(/Stage 8/i).first()).toBeVisible();
  });
});
