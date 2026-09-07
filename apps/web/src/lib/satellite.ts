/**
 * Sentinel NER — Satellite & InSAR Change Intelligence Client & Types (Stage 6)
 * Authoritative types and API functions for remote sensing observations,
 * InSAR LOS deformation, processing runs, and catalog connectors.
 */

export type SatelliteMission = "SENTINEL_1" | "SENTINEL_2" | "LANDSAT_8" | "LANDSAT_9" | "ALOS_2" | "NISAR";
export type ProductType = "SLC" | "GRD" | "RAW" | "INTERFEROGRAM" | "COHERENCE" | "DEFORMATION_VELOCITY" | "DISPLACEMENT_LOS" | "OPTICAL_CHANGE";
export type PassDirection = "ASCENDING" | "DESCENDING";
export type QualityState = "VALID" | "DEGRADED" | "LOW_COHERENCE" | "INSUFFICIENT_COVERAGE" | "PROCESSING_FAILED" | "DATA_UNAVAILABLE";
export type ProvenanceState = "REAL_EXTERNAL_DATA" | "REAL_UPLOADED_DATA" | "DETERMINISTIC_TEST_FIXTURE" | "DATASET_NOT_AVAILABLE";
export type JobStatus = "QUEUED" | "RUNNING" | "VALIDATING" | "PROCESSING" | "QC" | "COMPLETE" | "FAILED";
export type ConnectorStatus = "AVAILABLE" | "DEGRADED" | "AUTH_REQUIRED" | "RATE_LIMITED" | "UNAVAILABLE" | "NOT_CONFIGURED" | "DATASET_NOT_AVAILABLE";
export type UncertaintyState = "LOW" | "MEDIUM" | "HIGH" | "UNCERTAINTY_NOT_AVAILABLE";

export interface SatelliteObservation {
  id: string;
  mission: SatelliteMission;
  platform: string;
  instrument: string;
  product_type: ProductType;
  product_id: string;
  acquisition_time: string;
  processing_time: string;
  orbit_number?: number;
  relative_orbit?: number;
  pass_direction?: PassDirection;
  polarization?: string;
  mode?: string;
  footprint: {
    type: string;
    coordinates: number[][][];
  };
  bbox: number[];
  source_uri?: string;
  source_catalog: string;
  source_checksum?: string;
  spatial_reference: string;
  temporal_reference: string;
  processing_level: string;
  quality_state: QualityState;
  provenance_state: ProvenanceState;
  metadata?: Record<string, unknown>;
  district_id?: string;
  state?: string;
  created_at: string;
}

export interface InSARObservation {
  id: string;
  primary_scene_id: string;
  secondary_scene_id: string;
  acquisition_start: string;
  acquisition_end: string;
  temporal_baseline_days: number;
  perpendicular_baseline_meters: number;
  orbit_direction: PassDirection;
  relative_orbit?: number;
  processing_chain_version: string;
  displacement_product_reference?: string;
  coherence_product_reference?: string;
  deformation_geometry: {
    type: string;
    coordinates: number[][][];
  };
  displacement_statistics: {
    min_los_mm_yr: number;
    max_los_mm_yr: number;
    mean_los_mm_yr: number;
    std_los_mm_yr: number;
    unit: string;
    active_deformation_rate_detected?: boolean;
  };
  los_semantics: string;
  coherence_mean?: number;
  coherence_threshold: number;
  valid_pixel_ratio?: number;
  uncertainty: UncertaintyState;
  uncertainty_value_mm_yr?: number;
  quality_state: QualityState;
  processing_status: JobStatus;
  provenance_state: ProvenanceState;
  intersected_slope_units: string[];
  intersected_roads: string[];
  spatial_intersection_disclaimer: string;
  district_id?: string;
  state?: string;
  created_at: string;
}

export interface SatelliteProcessingRun {
  id: string;
  job_id: string;
  pipeline_type: string;
  pipeline_version: string;
  primary_input_id: string;
  secondary_input_id?: string;
  parameters: Record<string, unknown>;
  input_hashes: Record<string, string>;
  output_references: string[];
  output_checksums: Record<string, string>;
  status: JobStatus;
  retry_count: number;
  max_retries: number;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  failure_reason?: string;
  correlation_id?: string;
  software_revision: string;
  created_by: string;
  created_at: string;
}

export interface ExternalConnectorStatus {
  connector_id: string;
  name: string;
  catalog_type: string;
  endpoint_url: string;
  status: ConnectorStatus;
  auth_configured: boolean;
  last_checked: string;
  rate_limit_remaining?: number;
  message: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchSatelliteObservations(
  token: string,
  params?: {
    district_id?: string;
    mission?: string;
    product_type?: string;
    quality_state?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ items: SatelliteObservation[]; total: number; page: number; pages: number }> {
  if (!token || !token.trim()) {
    return { items: [], total: 0, page: 1, pages: 1 };
  }

  const query = new URLSearchParams();
  if (params?.district_id) query.set("district_id", params.district_id);
  if (params?.mission) query.set("mission", params.mission);
  if (params?.product_type) query.set("product_type", params.product_type);
  if (params?.quality_state) query.set("quality_state", params.quality_state);
  if (params?.page) query.set("page", params.page.toString());
  if (params?.limit) query.set("limit", params.limit.toString());

  const res = await fetch(`${API_BASE}/satellite/observations?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch satellite observations: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function fetchInSARObservations(
  token: string,
  params?: {
    district_id?: string;
    quality_state?: string;
    min_coherence?: number;
    page?: number;
    limit?: number;
  }
): Promise<{ items: InSARObservation[]; total: number; page: number; pages: number }> {
  if (!token || !token.trim()) {
    return { items: [], total: 0, page: 1, pages: 1 };
  }

  const query = new URLSearchParams();
  if (params?.district_id) query.set("district_id", params.district_id);
  if (params?.quality_state) query.set("quality_state", params.quality_state);
  if (params?.min_coherence !== undefined) query.set("min_coherence", params.min_coherence.toString());
  if (params?.page) query.set("page", params.page.toString());
  if (params?.limit) query.set("limit", params.limit.toString());

  const res = await fetch(`${API_BASE}/insar/observations?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch InSAR observations: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function fetchExternalConnectors(token: string): Promise<ExternalConnectorStatus[]> {
  if (!token || !token.trim()) {
    return [];
  }

  const res = await fetch(`${API_BASE}/satellite/connectors`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch connectors: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function fetchProcessingRuns(
  token: string,
  status?: string
): Promise<{ items: SatelliteProcessingRun[]; total: number }> {
  if (!token || !token.trim()) {
    return { items: [], total: 0 };
  }

  const query = new URLSearchParams();
  if (status) query.set("status", status);

  const res = await fetch(`${API_BASE}/satellite/processing-runs?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch processing runs: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}

export async function submitProcessingRun(
  token: string,
  payload: {
    pipeline_type: string;
    primary_input_id: string;
    secondary_input_id?: string;
    parameters?: Record<string, unknown>;
  }
): Promise<SatelliteProcessingRun> {
  const res = await fetch(`${API_BASE}/satellite/processing-runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.title || `Submission failed: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data;
}
