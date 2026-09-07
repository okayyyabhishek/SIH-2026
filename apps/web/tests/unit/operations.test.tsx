import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import OperationsPage from "@/app/operations/page";
import * as operationsApi from "@/lib/operations";
import { Action, Warning, Playbook, WarningLedgerEntry, checkLanguageSafety } from "@/lib/operations";

vi.mock("@/lib/operations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operations")>();
  return {
    ...actual,
    getActions: vi.fn(),
    getActionSummary: vi.fn(),
    getWarnings: vi.fn(),
    getWarningSummary: vi.fn(),
    getPlaybooks: vi.fn(),
    getLedgerEntries: vi.fn(),
    verifyLedgerChain: vi.fn(),
    reviewAction: vi.fn(),
    authorizeAction: vi.fn(),
    executeAction: vi.fn(),
    recordActionOutcome: vi.fn(),
    createWarning: vi.fn(),
    reviewWarning: vi.fn(),
    authorizeWarning: vi.fn(),
    dispatchWarning: vi.fn(),
    acknowledgeWarning: vi.fn(),
  };
});

const mockActions: Action[] = [
  {
    id: "act-test-001",
    title: "Culvert Scour Assessment: NH-54 km 18.2",
    action_type: "ROAD_ASSESSMENT",
    priority: "URGENT",
    status: "RECOMMENDED",
    district_id: "dst-aizawl",
    state_id: "IN-MZ",
    target_entity_type: "ROAD",
    target_entity_id: "road-nh54-aizawl",
    target_entity_name: "NH-54 Highway",
    recommended_agency_id: "PWD",
    recommendation_rationale: "Modeled saturation index indicates elevated culvert scour risk.",
    evidence: {
      hazard_index: 0.82,
      insar_los_displacement_mm: -24.5,
      uncertainty_level: "LOW",
    },
    created_by: "system:consequence-engine",
    created_at: "2026-09-04T12:00:00Z",
    updated_at: "2026-09-04T12:00:00Z",
    effective_from: "2026-09-04T12:00:00Z",
    expires_at: "2026-09-06T12:00:00Z",
    disclaimer: operationsApi.NON_AUTONOMOUS_ACTION_DISCLAIMER,
  },
  {
    id: "act-test-002",
    title: "Slope Angle Verification: Bridge 4 Approach",
    action_type: "ASSET_INSPECTION",
    priority: "CRITICAL",
    status: "PENDING_REVIEW",
    district_id: "dst-aizawl",
    state_id: "IN-MZ",
    target_entity_type: "ASSET",
    target_entity_id: "asset-bridge-4",
    target_entity_name: "Tuirial Bridge 4",
    recommended_agency_id: "BRO",
    recommendation_rationale: "InSAR line-of-sight creep detected on uphill abutment.",
    evidence: {
      hazard_index: 0.91,
      insar_los_displacement_mm: -38.2,
      uncertainty_level: "LOW",
    },
    review_notes: "Reviewed slope and soil profile. Awaiting authorization.",
    reviewed_by: "usr-tech-reviewer",
    reviewed_at: "2026-09-04T14:00:00Z",
    created_by: "system:consequence-engine",
    created_at: "2026-09-04T12:00:00Z",
    updated_at: "2026-09-04T14:00:00Z",
    effective_from: "2026-09-04T12:00:00Z",
    expires_at: "2026-09-06T12:00:00Z",
    disclaimer: operationsApi.NON_AUTONOMOUS_ACTION_DISCLAIMER,
  },
];

const mockWarnings: Warning[] = [
  {
    id: "wrn-test-001",
    warning_type: "ROAD_HAZARD_ADVISORY",
    status: "DISPATCHED",
    headline: "Road Hazard Advisory: Potential Rockfall Watch on NH-54 km 14-16",
    body: "Continuous rainfall has elevated slope saturation index. Drivers advised to exercise caution.",
    mizo_translation: "Fimkhur a ngai e.",
    district_id: "dst-aizawl",
    state_id: "IN-MZ",
    affected_entity_type: "ROAD",
    affected_entity_id: "road-nh54-aizawl",
    affected_entity_name: "NH-54 Highway",
    issuing_authority_id: "DDMA-AIZAWL",
    recipients: [
      {
        recipient_id: "rcp-pwd-1",
        recipient_name: "PWD Section Officer",
        agency_or_community: "PWD",
        contact_channel: "WEB_NOTIFICATION",
        contact_target: "pwd@sentinel.ner.internal",
        district_id: "dst-aizawl",
      },
    ],
    deliveries: [
      {
        id: "del-test-1",
        recipient_id: "rcp-pwd-1",
        channel: "WEB_NOTIFICATION",
        status: "SIMULATED",
        status_details: "SIMULATED: Sent in mock environment",
        sent_at: "2026-09-04T15:00:00Z",
        attempt_count: 1,
      },
    ],
    acknowledgements: [],
    escalations: [],
    created_at: "2026-09-04T14:30:00Z",
    effective_from: "2026-09-04T14:30:00Z",
    expires_at: "2026-09-05T14:30:00Z",
    created_by: "usr-ddma-lead",
    disclaimer: operationsApi.NON_AUTONOMOUS_WARNING_DISCLAIMER,
  },
];

const mockPlaybooks: Playbook[] = [
  {
    id: "pb-test-1",
    code: "PB-ROAD-EXPOSURE",
    name: "Highway Slope Assessment SOP",
    version: "1.2.0",
    trigger_criteria: "Hazard index > 0.70 on National/State Highway",
    applicable_entity_type: "ROAD",
    description: "Standard protocol for assessing highway slope stability.",
    required_authority_role: "STATE_AUTHORITY, DDMA, PWD, BRO",
    prohibited_actions: ["Do not issue road closure without police confirmation"],
    steps: [
      {
        step_number: 1,
        title: "Telemetry Review",
        description: "Review InSAR LOS deformation velocity",
        required_role: "FIELD_OFFICER",
        action_type: "ROAD_ASSESSMENT",
        is_mandatory: true,
      },
    ],
    is_active: true,
  },
];

describe("Stage 8 Operations & Action Control Frontend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(operationsApi.getActions).mockResolvedValue({
      items: mockActions,
      total: 2,
      pages: 1,
    });
    vi.mocked(operationsApi.getActionSummary).mockResolvedValue({
      total_actions: 2,
      recommended_count: 1,
      pending_review_count: 1,
      approved_count: 0,
      in_progress_count: 0,
      completed_count: 0,
      rejected_count: 0,
      expired_count: 0,
      critical_priority_count: 1,
    });
    vi.mocked(operationsApi.getWarnings).mockResolvedValue({
      items: mockWarnings,
      total: 1,
      pages: 1,
    });
    vi.mocked(operationsApi.getWarningSummary).mockResolvedValue({
      total_warnings: 1,
      draft_count: 0,
      in_review_count: 0,
      authorized_count: 0,
      dispatched_count: 1,
      acknowledged_count: 0,
      expired_count: 0,
      cancelled_count: 0,
    });
    vi.mocked(operationsApi.getPlaybooks).mockResolvedValue(mockPlaybooks);
    vi.mocked(operationsApi.getLedgerEntries).mockResolvedValue({
      items: [],
      total: 0,
      pages: 0,
    });
    vi.mocked(operationsApi.verifyLedgerChain).mockResolvedValue({
      district_id: "dst-aizawl",
      is_valid: true,
      total_entries: 3,
      genesis_hash: "0".repeat(64),
      latest_hash: "abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",
      message: "Cryptographic SHA-256 chain is valid and unbroken across 3 events.",
      verified_at: "2026-09-04T16:00:00Z",
    });
  });

  it("renders Stage 8 page title and Non-Autonomous Safety Categorization banner", async () => {
    render(<OperationsPage />);

    expect(screen.getByText(/OPERATIONAL INTERVENTION & ACTION CONTROL/i)).toBeInTheDocument();
    expect(screen.getByText(/NON-AUTONOMOUS CONTROL ACTIVE/i)).toBeInTheDocument();

    // Verify all 6 operational categories are distinctly presented
    expect(screen.getByText("OBSERVED FACT")).toBeInTheDocument();
    expect(screen.getByText("MODEL ESTIMATE")).toBeInTheDocument();
    expect(screen.getByText("CONSEQUENCE")).toBeInTheDocument();
    expect(screen.getByText("RECOMMENDATION")).toBeInTheDocument();
    expect(screen.getByText("HUMAN DECISION")).toBeInTheDocument();
    expect(screen.getByText("EXECUTED ACTION")).toBeInTheDocument();
  });

  it("renders action recommendations with priority, status, and telemetry", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Culvert Scour Assessment: NH-54 km 18.2")).toBeInTheDocument();
      expect(screen.getByText("Slope Angle Verification: Bridge 4 Approach")).toBeInTheDocument();
    });

    expect(screen.getAllByText("RECOMMENDED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PENDING_REVIEW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("URGENT").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CRITICAL").length).toBeGreaterThan(0);
    expect(screen.getByText("-24.5 mm/yr LOS")).toBeInTheDocument();
  });

  it("prohibits ungrounded alarmist language in warning safety validation", () => {
    const safeCheck = checkLanguageSafety("Road Hazard Advisory: Potential Rockfall Watch on NH-54");
    expect(safeCheck.isSafe).toBe(true);

    const alarmistCheck = checkLanguageSafety("LANDSLIDE WILL OCCUR on Highway 54 today!");
    expect(alarmistCheck.isSafe).toBe(false);
    expect(alarmistCheck.flaggedPhrase).toBe("LANDSLIDE WILL OCCUR");

    const roadClosedCheck = checkLanguageSafety("ROAD IS CLOSED due to rainfall");
    expect(roadClosedCheck.isSafe).toBe(false);
    expect(roadClosedCheck.flaggedPhrase).toBe("ROAD IS CLOSED");
  });

  it("opens Human Authorization Dossier modal on clicking Authorize button", async () => {
    render(<OperationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Slope Angle Verification: Bridge 4 Approach")).toBeInTheDocument();
    });

    // Switch to Authorization Queue tab
    const authTab = screen.getByText(/Authorization Queue/i);
    fireEvent.click(authTab);

    // Open dossier button
    const dossierBtn = screen.getAllByText(/Open Authorization Dossier/i)[0];
    fireEvent.click(dossierBtn);

    // Modal appears
    expect(screen.getByText("MANDATORY HUMAN AUTHORIZATION DOSSIER")).toBeInTheDocument();
    expect(screen.getByText(/Authorize Operational Intervention/i)).toBeInTheDocument();
    expect(screen.getByText("APPROVE")).toBeInTheDocument();
    expect(screen.getByText("REJECT")).toBeInTheDocument();
    expect(screen.getByText("REQUEST MORE INFORMATION")).toBeInTheDocument();
  });

  it("renders SOP playbooks tab with prohibited actions", async () => {
    render(<OperationsPage />);

    const pbTab = screen.getByText(/SOP Playbooks/i);
    fireEvent.click(pbTab);

    await waitFor(() => {
      expect(screen.getByText("PB-ROAD-EXPOSURE v1.2.0")).toBeInTheDocument();
      expect(screen.getByText("Highway Slope Assessment SOP")).toBeInTheDocument();
      expect(screen.getByText(/Do not issue road closure without police confirmation/i)).toBeInTheDocument();
    });
  });
});
