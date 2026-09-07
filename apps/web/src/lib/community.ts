/**
 * Sentinel NER — Stage 10 Community Intelligence Typed API Client
 */

import { fetchFromAPI } from './api';

export type ReportCategory =
  | 'LANDSLIDE'
  | 'CRACKING'
  | 'ROAD_DAMAGE'
  | 'DEBRIS'
  | 'ROCKFALL'
  | 'DRAINAGE_BLOCKAGE'
  | 'WATER_SEEPAGE'
  | 'SLOPE_MOVEMENT'
  | 'OTHER';

export type ReportStatus =
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'UNVERIFIED'
  | 'PROBABLE'
  | 'VERIFIED'
  | 'ACTIONED'
  | 'RESOLVED'
  | 'REJECTED';

export type ModerationState = 'UNMODERATED' | 'IN_REVIEW' | 'MODERATED';

export interface MediaReference {
  object_key: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  uploaded_at: string;
  provenance?: Record<string, any>;
  is_verified_safe?: boolean;
}

export interface CitizenReport {
  id: string;
  reporter_id: string;
  organization_id?: string | null;
  district_id: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  location_accuracy_m?: number | null;
  location_source: string;
  coordinate_reference: string;
  reported_at: string;
  received_at: string;
  category: ReportCategory;
  description?: string | null;
  media_references: MediaReference[];
  source: string;
  status: ReportStatus;
  confidence: number;
  moderation_state: ModerationState;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  linked_entities?: Record<string, any>;
  provenance?: Record<string, any>;
  correlation_id: string;
  moderation_history?: Array<{
    id: string;
    moderator_id: string;
    moderator_name: string;
    old_status: ReportStatus;
    new_status: ReportStatus;
    reason: string;
    timestamp: string;
  }>;
}

export interface CommunityEventCluster {
  id: string;
  cluster_code: string;
  district_id: string;
  center_point: {
    type: string;
    coordinates: [number, number];
  };
  radius_meters: number;
  category: ReportCategory;
  report_ids: string[];
  report_count: number;
  confidence_score: number;
  explanation: string;
  first_reported_at: string;
  last_reported_at: string;
  status: string;
  created_at: string;
}

export interface CommunitySummary {
  total_reports: number;
  submitted_count: number;
  unverified_count: number;
  probable_count: number;
  verified_count: number;
  rejected_count: number;
  resolved_count: number;
  cluster_count: number;
  district_id?: string | null;
  generated_at: string;
}

export interface CitizenReportCreate {
  district_id: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  location_accuracy_m?: number;
  location_source?: string;
  category: ReportCategory;
  description?: string;
  media_references?: MediaReference[];
  source?: string;
  linked_entities?: Record<string, any>;
}

export async function fetchCitizenReports(params: {
  district_id?: string;
  category?: string;
  status?: string;
  moderation_state?: string;
  skip?: number;
  limit?: number;
} = {}): Promise<{ items: CitizenReport[]; total: number; skip: number; limit: number }> {
  const q = new URLSearchParams();
  if (params.district_id) q.set('district_id', params.district_id);
  if (params.category) q.set('category', params.category);
  if (params.status) q.set('status', params.status);
  if (params.moderation_state) q.set('moderation_state', params.moderation_state);
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.limit != null) q.set('limit', String(params.limit));

  const res = await fetchFromAPI<{ success: boolean; data: { items: CitizenReport[]; total: number; skip: number; limit: number } }>(
    `/api/v1/community/reports?${q.toString()}`
  );
  return res.data;
}

export async function fetchCommunitySummary(districtId?: string): Promise<CommunitySummary> {
  const q = districtId ? `?district_id=${districtId}` : '';
  const res = await fetchFromAPI<{ success: boolean; data: CommunitySummary }>(
    `/api/v1/community/reports/summary${q}`
  );
  return res.data;
}

export async function fetchCitizenReport(reportId: string): Promise<CitizenReport> {
  const res = await fetchFromAPI<{ success: boolean; data: CitizenReport }>(
    `/api/v1/community/reports/${reportId}`
  );
  return res.data;
}

export async function submitCitizenReport(payload: CitizenReportCreate): Promise<CitizenReport> {
  const res = await fetchFromAPI<{ success: boolean; data: CitizenReport; message: string }>(
    '/api/v1/community/reports',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  return res.data;
}

export async function moderateCitizenReport(
  reportId: string,
  newStatus: ReportStatus,
  reason: string,
  evidenceReferences: string[] = []
): Promise<CitizenReport> {
  const res = await fetchFromAPI<{ success: boolean; data: CitizenReport; message: string }>(
    `/api/v1/community/reports/${reportId}/moderate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_status: newStatus,
        reason,
        evidence_references: evidenceReferences,
      }),
    }
  );
  return res.data;
}

export async function fetchCommunityClusters(districtId?: string): Promise<CommunityEventCluster[]> {
  const q = districtId ? `?district_id=${districtId}` : '';
  const res = await fetchFromAPI<{ success: boolean; data: CommunityEventCluster[] }>(
    `/api/v1/community/clusters${q}`
  );
  return res.data;
}

export async function recalculateCommunityClusters(districtId: string): Promise<{
  district_id: string;
  clusters_generated: number;
  clusters: CommunityEventCluster[];
}> {
  const res = await fetchFromAPI<{
    success: boolean;
    data: { district_id: string; clusters_generated: number; clusters: CommunityEventCluster[] };
    message: string;
  }>(`/api/v1/community/clusters/recalculate?district_id=${districtId}`, {
    method: 'POST',
  });
  return res.data;
}
