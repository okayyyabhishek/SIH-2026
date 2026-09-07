import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MapLayerControl from "@/components/map/MapLayerControl";
import MapFilterBar from "@/components/map/MapFilterBar";
import EntityDetailDrawer from "@/components/map/EntityDetailDrawer";
import AccessibleEntityList from "@/components/map/AccessibleEntityList";
import {
  District,
  Road,
  Asset,
  LandslideEvent,
  SlopeUnit,
  RoadChainage,
  Village,
} from "@/lib/domain";

// Synthetic Fixtures for Unit Testing
const MOCK_DISTRICT: District = {
  id: "dst-aizawl",
  name: "Aizawl District",
  code: "MZ-AIZ",
  state_code: "MZ",
  state_name: "Mizoram",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [92.65, 23.68],
        [92.8, 23.68],
        [92.8, 23.82],
        [92.65, 23.82],
        [92.65, 23.68],
      ],
    ],
  },
  status: "ACTIVE",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const MOCK_ROAD: Road = {
  id: "road-nh54",
  name: "National Highway 54 (Silchar - Aizawl)",
  road_code: "NH-54",
  road_type: "NATIONAL_HIGHWAY",
  authority_organization_id: "org-bro-pushpak",
  district_id: "dst-aizawl",
  state_code: "MZ",
  geometry: {
    type: "LineString",
    coordinates: [
      [92.71, 23.72],
      [92.72, 23.73],
      [92.73, 23.74],
    ],
  },
  operational_status: "OPERATIONAL",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const MOCK_ASSET: Asset = {
  id: "asset-civil-hospital",
  name: "Aizawl Civil Hospital",
  asset_type: "HEALTH",
  organization_id: "org-sdma-mizoram",
  district_id: "dst-aizawl",
  state_code: "MZ",
  geometry: {
    type: "Point",
    coordinates: [92.718, 23.728],
  },
  operational_status: "OPERATIONAL",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const MOCK_EVENT: LandslideEvent = {
  id: "evt-ls-001",
  event_reference: "LS-2026-MZ-001",
  event_time: "2026-06-15T04:30:00Z",
  geometry: {
    type: "Point",
    coordinates: [92.722, 23.732],
  },
  district_id: "dst-aizawl",
  state_code: "MZ",
  source: "FIELD_OBSERVATION",
  source_reference: "DDMA-LOG-442",
  status: "VERIFIED",
  description: "Slope failure near Hunthar Veng sector",
  created_at: "2026-06-15T05:00:00Z",
  updated_at: "2026-06-15T05:00:00Z",
};

describe("Sentinel NER — Stage 4 Geospatial UI Unit Tests", () => {
  it("renders MapLayerControl with all 7 entity layers and count indicators", () => {
    const onToggle = vi.fn();
    const visibleLayers = {
      districts: true,
      slope_units: true,
      roads: true,
      road_chainages: false,
      villages: true,
      assets: true,
      landslide_events: true,
    };
    const counts = {
      districts: 2,
      slope_units: 5,
      roads: 3,
      road_chainages: 12,
      villages: 8,
      assets: 4,
      landslide_events: 2,
    };

    render(
      <MapLayerControl
        visibleLayers={visibleLayers}
        onToggleLayer={onToggle}
        counts={counts}
      />
    );

    // Verify header and layer items
    expect(screen.getByText(/OPERATIONAL LAYERS/i)).toBeDefined();
    expect(screen.getByText("Districts")).toBeDefined();
    expect(screen.getByText("Slope Units")).toBeDefined();
    expect(screen.getByText("Roads")).toBeDefined();
    expect(screen.getByText("Road Chainages")).toBeDefined();
    expect(screen.getByText("Villages")).toBeDefined();
    expect(screen.getByText("Assets & Facilities")).toBeDefined();
    expect(screen.getByText("Landslide Events")).toBeDefined();
    expect(screen.getByText("InSAR Change Evidence")).toBeDefined();
    expect(screen.getByText("Consequence Relationships")).toBeDefined();

    // Toggle layer
    const roadsCheckbox = screen.getByLabelText(/Toggle Roads layer/i);
    fireEvent.click(roadsCheckbox);
    expect(onToggle).toHaveBeenCalledWith("roads");

    // Toggle InSAR Change Evidence layer
    const insarCheckbox = screen.getByLabelText(/Toggle InSAR Change Evidence layer/i);
    fireEvent.click(insarCheckbox);
    expect(onToggle).toHaveBeenCalledWith("insar_deformation");

    // Verify layer counts rendered
    expect(screen.getAllByTitle(/loaded entities/i).length).toBeGreaterThan(0);
  });

  it("renders MapFilterBar with district selector, query modes, and dual-view toggle", () => {
    const onSelectDistrict = vi.fn();
    const onChangeQueryMode = vi.fn();
    const onChangeView = vi.fn();
    const onResetView = vi.fn();

    render(
      <MapFilterBar
        districts={[MOCK_DISTRICT]}
        selectedDistrictId=""
        onSelectDistrict={onSelectDistrict}
        queryMode="view"
        onChangeQueryMode={onChangeQueryMode}
        nearbyRadiusMeters={5000}
        onChangeNearbyRadius={vi.fn()}
        activeView="map"
        onChangeView={onChangeView}
        onResetView={onResetView}
        totalVisibleEntities={10}
      />
    );

    expect(screen.getByText(/District:/i)).toBeDefined();
    expect(screen.getByText("Aizawl District (MZ-AIZ)")).toBeDefined();

    // Change district
    const select = screen.getByLabelText(/Filter by administrative district/i);
    fireEvent.change(select, { target: { value: "dst-aizawl" } });
    expect(onSelectDistrict).toHaveBeenCalledWith("dst-aizawl");

    // Switch view mode to Accessible Data Roster
    const rosterButton = screen.getByRole("button", { name: /Data Roster/i });
    fireEvent.click(rosterButton);
    expect(onChangeView).toHaveBeenCalledWith("list");

    // Reset View button
    const resetButton = screen.getByLabelText(/Reset map view/i);
    fireEvent.click(resetButton);
    expect(onResetView).toHaveBeenCalled();
  });

  it("deduplicates districts and groups by State in MapFilterBar for all North East states", () => {
    const districtsWithDuplicates: District[] = [
      MOCK_DISTRICT,
      { ...MOCK_DISTRICT, id: "dst-aizawl-alias" }, // duplicate code MZ-AIZ
      {
        id: "dst-gangtok",
        name: "Gangtok District",
        code: "SK-GT",
        state_code: "SK",
        state_name: "Sikkim",
        geometry: { type: "Polygon", coordinates: [[[88.5, 27.2], [88.7, 27.2], [88.7, 27.4], [88.5, 27.4], [88.5, 27.2]]] },
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "dst-kamrup",
        name: "Kamrup Metropolitan",
        code: "AS-KM",
        state_code: "AS",
        state_name: "Assam",
        geometry: { type: "Polygon", coordinates: [[[91.6, 26.0], [91.9, 26.0], [91.9, 26.3], [91.6, 26.3], [91.6, 26.0]]] },
        status: "ACTIVE",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    render(
      <MapFilterBar
        districts={districtsWithDuplicates}
        selectedDistrictId=""
        onSelectDistrict={vi.fn()}
        queryMode="view"
        onChangeQueryMode={vi.fn()}
        nearbyRadiusMeters={5000}
        onChangeNearbyRadius={vi.fn()}
        activeView="map"
        onChangeView={vi.fn()}
        onResetView={vi.fn()}
        totalVisibleEntities={25}
      />
    );

    // Verify state optgroups exist
    expect(screen.getByRole("group", { name: "Mizoram" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Sikkim" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Assam" })).toBeDefined();

    // Verify Aizawl is only rendered once (deduplicated)
    const aizawlOptions = screen.getAllByText("Aizawl District (MZ-AIZ)");
    expect(aizawlOptions.length).toBe(1);
    expect(screen.getByText("Gangtok District (SK-GT)")).toBeDefined();
    expect(screen.getByText("Kamrup Metropolitan (AS-KM)")).toBeDefined();
  });

  it("renders EntityDetailDrawer with factual metadata and Stage 5+ intelligence notice", () => {
    const onClose = vi.fn();

    const { rerender } = render(
      <EntityDetailDrawer
        selectedEntity={{ type: "road", data: MOCK_ROAD }}
        onClose={onClose}
      />
    );

    // Verify road details
    expect(screen.getByText("National Highway 54 (Silchar - Aizawl)")).toBeDefined();
    expect(screen.getByText("NH-54")).toBeDefined();
    expect(screen.getByText("NATIONAL_HIGHWAY")).toBeDefined();
    expect(screen.getByText("org-bro-pushpak")).toBeDefined();

    // Verify Stage boundary separation notice
    expect(screen.getByText(/Downstream Intelligence Notice/i)).toBeDefined();
    expect(screen.getByText(/Hazard predictions, rainfall susceptibility/i)).toBeDefined();

    // Rerender with Landslide Event
    rerender(
      <EntityDetailDrawer
        selectedEntity={{ type: "landslide_event", data: MOCK_EVENT }}
        onClose={onClose}
      />
    );

    expect(screen.getByText("LS-2026-MZ-001")).toBeDefined();
    expect(screen.getByText("FIELD_OBSERVATION")).toBeDefined();
    expect(screen.getByText("Slope failure near Hunthar Veng sector")).toBeDefined();

    // Close button
    const closeBtn = screen.getByLabelText(/Close entity detail drawer/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders AccessibleEntityList with keyboard accessibility and keyword filtering", () => {
    const onSelect = vi.fn();
    const visibleLayers = {
      districts: true,
      slope_units: true,
      roads: true,
      road_chainages: true,
      villages: true,
      assets: true,
      landslide_events: true,
    };

    render(
      <AccessibleEntityList
        districts={[MOCK_DISTRICT]}
        slopeUnits={[]}
        roads={[MOCK_ROAD]}
        roadChainages={[]}
        villages={[]}
        assets={[MOCK_ASSET]}
        landslideEvents={[MOCK_EVENT]}
        visibleLayers={visibleLayers}
        selectedEntity={null}
        onSelectEntity={onSelect}
      />
    );

    // Heading and items visible
    expect(screen.getByText("VISIBLE OPERATIONAL ENTITIES")).toBeDefined();
    expect(screen.getByText("Aizawl District")).toBeDefined();
    expect(screen.getByText("Aizawl Civil Hospital")).toBeDefined();
    expect(screen.getByText("LS-2026-MZ-001")).toBeDefined();

    // Keyboard selection with Enter key
    const hospitalRow = screen.getByText("Aizawl Civil Hospital").closest("tr");
    expect(hospitalRow).toBeDefined();
    if (hospitalRow) {
      fireEvent.keyDown(hospitalRow, { key: "Enter", code: "Enter" });
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "asset",
        })
      );
    }

    // Filter by keyword
    const searchInput = screen.getByLabelText(/Filter entities by keyword/i);
    fireEvent.change(searchInput, { target: { value: "Civil Hospital" } });
    expect(screen.getByText("Aizawl Civil Hospital")).toBeDefined();
    expect(screen.queryByText("LS-2026-MZ-001")).toBeNull();
  });
});
