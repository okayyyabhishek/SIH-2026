import { test, expect } from "@playwright/test";

test.describe("Sentinel NER — Transparent Risk Engine E2E Tests (Stage 5)", () => {
  test("loads the Risk Engine page and renders operational boundary banner", async ({ page }) => {
    await page.goto("/risk");

    // Title and banner check
    await expect(page.getByRole("heading", { name: "TRANSPARENT RISK ENGINE" })).toBeVisible();
    await expect(page.getByText(/Stage 5 Operational Boundary — Human Decision Support Only/i)).toBeVisible();
    await expect(page.getByText(/NOT official public warnings, evacuation orders, or road closures/i)).toBeVisible();
  });

  test("displays model transparency metrics, calibration and predictions roster", async ({ page }) => {
    await page.goto("/risk");

    // Active model card
    await expect(page.getByText("lr-baseline-v1.0.0")).toBeVisible();
    await expect(page.getByText("DETERMINISTIC SUITE")).toBeVisible();
    await expect(page.getByText(/Platt Scaling/i)).toBeVisible();

    // Table inspection
    const table = page.getByRole("table", { name: "Operational Landslide Risk Predictions" });
    await expect(table).toBeVisible();
    await expect(page.getByText("su-miz-aiz-001")).toBeVisible();
  });

  test("filters predictions and inspects explanation modal", async ({ page }) => {
    await page.goto("/risk");

    // Ensure predictions loaded
    await expect(page.getByText("su-miz-aiz-001")).toBeVisible();

    // Click Inspect on first prediction
    const inspectBtn = page.getByLabel("Inspect explanation and evidence for su-miz-aiz-001");
    await inspectBtn.click();

    // Verify modal content
    const dialog = page.getByRole("dialog", { name: "PREDICTION EXPLANATION & PROVENANCE" });
    await expect(dialog).toBeVisible();
    await expect(page.getByText(/Provenance & Explanation Unavailable/i)).toBeVisible();
    await expect(page.getByText(/Operational Provenance Guarantee/i)).toBeVisible();
    await expect(page.getByText(/CLIENT DEMONSTRATION RECORD/i)).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole("button", { name: "Close Provenance Inspector" });
    await closeBtn.click({ force: true });
    await expect(dialog).not.toBeVisible();
  });
});
