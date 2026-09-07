/**
 * Sentinel NER — Consequence Intelligence Client & Types (Stage 7)
 * Authoritative types and API functions for Road & Asset Consequence Intelligence,
 * spatial exposure analysis, chainage identification, and decision support.
 */

export type ConsequenceSourceType = "SLOPE_UNIT" | "LANDSLIDE_EVENT" | "RISK_PREDICTION" | "INSAR_OBSERVATION";
export type ConsequenceTargetType = "ROAD" | "ROAD_CHAINAGE" | "ASSET" | "VILLAGE";
export type SpatialRelationType = "INTERSECTS" | "WITHIN" | "NEARBY" | "CONTAINS" | "OVERLAPS";
export type ConsequenceCategory =
  | "ROAD_EXPOSURE"
  | "ASSET_EXPOSURE"
  | "VILLAGE_PROXIMITY"
  | "TRANSPORT_CORRIDOR_EXPOSURE"
  | "CRITICAL_INFRASTRUCTURE_EXPOSURE";
export type AssetCriticality = "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNKNOWN";
export type ConsequenceConfidence = "HIGH" | "MEDIUM" | "LOW";
export type UncertaintyLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type RelationshipStatus = "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
export type JobStatus = "QUEUED" | "RUNNING" | "ANALYZING" | "QC" | "COMPLETE" | "FAILED";

export const NON_AUTONOMOUS_DISCLAIMER =
  "Stage 7 Consequence Intelligence denotes potential spatial exposure and infrastructure proximity only. " +
  "It does NOT automatically order road closures, evacuations, dispatch personnel, or broadcast public alerts. " +
  "All operational interventions require authoritative human decision-maker review.";

export const ROAD_EXPOSURE_TERMINOLOGY =
  "Road corridor is POTENTIALLY AFFECTED / SPATIALLY EXPOSED based on geometric proximity to modeled hazard or " +
  "measured deformation. It is NOT designated as CLOSED without authoritative administrative or police order.";

export const ASSET_EXPOSURE_TERMINOLOGY =
  "Asset is POTENTIALLY EXPOSED based on spatial proximity. It is NOT designated as DAMAGED without " +
  "authoritative physical field structural assessment.";

export const VILLAGE_EXPOSURE_TERMINOLOGY =
  "Village settlement is SPATIALLY EXPOSED / PROXIMITY IDENTIFIED. It is NOT designated as UNSAFE or " +
  "requiring evacuation without formal administrative disaster declaration.";

export const CHAINAGE_DATA_UNAVAILABLE_CODE = "CHAINAGE_DATA_UNAVAILABLE";
export const RISK_DATA_UNAVAILABLE_CODE = "RISK_DATA_UNAVAILABLE";
export const SATELLITE_EVIDENCE_UNAVAILABLE_CODE = "SATELLITE_EVIDENCE_UNAVAILABLE";
export const ROAD_GEOMETRY_UNAVAILABLE_CODE = "ROAD_GEOMETRY_UNAVAILABLE";
export const CRITICALITY_UNKNOWN_CODE = "CRITICALITY_UNKNOWN";

export interface ConsequenceRelationship {
  id: string;
  source_type: ConsequenceSourceType;
  source_id: string;
  source_name?: string;
  target_type: ConsequenceTargetType;
  target_id: string;
  target_name?: string;
  target_code?: string;
  relationship_type: ConsequenceCategory;
  spatial_relation: SpatialRelationType;
  distance_meters: number;
  intersection_ratio?: number | null;
  exposure_basis: string;
  evidence_ids: string[];
  risk_prediction_id?: string | null;
  risk_level?: string | null;
  satellite_observation_id?: string | null;
  insar_deformation_mm_yr?: number | null;
  criticality: AssetCriticality;
  confidence: ConsequenceConfidence;
  uncertainty: UncertaintyLevel;
  assumptions: string[];
  organization_id?: string | null;
  authority_name?: string | null;
  chainage_km?: number | null;
  chainage_status?: string | null;
  district_id: string;
  state_code: string;
  generated_at: string;
  valid_from: string;
  valid_until?: string;
  algorithm_version: string;
  status: RelationshipStatus;
  metadata?: Record<string, unknown>;
  is_demo_fixture?: boolean;
}

export interface ConsequenceRun {
  id: string;
  district_id: string;
  algorithm_version: string;
  status: JobStatus;
  candidate_count: number;
  relationship_count: number;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  failure_reason?: string;
  retry_count: number;
  correlation_id?: string;
  created_by: string;
  created_at: string;
}

export interface ConsequenceRunRequest {
  district_id: string;
  distance_threshold_m?: number;
  include_satellite_evidence?: boolean;
  include_risk_predictions?: boolean;
}

export interface ConsequenceSummary {
  district_id: string;
  total_relationships: number;
  potentially_affected_roads_count: number;
  linked_chainages_count: number;
  exposed_assets_count: number;
  critical_assets_count: number;
  nearby_villages_count: number;
  generated_at: string;
  disclaimer: string;
}

export interface ConsequenceFilterParams {
  district_id?: string;
  source_type?: ConsequenceSourceType;
  source_id?: string;
  target_type?: ConsequenceTargetType;
  target_id?: string;
  relationship_type?: ConsequenceCategory;
  spatial_relation?: SpatialRelationType;
  criticality?: AssetCriticality;
  page?: number;
  limit?: number;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1` : "http://localhost:8000/api/v1");

export async function fetchConsequenceRelationships(
  token: string,
  params?: ConsequenceFilterParams
): Promise<{ items: ConsequenceRelationship[]; total: number; page: number; pages: number }> {
  if (!token || !token.trim()) {
    return { items: [], total: 0, page: 1, pages: 1 };
  }

  const query = new URLSearchParams();
  if (params?.district_id) query.set("district_id", params.district_id);
  if (params?.source_type) query.set("source_type", params.source_type);
  if (params?.source_id) query.set("source_id", params.source_id);
  if (params?.target_type) query.set("target_type", params.target_type);
  if (params?.target_id) query.set("target_id", params.target_id);
  if (params?.relationship_type) query.set("relationship_type", params.relationship_type);
  if (params?.spatial_relation) query.set("spatial_relation", params.spatial_relation);
  if (params?.criticality) query.set("criticality", params.criticality);
  if (params?.page) query.set("page", params.page.toString());
  if (params?.limit) query.set("limit", params.limit.toString());

  const res = await fetch(`${API_BASE}/consequences/relationships?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch consequence relationships: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function fetchConsequenceRelationshipById(
  token: string,
  id: string
): Promise<ConsequenceRelationship> {
  if (!token || !token.trim()) {
    throw new Error("Authentication token is required to fetch consequence relationship.");
  }

  const res = await fetch(`${API_BASE}/consequences/relationships/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch consequence relationship: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function fetchEntityConsequences(
  token: string,
  entityType: string,
  entityId: string
): Promise<ConsequenceRelationship[]> {
  if (!token || !token.trim()) {
    return [];
  }

  const res = await fetch(`${API_BASE}/consequences/entities/${entityType}/${entityId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch entity consequences: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function fetchConsequenceSummary(
  token: string,
  districtId: string
): Promise<ConsequenceSummary | null> {
  if (!token || !token.trim()) {
    return null;
  }

  const res = await fetch(`${API_BASE}/consequences/summary?district_id=${districtId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch consequence summary: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function triggerConsequenceRun(
  token: string,
  payload: ConsequenceRunRequest
): Promise<ConsequenceRun> {
  const res = await fetch(`${API_BASE}/consequences/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.title || `Run trigger failed: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function fetchConsequenceRun(
  token: string,
  runId: string
): Promise<ConsequenceRun> {
  const res = await fetch(`${API_BASE}/consequences/runs/${runId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch consequence run: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}
