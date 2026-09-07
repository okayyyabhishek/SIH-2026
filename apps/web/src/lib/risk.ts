/**
 * Sentinel NER — Risk Engine Typed Contracts & API Access (Stage 5)
 * Provides frontend interfaces for Risk Predictions, Explanations, Evidence,
 * Model Registry, and Scoped Execution Runs.
 */

import { fetchFromAPI } from "./api";
import { APIEnvelope, PaginatedResult } from "./domain";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
export type RiskSubjectType = "SLOPE_UNIT" | "DISTRICT" | "ROAD";
export type DataQualityState = "VALID" | "STALE" | "MISSING" | "OUT_OF_RANGE" | "LOW_QUALITY" | "PARTIAL" | "DATA_INSUFFICIENT";
export type UncertaintyLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type ModelLifecycleStatus = "DRAFT" | "VALIDATING" | "VALIDATED" | "APPROVED" | "ACTIVE" | "RETIRED";
export type ModelRunStatus = "RUNNING" | "COMPLETED" | "PARTIALLY_COMPLETED" | "FAILED";

export interface FeatureContribution {
  feature_name: string;
  feature_value?: number | null;
  coefficient: number;
  raw_contribution: number;
  normalized_weight: number;
  direction_of_influence: "INCREASES_RISK" | "DECREASES_RISK" | "NEUTRAL";
  association_statement: string;
}

export interface PredictionExplanation {
  id: string;
  prediction_id: string;
  top_contributing_features: FeatureContribution[];
  summary_narrative: string;
  baseline_intercept: number;
  raw_model_score: number;
  disclaimer: string;
  created_at: string;
}

export interface RiskEvidence {
  id: string;
  prediction_id: string;
  subject_type: RiskSubjectType;
  subject_id: string;
  historical_events_count: number;
  historical_event_ids: string[];
  spatial_relation_notes: string;
  observations_summary: Record<string, unknown>;
  created_at: string;
}

export interface RiskPrediction {
  id: string;
  subject_type: RiskSubjectType;
  subject_id: string;
  geographic_scope: Record<string, unknown>;
  district_id: string;
  state_code: string;
  model_version_id: string;
  model_run_id: string;
  generated_at: string;
  valid_from: string;
  valid_until: string;
  risk_value: number;
  risk_scale: string;
  risk_level: RiskLevel;
  raw_score: number;
  calibrated_probability?: number | null;
  calibration_method?: string | null;
  calibration_version?: string | null;
  uncertainty_score: number;
  uncertainty_level: UncertaintyLevel;
  confidence_state: string;
  feature_snapshot_id: string;
  evidence_ids: string[];
  explanation_id?: string | null;
  data_quality_state: DataQualityState;
  missing_feature_count: number;
  stale_feature_count: number;
  status: "COMPLETED" | "DATA_INSUFFICIENT" | "FAILED";
  is_demo_fixture?: boolean;
  created_at: string;
}

export interface ModelVersion {
  id: string;
  model_name: string;
  algorithm: string;
  version: string;
  feature_definition_version: string;
  training_dataset_reference?: string | null;
  training_period?: { start: string; end: string } | null;
  validation_period?: { start: string; end: string } | null;
  test_period?: { start: string; end: string } | null;
  hyperparameters: Record<string, unknown>;
  preprocessing_version: string;
  threshold_version: string;
  calibration_version?: string | null;
  artifact_reference: string;
  artifact_checksum_sha256: string;
  metrics?: Record<string, unknown> | null;
  limitations: string[];
  status: ModelLifecycleStatus;
  created_at: string;
  approved_by?: string | null;
  activated_at?: string | null;
}

export interface ModelRun {
  id: string;
  model_version_id: string;
  initiated_by: string;
  execution_time: string;
  dataset_reference?: string | null;
  district_id?: string | null;
  entities_evaluated: number;
  successful_predictions: number;
  rejected_predictions: number;
  failed_predictions: number;
  duration_ms: number;
  software_commit: string;
  status: ModelRunStatus;
  failure_reason?: string | null;
  correlation_id: string;
}

// ==============================================================================
// API ACCESS FUNCTIONS
// ==============================================================================

export async function fetchRiskPredictions(params: {
  subject_type?: RiskSubjectType;
  subject_id?: string;
  district_id?: string;
  model_version_id?: string;
  risk_level?: RiskLevel;
  status?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedResult<RiskPrediction>> {
  const query = new URLSearchParams();
  if (params.subject_type) query.set("subject_type", params.subject_type);
  if (params.subject_id) query.set("subject_id", params.subject_id);
  if (params.district_id) query.set("district_id", params.district_id);
  if (params.model_version_id) query.set("model_version_id", params.model_version_id);
  if (params.risk_level) query.set("risk_level", params.risk_level);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetchFromAPI<APIEnvelope<PaginatedResult<RiskPrediction>>>(
    `api/v1/risk/predictions?${query.toString()}`
  );
  return res.data;
}

export async function fetchRiskPredictionById(predictionId: string): Promise<RiskPrediction> {
  const res = await fetchFromAPI<APIEnvelope<RiskPrediction>>(`api/v1/risk/predictions/${predictionId}`);
  return res.data;
}

export async function fetchPredictionExplanation(predictionId: string): Promise<PredictionExplanation> {
  const res = await fetchFromAPI<APIEnvelope<PredictionExplanation>>(`api/v1/risk/predictions/${predictionId}/explanation`);
  return res.data;
}

export async function fetchPredictionEvidence(predictionId: string): Promise<RiskEvidence[]> {
  const res = await fetchFromAPI<APIEnvelope<RiskEvidence[]>>(`api/v1/risk/predictions/${predictionId}/evidence`);
  return res.data;
}

export async function fetchModelVersions(): Promise<ModelVersion[]> {
  const res = await fetchFromAPI<APIEnvelope<ModelVersion[]>>("api/v1/risk/models");
  return res.data;
}

export async function fetchModelVersionById(modelId: string): Promise<ModelVersion> {
  const res = await fetchFromAPI<APIEnvelope<ModelVersion>>(`api/v1/risk/models/${modelId}`);
  return res.data;
}

export async function fetchModelRuns(params: { model_version_id?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<ModelRun>> {
  const query = new URLSearchParams();
  if (params.model_version_id) query.set("model_version_id", params.model_version_id);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetchFromAPI<APIEnvelope<PaginatedResult<ModelRun>>>(`api/v1/risk/runs?${query.toString()}`);
  return res.data;
}

export async function triggerRiskRun(payload: {
  model_version_id?: string;
  district_id?: string;
  subject_type?: RiskSubjectType;
  subject_ids?: string[];
}): Promise<ModelRun> {
  const res = await fetchFromAPI<APIEnvelope<ModelRun>>("api/v1/risk/runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
