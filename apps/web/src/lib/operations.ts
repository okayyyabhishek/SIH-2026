/**
 * Sentinel NER — Stage 8 Operational Control & Warning Client
 * Authoritative types, API endpoints, and safety validations for:
 * - Human-Authorized Action Recommendations
 * - Multi-Channel Controlled Warnings
 * - Truthful Notification Delivery & Recipient Acknowledgements
 * - Append-Only Cryptographic Warning Ledger & SOP Playbooks
 */

import { fetchFromAPI } from "./api";

// ============================================================
// SAFETY DISCLAIMERS & LANGUAGE CONSTRAINTS
// ============================================================

export const NON_AUTONOMOUS_ACTION_DISCLAIMER =
  "NON-AUTONOMOUS CONTROL PRINCIPLE: This operational action recommendation is a decision-support artifact. " +
  "It does NOT automatically close roads, evacuate persons, dispatch physical crews, or execute municipal interventions. " +
  "Explicit human review and authorized sign-off from a certified official is mandatory prior to execution.";

export const NON_AUTONOMOUS_WARNING_DISCLAIMER =
  "NON-AUTONOMOUS WARNING NOTICE: This warning advisory requires authoritative human review and explicit multi-tier authorization. " +
  "No model prediction or satellite observation is ever automatically broadcast to public recipients or external agencies.";

export const PROHIBITED_ALARMIST_PHRASES = [
  "LANDSLIDE WILL OCCUR",
  "CATASTROPHIC COLLAPSE IMMINENT",
  "EVACUATE IMMEDIATELY WITHOUT DELAY",
  "ROAD IS CLOSED",
  "HIGHWAY BLOCKED INDEFINITELY",
  "VILLAGE DESTROYED",
  "CERTAIN DISASTER",
  "100% GUARANTEED COLLAPSE",
] as const;

export function checkLanguageSafety(content: string): { isSafe: boolean; flaggedPhrase?: string } {
  const upper = content.toUpperCase();
  for (const phrase of PROHIBITED_ALARMIST_PHRASES) {
    if (upper.includes(phrase)) {
      return { isSafe: false, flaggedPhrase: phrase };
    }
  }
  return { isSafe: true };
}

// ============================================================
// ENUMS & LITERALS
// ============================================================

export type ActionType =
  | "FIELD_INSPECTION"
  | "ENGINEERING_REVIEW"
  | "ROAD_ASSESSMENT"
  | "ASSET_INSPECTION"
  | "SATELLITE_REVIEW"
  | "GEOLOGICAL_REVIEW"
  | "AUTHORITY_REVIEW"
  | "PUBLIC_WARNING_REVIEW";

export type ActionStatus =
  | "RECOMMENDED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "QUEUED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED";

export type ActionPriority = "ROUTINE" | "ELEVATED" | "URGENT" | "CRITICAL";

export type AuthorizationDecision = "APPROVE" | "REJECT" | "REQUEST_MORE_INFORMATION";

export type ActionOutcomeType =
  | "HAZARD_CONFIRMED_MITIGATED"
  | "FALSE_ALARM"
  | "STABILIZED"
  | "ESCALATED"
  | "MONITORING_CONTINUED";

export type WarningType =
  | "ROAD_HAZARD_ADVISORY"
  | "SLOPE_WATCH_BULLETIN"
  | "INFRASTRUCTURE_PROXIMITY_NOTICE"
  | "CIVIL_PROTECTION_ALERT"
  | "AGENCY_COORDINATION_ORDER";

export type WarningStatus =
  | "DRAFT"
  | "REVIEW"
  | "AUTHORIZED"
  | "DISPATCHING"
  | "DISPATCHED"
  | "PARTIALLY_ACKNOWLEDGED"
  | "ACKNOWLEDGED"
  | "EXPIRED"
  | "CANCELLED"
  | "RESOLVED";

export type DeliveryChannel = "SMS" | "EMAIL" | "PUSH_NOTIFICATION" | "WEB_NOTIFICATION" | "VHF_RADIO_RELAY";

export type DeliveryStatus =
  | "PENDING"
  | "REQUESTED"
  | "ACCEPTED_BY_PROVIDER"
  | "DELIVERED"
  | "FAILED"
  | "SIMULATED"
  | "NOT_CONFIGURED"
  | "UNKNOWN";

export type AcknowledgementState = "UNACKNOWLEDGED" | "ACKNOWLEDGED" | "DECLINED" | "DEFERRED";

export type LedgerEventType =
  | "ACTION_CREATED"
  | "ACTION_REVIEWED"
  | "ACTION_APPROVED"
  | "ACTION_REJECTED"
  | "ACTION_CANCELLED"
  | "ACTION_STARTED"
  | "ACTION_COMPLETED"
  | "ACTION_FAILED"
  | "WARNING_CREATED"
  | "WARNING_REVIEWED"
  | "WARNING_AUTHORIZED"
  | "WARNING_REJECTED"
  | "WARNING_DISPATCH_REQUESTED"
  | "WARNING_DISPATCHED"
  | "WARNING_DELIVERY_FAILED"
  | "WARNING_ACKNOWLEDGED"
  | "WARNING_ESCALATED"
  | "WARNING_CANCELLED"
  | "WARNING_EXPIRED";

// ============================================================
// DOMAIN MODELS
// ============================================================

export interface ActionEvidence {
  consequence_relationship_id?: string;
  risk_prediction_id?: string;
  hazard_index?: number;
  satellite_observation_ids?: string[];
  insar_los_displacement_mm?: number;
  coherence_score?: number;
  uncertainty_level?: string;
  temporal_window_start?: string;
  temporal_window_end?: string;
  synthesis_algorithm_version?: string;
}

export interface ActionAuthorization {
  authorizer_user_id: string;
  authorizer_name?: string;
  authorizer_role?: string;
  role?: string;
  authorizer_organization_id?: string;
  organization_id?: string;
  authorizer_jurisdiction?: string;
  jurisdiction_district_id?: string;
  decision: AuthorizationDecision;
  decision_timestamp: string;
  justification_comment?: string;
  justification?: string;
  evidence_snapshot_hash?: string;
  evidence_snapshot_version?: string;
  authorization_policy_version?: string;
  policy_version?: string;
}

export interface ActionExecution {
  assigned_agency_id: string;
  assigned_personnel?: string[];
  dispatched_at?: string;
  started_at?: string;
  completed_at?: string;
  arrived_on_site_at?: string;
  execution_notes?: string;
  failure_reason?: string;
}

export interface ActionOutcome {
  outcome_type: ActionOutcomeType;
  ground_observations: string;
  mitigation_applied?: string;
  inspector_user_id?: string;
  inspector_role?: string;
  recorded_by?: string;
  recorded_at: string;
  follow_up_recommended: boolean;
}

export interface Action {
  id: string;
  title: string;
  action_type: ActionType;
  priority: ActionPriority;
  status: ActionStatus;
  district_id: string;
  state_id: string;
  target_entity_type: string;
  target_entity_id: string;
  target_entity_name?: string;
  recommended_agency_id: string;
  recommendation_rationale: string;
  evidence: ActionEvidence;
  authorization?: ActionAuthorization;
  execution?: ActionExecution;
  outcome?: ActionOutcome;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  playbook_id?: string;
  idempotency_key?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  effective_from: string;
  expires_at: string;
  disclaimer: string;
}

export interface ActionSummary {
  total_actions: intNumber;
  recommended_count: intNumber;
  pending_review_count: intNumber;
  approved_count: intNumber;
  in_progress_count: intNumber;
  completed_count: intNumber;
  rejected_count: intNumber;
  expired_count: intNumber;
  critical_priority_count: intNumber;
}

type intNumber = number;

export interface WarningRecipient {
  recipient_id: string;
  recipient_name: string;
  agency_or_community: string;
  contact_channel: DeliveryChannel;
  contact_target: string;
  district_id: string;
}

export interface WarningDelivery {
  id: string;
  recipient_id: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  provider_reference?: string;
  status_details?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  attempt_count: number;
}

export interface WarningAcknowledgement {
  id: string;
  recipient_id: string;
  state: AcknowledgementState;
  acknowledged_at: string;
  channel: DeliveryChannel;
  notes?: string;
}

export interface WarningEscalation {
  id: string;
  escalation_level: number;
  trigger_reason: string;
  escalated_to_group: string;
  escalated_at: string;
  policy_reference: string;
}

export interface Warning {
  id: string;
  warning_type: WarningType;
  status: WarningStatus;
  headline: string;
  body: string;
  mizo_translation?: string;
  district_id: string;
  state_id: string;
  affected_entity_type: string;
  affected_entity_id: string;
  affected_entity_name?: string;
  issuing_authority_id: string;
  recipients: WarningRecipient[];
  deliveries: WarningDelivery[];
  acknowledgements: WarningAcknowledgement[];
  escalations: WarningEscalation[];
  authorized_by?: string;
  authorized_at?: string;
  authorization_justification?: string;
  created_at: string;
  effective_from: string;
  expires_at: string;
  created_by: string;
  disclaimer: string;
}

export interface WarningSummary {
  total_warnings: number;
  draft_count: number;
  in_review_count: number;
  authorized_count: number;
  dispatched_count: number;
  acknowledged_count: number;
  expired_count: number;
  cancelled_count: number;
}

export interface PlaybookStep {
  step_number: number;
  title: string;
  description: string;
  required_role: string;
  action_type?: ActionType;
  permitted_action_types?: string[];
  prohibited_actions?: string[];
  guidance_notes?: string;
  is_mandatory?: boolean;
}

export interface Playbook {
  id: string;
  code?: string;
  playbook_code?: string;
  name: string;
  version: string;
  trigger_criteria: string;
  applicable_entity_type?: string;
  applicable_consequence_types?: string[];
  description: string;
  required_authority_role: string;
  prohibited_actions?: string[];
  steps?: PlaybookStep[];
  is_active: boolean;
}

export interface WarningLedgerEntry {
  id: string;
  sequence_number: number;
  district_id: string;
  event_type: LedgerEventType;
  actor_user_id: string;
  actor_role: string;
  payload_json_canonical: string;
  prev_event_hash: string;
  current_event_hash: string;
  recorded_at: string;
  warning_id?: string;
  action_id?: string;
  payload: Record<string, unknown>;
}

export interface LedgerVerificationResult {
  district_id: string;
  is_valid: boolean;
  total_entries: number;
  genesis_hash: string;
  latest_hash?: string;
  corrupted_sequence_number?: number;
  message: string;
  verified_at: string;
}

// ============================================================
// API WRAPPERS
// ============================================================

export async function getActions(params?: {
  district_id?: string;
  status?: ActionStatus;
  priority?: ActionPriority;
  page?: number;
  limit?: number;
}): Promise<{ items: Action[]; total: number; pages: number }> {
  const q = new URLSearchParams();
  if (params?.district_id) q.set("district_id", params.district_id);
  if (params?.status) q.set("status", params.status);
  if (params?.priority) q.set("priority", params.priority);
  if (params?.page) q.set("page", params.page.toString());
  if (params?.limit) q.set("limit", params.limit.toString());

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await fetchFromAPI<{ data: { items: Action[]; total: number; pages: number } }>(
    `/api/v1/actions${queryStr}`
  );
  return res.data;
}

export async function getAction(actionId: string): Promise<Action> {
  const res = await fetchFromAPI<{ data: Action }>(`/api/v1/actions/${actionId}`);
  return res.data;
}

export async function createAction(payload: {
  title: string;
  action_type: ActionType;
  priority: ActionPriority;
  district_id: string;
  target_entity_type: string;
  target_entity_id: string;
  target_entity_name?: string;
  recommended_agency_id: string;
  recommendation_rationale: string;
  consequence_relationship_id?: string;
  playbook_id?: string;
  expires_at: string;
  idempotency_key?: string;
}): Promise<Action> {
  const res = await fetchFromAPI<{ data: Action }>("/api/v1/actions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function reviewAction(actionId: string, reviewNotes: string): Promise<Action> {
  const res = await fetchFromAPI<{ data: Action }>(`/api/v1/actions/${actionId}/review`, {
    method: "POST",
    body: JSON.stringify({ review_notes: reviewNotes }),
  });
  return res.data;
}

export async function authorizeAction(
  actionId: string,
  decision: AuthorizationDecision,
  justification: string
): Promise<Action> {
  const res = await fetchFromAPI<{ data: Action }>(`/api/v1/actions/${actionId}/authorize`, {
    method: "POST",
    body: JSON.stringify({ decision, justification }),
  });
  return res.data;
}

export async function executeAction(
  actionId: string,
  assignedAgencyId: string,
  assignedPersonnel: string[] = [],
  executionNotes?: string
): Promise<Action> {
  const res = await fetchFromAPI<{ data: Action }>(`/api/v1/actions/${actionId}/execute`, {
    method: "POST",
    body: JSON.stringify({
      assigned_agency_id: assignedAgencyId,
      assigned_personnel: assignedPersonnel,
      execution_notes: executionNotes,
    }),
  });
  return res.data;
}

export async function recordActionOutcome(
  actionId: string,
  outcomeType: ActionOutcomeType,
  groundObservations: string,
  mitigationApplied?: string,
  followUpRecommended = false
): Promise<Action> {
  const res = await fetchFromAPI<{ data: Action }>(`/api/v1/actions/${actionId}/outcome`, {
    method: "POST",
    body: JSON.stringify({
      outcome_type: outcomeType,
      ground_observations: groundObservations,
      mitigation_applied: mitigationApplied,
      follow_up_recommended: followUpRecommended,
    }),
  });
  return res.data;
}

export async function getActionSummary(districtId: string): Promise<ActionSummary> {
  const res = await fetchFromAPI<{ data: ActionSummary }>(`/api/v1/actions/summary/${districtId}`);
  return res.data;
}

export async function getWarnings(params?: {
  district_id?: string;
  status?: WarningStatus;
  warning_type?: WarningType;
  page?: number;
  limit?: number;
}): Promise<{ items: Warning[]; total: number; pages: number }> {
  const q = new URLSearchParams();
  if (params?.district_id) q.set("district_id", params.district_id);
  if (params?.status) q.set("status", params.status);
  if (params?.warning_type) q.set("warning_type", params.warning_type);
  if (params?.page) q.set("page", params.page.toString());
  if (params?.limit) q.set("limit", params.limit.toString());

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await fetchFromAPI<{ data: { items: Warning[]; total: number; pages: number } }>(
    `/api/v1/warnings${queryStr}`
  );
  return res.data;
}

export async function getWarning(warningId: string): Promise<Warning> {
  const res = await fetchFromAPI<{ data: Warning }>(`/api/v1/warnings/${warningId}`);
  return res.data;
}

export async function createWarning(payload: {
  warning_type: WarningType;
  headline: string;
  body: string;
  mizo_translation?: string;
  district_id: string;
  affected_entity_type: string;
  affected_entity_id: string;
  affected_entity_name?: string;
  issuing_authority_id: string;
  recipients?: WarningRecipient[];
  expires_at: string;
}): Promise<Warning> {
  const res = await fetchFromAPI<{ data: Warning }>("/api/v1/warnings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function reviewWarning(warningId: string, reviewComment: string): Promise<Warning> {
  const res = await fetchFromAPI<{ data: Warning }>(`/api/v1/warnings/${warningId}/review`, {
    method: "POST",
    body: JSON.stringify({ review_comment: reviewComment }),
  });
  return res.data;
}

export async function authorizeWarning(
  warningId: string,
  decision: "APPROVE" | "REJECT",
  justification: string
): Promise<Warning> {
  const res = await fetchFromAPI<{ data: Warning }>(`/api/v1/warnings/${warningId}/authorize`, {
    method: "POST",
    body: JSON.stringify({ decision, justification }),
  });
  return res.data;
}

export async function dispatchWarning(warningId: string, idempotencyKey?: string): Promise<Warning> {
  const res = await fetchFromAPI<{ data: Warning }>(`/api/v1/warnings/${warningId}/dispatch`, {
    method: "POST",
    body: JSON.stringify({ idempotency_key: idempotencyKey }),
  });
  return res.data;
}

export async function acknowledgeWarning(
  warningId: string,
  recipientId: string,
  channel: DeliveryChannel,
  notes?: string
): Promise<Warning> {
  const res = await fetchFromAPI<{ data: Warning }>(`/api/v1/warnings/${warningId}/acknowledge`, {
    method: "POST",
    body: JSON.stringify({
      recipient_id: recipientId,
      channel,
      notes,
    }),
  });
  return res.data;
}

export async function cancelWarning(warningId: string, cancellationReason: string): Promise<Warning> {
  const res = await fetchFromAPI<{ data: Warning }>(`/api/v1/warnings/${warningId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancellation_reason: cancellationReason }),
  });
  return res.data;
}

export async function getWarningSummary(districtId: string): Promise<WarningSummary> {
  const res = await fetchFromAPI<{ data: WarningSummary }>(`/api/v1/warnings/summary/${districtId}`);
  return res.data;
}

export async function getPlaybooks(): Promise<Playbook[]> {
  const res = await fetchFromAPI<{ data: Playbook[] | { items: Playbook[] } }>("/api/v1/playbooks");
  if (Array.isArray(res.data)) return res.data;
  return (res.data as any)?.items || [];
}

export async function getPlaybook(playbookId: string): Promise<Playbook> {
  const res = await fetchFromAPI<{ data: Playbook }>(`/api/v1/playbooks/${playbookId}`);
  return res.data;
}

export async function getLedgerEntries(params?: {
  district_id?: string;
  event_type?: LedgerEventType;
  warning_id?: string;
  action_id?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: WarningLedgerEntry[]; total: number; pages: number }> {
  const q = new URLSearchParams();
  if (params?.district_id) q.set("district_id", params.district_id);
  if (params?.event_type) q.set("event_type", params.event_type);
  if (params?.warning_id) q.set("warning_id", params.warning_id);
  if (params?.action_id) q.set("action_id", params.action_id);
  if (params?.page) q.set("page", params.page.toString());
  if (params?.limit) q.set("limit", params.limit.toString());

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  const res = await fetchFromAPI<{ data: { items: WarningLedgerEntry[]; total: number; pages: number } }>(
    `/api/v1/warning-ledger${queryStr}`
  );
  return res.data;
}

export async function getLedgerEntry(entryId: string): Promise<WarningLedgerEntry> {
  const res = await fetchFromAPI<{ data: WarningLedgerEntry }>(`/api/v1/warning-ledger/${entryId}`);
  return res.data;
}

export async function verifyLedgerChain(districtId: string): Promise<LedgerVerificationResult> {
  const res = await fetchFromAPI<{ data: LedgerVerificationResult }>(
    `/api/v1/warning-ledger/verify-chain/${districtId}`
  );
  return res.data;
}
