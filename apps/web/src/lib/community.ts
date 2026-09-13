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

/* ═══════════════════════════════════════════════════════════════════════════
   STAGE 10: GEOFENCED PRONE AREA PROXIMITY & SMS ALERT SERVICE
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SMSAlertEnrollment {
  phoneNumber: string;
  recipientName?: string;
  preferredLanguage: 'en' | 'hi' | 'mizo';
  districtId?: string;
  isActive: boolean;
  enrolledAt: string;
  lastNotifiedAt?: string;
}

export interface ProneAreaZone {
  id: string;
  name: string;
  corridorName: string;
  districtId: string;
  state: string;
  center: [number, number]; // [lat, lng]
  dangerRadiusMeters: number; // e.g. 500m (Red Zone)
  warningRadiusMeters: number; // e.g. 2500m (Advisory Zone)
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE';
  hazardType: ReportCategory;
  currentSituation: string; // What is currently happening in the affected prone area
  roadStatus: string;
  recommendedAction: string;
  activeSince: string;
}

export interface SMSAlertMessage {
  id: string;
  proneAreaId: string;
  proneAreaName: string;
  recipientPhone: string;
  senderId: string;
  messageText: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE';
  distanceMeters: number;
  dispatchedAt: string;
  acknowledged?: boolean;
}

/** Authoritative Northeast Landslide Prone Areas & Corridors */
export const PRONE_AREAS_NER: ProneAreaZone[] = [
  {
    id: 'zone-durtlang-01',
    name: 'Durtlang Ridge Corridor',
    corridorName: 'NH-54 km 44.2 (North Bend)',
    districtId: 'dst-aizawl',
    state: 'Mizoram',
    center: [23.7548, 92.7214],
    dangerRadiusMeters: 600,
    warningRadiusMeters: 2500,
    riskLevel: 'HIGH',
    hazardType: 'LANDSLIDE',
    currentSituation: 'Active scarp slip & progressive clay detachment. Approx 15cm road surface displacement with continuous rubble fall across northbound lane.',
    roadStatus: 'SINGLE LANE CONVOY ONLY • HEAVY TRUCKS DIVERTED',
    recommendedAction: 'Reduce speed to 15 km/h. Keep clear of cliff toe. Follow PWD / BRO Pushpak flaggers or divert via Sairang.',
    activeSince: '2026-09-08T06:30:00Z',
  },
  {
    id: 'zone-ranipool-02',
    name: 'Ranipool – Singtam Corridor',
    corridorName: 'NH-10 Himalayan Sector',
    districtId: 'dst-east-sikkim',
    state: 'Sikkim',
    center: [27.3389, 88.6138],
    dangerRadiusMeters: 750,
    warningRadiusMeters: 3000,
    riskLevel: 'CRITICAL',
    hazardType: 'ROCKFALL',
    currentSituation: 'Recurring boulder detachments from vertical gneissic cut slope above highway. High rainfall triggering rapid mudwash.',
    roadStatus: 'INTERMITTENT BLOCKAGE • ESCORTED TRANSIT',
    recommendedAction: 'Do not stop vehicles in rockfall chute zone. Evacuate roadside huts. Emergency machinery deployed by BRO Swastik.',
    activeSince: '2026-09-08T11:15:00Z',
  },
  {
    id: 'zone-ramhlun-03',
    name: 'Ramhlun North Tension Ridge',
    corridorName: 'Ramhlun Residential Spur',
    districtId: 'dst-aizawl',
    state: 'Mizoram',
    center: [23.7489, 92.7301],
    dangerRadiusMeters: 450,
    warningRadiusMeters: 2000,
    riskLevel: 'MODERATE',
    hazardType: 'CRACKING',
    currentSituation: 'Longitudinal tension cracks expanding across residential retaining wall and roadway following 65mm precipitation.',
    roadStatus: 'CAUTION ADVISORY • LIGHT VEHICLES ONLY',
    recommendedAction: 'Monitor building foundation cracks. Divert heavy axle loads. Report widening to Disaster Volunteer network.',
    activeSince: '2026-09-09T03:00:00Z',
  },
  {
    id: 'zone-bilkhawthlir-04',
    name: 'Bilkhawthlir Lowland Corridor',
    corridorName: 'NH-306 Valley Spur',
    districtId: 'dst-kolasib',
    state: 'Mizoram',
    center: [24.1628, 92.6845],
    dangerRadiusMeters: 500,
    warningRadiusMeters: 2200,
    riskLevel: 'HIGH',
    hazardType: 'WATER_SEEPAGE',
    currentSituation: 'Sudden high-volume turbid spring emergence at slope toe with active soil liquefaction and drainage ditch overflow.',
    roadStatus: 'FLOODED SLOPES • WATERLOGGED EMBANKMENT',
    recommendedAction: 'Avoid driving through muddy slope runoff. Watch for sudden road drop. PWD drainage team on site.',
    activeSince: '2026-09-08T18:45:00Z',
  },
  {
    id: 'zone-zote-05',
    name: 'Zote Access Corridor',
    corridorName: 'Champhai Bypass km 12',
    districtId: 'dst-champhai',
    state: 'Mizoram',
    center: [23.4721, 93.3289],
    dangerRadiusMeters: 400,
    warningRadiusMeters: 2000,
    riskLevel: 'MODERATE',
    hazardType: 'ROAD_DAMAGE',
    currentSituation: 'Step-settlement of 18cm along road foundation with shear slip cracks extending into agricultural terraces.',
    roadStatus: 'SLOW TRANSIT (MAX 10 KM/H)',
    recommendedAction: 'Follow flaggers. Avoid parking on outer embankment shoulder.',
    activeSince: '2026-09-09T05:20:00Z',
  },
];

/**
 * Calculates geodesic distance between two [latitude, longitude] coordinates using Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats standard Government Common Alerting Protocol (CAP) emergency SMS payload.
 */
export function generateProneAreaSMS(
  zone: ProneAreaZone,
  phone: string,
  distanceMeters: number
): SMSAlertMessage {
  const isInsideDanger = distanceMeters <= zone.dangerRadiusMeters;
  const distText =
    distanceMeters < 1000 ? `${distanceMeters}m` : `${(distanceMeters / 1000).toFixed(1)}km`;

  const urgencyTag = isInsideDanger
    ? 'CRITICAL RED ALERT • IMMEDIATE DANGER'
    : 'PROXIMITY WARNING • HAZARD ZONE APPROACH';

  const messageText = `[GOI-NDMA / NLEWS EMERGENCY SMS ALERT]
URGENCY: ${urgencyTag}
LOCATION: ${zone.name} (${zone.corridorName}, ${zone.state})
PROXIMITY: You are currently ${distText} from the affected active landslide prone zone.
WHAT IS HAPPENING: ${zone.currentSituation}
ROAD STATUS: ${zone.roadStatus}
ACTION REQUIRED: ${zone.recommendedAction}
EMERGENCY HELPLINE: 1078 (NDMA Toll-Free 24/7) • Ref: CAP-NER-${zone.id.toUpperCase()}-${Date.now().toString().slice(-4)}`;

  return {
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    proneAreaId: zone.id,
    proneAreaName: zone.name,
    recipientPhone: phone,
    senderId: 'GOI-NDMA',
    messageText,
    riskLevel: zone.riskLevel,
    distanceMeters,
    dispatchedAt: new Date().toISOString(),
    acknowledged: false,
  };
}
