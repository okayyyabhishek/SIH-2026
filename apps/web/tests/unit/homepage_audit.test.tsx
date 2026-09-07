import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HomePage from "@/app/page";
import { HeroSection } from "@/components/HeroSection";
import { DomainTelemetryHub } from "@/components/home/DomainTelemetryHub";
import { ActionQueuePreview } from "@/components/dashboard/ActionQueuePreview";
import { ExternalFeeds, OperationalMetrics } from "@/components/dashboard/SituationOverview";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("Homepage Comprehensive Function Audit (http://localhost:3000/)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. HeroSection Interactive Functions", () => {
    it("toggles simulation scenario between Baseline Nominal and Monsoon Surge", () => {
      render(<HeroSection />);

      // Initially Baseline Nominal
      expect(screen.getByText("ADVISORY")).toBeDefined();
      expect(screen.getByText("-28.4 mm/yr")).toBeDefined();
      expect(screen.getByText("3 Actions Pending")).toBeDefined();

      // Click Monsoon Surge button
      const monsoonBtn = screen.getByRole("button", { name: /Monsoon Surge/i });
      fireEvent.click(monsoonBtn);

      // Verify dynamic monsoon updates
      expect(screen.getByText("CRITICAL EMERGENCY")).toBeDefined();
      expect(screen.getByText("-42.8 mm/yr")).toBeDefined();
      expect(screen.getByText("Immediate Evacuation")).toBeDefined();

      // Switch back to Nominal
      const nominalBtn = screen.getByRole("button", { name: /Baseline Nominal/i });
      fireEvent.click(nominalBtn);

      expect(screen.getByText("ADVISORY")).toBeDefined();
      expect(screen.getByText("-28.4 mm/yr")).toBeDefined();
      expect(screen.getByText("3 Actions Pending")).toBeDefined();
    });

    it("handles search input, category selection, and Enter key submission", () => {
      render(<HeroSection />);

      const searchInput = screen.getByPlaceholderText(/Search Highway Corridor/i);
      const categorySelect = screen.getByLabelText(/Filter Search by Category/i);

      // Type search query
      fireEvent.change(searchInput, { target: { value: "NH-27 Jatinga" } });
      expect((searchInput as HTMLInputElement).value).toBe("NH-27 Jatinga");

      // Select category
      fireEvent.change(categorySelect, { target: { value: "highways" } });
      expect((categorySelect as HTMLSelectElement).value).toBe("highways");

      // Press Enter to trigger search
      fireEvent.keyDown(searchInput, { key: "Enter" });
      expect(mockPush).toHaveBeenCalledWith("/map?q=NH-27%20Jatinga&category=highways");
    });

    it("activates quick priority filter chips and updates search field", () => {
      render(<HeroSection />);

      const searchInput = screen.getByPlaceholderText(/Search Highway Corridor/i);

      // Click NH-27 (Assam)
      const assamChip = screen.getByRole("button", { name: /NH-27 \(Assam\)/i });
      fireEvent.click(assamChip);
      expect((searchInput as HTMLInputElement).value).toBe("NH-27 Jatinga Valley");
      expect(assamChip.getAttribute("aria-pressed")).toBe("true");

      // Click NH-6 (Meghalaya)
      const meghalayaChip = screen.getByRole("button", { name: /NH-6 \(Meghalaya\)/i });
      fireEvent.click(meghalayaChip);
      expect((searchInput as HTMLInputElement).value).toBe("NH-6 Sonapur Tunnel");
      expect(meghalayaChip.getAttribute("aria-pressed")).toBe("true");
      expect(assamChip.getAttribute("aria-pressed")).toBe("false");

      // Click Durtlang Scarp
      const durtlangChip = screen.getByRole("button", { name: /Durtlang Scarp/i });
      fireEvent.click(durtlangChip);
      expect((searchInput as HTMLInputElement).value).toBe("Durtlang Ridge Scarp");
      expect(durtlangChip.getAttribute("aria-pressed")).toBe("true");
    });

    it("provides valid navigation links for primary CTAs", () => {
      render(<HeroSection />);

      const mapLink = screen.getByRole("link", { name: /Launch GIS Map/i });
      expect(mapLink.getAttribute("href")).toBe("/map");

      const ewLink = screen.getByRole("link", { name: /Early Warning Dashboard/i });
      expect(ewLink.getAttribute("href")).toBe("/early-warning");

      const riskLink = screen.getByRole("link", { name: /Forecast Bulletin/i });
      expect(riskLink.getAttribute("href")).toBe("/risk");
    });
  });

  describe("2. DomainTelemetryHub Interactive Functions", () => {
    it("switches telemetry domains via dropdown and tab buttons", () => {
      render(<DomainTelemetryHub />);

      const select = screen.getByLabelText(/Switch Telemetry Feature Domain/i);

      // Switch to hydrology
      fireEvent.change(select, { target: { value: "hydrology" } });
      expect(screen.getByText(/NASA LHASA v2 Satellite Hydrological Telemetry/i)).toBeDefined();
      expect(screen.getByText("82.4%")).toBeDefined();

      // Switch to geotech
      fireEvent.change(select, { target: { value: "geotech" } });
      expect(screen.getByText(/AMRITA AWNA IoT Mesh & KIGAM Slope Stability/i)).toBeDefined();
      expect(screen.getByText("1.08 Fs")).toBeDefined();

      // Switch to highways
      fireEvent.change(select, { target: { value: "highways" } });
      expect(screen.getByText(/ISRO BHUVAN & Highway Corridor Status/i)).toBeDefined();
      expect(screen.getByText("13 of 14")).toBeDefined();

      // Switch back to early-warning using tab button
      const ewTabBtn = screen.getByRole("tab", { name: /Early Warning & Threat Matrix/i });
      fireEvent.click(ewTabBtn);
      expect(screen.getByText(/Landslide Early Warning & Threat Matrix/i)).toBeDefined();
    });

    it("toggles the interactive workspace preview open and closed", () => {
      render(<DomainTelemetryHub />);

      const toggleBtn = screen.getByRole("button", { name: /Show Workspace/i });
      expect(toggleBtn).toBeDefined();
      expect(screen.queryByText(/Interactive Workspace Active/i)).toBeNull();

      // Open workspace
      fireEvent.click(toggleBtn);
      expect(screen.getByText(/Interactive Workspace Active/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /Hide Workspace/i })).toBeDefined();

      // Close workspace via Close button
      const closeBtn = screen.getByRole("button", { name: /Close/i });
      fireEvent.click(closeBtn);
      expect(screen.queryByText(/Interactive Workspace Active/i)).toBeNull();
    });
  });

  describe("3. Operational Action Center Functions", () => {
    it("renders operational metrics with integrity badge", () => {
      render(<OperationalMetrics />);

      expect(screen.getByText("MONITORED CORRIDORS")).toBeDefined();
      expect(screen.getByText("2 Primary")).toBeDefined();
      expect(screen.getByText("SLOPE UNITS INDEXED")).toBeDefined();
      expect(screen.getByText("1,420 Units")).toBeDefined();
      expect(screen.getByText("ACTIVE ACTIONS")).toBeDefined();
      expect(screen.getByText("3 In Queue")).toBeDefined();
      expect(screen.getByText("LEDGER AUDIT STATE")).toBeDefined();
      expect(screen.getByText("Locked")).toBeDefined();
    });

    it("toggles action queue expand/collapse and filters actions", () => {
      render(<ActionQueuePreview />);

      // Initially collapsed
      expect(screen.queryByText(/ACT-2026-0891/i)).toBeNull();

      // Click header to expand
      const headerTitle = screen.getByText("OPERATIONAL ACTION QUEUE");
      fireEvent.click(headerTitle);

      // Now all 3 actions visible
      expect(screen.getByText("ACT-2026-0891")).toBeDefined();
      expect(screen.getByText("ACT-2026-0892")).toBeDefined();
      expect(screen.getByText("ACT-2026-0893")).toBeDefined();

      // Filter by CRITICAL
      const criticalBtn = screen.getByRole("button", { name: "CRITICAL" });
      fireEvent.click(criticalBtn);

      expect(screen.getByText("ACT-2026-0891")).toBeDefined();
      expect(screen.queryByText("ACT-2026-0892")).toBeNull();
      expect(screen.queryByText("ACT-2026-0893")).toBeNull();

      // Filter by URGENT
      const urgentBtn = screen.getByRole("button", { name: "URGENT" });
      fireEvent.click(urgentBtn);

      expect(screen.queryByText("ACT-2026-0891")).toBeNull();
      expect(screen.getByText("ACT-2026-0892")).toBeDefined();
      expect(screen.queryByText("ACT-2026-0893")).toBeNull();

      // Filter back to ALL
      const allBtn = screen.getByRole("button", { name: "ALL" });
      fireEvent.click(allBtn);

      expect(screen.getByText("ACT-2026-0891")).toBeDefined();
      expect(screen.getByText("ACT-2026-0892")).toBeDefined();
      expect(screen.getByText("ACT-2026-0893")).toBeDefined();
    });

    it("executes ACT now flow and updates action status to in-progress", () => {
      render(<ActionQueuePreview />);

      // Expand queue
      fireEvent.click(screen.getByText("OPERATIONAL ACTION QUEUE"));

      // Click ACT on first action
      const actButtons = screen.getAllByRole("button", { name: /Execute action/i });
      fireEvent.click(actButtons[0]);

      // Verify status changed to in progress
      expect(screen.getByText("Action In Progress")).toBeDefined();
    });

    it("handles dismiss modal with operational reason validation", () => {
      render(<ActionQueuePreview />);

      // Expand queue
      fireEvent.click(screen.getByText("OPERATIONAL ACTION QUEUE"));

      // Click DISMISS WITH REASON
      const dismissButtons = screen.getAllByRole("button", { name: /Dismiss action/i });
      fireEvent.click(dismissButtons[0]);

      // Modal dialog should appear
      expect(screen.getByText(/Log Operational Reason for Dismissal/i)).toBeDefined();

      // Confirm button should be disabled without reason
      const confirmBtn = screen.getByRole("button", { name: /Confirm Dismissal/i });
      expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);

      // Test Cancel closes dialog
      const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      expect(screen.queryByText(/Log Operational Reason for Dismissal/i)).toBeNull();

      // Re-open and enter valid operational reason
      const dismissButtonsAfter = screen.getAllByRole("button", { name: /Dismiss action/i });
      fireEvent.click(dismissButtonsAfter[0]);

      const textarea = screen.getByPlaceholderText(/On-site PWD patrol confirmed false positive/i);
      fireEvent.change(textarea, { target: { value: "Site inspected by BRO patrol - false positive due to boulder clearing." } });

      const confirmBtnEnabled = screen.getByRole("button", { name: /Confirm Dismissal/i });
      expect((confirmBtnEnabled as HTMLButtonElement).disabled).toBe(false);

      fireEvent.click(confirmBtnEnabled);

      // Dialog closed, and dismissed status message shown
      expect(screen.queryByText(/Log Operational Reason for Dismissal/i)).toBeNull();
      expect(screen.getByText(/Dismissed with logged operational reason/i)).toBeDefined();
    });

    it("toggles external feeds expand/collapse and renders registered telemetry adapters", () => {
      render(<ExternalFeeds />);

      // Initially collapsed
      expect(screen.queryByText(/GSI \/ NLFC Landslide Susceptibility/i)).toBeNull();

      // Expand feeds
      const header = screen.getByText(/DEPENDENCY STATUS & TELEMETRY/i);
      fireEvent.click(header);

      // Feeds should now be visible
      expect(screen.getByText(/GSI \/ NLFC Landslide Susceptibility/i)).toBeDefined();
      expect(screen.getByText(/IMD Doppler Radar & Precipitation Grid/i)).toBeDefined();
      expect(screen.getByText(/ISRO \/ NRSC Bhuvan Disaster Services/i)).toBeDefined();
      expect(screen.getByText(/Sentinel-1 InSAR \/ MintPy Pipeline/i)).toBeDefined();
      expect(screen.getByText(/Geotechnical Piezometers & Tiltmeters/i)).toBeDefined();
    });
  });

  describe("4. Full HomePage Integration", () => {
    it("renders complete HomePage with live disaster bulletin, domain hub, and operational section", () => {
      render(<HomePage />);

      // Hero section
      expect(screen.getByText(/National Landslide Early Warning & Risk Management Platform/i)).toBeDefined();

      // Live bulletin ticker
      expect(screen.getByText(/LIVE BULLETIN/i)).toBeDefined();
      expect(screen.getByText(/Elevated landslide risk along NH-54 corridor/i)).toBeDefined();

      // Domain intelligence hub
      expect(screen.getByText(/Domain Intelligence & Telemetry Hub/i)).toBeDefined();

      // Operational Situation & Action Center
      expect(screen.getByText(/Operational Situation & Action Center/i)).toBeDefined();
      expect(screen.getByText(/Operational Integrity: Nominal/i)).toBeDefined();
    });
  });
});
