import { test, expect } from "@playwright/test";

test.describe("Sentinel NER — Stage 4 Operational Geospatial Map E2E", () => {
  test("loads the map interface with header, filter bar, and layer controls", async ({ page }) => {
    await page.goto("/map");

    // Verify header and stage badge
    await expect(page.getByText("OPERATIONAL GEOSPATIAL MAP")).toBeVisible();
    await expect(page.getByText("STAGE 4 ACTIVE")).toBeVisible();
    await expect(page.getByText("CRS: EPSG:4326")).toBeVisible();

    // Verify filter bar
    await expect(page.getByText(/District:/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nearby" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Point Query" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Map Canvas/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Data Roster/i })).toBeVisible();

    // Verify operational layer controls
    await expect(page.getByText(/OPERATIONAL LAYERS/i)).toBeVisible();
    await expect(page.getByText("Districts", { exact: true })).toBeVisible();
    await expect(page.getByText("Slope Units")).toBeVisible();
    await expect(page.getByText("Roads")).toBeVisible();
    await expect(page.getByText("Road Chainages")).toBeVisible();
    await expect(page.getByText("Villages")).toBeVisible();
    await expect(page.getByText("Assets & Facilities")).toBeVisible();
    await expect(page.getByText("Landslide Events")).toBeVisible();
  });

  test("toggles layer visibility in Operational Layers panel", async ({ page }) => {
    await page.goto("/map");

    // Roads checkbox toggle
    const roadsCheckbox = page.getByLabel("Toggle Roads layer");
    await expect(roadsCheckbox).toBeVisible();
    await expect(roadsCheckbox).toBeChecked();

    await roadsCheckbox.click();
    await expect(roadsCheckbox).not.toBeChecked();

    await roadsCheckbox.click();
    await expect(roadsCheckbox).toBeChecked();
  });

  test("switches to accessible tabular data roster view and inspects entity details", async ({ page }) => {
    await page.goto("/map");

    // Switch to Data Roster view
    const rosterButton = page.getByRole("button", { name: /Data Roster/i });
    await rosterButton.click();

    // Verify accessible roster table header
    await expect(page.getByText("VISIBLE OPERATIONAL ENTITIES")).toBeVisible();
    await expect(page.getByText(/Accessible, keyboard-navigable spatial data/i)).toBeVisible();

    // Verify filter input
    const filterInput = page.getByLabel(/Filter entities by keyword/i);
    await expect(filterInput).toBeVisible();

    // If entities are loaded, inspect the first one
    const inspectButtons = page.getByRole("button", { name: /View details for/i });
    const count = await inspectButtons.count();
    if (count > 0) {
      await inspectButtons.first().click();

      // Verify EntityDetailDrawer opens
      await expect(page.getByText("FACTUAL OPERATIONAL METADATA")).toBeVisible();
      await expect(page.getByText(/Downstream Intelligence Notice/i)).toBeVisible();

      // Close drawer
      const closeBtn = page.getByLabel("Close entity detail drawer");
      await closeBtn.click();
      await expect(page.getByText("FACTUAL OPERATIONAL METADATA")).not.toBeVisible();
    }
  });

  test("supports nearby radius mode toggle with slider", async ({ page }) => {
    await page.goto("/map");

    const nearbyBtn = page.getByRole("button", { name: "Nearby" });
    await nearbyBtn.click();

    // Verify radius slider appears
    await expect(page.getByText(/Radius:/i)).toBeVisible();
    const slider = page.getByLabel(/Proximity search radius slider/i);
    await expect(slider).toBeVisible();
  });
});
