/**
 * Sentinel NER — Domain Data Typed Contracts (Stage 3)
 * Provides frontend TypeScript interfaces for authoritative operational entities
 * and typed API access functions.
 */

import { fetchFromAPI } from "./api";

// ==============================================================================
// GEOJSON TYPES
// ==============================================================================

export type GeoJSONGeometryType = "Point" | "LineString" | "Polygon" | "MultiPolygon" | "MultiLineString";

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: [number, number][];
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

export interface GeoJSONMultiPolygon {
  type: "MultiPolygon";
  coordinates: [number, number][][][];
}

export type GeoJSONGeometry = GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon | GeoJSONMultiPolygon;

// ==============================================================================
// DOMAIN ENTITY INTERFACES
// ==============================================================================

export interface District {
  id: string;
  name: string;
  code: string;
  state_code: string;
  state_name: string;
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface SlopeUnit {
  id: string;
  code: string;
  name?: string;
  district_id: string;
  state_code: string;
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
  area_sqkm?: number;
  status: "ACTIVE" | "MONITORED" | "INACTIVE";
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Road {
  id: string;
  name: string;
  road_code: string;
  road_type: "NATIONAL_HIGHWAY" | "STATE_HIGHWAY" | "MAJOR_DISTRICT_ROAD" | "RURAL_ROAD" | "STRATEGIC_BORDER_ROAD";
  authority_organization_id: string;
  district_id: string;
  state_code: string;
  geometry: GeoJSONLineString;
  operational_status: "OPERATIONAL" | "RESTRICTED" | "CLOSED" | "UNDER_MAINTENANCE";
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface RoadChainage {
  id: string;
  road_id: string;
  chainage_km: number;
  geometry: GeoJSONPoint;
  district_id: string;
  state_code: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Village {
  id: string;
  name: string;
  village_code?: string;
  district_id: string;
  state_code: string;
  geometry: GeoJSONPoint | GeoJSONPolygon;
  population?: number;
  status: "ACTIVE" | "EVACUATED" | "INACCESSIBLE" | "HISTORICAL";
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Asset {
  id: string;
  name: string;
  asset_type: "ROAD_INFRASTRUCTURE" | "BRIDGE" | "CULVERT" | "RAILWAY" | "RAILWAY_STATION" | "POWER" | "WATER" | "TELECOM" | "HEALTH" | "SCHOOL" | "GOVERNMENT" | "OTHER";
  organization_id: string;
  district_id: string;
  state_code: string;
  geometry: GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon;
  operational_status: "OPERATIONAL" | "DAMAGED" | "DESTROYED" | "UNDER_REPAIR" | "OFFLINE";
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface LandslideEvent {
  id: string;
  event_reference: string;
  event_time: string;
  detected_time?: string;
  reported_time?: string;
  geometry: GeoJSONPoint | GeoJSONPolygon;
  district_id: string;
  state_code: string;
  source: "FIELD_OBSERVATION" | "OFFICIAL_RECORD" | "IMPORTED_DATA" | "REMOTE_SENSING" | "OTHER";
  source_reference?: string;
  status: "REPORTED" | "VERIFIED" | "HISTORICAL" | "REJECTED" | "ARCHIVED";
  description?: string;
  evidence_references?: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface APIEnvelope<T> {
  success: boolean;
  data: T;
  correlation_id: string;
  timestamp: string;
}

// ==============================================================================
// API HELPER ACCESSORS
// ==============================================================================

export async function fetchDistricts(params: { state_code?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<District>> {
  const query = new URLSearchParams();
  if (params.state_code) query.set("state_code", params.state_code);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetchFromAPI<APIEnvelope<PaginatedResult<District>>>(`api/v1/districts?${query.toString()}`);
  return res.data;
}

export async function fetchSlopeUnits(params: { district_id?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<SlopeUnit>> {
  const query = new URLSearchParams();
  if (params.district_id) query.set("district_id", params.district_id);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetchFromAPI<APIEnvelope<PaginatedResult<SlopeUnit>>>(`api/v1/slope-units?${query.toString()}`);
  return res.data;
}

export async function fetchRoads(params: { district_id?: string; authority_organization_id?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<Road>> {
  const query = new URLSearchParams();
  if (params.district_id) query.set("district_id", params.district_id);
  if (params.authority_organization_id) query.set("authority_organization_id", params.authority_organization_id);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetchFromAPI<APIEnvelope<PaginatedResult<Road>>>(`api/v1/roads?${query.toString()}`);
  return res.data;
}

export async function fetchLandslideEvents(params: { district_id?: string; status?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<LandslideEvent>> {
  const query = new URLSearchParams();
  if (params.district_id) query.set("district_id", params.district_id);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetchFromAPI<APIEnvelope<PaginatedResult<LandslideEvent>>>(`api/v1/landslide-events?${query.toString()}`);
  return res.data;
}

export async function fetchRoadChainages(params: { road_id?: string; district_id?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<RoadChainage>> {
  const query = new URLSearchParams();
  if (params.road_id) query.set("road_id", params.road_id);
  if (params.district_id) query.set("district_id", params.district_id);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetchFromAPI<APIEnvelope<PaginatedResult<RoadChainage>>>(`api/v1/road-chainages?${query.toString()}`);
  return res.data;
}

export async function fetchVillages(params: { district_id?: string; status?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<Village>> {
  const query = new URLSearchParams();
  if (params.district_id) query.set("district_id", params.district_id);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetchFromAPI<APIEnvelope<PaginatedResult<Village>>>(`api/v1/villages?${query.toString()}`);
  return res.data;
}

export async function fetchAssets(params: { district_id?: string; organization_id?: string; asset_type?: string; page?: number; limit?: number } = {}): Promise<PaginatedResult<Asset>> {
  const query = new URLSearchParams();
  if (params.district_id) query.set("district_id", params.district_id);
  if (params.organization_id) query.set("organization_id", params.organization_id);
  if (params.asset_type) query.set("asset_type", params.asset_type);
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const res = await fetchFromAPI<APIEnvelope<PaginatedResult<Asset>>>(`api/v1/assets?${query.toString()}`);
  return res.data;
}

export interface SpatialQueryResponse {
  items: Array<Record<string, unknown>>;
  count: number;
  districts?: District[];
  slope_units?: SlopeUnit[];
  roads?: Road[];
  road_chainages?: RoadChainage[];
  villages?: Village[];
  assets?: Asset[];
  landslide_events?: LandslideEvent[];
}

export async function fetchSpatialNearby(params: {
  lon: number;
  lat: number;
  radius_meters?: number;
  layers?: string;
  entity_type?: string;
}): Promise<SpatialQueryResponse> {
  const query = new URLSearchParams();
  query.set("longitude", params.lon.toString());
  query.set("latitude", params.lat.toString());
  if (params.radius_meters) query.set("radius_meters", params.radius_meters.toString());
  if (params.layers) query.set("layers", params.layers);
  if (params.entity_type) query.set("entity_type", params.entity_type);

  const res = await fetchFromAPI<APIEnvelope<SpatialQueryResponse>>(`api/v1/spatial/nearby?${query.toString()}`);
  return res.data;
}

export async function fetchSpatialPointInGeometry(params: {
  lon: number;
  lat: number;
  layers?: string;
}): Promise<SpatialQueryResponse> {
  const query = new URLSearchParams();
  query.set("longitude", params.lon.toString());
  query.set("latitude", params.lat.toString());
  if (params.layers) query.set("layers", params.layers);

  const res = await fetchFromAPI<APIEnvelope<SpatialQueryResponse>>(`api/v1/spatial/point-in-geometry?${query.toString()}`);
  return res.data;
}

export async function fetchSpatialBBox(params: {
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
  layers?: string;
}): Promise<SpatialQueryResponse> {
  const query = new URLSearchParams();
  query.set("min_lng", params.min_lng.toString());
  query.set("min_lat", params.min_lat.toString());
  query.set("max_lng", params.max_lng.toString());
  query.set("max_lat", params.max_lat.toString());
  if (params.layers) query.set("layers", params.layers);

  const res = await fetchFromAPI<APIEnvelope<SpatialQueryResponse>>(`api/v1/spatial/bbox?${query.toString()}`);
  return res.data;
}

// ==============================================================================
// NORTH EAST REGION (NER) STATES & DISTRICTS
// ==============================================================================

export interface NERStateDistrictGroup {
  stateCode: string;
  stateName: string;
  districts: {
    id: string;
    name: string;
    code: string;
  }[];
}

export const NER_STATE_GROUPS: NERStateDistrictGroup[] = [
  {
    stateCode: "MZ",
    stateName: "Mizoram",
    districts: [
      { id: "dst-aizawl", name: "Aizawl District", code: "MZ-AIZ" },
      { id: "dst-kolasib", name: "Kolasib District", code: "MZ-KOL" },
      { id: "dst-champhai", name: "Champhai District", code: "MZ-CHA" },
      { id: "dst-lunglei", name: "Lunglei District", code: "MZ-LUN" },
      { id: "dst-serchhip", name: "Serchhip District", code: "MZ-SER" },
    ],
  },
  {
    stateCode: "AS",
    stateName: "Assam",
    districts: [
      { id: "dst-dima-hasao", name: "Dima Hasao District", code: "AS-DH" },
      { id: "dst-kamrup-metro", name: "Kamrup Metropolitan", code: "AS-KM" },
      { id: "dst-cachar", name: "Cachar District", code: "AS-CA" },
    ],
  },
  {
    stateCode: "ML",
    stateName: "Meghalaya",
    districts: [
      { id: "dst-east-khasi-hills", name: "East Khasi Hills (Shillong)", code: "ML-EKH" },
      { id: "dst-west-jaintia-hills", name: "West Jaintia Hills", code: "ML-WJH" },
    ],
  },
  {
    stateCode: "AR",
    stateName: "Arunachal Pradesh",
    districts: [
      { id: "dst-papum-pare", name: "Papum Pare (Itanagar)", code: "AR-PP" },
      { id: "dst-west-kameng", name: "West Kameng District", code: "AR-WK" },
      { id: "dst-tawang", name: "Tawang District", code: "AR-TW" },
    ],
  },
  {
    stateCode: "MN",
    stateName: "Manipur",
    districts: [
      { id: "dst-imphal-west", name: "Imphal West District", code: "MN-IW" },
      { id: "dst-noney", name: "Noney (Tupul Corridor)", code: "MN-NN" },
      { id: "dst-churachandpur", name: "Churachandpur District", code: "MN-CC" },
    ],
  },
  {
    stateCode: "NL",
    stateName: "Nagaland",
    districts: [
      { id: "dst-kohima", name: "Kohima District", code: "NL-KO" },
      { id: "dst-dimapur", name: "Dimapur District", code: "NL-DI" },
      { id: "dst-mokokchung", name: "Mokokchung District", code: "NL-MK" },
    ],
  },
  {
    stateCode: "SK",
    stateName: "Sikkim",
    districts: [
      { id: "dst-gangtok", name: "Gangtok District", code: "SK-GT" },
      { id: "dst-namchi", name: "Namchi District", code: "SK-NM" },
      { id: "dst-mangan", name: "Mangan District", code: "SK-MG" },
    ],
  },
  {
    stateCode: "TR",
    stateName: "Tripura",
    districts: [
      { id: "dst-west-tripura", name: "West Tripura (Agartala)", code: "TR-WT" },
      { id: "dst-dhalai", name: "Dhalai District", code: "TR-DH" },
    ],
  },
];

