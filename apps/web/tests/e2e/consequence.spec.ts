import { test, expect } from "@playwright/test";

test.describe("Sentinel NER — Road & Asset Consequence Intelligence E2E Tests (Stage 7)", () => {
  test("loads the Consequences page and verifies strict non-autonomous boundary disclaimer", async ({ page }) => {
    await page.goto("/consequences");

    // Title and banner check
    await expect(
      page.getByRole("heading", { name: /Road & Asset Consequence Intelligence/i })
    ).toBeVisible();
    await expect(
      page.getByText(/STAGE 7 NON-AUTONOMOUS OPERATIONAL BOUNDARY NOTICE/i)
    ).toBeVisible();
    await expect(
      page.getByText(/Stage 7 Consequence Intelligence denotes potential spatial exposure/i)
    ).toBeVisible();
    await expect(
      page.getByText(/It does NOT automatically order road closures, evacuations/i)
    ).toBeVisible();
  });

  test("displays consequence metrics overview cards", async ({ page }) => {
    await page.goto("/consequences");

    await expect(page.getByText("Potentially Affected Roads")).toBeVisible();
    await expect(page.getByText("Linked Road Chainages")).toBeVisible();
    await expect(page.getByText("Critical Assets Exposed")).toBeVisible();
    await expect(page.getByText("Nearby Habitations")).toBeVisible();
  });

  test("renders consequence relationships table with non-alarmist terminology and opens detail drawer", async ({
    page,
  }) => {
    await page.goto("/consequences");

    // Table inspection
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // Verify seeded relationships are rendered
    await expect(page.getByText("National Highway 54")).toBeVisible();

    // Click on Inspect button for NH-54
    const inspectBtn = page.getByRole("button", { name: /^Inspect$/i }).first();
    await inspectBtn.click();

    // Verify detail drawer renders
    const drawer = page.getByTestId("consequence-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Spatial Exposure Basis")).toBeVisible();
    await expect(drawer.getByText("KM 12.5", { exact: true })).toBeVisible();

    // Close drawer
    await page.getByLabel("Close detail drawer").click({ force: true });
  });

  test("opens consequence analysis execution modal with bounded parameters", async ({ page }) => {
    await page.goto("/consequences");

    // Open execution modal
    const runBtn = page.getByRole("button", { name: /Trigger Analysis Run/i });
    await runBtn.click();

    // Modal check
    await expect(page.getByText("Execute Consequence Analysis")).toBeVisible();
    await expect(page.getByText("Target District Scope")).toBeVisible();
    await expect(page.getByText(/Proximity Threshold/i)).toBeVisible();

    // Close modal
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("navigates via /lifelines redirect to /consequences", async ({ page }) => {
    await page.goto("/lifelines");
    await expect(page).toHaveURL(/.*\/consequences/);
    await expect(
      page.getByRole("heading", { name: /Road & Asset Consequence Intelligence/i })
    ).toBeVisible();
  });
});
