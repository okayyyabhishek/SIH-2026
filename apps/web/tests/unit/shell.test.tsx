import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SentinelShell } from "@/components/layout/SentinelShell";
import { RequireRolePlaceholder } from "@/components/auth/RequireRolePlaceholder";
import { ActionQueuePreview } from "@/components/dashboard/ActionQueuePreview";
import { useAuthStore } from "@/lib/auth";

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

beforeEach(() => {
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
    token: "mock-admin-token",
  });
});

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
    expect(screen.getAllByText("Live Weather").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Warning Ledger").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Field & Community/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alerts & Delivery").length).toBeGreaterThan(0);
  });

  it("displays government header elements and status indicators", () => {
    // Unauthenticated state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: null,
    });

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

describe("Sentinel NER — Role-Aware Shell Navigation", () => {
  it("restricts public USER to strictly 4 modules across top nav, sidebar, and mobile dock", () => {
    useAuthStore.setState({
      user: {
        id: "usr-user-gmail",
        email: "user@gmail.com",
        full_name: "Operational User",
        status: "ACTIVE",
        role: "USER",
        organization_id: "public",
        organization_name: "Citizen Observation Network",
        jurisdiction_scope: "LOCAL",
        permissions: [],
      },
      isAuthenticated: true,
      token: "mock-user-token",
    });

    render(
      <SentinelShell>
        <div>User Role Workspace</div>
      </SentinelShell>
    );

    const topNav = screen.getByRole("navigation", { name: "Primary Portal Navigation" });
    const sidebar = screen.getByRole("navigation", { name: "Sidebar Navigation" });
    const mobileNav = screen.getByRole("navigation", { name: "Mobile Bottom Navigation" });

    // 1. Top Portal Navigation: Exclusively the 4 designated modules
    expect(within(topNav).getByText("Spatial Map")).toBeDefined();
    expect(within(topNav).getByText("Live Weather")).toBeDefined();
    expect(within(topNav).getByText("Field & Community")).toBeDefined();
    expect(within(topNav).getByText("Alerts & Delivery")).toBeDefined();
    expect(within(topNav).queryByText("SENTINEL AI")).toBeNull();
    expect(within(topNav).queryByText("Command Center")).toBeNull();
    expect(within(topNav).queryByText("Operations")).toBeNull();

    // 2. Sidebar Navigation: Strictly the 4 designated modules
    expect(within(sidebar).getAllByText("Spatial Map").length).toBeGreaterThan(0);
    expect(within(sidebar).getAllByText("Live Weather").length).toBeGreaterThan(0);
    expect(within(sidebar).getAllByText(/Field & Community/).length).toBeGreaterThan(0);
    expect(within(sidebar).getAllByText("Alerts & Delivery").length).toBeGreaterThan(0);

    // Sidebar MUST NOT contain any other modules
    expect(within(sidebar).queryByText("Command Center")).toBeNull();
    expect(within(sidebar).queryByText("Creep Watch")).toBeNull();
    expect(within(sidebar).queryByText("Early Warning Matrix")).toBeNull();
    expect(within(sidebar).queryByText("Satellite Hydrology")).toBeNull();
    expect(within(sidebar).queryByText("Subsurface Geotech")).toBeNull();
    expect(within(sidebar).queryByText("Highway Corridors")).toBeNull();
    expect(within(sidebar).queryByText("SENTINEL AI")).toBeNull();
    expect(within(sidebar).queryByText("Operations Matrix")).toBeNull();

    // 3. Mobile Navigation: Contains only the 4 modules plus Menu
    expect(within(mobileNav).getByText("Spatial Map")).toBeDefined();
    expect(within(mobileNav).getByText("Live Weather")).toBeDefined();
    expect(within(mobileNav).getByText("Field & Community")).toBeDefined();
    expect(within(mobileNav).getByText("Alerts & Delivery")).toBeDefined();
    expect(within(mobileNav).getByText("Menu")).toBeDefined();
    expect(within(mobileNav).queryByText("Sentinel AI")).toBeNull();
    expect(within(mobileNav).queryByText("Command")).toBeNull();
    expect(within(mobileNav).queryByText("Operations")).toBeNull();
  });

  it("restricts FIELD_OFFICER to operational/highway modules without command center or creep watch", () => {
    useAuthStore.setState({
      user: {
        id: "usr-field-1",
        email: "field.kolasib@sentinel.ner.internal",
        full_name: "Highway Patrol Inspector Lalhmingthanga",
        status: "ACTIVE",
        role: "FIELD_OFFICER",
        organization_id: "org-hp-kolasib",
        organization_name: "Kolasib Highway Patrol",
        jurisdiction_scope: "NH-54",
        permissions: [],
      },
      isAuthenticated: true,
      token: "mock-field-token",
    });

    render(
      <SentinelShell>
        <div>Field Officer Workspace</div>
      </SentinelShell>
    );

    const sidebar = screen.getByRole("navigation", { name: "Sidebar Navigation" });

    // Field Officer sees Highway Corridors & Consequence Intel in sidebar
    expect(within(sidebar).getAllByText("Highway Corridors").length).toBeGreaterThan(0);
    expect(within(sidebar).getAllByText("Consequence Intel").length).toBeGreaterThan(0);

    // Field Officer does NOT see Command Center or Creep Watch or Satellite Hydrology in sidebar
    expect(within(sidebar).queryByText("Command Center")).toBeNull();
    expect(within(sidebar).queryByText("Creep Watch")).toBeNull();
    expect(within(sidebar).queryByText("Satellite Hydrology")).toBeNull();
    expect(within(sidebar).queryByText("Subsurface Geotech")).toBeNull();
  });
});

