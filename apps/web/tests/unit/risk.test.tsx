import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import RiskEnginePage from "@/app/risk/page";
import * as riskApi from "@/lib/risk";

// Mock risk API functions
vi.mock("@/lib/risk", async () => {
  const actual = await vi.importActual<typeof import("@/lib/risk")>("@/lib/risk");
  return {
    ...actual,
    fetchRiskPredictions: vi.fn(),
    fetchModelVersions: vi.fn(),
    fetchPredictionExplanation: vi.fn(),
    fetchPredictionEvidence: vi.fn(),
    triggerRiskRun: vi.fn(),
  };
});

describe("Stage 5 Transparent Risk Engine (Frontend Tests)", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    (process.env as any).NODE_ENV = "test";
  });

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
  });

  it("renders Stage 5 operational boundary banner and non-autonomous warning disclaimer", async () => {
    (riskApi.fetchRiskPredictions as any).mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, pages: 1 });
    (riskApi.fetchModelVersions as any).mockResolvedValue([]);

    render(<RiskEnginePage />);

    expect(
      screen.getByText(/Stage 5 Operational Boundary — Human Decision Support Only/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Risk estimates represent machine-learning associations derived from observational data/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/TRANSPARENT RISK ENGINE/i)).toBeInTheDocument();
  });

  it("renders active model card, probability calibration status, and accessible predictions table with demo badges", async () => {
    (riskApi.fetchRiskPredictions as any).mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, pages: 1 });
    (riskApi.fetchModelVersions as any).mockResolvedValue([]);

    render(<RiskEnginePage />);

    // Model cards
    expect(screen.getByText("lr-baseline-v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("DETERMINISTIC SUITE")).toBeInTheDocument();
    expect(screen.getByText("Platt Scaling (v1.0.0)")).toBeInTheDocument();

    // Accessible Table
    const table = screen.getByRole("table", { name: /Operational Landslide Risk Predictions/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByText("Subject Entity")).toBeInTheDocument();
    expect(screen.getByText("Calibrated Prob / Score")).toBeInTheDocument();
    expect(screen.getByText("Uncertainty")).toBeInTheDocument();
    expect(screen.getByText("Data Quality")).toBeInTheDocument();

    // Retained demo fixtures are explicitly labeled as DEMO / TEST DATA
    const demoBadges = screen.getAllByText(/DEMO \/ TEST DATA/i);
    expect(demoBadges.length).toBeGreaterThan(0);
  });

  it("filters predictions by risk level and status", async () => {
    (riskApi.fetchRiskPredictions as any).mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, pages: 1 });
    (riskApi.fetchModelVersions as any).mockResolvedValue([]);

    render(<RiskEnginePage />);

    // Demo predictions include su-miz-aiz-001 (VERY_HIGH) and su-miz-kol-001 (DATA_INSUFFICIENT)
    expect(screen.getByText("su-miz-aiz-001")).toBeInTheDocument();
    expect(screen.getByText("su-miz-kol-001")).toBeInTheDocument();

    // Filter by risk level
    const riskFilter = screen.getByLabelText(/Risk Level:/i);
    fireEvent.change(riskFilter, { target: { value: "VERY_HIGH" } });

    expect(screen.getByText("su-miz-aiz-001")).toBeInTheDocument();
    expect(screen.queryByText("su-miz-kol-001")).not.toBeInTheDocument();

    // Reset filter
    fireEvent.change(riskFilter, { target: { value: "ALL" } });
    expect(screen.getByText("su-miz-kol-001")).toBeInTheDocument();
  });

  it("renders authoritative backend explanation with all 5 features and confirms absence of legacy features", async () => {
    (riskApi.fetchRiskPredictions as any).mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, pages: 1 });
    (riskApi.fetchModelVersions as any).mockResolvedValue([]);
    (riskApi.fetchPredictionExplanation as any).mockResolvedValue({
      id: "expl-real-001",
      prediction_id: "risk-pred-001",
      top_contributing_features: [
        {
          feature_name: "slope_angle_deg",
          feature_value: 38.5,
          coefficient: 0.48,
          raw_contribution: 0.42,
          normalized_weight: 0.32,
          direction_of_influence: "INCREASES_RISK",
          association_statement: "Feature 'slope_angle_deg' elevated the model estimate (+0.42 log-odds contribution).",
        },
        {
          feature_name: "historical_event_density_30d",
          feature_value: 2.4,
          coefficient: 0.55,
          raw_contribution: 0.35,
          normalized_weight: 0.27,
          direction_of_influence: "INCREASES_RISK",
          association_statement: "Feature 'historical_event_density_30d' elevated the model estimate (+0.35 log-odds contribution).",
        },
        {
          feature_name: "soil_permeability_index",
          feature_value: 3.2,
          coefficient: -0.22,
          raw_contribution: 0.21,
          normalized_weight: 0.16,
          direction_of_influence: "INCREASES_RISK",
          association_statement: "Feature 'soil_permeability_index' elevated the model estimate (+0.21 log-odds contribution).",
        },
        {
          feature_name: "drainage_density",
          feature_value: 4.8,
          coefficient: 0.28,
          raw_contribution: 0.18,
          normalized_weight: 0.14,
          direction_of_influence: "INCREASES_RISK",
          association_statement: "Feature 'drainage_density' elevated the model estimate (+0.18 log-odds contribution).",
        },
        {
          feature_name: "road_proximity_m",
          feature_value: 350.0,
          coefficient: -0.32,
          raw_contribution: 0.14,
          normalized_weight: 0.11,
          direction_of_influence: "INCREASES_RISK",
          association_statement: "Feature 'road_proximity_m' elevated the model estimate (+0.14 log-odds contribution).",
        },
      ],
      summary_narrative: "Model estimate categorized as VERY_HIGH. Primary statistical drivers: slope_angle_deg, historical_event_density_30d.",
      baseline_intercept: -0.65,
      raw_model_score: 1.67,
      disclaimer: "DECISION SUPPORT ONLY: Feature contributions represent statistical association, not confirmed physical causality.",
      created_at: new Date().toISOString(),
    });
    (riskApi.fetchPredictionEvidence as any).mockResolvedValue([
      {
        id: "evid-real-001",
        prediction_id: "risk-pred-001",
        subject_type: "SLOPE_UNIT",
        subject_id: "su-miz-aiz-001",
        historical_events_count: 3,
        historical_event_ids: ["ls-01", "ls-02", "ls-03"],
        spatial_relation_notes: "3 historical ruptures documented.",
        observations_summary: { source: "FIELD_SURVEY" },
        created_at: new Date().toISOString(),
      },
    ]);

    render(<RiskEnginePage />);

    const inspectBtn = screen.getByLabelText(/Inspect explanation and evidence for su-miz-aiz-001/i);
    fireEvent.click(inspectBtn);

    // Modal opens & authoritative explanation loads
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("PREDICTION EXPLANATION & PROVENANCE")).toBeInTheDocument();
      expect(screen.getByText(/Features that Contributed to the Model Estimate/i)).toBeInTheDocument();
    });

    // All 5 authoritative features must be rendered
    expect(screen.getByText("slope_angle_deg")).toBeInTheDocument();
    expect(screen.getByText("historical_event_density_30d")).toBeInTheDocument();
    expect(screen.getByText("soil_permeability_index")).toBeInTheDocument();
    expect(screen.getByText("drainage_density")).toBeInTheDocument();
    expect(screen.getByText("road_proximity_m")).toBeInTheDocument();

    // Confirm that obsolete/stale features are NEVER rendered
    expect(screen.queryByText("rainfall_accumulated_24h")).not.toBeInTheDocument();
    expect(screen.queryByText("slope_angle_degrees")).not.toBeInTheDocument();
    expect(screen.queryByText("historical_landslide_count_5yr")).not.toBeInTheDocument();

    // Disclaimers and evidence
    expect(screen.getByText(/NON-CAUSAL DISCLAIMER/i)).toBeInTheDocument();
    expect(screen.getByText(/Ground-Truth Historical Evidence/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole("button", { name: /Close explanation dialog/i });
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("handles 404 / unavailable explanation gracefully without fabricating fallback data", async () => {
    (riskApi.fetchRiskPredictions as any).mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, pages: 1 });
    (riskApi.fetchModelVersions as any).mockResolvedValue([]);
    // Mock 404 rejection on explanation
    (riskApi.fetchPredictionExplanation as any).mockRejectedValue(new Error("Explanation not found (HTTP 404)"));
    (riskApi.fetchPredictionEvidence as any).mockResolvedValue([]);

    render(<RiskEnginePage />);

    const inspectBtn = screen.getByLabelText(/Inspect explanation and evidence for su-miz-aiz-001/i);
    fireEvent.click(inspectBtn);

    // Modal opens & displays truthful unavailable state
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("PREDICTION EXPLANATION & PROVENANCE")).toBeInTheDocument();
      expect(screen.getByText("Provenance & Explanation Unavailable")).toBeInTheDocument();
    });

    // Provenance guarantee notice is present
    expect(screen.getByText(/Operational Provenance Guarantee/i)).toBeInTheDocument();
    expect(screen.getByText(/Sentinel NER enforces strict anti-hallucination standards/i)).toBeInTheDocument();

    // Metadata trace is preserved
    expect(screen.getByText("PREDICTION ID")).toBeInTheDocument();
    expect(screen.getByText("risk-pred-001")).toBeInTheDocument();
    expect(screen.getByText("MODEL VERSION")).toBeInTheDocument();
    expect(screen.getAllByText("lr-baseline-v1.0.0").length).toBeGreaterThan(0);

    // Client demonstration record alert is shown
    expect(screen.getByText("CLIENT DEMONSTRATION RECORD")).toBeInTheDocument();

    // Strictly verify NO fabricated features or legacy weights are rendered
    expect(screen.queryByText(/Features that Contributed to the Model Estimate/i)).not.toBeInTheDocument();
    expect(screen.queryByText("rainfall_accumulated_24h")).not.toBeInTheDocument();
    expect(screen.queryByText("slope_angle_degrees")).not.toBeInTheDocument();
    expect(screen.queryByText("historical_landslide_count_5yr")).not.toBeInTheDocument();
    expect(screen.queryByText(/45%/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/28%/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/18%/i)).not.toBeInTheDocument();
  });

  it("handles network error explanation request truthfully", async () => {
    (riskApi.fetchRiskPredictions as any).mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, pages: 1 });
    (riskApi.fetchModelVersions as any).mockResolvedValue([]);
    (riskApi.fetchPredictionExplanation as any).mockRejectedValue(new Error("Network Error: Failed to fetch"));
    (riskApi.fetchPredictionEvidence as any).mockRejectedValue(new Error("Network Error"));

    render(<RiskEnginePage />);

    const inspectBtn = screen.getByLabelText(/Inspect explanation and evidence for su-miz-aiz-001/i);
    fireEvent.click(inspectBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Provenance & Explanation Unavailable")).toBeInTheDocument();
    });

    expect(screen.queryByText("rainfall_accumulated_24h")).not.toBeInTheDocument();
    expect(screen.queryByText("slope_angle_degrees")).not.toBeInTheDocument();
  });

  it("does not render client-side demo predictions in production mode when API returns empty", async () => {
    (process.env as any).NODE_ENV = "production";

    (riskApi.fetchRiskPredictions as any).mockResolvedValue({ items: [], total: 0, page: 1, limit: 50, pages: 1 });
    (riskApi.fetchModelVersions as any).mockResolvedValue([]);

    render(<RiskEnginePage />);

    // In production with empty API, no synthetic demo predictions are used
    await waitFor(() => {
      expect(
        screen.getByText(/No operational risk predictions available. Trigger a risk assessment run to evaluate terrain entities./i)
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("su-miz-aiz-001")).not.toBeInTheDocument();
    expect(screen.queryByText("su-miz-aiz-002")).not.toBeInTheDocument();
    expect(screen.queryByText("su-miz-kol-001")).not.toBeInTheDocument();
  });
});

