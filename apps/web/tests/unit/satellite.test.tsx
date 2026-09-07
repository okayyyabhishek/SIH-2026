import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreepWatchPage from "@/app/creep-watch/page";
import * as satelliteApi from "@/lib/satellite";
import { InSARObservation, ExternalConnectorStatus } from "@/lib/satellite";

// Mock satellite API functions
vi.mock("@/lib/satellite", async () => {
  const actual = await vi.importActual<typeof import("@/lib/satellite")>("@/lib/satellite");
  return {
    ...actual,
    fetchExternalConnectors: vi.fn(),
    fetchInSARObservations: vi.fn(),
    fetchSatelliteObservations: vi.fn(),
    fetchProcessingRuns: vi.fn(),
    submitProcessingRun: vi.fn(),
  };
});

const mockInSARObservations: InSARObservation[] = [
  {
    id: "insar_obs_champhai_test_001",
    primary_scene_id: "S1A_IW_SLC__1SDV_20260301T001500_M1",
    secondary_scene_id: "S1A_IW_SLC__1SDV_20260313T001500_M1",
    acquisition_start: "2026-03-01T00:15:00Z",
    acquisition_end: "2026-03-13T00:15:00Z",
    temporal_baseline_days: 12.0,
    perpendicular_baseline_meters: 42.5,
    orbit_direction: "ASCENDING",
    relative_orbit: 121,
    processing_chain_version: "sentinel-ner-insar-v1.0.0",
    deformation_geometry: {
      type: "Polygon",
      coordinates: [[[93.3, 23.4], [93.4, 23.4], [93.4, 23.5], [93.3, 23.5], [93.3, 23.4]]],
    },
    displacement_statistics: {
      min_los_mm_yr: -24.8,
      max_los_mm_yr: -2.1,
      mean_los_mm_yr: -18.4,
      std_los_mm_yr: 3.2,
      unit: "mm/year",
      active_deformation_rate_detected: true,
    },
    los_semantics: "LINE_OF_SIGHT_ONLY: Negative velocity indicates range increase / movement away from satellite sensor.",
    coherence_mean: 0.74,
    coherence_threshold: 0.3,
    valid_pixel_ratio: 0.91,
    uncertainty: "LOW",
    uncertainty_value_mm_yr: 2.1,
    quality_state: "VALID",
    processing_status: "COMPLETE",
    provenance_state: "DETERMINISTIC_TEST_FIXTURE",
    intersected_slope_units: ["su_champhai_north_042"],
    intersected_roads: ["NH-102B"],
    spatial_intersection_disclaimer: "SPATIAL INTERSECTION ONLY: Observed deformation footprint overlaps this slope unit boundary. Does NOT infer slope failure causation.",
    district_id: "dist-champhai",
    state: "Mizoram",
    created_at: "2026-03-13T06:05:00Z",
  },
];

const mockConnectors: ExternalConnectorStatus[] = [
  {
    connector_id: "copernicus_dataspace",
    name: "Copernicus Data Space Ecosystem (CDSE)",
    catalog_type: "STAC / OData API",
    endpoint_url: "https://dataspace.copernicus.eu/stac",
    status: "NOT_CONFIGURED",
    auth_configured: false,
    last_checked: "2026-09-04T20:00:00Z",
    message: "CDSE credentials not set in environment. Operational state truthful.",
  },
  {
    connector_id: "aws_earth_search",
    name: "AWS Open Data Earth Search (Element84 STAC)",
    catalog_type: "STAC API v1.0.0",
    endpoint_url: "https://earth-search.aws.element84.com/v1",
    status: "DATASET_NOT_AVAILABLE",
    auth_configured: true,
    last_checked: "2026-09-04T20:00:00Z",
    message: "STAC endpoint reachable but active radar scene bounds require operational search constraints.",
  },
];

describe("Stage 6 Creep Watch & InSAR Intelligence (Frontend Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (satelliteApi.fetchExternalConnectors as any).mockResolvedValue(mockConnectors);
    (satelliteApi.fetchInSARObservations as any).mockResolvedValue({
      items: mockInSARObservations,
      total: 1,
      page: 1,
      limit: 50,
      pages: 1,
    });
    (satelliteApi.fetchSatelliteObservations as any).mockResolvedValue({
      items: [
        {
          id: "S1A_IW_SLC__1SDV_20260313T001500_M1",
          mission: "SENTINEL_1",
          acquisition_time: "2026-03-13T00:15:00Z",
        },
        {
          id: "S1A_IW_SLC__1SDV_20260301T001500_M1",
          mission: "SENTINEL_1",
          acquisition_time: "2026-03-01T00:15:00Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
      pages: 1,
    });
    (satelliteApi.fetchProcessingRuns as any).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      pages: 1,
    });
  });

  it("renders Stage 6 operational boundary banner and non-autonomous warning disclaimer", async () => {
    render(<CreepWatchPage />);

    expect(
      screen.getByText(/SATELLITE & INSAR CHANGE INTELLIGENCE/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Operational Decision Support Boundary \(Non-Autonomous Principle\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Remote sensing evidence indicates/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Observed spatial overlap with slope units denotes geometric co-location only/i)
    ).toBeInTheDocument();
  });

  it("renders truthful external connector status cards with anti-fabrication statement", async () => {
    render(<CreepWatchPage />);

    await waitFor(() => {
      expect(screen.getByText("Copernicus Data Space Ecosystem (CDSE)")).toBeInTheDocument();
      expect(screen.getByText("NOT_CONFIGURED")).toBeInTheDocument();
      expect(screen.getByText("AWS Open Data Earth Search (Element84 STAC)")).toBeInTheDocument();
      expect(screen.getByText("DATASET_NOT_AVAILABLE")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Upstream Satellite Catalogs & Live Connectors/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Anti-Fabrication Guard: Live Status Enforced/i)
    ).toBeInTheDocument();
  });

  it("renders accessible InSAR deformation roster and inspects provenance with LOS disclaimer", async () => {
    render(<CreepWatchPage />);

    // Check table rendering with async findBy
    expect(await screen.findByText(/-18.4 mm\/yr/i, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /InSAR Observations Table/i })).toBeInTheDocument();
    expect(screen.getAllByText("VALID").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("insar_obs_champhai_test_001")).toBeInTheDocument();

    // Click Inspect button
    const inspectBtn = await screen.findByRole("button", { name: /^Inspect$/i });
    fireEvent.click(inspectBtn);

    // Verify modal appears with Line-of-Sight Range Change disclaimer
    expect(await screen.findByText(/InSAR Observation Telemetry & Lineage/i)).toBeInTheDocument();
    expect(screen.getByText(/Line-of-Sight \(LOS\) Measurement Semantics/i)).toBeInTheDocument();
    expect(screen.getByText(/LINE_OF_SIGHT_ONLY/i)).toBeInTheDocument();
    expect(screen.getByText(/SPATIAL INTERSECTION ONLY/i)).toBeInTheDocument();
  });

  it("opens processing run dispatch modal with bounded parameters", async () => {
    render(<CreepWatchPage />);

    const runBtn = screen.getByRole("button", { name: /Dispatch InSAR Run/i });
    fireEvent.click(runBtn);

    expect(screen.getByText(/Dispatch InSAR Processing Job/i)).toBeInTheDocument();
    expect(screen.getByText(/Primary Acquisition Scene/i)).toBeInTheDocument();
    expect(screen.getByText(/Secondary Acquisition Scene/i)).toBeInTheDocument();
    expect(screen.getByText(/Perpendicular Baseline B⊥ \(Meters\)/i)).toBeInTheDocument();
  });
});
