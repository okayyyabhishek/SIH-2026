import { test, expect } from "@playwright/test";

test.describe("Sentinel NER — Stage 2 Identity, RBAC & Tenancy E2E", () => {
  test("navigates to login page, selects demo identity, and validates form", async ({ page }) => {
    await page.goto("/login");

    // Verify operational access heading
    await expect(page.getByText("OPERATIONAL AUTHENTICATION")).toBeVisible();

    // Verify accessible inputs
    const emailInput = page.getByLabel(/official agency email/i);
    await expect(emailInput).toBeVisible();

    const passwordInput = page.getByLabel(/credential password/i);
    await expect(passwordInput).toBeVisible();

    // Select DDMA preset
    const ddmaPreset = page.getByRole("button", { name: /DDMA Incident Commander/i });
    await expect(ddmaPreset).toBeVisible();
    await ddmaPreset.click();

    // Verify populated email
    await expect(emailInput).toHaveValue("ddma.aizawl@sentinel.ner.internal");
  });
});
