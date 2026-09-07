import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConsequencesPage from "@/app/consequences/page";
import * as consequenceApi from "@/lib/consequence";
import { ConsequenceRelationship, ConsequenceSummary } from "@/lib/consequence";

vi.mock("@/lib/consequence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/consequence")>();
  return {
    ...actual,
    fetchConsequenceRelationships: vi.fn(),
    fetchConsequenceSummary: vi.fn(),
    triggerConsequenceRun: vi.fn(),
  };
});

const mockRelationships: ConsequenceRelationship[] = [
  {
    id: "cr-aizawl-road-001",
    source_type: "SLOPE_UNIT",
    source_id: "su_aizawl_central_001",
    source_name: "SU-AIZ-001",
    target_type: "ROAD",
    target_id: "road-nh-54-aizawl",
    target_name: "NH-54 (Silchar-Aizawl Highway)",
    target_code: "NH-54",
    relationship_type: "TRANSPORT_CORRIDOR_EXPOSURE",
    spatial_relation: "INTERSECTS",
    distance_meters: 0.0,
    chainage_km: 42.5,
    chainage_status: "KM_42.5",
    authority_name: "Border Roads Organisation",
    organization_id: "org-bro",
    criticality: "CRITICAL",
    risk_prediction_id: "pred-aizawl-central-001",
    risk_level: "HIGH",
    satellite_observation_id: "insar-aizawl-2026-001",
    insar_deformation_mm_yr: -28.4,
    exposure_basis: "Direct intersection with slope unit boundary. Modeled high hazard.",
    assumptions: ["Standard 250m search radius", "Planar segment intersection"],
    evidence_ids: ["su_aizawl_central_001", "road-nh-54-aizawl", "insar-aizawl-2026-001"],
    confidence: "HIGH",
    uncertainty: "LOW",
    status: "ACTIVE",
    district_id: "dst-aizawl",
    state_code: "MZ",
    algorithm_version: "stage7-consequence-v1.0.0",
    generated_at: "2026-09-04T12:00:00Z",
    valid_from: "2026-09-04T12:00:00Z",
  },
  {
    id: "cr-aizawl-asset-002",
    source_type: "SLOPE_UNIT",
    source_id: "su_aizawl_central_001",
    source_name: "SU-AIZ-001",
    target_type: "ASSET",
    target_id: "asset-aizawl-hospital-001",
    target_name: "Aizawl Civil Hospital",
    target_code: "HOSP-01",
    relationship_type: "CRITICAL_INFRASTRUCTURE_EXPOSURE",
    spatial_relation: "NEARBY",
    distance_meters: 65.0,
    authority_name: "Department of Health",
    organization_id: "org-health",
    criticality: "CRITICAL",
    risk_prediction_id: "pred-aizawl-central-001",
    risk_level: "HIGH",
    satellite_observation_id: "insar-aizawl-2026-001",
    insar_deformation_mm_yr: -28.4,
    exposure_basis: "Within 65m proximity to active creep footprint SU-001.",
    assumptions: ["250m proximity buffer", "Authoritative facility coordinate"],
    evidence_ids: ["su_aizawl_central_001", "asset-aizawl-hospital-001"],
    confidence: "MEDIUM",
    uncertainty: "LOW",
    status: "ACTIVE",
    district_id: "dst-aizawl",
    state_code: "MZ",
    algorithm_version: "stage7-consequence-v1.0.0",
    generated_at: "2026-09-04T12:00:00Z",
    valid_from: "2026-09-04T12:00:00Z",
  },
  {
    id: "cr-aizawl-village-003",
    source_type: "SLOPE_UNIT",
    source_id: "su_aizawl_central_001",
    source_name: "SU-AIZ-001",
    target_type: "VILLAGE",
    target_id: "vil-durtlang-001",
    target_name: "Durtlang North",
    target_code: "VIL-01",
    relationship_type: "VILLAGE_PROXIMITY",
    spatial_relation: "NEARBY",
    distance_meters: 110.0,
    authority_name: "DDMA Aizawl",
    organization_id: "org-ddma",
    criticality: "HIGH",
    risk_prediction_id: "pred-aizawl-central-001",
    risk_level: "HIGH",
    exposure_basis: "Settlement centroid within 110m of modeled slope unit.",
    assumptions: ["Centroid-to-boundary distance"],
    evidence_ids: ["su_aizawl_central_001", "vil-durtlang-001"],
    confidence: "MEDIUM",
    uncertainty: "MEDIUM",
    status: "ACTIVE",
    district_id: "dst-aizawl",
    state_code: "MZ",
    algorithm_version: "stage7-consequence-v1.0.0",
    generated_at: "2026-09-04T12:00:00Z",
    valid_from: "2026-09-04T12:00:00Z",
  },
  {
    id: "cr-aizawl-asset-unknown-004",
    source_type: "SLOPE_UNIT",
    source_id: "su_aizawl_south_002",
    source_name: "SU-AIZ-002",
    target_type: "ASSET",
    target_id: "asset-unknown-culvert-099",
    target_name: "Culvert Box 14",
    target_code: "CUL-99",
    relationship_type: "ASSET_EXPOSURE",
    spatial_relation: "NEARBY",
    distance_meters: 180.0,
    criticality: "UNKNOWN",
    exposure_basis: "Proximity to SU-002 without Stage 5 risk prediction or chainage.",
    assumptions: ["250m search threshold"],
    evidence_ids: ["su_aizawl_south_002", "asset-unknown-culvert-099"],
    confidence: "LOW",
    uncertainty: "HIGH",
    status: "ACTIVE",
    district_id: "dst-aizawl",
    state_code: "MZ",
    algorithm_version: "stage7-consequence-v1.0.0",
    generated_at: "2026-09-04T12:00:00Z",
    valid_from: "2026-09-04T12:00:00Z",
  },
];

const mockSummary: ConsequenceSummary = {
  district_id: "dst-aizawl",
  total_relationships: 4,
  potentially_affected_roads_count: 1,
  linked_chainages_count: 1,
  exposed_assets_count: 2,
  critical_assets_count: 2,
  nearby_villages_count: 1,
  generated_at: "2026-09-04T12:00:00Z",
  disclaimer:
    "STAGE 7 STRICT BOUNDARY: Consequence Intelligence provides spatial exposure and operational proximity assessments. It does NOT execute autonomous closures, evacuations, or interventions.",
};

describe("Stage 7 Road & Asset Consequence Intelligence (Frontend Unit Tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (consequenceApi.fetchConsequenceRelationships as any).mockResolvedValue({
      items: mockRelationships,
      total: 4,
      page: 1,
      limit: 100,
      pages: 1,
    });
    (consequenceApi.fetchConsequenceSummary as any).mockResolvedValue(mockSummary);
  });

  it("renders the Stage 7 Consequence Intelligence Header and Non-Autonomous disclaimer banner", async () => {
    render(<ConsequencesPage />);

    expect(
      screen.getByRole("heading", { name: /Road & Asset Consequence Intelligence/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Stage 7 — Operational Lifeline Exposure & Spatial Relationship Analysis/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/STAGE 7 NON-AUTONOMOUS OPERATIONAL BOUNDARY NOTICE/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Consequence Intelligence denotes potential spatial exposure and infrastructure proximity only/i)
    ).toBeInTheDocument();
  });

  it("renders summary metric cards with accurate labels", async () => {
    render(<ConsequencesPage />);

    await waitFor(() => {
      expect(screen.getByText("Potentially Affected Roads")).toBeInTheDocument();
      expect(screen.getByText("Linked Road Chainages")).toBeInTheDocument();
      expect(screen.getByText("Critical Assets Exposed")).toBeInTheDocument();
      expect(screen.getByText("Nearby Habitations")).toBeInTheDocument();
    });
  });

  it("renders consequence relationships table with non-alarmist terminology", async () => {
    render(<ConsequencesPage />);

    await waitFor(() => {
      expect(screen.getByText("NH-54 (Silchar-Aizawl Highway)")).toBeInTheDocument();
      expect(screen.getByText("Aizawl Civil Hospital")).toBeInTheDocument();
      expect(screen.getByText("Durtlang North")).toBeInTheDocument();
      expect(screen.getByText("Culvert Box 14")).toBeInTheDocument();
    });

    // Verify explicit spatial relation tags
    expect(screen.getAllByText("INTERSECTS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NEARBY").length).toBeGreaterThan(0);

    // Verify no emergency action language ("CLOSED", "DAMAGED", "UNSAFE" as action/status)
    expect(screen.queryByText(/^CLOSED$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^DAMAGED$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^UNSAFE$/i)).not.toBeInTheDocument();
  });

  it("displays missing-data indicators truthfully", async () => {
    render(<ConsequencesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culvert Box 14")).toBeInTheDocument();
    });

    // Verify UNKNOWN criticality is displayed honestly
    expect(screen.getAllByText(/Criticality: UNKNOWN/i).length).toBeGreaterThan(0);
  });

  it("opens relationship detail drawer on Inspect button click and shows explainable evidence", async () => {
    render(<ConsequencesPage />);

    expect(await screen.findByText("NH-54 (Silchar-Aizawl Highway)")).toBeInTheDocument();

    // Click Inspect button
    const inspectBtns = await screen.findAllByRole("button", { name: /^Inspect$/i });
    fireEvent.click(inspectBtns[0]);

    // Verify drawer appears
    expect(await screen.findByText("Spatial Exposure Basis")).toBeInTheDocument();
    expect(screen.getAllByText(/KM 42.5/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Direct intersection with slope unit boundary/i)).toBeInTheDocument();

    // Close drawer
    const closeBtn = screen.getByRole("button", { name: /Close detail drawer/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText("Spatial Exposure Basis")).not.toBeInTheDocument();
  });

  it("filters relationships by target type filter", async () => {
    render(<ConsequencesPage />);

    await waitFor(() => {
      expect(screen.getByText("NH-54 (Silchar-Aizawl Highway)")).toBeInTheDocument();
    });

    // Filter by ROAD
    const filterSelect = screen.getByRole("combobox", { name: /Filter by target type/i });
    fireEvent.change(filterSelect, { target: { value: "ROAD" } });

    await waitFor(() => {
      expect(screen.getByText("NH-54 (Silchar-Aizawl Highway)")).toBeInTheDocument();
      expect(screen.queryByText("Aizawl Civil Hospital")).not.toBeInTheDocument();
      expect(screen.queryByText("Durtlang North")).not.toBeInTheDocument();
    });
  });

  describe("Provenance & Demo-Data Production Isolation", () => {
    it("never allows demo consequence relationships to masquerade in production (production isolation)", async () => {
      vi.stubEnv("NODE_ENV", "production");
      // Simulate unauthenticated / failed API call
      (consequenceApi.fetchConsequenceRelationships as any).mockRejectedValue(
        new Error("Unauthorized: token required")
      );

      render(<ConsequencesPage />);

      await waitFor(() => {
        expect(screen.getByText("No operational consequence relationships available.")).toBeInTheDocument();
      });

      // Ensure demo relationships are NOT rendered in production
      expect(screen.queryByText("SU-AIZ-101")).not.toBeInTheDocument();
      expect(screen.queryByText("rel-demo-road-01")).not.toBeInTheDocument();
      expect(screen.queryByText("pred-demo-01")).not.toBeInTheDocument();
      expect(screen.queryByText("insar-demo-01")).not.toBeInTheDocument();

      vi.unstubAllEnvs();
    });

    it("displays DEMO / TEST DATA badge and CLIENT DEMONSTRATION RECORD warning for demo fixtures", async () => {
      // Return a demo fixture marked with is_demo_fixture
      const demoFixtures: ConsequenceRelationship[] = [
        {
          ...mockRelationships[0],
          id: "rel-demo-road-01",
          source_name: "SU-AIZ-101",
          target_name: "National Highway 54",
          is_demo_fixture: true,
          evidence_ids: ["su-aizawl-101", "road-nh54-aizawl", "pred-demo-01", "insar-demo-01"],
        },
      ];
      (consequenceApi.fetchConsequenceRelationships as any).mockResolvedValue({
        items: demoFixtures,
        total: 1,
        page: 1,
        limit: 100,
        pages: 1,
      });

      render(<ConsequencesPage />);

      // Verify DEMO / TEST DATA badge in table
      await waitFor(() => {
        expect(screen.getByText("DEMO / TEST DATA")).toBeInTheDocument();
      });

      // Click inspect button
      const inspectBtns = await screen.findAllByRole("button", { name: /^Inspect$/i });
      fireEvent.click(inspectBtns[0]);

      // Verify CLIENT DEMONSTRATION RECORD warning banner in drawer
      const demoWarnings = await screen.findAllByText("CLIENT DEMONSTRATION RECORD");
      expect(demoWarnings.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/This consequence relationship is a development fixture containing simulated demonstration evidence/i)
      ).toBeInTheDocument();
      expect(screen.getByText("(Simulated Fixture Evidence)")).toBeInTheDocument();
    });

    it("renders authoritative backend relationships truthfully without fabricating Stage 5/6 evidence", async () => {
      // Backend relationship with no linked risk prediction or InSAR telemetry
      const backendRels: ConsequenceRelationship[] = [
        {
          ...mockRelationships[0],
          id: "rel-road-3527a2421e1a",
          source_name: "SU-MZ-AIZ-00101",
          target_name: "NH-54 (Aizawl - Lunglei Corridor)",
          is_demo_fixture: false,
          evidence_ids: ["su-aizawl-001", "road-nh54-aizawl"],
          risk_level: "RISK_DATA_UNAVAILABLE",
          insar_deformation_mm_yr: undefined,
        },
      ];
      (consequenceApi.fetchConsequenceRelationships as any).mockResolvedValue({
        items: backendRels,
        total: 1,
        page: 1,
        limit: 100,
        pages: 1,
      });

      render(<ConsequencesPage />);

      await waitFor(() => {
        expect(screen.getByText("NH-54 (Aizawl - Lunglei Corridor)")).toBeInTheDocument();
      });

      // Verify NO demo badge is rendered for real backend data
      expect(screen.queryByText("DEMO / TEST DATA")).not.toBeInTheDocument();

      // Open drawer
      const inspectBtns = await screen.findAllByRole("button", { name: /^Inspect$/i });
      fireEvent.click(inspectBtns[0]);

      // Verify drawer does NOT show CLIENT DEMONSTRATION RECORD
      expect(screen.queryByText("CLIENT DEMONSTRATION RECORD")).not.toBeInTheDocument();

      // Verify Stage 5 Model Risk and Stage 6 InSAR are truthfully marked UNAVAILABLE
      const unavailableBadges = screen.getAllByText("UNAVAILABLE");
      expect(unavailableBadges.length).toBeGreaterThanOrEqual(2);
    });

    it("renders truthful empty operational state when production has zero consequence relationships", async () => {
      vi.stubEnv("NODE_ENV", "production");
      (consequenceApi.fetchConsequenceRelationships as any).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 100,
        pages: 1,
      });

      render(<ConsequencesPage />);

      await waitFor(() => {
        expect(screen.getByText("No operational consequence relationships available.")).toBeInTheDocument();
      });
      expect(
        screen.getByText(/No operational consequence relationships have been computed or published for this district scope/i)
      ).toBeInTheDocument();

      vi.unstubAllEnvs();
    });

    it("strictly preserves Stage 7 non-autonomous operational boundary", async () => {
      render(<ConsequencesPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/STAGE 7 NON-AUTONOMOUS OPERATIONAL BOUNDARY NOTICE/i)
        ).toBeInTheDocument();
      });

      // Verify disclaimer points: spatial exposure only, no auto closure, no evacuation, no dispatch, human review
      const disclaimer = screen.getByText(/All operational interventions require authoritative human decision-maker review/i);
      expect(disclaimer).toBeInTheDocument();
      expect(disclaimer.textContent).toContain("does NOT automatically order road closures");
      expect(disclaimer.textContent).toContain("evacuations");
      expect(disclaimer.textContent).toContain("dispatch personnel");
      expect(disclaimer.textContent).toContain("potential spatial exposure");
    });

    it("gracefully renders relationships with null chainage_km and null insar without toFixed crash", async () => {
      const nullChainageRelationship: ConsequenceRelationship = {
        ...mockRelationships[0],
        id: "cr-null-chainage-001",
        target_name: "SH-12 Road Segment",
        target_type: "ROAD",
        chainage_km: null as unknown as undefined,
        chainage_status: "UNSURVEYED",
        insar_deformation_mm_yr: null as unknown as undefined,
        distance_meters: null as unknown as number,
      };

      vi.mocked(consequenceApi.fetchConsequenceRelationships).mockResolvedValueOnce({
        items: [nullChainageRelationship],
        total: 1,
        page: 1,
        pages: 1,
      });

      render(<ConsequencesPage />);

      await waitFor(() => {
        expect(screen.getByText("SH-12 Road Segment")).toBeInTheDocument();
      });

      // Chainage status should be rendered safely without throwing TypeError: Cannot read properties of null
      expect(screen.getByText("UNSURVEYED")).toBeInTheDocument();
      expect(screen.getByText("0.0 m")).toBeInTheDocument();
    });
  });
});
