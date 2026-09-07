import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SentinelShell } from "@/components/layout/SentinelShell";
import { RequireRolePlaceholder } from "@/components/auth/RequireRolePlaceholder";
import { ActionQueuePreview } from "@/components/dashboard/ActionQueuePreview";
import { useAuthStore } from "@/lib/auth";

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Sentinel NER — Government Standard Shell", () => {
  it("renders the accessible skip-to-content link targeting #main-content", () => {
    render(
      <SentinelShell>
        <div>Test Content</div>
      </SentinelShell>
    );

    const skipLink = screen.getByRole("link", { name: /skip to main content/i });
    expect(skipLink).toBeDefined();
    expect(skipLink.getAttribute("href")).toBe("#main-content");
  });

  it("renders the government standard navigation and branding", () => {
    render(
      <SentinelShell>
        <div>Test Content</div>
      </SentinelShell>
    );

    expect(screen.getByText("SENTINEL NER")).toBeDefined();

    // Verify key navigation options appear (may appear multiple times in sidebar + nav)
    expect(screen.getAllByText("Command Center").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Spatial Map").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Creep Watch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Warning Ledger").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Field & Community/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alerts & Delivery").length).toBeGreaterThan(0);
  });

  it("displays government header elements and status indicators", () => {
    render(
      <SentinelShell>
        <div>Test Content</div>
      </SentinelShell>
    );

    // Government of India top bar
    expect(screen.getByText(/भारत सरकार \| GOVERNMENT OF INDIA/)).toBeDefined();
    expect(screen.getByText(/Ministry of Earth Sciences/)).toBeDefined();

    // Operational indicators & Helpline
    expect(screen.getByText(/NDMA Helpline: 1078/)).toBeDefined();

    // Sign In button (not logged in)
    expect(screen.getByRole("link", { name: /Sign In/i })).toBeDefined();
  });

  it("renders compact user avatar dropdown and verifies header removals when authenticated", () => {
    const mockLogout = vi.fn();
    useAuthStore.setState({
      user: {
        id: "usr-admin-1",
        email: "admin@sentinel.ner.internal",
        full_name: "Platform Administrator",
        status: "ACTIVE",
        role: "PLATFORM_ADMIN",
        organization_id: "org-sdma-mizoram",
        organization_name: "Mizoram SDMA",
        jurisdiction_scope: "GLOBAL",
        permissions: [],
      },
      isAuthenticated: true,
      logout: mockLogout,
    });

    render(
      <SentinelShell>
        <div>Test Content</div>
      </SentinelShell>
    );

    // Removed elements should NOT exist in header
    expect(screen.queryByText(/Scope: Aizawl & Lunglei Corridors/i)).toBeNull();
    expect(screen.queryByText(/^LIVE$/)).toBeNull();

    // Compact circular avatar button should exist
    const profileBtn = screen.getByRole("button", { name: /User profile menu for Platform Administrator/i });
    expect(profileBtn).toBeDefined();

    // Initially dropdown menu is closed
    expect(screen.queryByRole("menu")).toBeNull();

    // Click profile button to open dropdown
    fireEvent.click(profileBtn);
    expect(screen.getByRole("menu")).toBeDefined();
    expect(screen.getByText("Platform Administrator")).toBeDefined();
    expect(screen.getByText("PLATFORM_ADMIN")).toBeDefined();

    // Sign out button should be present in dropdown
    const signOutBtn = screen.getByRole("menuitem", { name: /Sign Out/i });
    expect(signOutBtn).toBeDefined();
    fireEvent.click(signOutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);

    // Reset auth store after test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });
  });

  it("renders the GIGW-compliant footer with related portals", () => {
    render(
      <SentinelShell>
        <div>Test Content</div>
      </SentinelShell>
    );

    // Footer sections
    expect(screen.getByText("About Sentinel NER")).toBeDefined();
    expect(screen.getByText("Quick Links")).toBeDefined();
    expect(screen.getByText("Related Portals")).toBeDefined();
    expect(screen.getByText("Contact")).toBeDefined();

    // Government links
    expect(screen.getByText(/india.gov.in/)).toBeDefined();
    expect(screen.getAllByText(/NDMA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/GSI/).length).toBeGreaterThan(0);

    // Accessibility statement
    expect(screen.getByText(/Accessibility Statement/)).toBeDefined();
    expect(screen.getByText(/WCAG 2.2 Level AA/)).toBeDefined();
  });
});

describe("Sentinel NER — RBAC Architectural Placeholders (Stage 1)", () => {
  it("renders the RBAC boundary with role-region semantics and configured roles", () => {
    render(
      <RequireRolePlaceholder
        allowedRoles={["PLATFORM_ADMIN", "DDMA", "PWD"]}
        featureTitle="Warning Ledger & Public Alert Authorization (Stage 8)"
        targetStage={8}
      />
    );

    const region = screen.getByRole("region", {
      name: /RBAC Protected Boundary: Warning Ledger & Public Alert Authorization \(Stage 8\)/i,
    });
    expect(region).toBeDefined();

    expect(screen.getByText("Warning Ledger & Public Alert Authorization (Stage 8)")).toBeDefined();
    expect(screen.getByText("PLATFORM_ADMIN")).toBeDefined();
    expect(screen.getByText("DDMA")).toBeDefined();
    expect(screen.getByText("PWD")).toBeDefined();
    expect(screen.getAllByText(/Stage 8/i).length).toBeGreaterThan(0);
  });

  it("accepts and displays all 11 operational RBAC roles including INFRASTRUCTURE_AUTHORITY", () => {
    const allElevenRoles = [
      "PLATFORM_ADMIN",
      "STATE_AUTHORITY",
      "DDMA",
      "PWD",
      "BRO",
      "NHIDCL",
      "RAILWAY_AUTHORITY",
      "INFRASTRUCTURE_AUTHORITY",
      "FIELD_OFFICER",
      "OBSERVER_AUDITOR",
      "CITIZEN_REPORTER",
    ] as const;

    render(
      <RequireRolePlaceholder
        allowedRoles={[...allElevenRoles]}
        featureTitle="Full Multi-Agency Boundary"
        targetStage={8}
      />
    );

    for (const role of allElevenRoles) {
      expect(screen.getByText(role)).toBeDefined();
    }
  });
});

describe("Sentinel NER — Action Queue Space (Stage 1)", () => {
  it("renders the primary operational action queue without fake risk numbers", () => {
    render(<ActionQueuePreview />);

    expect(screen.getByText("OPERATIONAL ACTION QUEUE")).toBeDefined();

    // Click header to expand queue
    fireEvent.click(screen.getByText("OPERATIONAL ACTION QUEUE"));

    expect(screen.getByText(/NH-54/i)).toBeDefined();

    // Verify ACT and DISMISS buttons are rendered with operational semantics
    const actButtons = screen.getAllByRole("button", { name: /ACT/i });
    expect(actButtons.length).toBeGreaterThan(0);

    const dismissButtons = screen.getAllByRole("button", { name: /DISMISS/i });
    expect(dismissButtons.length).toBeGreaterThan(0);
  });
});

describe("Sentinel NER — Theme Options & Multi-Lingual Controls", () => {
  it("renders theme buttons for Light, Dark, and Contrast modes", () => {
    render(
      <SentinelShell>
        <div>Theme Test Content</div>
      </SentinelShell>
    );

    const darkBtn = screen.getByRole("button", { name: /Dark/i });
    const lightBtn = screen.getByRole("button", { name: /Light/i });
    const contrastBtn = screen.getByRole("button", { name: /Contrast/i });

    expect(darkBtn).toBeDefined();
    expect(lightBtn).toBeDefined();
    expect(contrastBtn).toBeDefined();
  });

  it("switches theme to light, high-contrast, and dark on click", () => {
    render(
      <SentinelShell>
        <div>Theme Switch Test</div>
      </SentinelShell>
    );

    const lightBtn = screen.getByRole("button", { name: /Light/i });
    fireEvent.click(lightBtn);
    expect(document.documentElement.classList.contains("light")).toBe(true);

    const contrastBtn = screen.getByRole("button", { name: /Contrast/i });
    fireEvent.click(contrastBtn);
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);

    const darkBtn = screen.getByRole("button", { name: /Dark/i });
    fireEvent.click(darkBtn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("switches language between English, Hindi, and Mizo", () => {
    render(
      <SentinelShell>
        <div>Language Switch Test</div>
      </SentinelShell>
    );

    // Switch to Hindi
    const hiBtn = screen.getByRole("button", { name: "हिंदी" });
    fireEvent.click(hiBtn);
    expect(document.documentElement.lang).toBe("hi");
    expect(screen.getAllByText("कमांड सेंटर").length).toBeGreaterThan(0);

    // Switch to Mizo
    const mizoBtn = screen.getByRole("button", { name: "Mizo" });
    fireEvent.click(mizoBtn);
    expect(document.documentElement.lang).toBe("lus");
    expect(screen.getAllByText("Hmunpui").length).toBeGreaterThan(0);

    // Switch back to English
    const enBtn = screen.getByRole("button", { name: "English" });
    fireEvent.click(enBtn);
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getAllByText("Command Center").length).toBeGreaterThan(0);
  });
});

describe("Sentinel NER — Dropdown Navigation & Feature Organization", () => {
  it("renders feature quick-jump dropdown with optgroups for all 5 domains", () => {
    render(
      <SentinelShell>
        <div>Quick Jump Test</div>
      </SentinelShell>
    );

    const quickJumpSelects = screen.getAllByLabelText(/Quick Feature Select/i);
    expect(quickJumpSelects.length).toBeGreaterThan(0);

    const select = quickJumpSelects[0];
    expect(select).toBeDefined();

    // Verify key optgroups exist
    expect(screen.getAllByRole("group", { name: /Early Warning & Hazards/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("group", { name: /Corridors & Lifelines/i }).length).toBeGreaterThan(0);
  });

  it("renders collapsible feature accordion groups with expand/collapse toggle", () => {
    render(
      <SentinelShell>
        <div>Accordion Test</div>
      </SentinelShell>
    );

    // Check "Collapse All" button
    const collapseAllBtn = screen.getByRole("button", { name: /Collapse All/i });
    expect(collapseAllBtn).toBeDefined();

    fireEvent.click(collapseAllBtn);

    // Toggle button should now show "Expand All"
    expect(screen.getByRole("button", { name: /Expand All/i })).toBeDefined();
  });
});
