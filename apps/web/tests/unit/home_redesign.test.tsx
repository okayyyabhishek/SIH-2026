import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AmritaHeroSection } from "@/components/home/AmritaHeroSection";
import { NasaLhasaHydrology } from "@/components/home/NasaLhasaHydrology";
import { LewsForecastAssistant } from "@/components/home/LewsForecastAssistant";
import { AmritaKigamGeotech } from "@/components/home/AmritaKigamGeotech";
import { BhuvanDisasterMonitor } from "@/components/home/BhuvanDisasterMonitor";
import { DomainTelemetryHub } from "@/components/home/DomainTelemetryHub";
import { IndiaGovMissionGrid } from "@/components/home/IndiaGovMissionGrid";
import HomePage from "@/app/page";

// Mock Next.js navigation and image
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

describe("Sentinel NER — Government Standard Landslide Intelligence Platform", () => {
  it("renders AmritaHeroSection with government welcome banner and key metrics", () => {
    render(<AmritaHeroSection />);

    // Check operational status badge
    expect(screen.getByText(/System Operational — Updated Hourly/i)).toBeDefined();

    // Check bilingual title
    expect(screen.getByText(/राष्ट्रीय भूस्खलन पूर्व चेतावनी मंच/i)).toBeDefined();
    expect(screen.getByText(/National Landslide Early Warning & Risk Management Platform/i)).toBeDefined();

    // Check CTAs
    expect(screen.getByRole("link", { name: /Launch GIS Map/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Early Warning Dashboard/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Forecast Bulletin/i })).toBeDefined();

    // Check key metrics
    expect(screen.getByText("1,248")).toBeDefined();
    expect(screen.getByText("14 Routes")).toBeDefined();
    expect(screen.getByText("-28.4 mm/yr")).toBeDefined();
    expect(screen.getByText("ADVISORY")).toBeDefined();
  });

  it("renders NasaLhasaHydrology with GPM IMERG 7-day ARI, SMAP soil moisture, and expandable graph", () => {
    render(<NasaLhasaHydrology />);

    expect(screen.getByText(/NASA LHASA v2 • GLOBAL SATELLITE HYDROLOGICAL TELEMETRY/i)).toBeDefined();
    expect(screen.getByText(/7-Day ARI Index/i)).toBeDefined();
    expect(screen.getByText("286.4")).toBeDefined();
    expect(screen.getByText(/SMAP Soil Saturation/i)).toBeDefined();
    expect(screen.getByText("82.4%")).toBeDefined();
    expect(screen.getByText(/LHASA NOWCAST: HIGH/i)).toBeDefined();

    // Verify Expand Graph Button exists and toggles expanded canvas
    const expandBtn = screen.getByRole("button", { name: /Expand/i });
    expect(expandBtn).toBeDefined();
    expect(screen.queryByRole("region", { name: /Expanded Hydrological Time Series Graph/i })).toBeNull();

    // Expand graph
    fireEvent.click(expandBtn);
    expect(screen.getByRole("region", { name: /Expanded Hydrological Time Series Graph/i })).toBeDefined();
    expect(screen.getByText(/Expanded Basin Precipitation & Infiltration Hydrograph/i)).toBeDefined();
    expect(screen.getByText(/Daily Rainfall vs Threshold/i)).toBeDefined();
    expect(screen.getByText(/Cumulative Accumulation/i)).toBeDefined();

    // Collapse graph
    const collapseBtn = screen.getByRole("button", { name: /Collapse/i });
    fireEvent.click(collapseBtn);
    expect(screen.queryByRole("region", { name: /Expanded Hydrological Time Series Graph/i })).toBeNull();

    // Test basin selection
    const basinSelect = screen.getByLabelText(/Select Basin Scope/i);
    expect(basinSelect).toBeDefined();
    fireEvent.change(basinSelect, { target: { value: "kolasib-nh306" } });
    expect(screen.getByText("312.8")).toBeDefined();
    expect(screen.getByText("86.5%")).toBeDefined();
    expect(screen.getByText(/LHASA NOWCAST: SEVERE/i)).toBeDefined();

    // Test Share Dispatch
    const shareBtn = screen.getByRole("button", { name: /Share Dispatch/i });
    expect(shareBtn).toBeDefined();
    fireEvent.click(shareBtn);
    expect(screen.getByText(/Copied!/i)).toBeDefined();
  });

  it("renders LewsForecastAssistant with GSI horizon selector and IIT Mandi 4-tier matrix", () => {
    render(<LewsForecastAssistant />);

    // Check title and description
    expect(screen.getByText(/IIT MANDI GEE LEWS INTEGRATION/i)).toBeDefined();
    expect(screen.getByText(/Landslide Early Warning & Threat Matrix/i)).toBeDefined();

    // Check GSI Bulletin Horizon buttons and dynamic state
    const horizon48Btn = screen.getByRole("button", { name: /48h Extended Forecast/i });
    expect(horizon48Btn).toBeDefined();
    fireEvent.click(horizon48Btn);
    expect(screen.getByText(/48h Extended Multi-Model Forecast/i)).toBeDefined();

    const horizon72Btn = screen.getByRole("button", { name: /72h Synoptic Outlook/i });
    expect(horizon72Btn).toBeDefined();
    fireEvent.click(horizon72Btn);
    expect(screen.getByText(/72h Synoptic Regional Outlook/i)).toBeDefined();

    // Check 4 tiers in legend
    expect(screen.getByText(/Extreme \(≥98%\)/i)).toBeDefined();
    expect(screen.getByText(/High \(95–98%\)/i)).toBeDefined();
    expect(screen.getByText(/Moderate \(90–95%\)/i)).toBeDefined();
    expect(screen.getByText(/Low \(<90%\)/i)).toBeDefined();

    // Check district switcher
    const kolasibBtn = screen.getByRole("button", { name: /Kolasib/i });
    expect(kolasibBtn).toBeDefined();
    fireEvent.click(kolasibBtn);
    expect(screen.getAllByText(/Kolasib/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/NH-306 \(Silchar-Aizawl Supply Lifeline\)/i)).toBeDefined();

    // Switch back to 24h
    const horizon24Btn = screen.getByRole("button", { name: /24h Active Bulletin/i });
    fireEvent.click(horizon24Btn);
    expect(screen.getByText(/24h Active Real-Time Bulletin/i)).toBeDefined();
    expect(screen.getByText(/128 mm/i)).toBeDefined();

    // Check lookback day toggle and dynamic updates
    const lookbackBtn = screen.getByRole("button", { name: /-1d/i });
    expect(lookbackBtn).toBeDefined();
    fireEvent.click(lookbackBtn);
    expect(screen.getByText(/Historical Lookback Acquisition/i)).toBeDefined();
    expect(screen.getByText(/94.5 mm/i)).toBeDefined();

    // Check share briefing button
    const shareBtn = screen.getByRole("button", { name: /Share Briefing/i });
    expect(shareBtn).toBeDefined();
    fireEvent.click(shareBtn);
    expect(screen.getByText(/Copied!/i)).toBeDefined();
  });

  it("renders AmritaKigamGeotech with Factor of Safety Fs dial and subsurface piezometer columns", () => {
    render(<AmritaKigamGeotech />);

    expect(screen.getByText(/AMRITA AWNA IoT MESH & KIGAM GEOTECHNICAL MONITORING/i)).toBeDefined();
    expect(screen.getByText(/KIGAM Slope Stability Meter/i)).toBeDefined();
    expect(screen.getByText("1.08")).toBeDefined();
    expect(screen.getByText(/CRITICAL CREEP WATCH/i)).toBeDefined();
    expect(screen.getByText(/Amrita AWNA Subsurface Profile/i)).toBeDefined();
    expect(screen.getByText("3.0m")).toBeDefined();
    expect(screen.getByText("6.0m")).toBeDefined();
    expect(screen.getByText("9.0m")).toBeDefined();
    expect(screen.getByText(/IoT WSN Mesh/i)).toBeDefined();
    expect(screen.getByText("12.8 V")).toBeDefined();
    expect(screen.getByText("-82 dBm")).toBeDefined();

    // Test simulation scenario toggle
    const downpourBtn = screen.getByRole("button", { name: /Simulate Downpour/i });
    expect(downpourBtn).toBeDefined();
    fireEvent.click(downpourBtn);
    expect(screen.getByText("0.92")).toBeDefined();
    expect(screen.getAllByText(/CRITICAL FAILURE IMMINENT/i).length).toBeGreaterThan(0);

    // Switch back to real-time
    const realtimeBtn = screen.getByRole("button", { name: /Real-Time Telemetry/i });
    fireEvent.click(realtimeBtn);
    expect(screen.getByText("1.08")).toBeDefined();

    // Test station switcher
    const stationSelect = screen.getByLabelText(/Select Station/i);
    expect(stationSelect).toBeDefined();
    fireEvent.change(stationSelect, { target: { value: "station-03" } });
    expect(screen.getByText("1.45")).toBeDefined();
    expect(screen.getAllByText(/GEOTECHNICALLY STABLE/i).length).toBeGreaterThan(0);

    // Test Share Dispatch
    const shareBtn = screen.getByRole("button", { name: /Share Dispatch/i });
    expect(shareBtn).toBeDefined();
    fireEvent.click(shareBtn);
    expect(screen.getByText(/Copied!/i)).toBeDefined();
  });

  it("renders BhuvanDisasterMonitor with highway corridor obstruction feed and scarp inventory", () => {
    render(<BhuvanDisasterMonitor />);

    expect(screen.getByText(/ISRO BHUVAN DISASTER MANAGEMENT SUPPORT/i)).toBeDefined();
    expect(screen.getByText(/NH-54/i)).toBeDefined();
    expect(screen.getByText(/SINGLE LANE/i)).toBeDefined();
    expect(screen.getAllByText(/^CLEAR$/i).length).toBeGreaterThan(0);

    // Switch to satellite scarp inventory
    const scarpTabBtn = screen.getByRole("button", { name: /Satellite Scarp Inventory/i });
    expect(scarpTabBtn).toBeDefined();
    fireEvent.click(scarpTabBtn);

    expect(screen.getByText("BHU-MZ-2026-004")).toBeDefined();
    expect(screen.getByText(/Durtlang Scarp Zone A/i)).toBeDefined();
  });

  it("renders IndiaGovMissionGrid with 6 mission category cards", () => {
    render(<IndiaGovMissionGrid />);

    expect(screen.getByText(/Operational Mission Categories/i)).toBeDefined();
    expect(screen.getByText(/Stage 5/i)).toBeDefined();
    expect(screen.getByText(/Quantitative Risk Engine/i)).toBeDefined();
    expect(screen.getByText(/InSAR Creep Watch/i)).toBeDefined();
    expect(screen.getByText(/Slope Unit GIS & Corridors/i)).toBeDefined();
    expect(screen.getByText(/Consequence Intelligence/i)).toBeDefined();
    expect(screen.getByText(/Action & Warning Ledger/i)).toBeDefined();
    expect(screen.getByText(/Field & Community Reporting/i)).toBeDefined();
  });

  it("renders full HomePage with all domain references and action center", () => {
    render(<HomePage />);

    expect(screen.getByText(/National Landslide Early Warning & Risk Management Platform/i)).toBeDefined();
    expect(screen.getByText(/NASA LHASA v2/i)).toBeDefined();
    expect(screen.getByText(/Landslide Early Warning & Threat Matrix/i)).toBeDefined();
    expect(screen.getByText(/AMRITA AWNA IoT/i)).toBeDefined();
    expect(screen.getByText(/Operational Situation & Action Center/i)).toBeDefined();
    expect(screen.getByText(/Real-Time Incident Dispatch/i)).toBeDefined();
  });

  it("switches telemetry domain in DomainTelemetryHub via feature select dropdown", () => {
    render(<DomainTelemetryHub />);

    const select = screen.getByLabelText(/Switch Telemetry Feature Domain/i);
    expect(select).toBeDefined();

    // Switch to hydrology
    fireEvent.change(select, { target: { value: "hydrology" } });
    expect(screen.getByText(/NASA LHASA v2 Satellite Hydrological Telemetry/i)).toBeDefined();

    // Switch to geotech
    fireEvent.change(select, { target: { value: "geotech" } });
    expect(screen.getByText(/AMRITA AWNA IoT Mesh & KIGAM Slope Stability/i)).toBeDefined();
  });

  it("filters mission categories in IndiaGovMissionGrid via category dropdown", () => {
    render(<IndiaGovMissionGrid />);

    const filterSelect = screen.getByLabelText(/Filter Mission Categories/i);
    expect(filterSelect).toBeDefined();

    // Filter to Predictive Hazard & AI
    fireEvent.change(filterSelect, { target: { value: "hazard-ai" } });
    expect(screen.getByText(/Quantitative Risk Engine/i)).toBeDefined();
    expect(screen.getByText(/InSAR Creep Watch/i)).toBeDefined();
    expect(screen.queryByText(/Slope Unit GIS & Corridors/i)).toBeNull();
    expect(screen.queryByText(/Action & Warning Ledger/i)).toBeNull();

    // Filter back to all
    fireEvent.change(filterSelect, { target: { value: "all" } });
    expect(screen.getByText(/Slope Unit GIS & Corridors/i)).toBeDefined();
    expect(screen.getByText(/Action & Warning Ledger/i)).toBeDefined();
  });
});
