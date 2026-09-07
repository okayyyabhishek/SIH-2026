import { test, expect } from "@playwright/test";

test.describe("Sentinel NER — Satellite & InSAR Change Intelligence E2E Tests (Stage 6)", () => {
  test("loads the Creep Watch page and renders operational boundary banner", async ({ page }) => {
    await page.goto("/creep-watch");

    // Title and banner check
    await expect(page.getByRole("heading", { name: /SATELLITE & INSAR CHANGE INTELLIGENCE/i })).toBeVisible();
    await expect(page.getByText(/Operational Decision Support Boundary \(Non-Autonomous Principle\)/i)).toBeVisible();
    await expect(page.getByText(/Remote sensing evidence indicates/i)).toBeVisible();
    await expect(page.getByText(/Observed spatial overlap with slope units denotes geometric co-location only/i)).toBeVisible();
  });

  test("displays truthful external satellite connectors and anti-fabrication status", async ({ page }) => {
    await page.goto("/creep-watch");

    await expect(page.getByText(/Upstream Satellite Catalogs & Live Connectors/i)).toBeVisible();
    await expect(page.getByText(/Anti-Fabrication Guard: Live Status Enforced/i)).toBeVisible();
    await expect(page.getByText("Copernicus Data Space Ecosystem (CDSE)")).toBeVisible();
    await expect(page.getByText("AWS Open Data Earth Search (Element84 STAC)")).toBeVisible();
  });

  test("renders InSAR deformation roster and inspects telemetry modal with LOS disclaimer", async ({ page }) => {
    await page.goto("/creep-watch");

    // Table inspection
    const table = page.getByRole("table", { name: "InSAR Observations Table" });
    await expect(table).toBeVisible();
    await expect(page.getByText("insar_obs_champhai_test_001")).toBeVisible();

    // Click Inspect button on the observation
    const inspectBtn = page.getByRole("button", { name: "Inspect" }).first();
    await inspectBtn.click({ force: true });

    // Verify modal content
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByText(/InSAR Observation Telemetry & Lineage/i)).toBeVisible();
    await expect(page.getByText(/Line-of-Sight \(LOS\) Measurement Semantics/i)).toBeVisible();
    await expect(page.getByText(/LINE_OF_SIGHT_ONLY/i)).toBeVisible();
    await expect(page.getByText(/SPATIAL INTERSECTION ONLY/i)).toBeVisible();

    // Close modal via close button
    const closeBtn = dialog.getByLabel("Close dialog");
    await closeBtn.click({ force: true });
    await expect(dialog).not.toBeVisible();
  });

  test("opens InSAR processing job dispatch modal with bounded parameter fields", async ({ page }) => {
    await page.goto("/creep-watch");

    // Open dispatch run modal
    const dispatchBtn = page.getByRole("button", { name: "Dispatch InSAR Run" });
    await dispatchBtn.click({ force: true });

    // Modal verification
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByText(/Dispatch InSAR Processing Job/i)).toBeVisible();
    await expect(page.getByText(/Primary Acquisition Scene/i)).toBeVisible();
    await expect(page.getByText(/Secondary Acquisition Scene/i)).toBeVisible();
    await expect(page.getByText(/Perpendicular Baseline B⊥ \(Meters\)/i)).toBeVisible();
    await expect(page.getByText(/Critical baseline limit: 500m max for Sentinel-1 C-band/i)).toBeVisible();

    // Close modal
    const closeBtn = dialog.getByLabel("Close dialog");
    await closeBtn.click({ force: true });
    await expect(dialog).not.toBeVisible();
  });
});
