import { test, expect } from "@playwright/test";

test.describe("Sentinel NER — Human-Authorized Action & Warning Control E2E Tests (Stage 8)", () => {
  test("loads Operations page and validates Non-Autonomous Safety Categorization banner", async ({ page }) => {
    await page.goto("/operations");

    // Title and Stage 8 check
    await expect(
      page.getByRole("heading", { name: /OPERATIONAL INTERVENTION & ACTION CONTROL/i })
    ).toBeVisible();
    await expect(page.getByText("STAGE 8")).toBeVisible();
    await expect(page.getByText(/NON-AUTONOMOUS CONTROL ACTIVE/i)).toBeVisible();

    // Verify all 6 distinct categories are rendered
    await expect(page.getByText("OBSERVED FACT")).toBeVisible();
    await expect(page.getByText("MODEL ESTIMATE")).toBeVisible();
    await expect(page.getByText("CONSEQUENCE")).toBeVisible();
    await expect(page.getByText("RECOMMENDATION")).toBeVisible();
    await expect(page.getByText("HUMAN DECISION")).toBeVisible();
    await expect(page.getByText("EXECUTED ACTION")).toBeVisible();

    // Verify statutory disclaimer
    await expect(
      page.getByText(/NON-AUTONOMOUS CONTROL PRINCIPLE/i)
    ).toBeVisible();
  });

  test("interacts with tabs across the operational command workflow", async ({ page }) => {
    await page.goto("/operations");

    // Click Authorization Queue tab
    await page.getByRole("button", { name: /Authorization Queue/i }).click();
    await expect(page.getByText(/Authoritative Human Review Protocol/i)).toBeVisible();

    // Click Controlled Warnings tab
    await page.getByRole("button", { name: /Controlled Warnings/i }).click();
    await expect(page.getByRole("heading", { name: /Multi-Channel Controlled Warnings/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Compose Controlled Warning/i })).toBeVisible();

    // Click Deliveries & Acknowledgements tab
    await page.getByRole("button", { name: /Deliveries & Acknowledgements/i }).click();
    await expect(page.getByText(/Truthful Multi-Channel Notification Status/i)).toBeVisible();
    await expect(page.getByText(/DELIVERED ≠ ACKNOWLEDGED/i)).toBeVisible();

    // Click SOP Playbooks tab
    await page.getByRole("button", { name: /SOP Playbooks/i }).click();
    await expect(page.getByText(/Standard Operating Procedure \(SOP\) Operational Playbooks/i)).toBeVisible();
  });

  test("loads Tamper-Evident Warning Ledger page and displays SHA-256 verification", async ({ page }) => {
    await page.goto("/ledger");

    // Title verification
    await expect(
      page.getByRole("heading", { name: /TAMPER-EVIDENT WARNING LEDGER/i })
    ).toBeVisible();

    // Verify integrity button
    await expect(
      page.getByRole("button", { name: /Verify Cryptographic Integrity/i })
    ).toBeVisible();

    // Verify blockchain genesis or hash headers
    await expect(page.getByText(/Genesis Block Hash/i)).toBeVisible();
  });
});
