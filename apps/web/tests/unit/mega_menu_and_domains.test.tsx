import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SentinelMegaMenu } from "@/components/layout/SentinelMegaMenu";
import HydrologyPage from "@/app/hydrology/page";
import EarlyWarningPage from "@/app/early-warning/page";
import GeotechPage from "@/app/geotech/page";
import HighwaysPage from "@/app/highways/page";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("SentinelMegaMenu — Myntra-Style Multi-Column Navigation Dropdown", () => {
  it("renders all four primary domain category trigger buttons", () => {
    render(<SentinelMegaMenu />);

    expect(screen.getByRole("button", { name: /EARLY WARNING & INTEL/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /INFRASTRUCTURE & LIFELINES/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /GEOTECHNICAL & IOT/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /OPERATIONS & DISPATCH/i })).toBeDefined();
  });

  it("opens the multi-column dropdown panel when clicking on EARLY WARNING & INTEL", () => {
    render(<SentinelMegaMenu />);

    const triggerBtn = screen.getByRole("button", { name: /EARLY WARNING & INTEL/i });
    fireEvent.click(triggerBtn);

    // Verify multi-column headings appear
    expect(screen.getByText(/SATELLITE HYDROLOGY/i)).toBeDefined();
    expect(screen.getByText(/GSI & IIT MANDI LEWS/i)).toBeDefined();
    expect(screen.getByText(/SPATIAL & INSAR RADAR/i)).toBeDefined();

    // Verify direct links to dedicated pages
    expect(screen.getByRole("link", { name: /Precipitation Telemetry/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Landslide Threat Matrix/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /3D GIS Spatial Map/i })).toBeDefined();
  });

  it("switches columns and links when toggling to INFRASTRUCTURE & LIFELINES", () => {
    render(<SentinelMegaMenu />);

    const infraBtn = screen.getByRole("button", { name: /INFRASTRUCTURE & LIFELINES/i });
    fireEvent.click(infraBtn);

    expect(screen.getByText(/HIGHWAY CORRIDORS/i)).toBeDefined();
    expect(screen.getByText(/SATELLITE SCARP INVENTORY/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Arterial Highway Status/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /ISRO NRSC Bhuvan DMS/i })).toBeDefined();
  });

  it("renders OPERATIONS & DISPATCH domain with Dual-Custody Governance featured card and high-contrast CTA button", () => {
    render(<SentinelMegaMenu />);

    const opsBtn = screen.getByRole("button", { name: /OPERATIONS & DISPATCH/i });
    fireEvent.click(opsBtn);

    expect(screen.getByText(/Dual-Custody Governance/i)).toBeDefined();
    expect(screen.getByText(/Duty Officer Ledger/i)).toBeDefined();
    expect(screen.getByText(/Multi-Signature Sealed/i)).toBeDefined();

    const ctaBtn = screen.getByRole("link", { name: /Open Operational View/i });
    expect(ctaBtn).toBeDefined();
    expect(ctaBtn.className).toContain("mega-featured-btn");
    expect(ctaBtn.className).toContain("!text-white");
    expect(ctaBtn.className).not.toContain("mega-action-link");
  });

  it("closes the mega-menu when Escape key is pressed", () => {
    render(<SentinelMegaMenu />);

    const triggerBtn = screen.getByRole("button", { name: /GEOTECHNICAL & IOT/i });
    fireEvent.click(triggerBtn);

    expect(screen.getByText(/SUBSURFACE STABILITY \(Fs\)/i)).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByText(/SUBSURFACE STABILITY \(Fs\)/i)).toBeNull();
  });
});

describe("Dedicated Telemetry Domain Pages", () => {
  it("renders /hydrology page with breadcrumbs, GPM IMERG and SMAP soil moisture", () => {
    render(<HydrologyPage />);

    expect(screen.getByRole("heading", { name: /SATELLITE HYDROLOGICAL TELEMETRY/i })).toBeDefined();
    expect(screen.getByText(/7-Day ARI Index/i)).toBeDefined();
    expect(screen.getByText(/SMAP Soil Saturation/i)).toBeDefined();
    expect(screen.getByText(/Antecedent Soil Moisture \(SMAP\)/i)).toBeDefined();
  });

  it("renders /early-warning page with 4-tier matrix, GSI horizon, and AI briefing", () => {
    render(<EarlyWarningPage />);

    expect(screen.getByRole("heading", { level: 1, name: /LANDSLIDE EARLY WARNING & THREAT MATRIX/i })).toBeDefined();
    expect(screen.getByText(/IIT MANDI GEE LEWS INTEGRATION/i)).toBeDefined();
    expect(screen.getAllByText(/EXTREME \(≥98%\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HIGH \(95–98%\)/i).length).toBeGreaterThan(0);
  });

  it("renders /geotech page with Factor of Safety Fs dial and piezometer arrays", () => {
    render(<GeotechPage />);

    expect(screen.getByRole("heading", { level: 1, name: /DEEP SUBSURFACE SENSORS & SLOPE STABILITY \(Fs\)/i })).toBeDefined();
    expect(screen.getByText(/KIGAM Slope Stability Meter/i)).toBeDefined();
    expect(screen.getByText("1.08")).toBeDefined();
    expect(screen.getByText(/Amrita AWNA Subsurface Profile/i)).toBeDefined();
  });

  it("renders /highways page with NH-54 arterial corridors, debris and scarp telemetry", () => {
    render(<HighwaysPage />);

    expect(screen.getByRole("heading", { level: 1, name: /ARTERIAL HIGHWAY CORRIDORS & SATELLITE EVENT INVENTORY/i })).toBeDefined();
    expect(screen.getByText(/ISRO BHUVAN DISASTER MANAGEMENT SUPPORT/i)).toBeDefined();
    expect(screen.getAllByText(/NH-54/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/BRO Project Pushpak Coordination/i)).toBeDefined();
  });
});
