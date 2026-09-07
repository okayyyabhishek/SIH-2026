/**
 * Sentinel NER — Stage 10 Field Sensor Network Typed API Client
 */

import { fetchFromAPI } from './api';

export type SensorType =
  | 'RAINFALL'
  | 'TILT'
  | 'INCLINOMETER'
  | 'SOIL_MOISTURE'
  | 'PIEZOMETER'
  | 'GNSS'
  | 'CRACK_GAUGE'
  | 'VIBRATION'
  | 'OTHER';

export type SensorStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'MAINTENANCE'
  | 'CALIBRATION_REQUIRED'
  | 'DECOMMISSIONED'
  | 'OFFLINE';

export type ObservationQuality =
  | 'VALID'
  | 'SUSPECT'
  | 'INVALID'
  | 'STALE'
  | 'DUPLICATE'
  | 'OUT_OF_RANGE'
  | 'CLOCK_SKEW'
  | 'MISSING'
  | 'CALIBRATION_REQUIRED';

export type SensorFreshness = 'LIVE' | 'RECENT' | 'STALE' | 'OFFLINE' | 'UNKNOWN';

export interface SensorObservation {
  id: string;
  sensor_id: string;
  district_id: string;
  observed_at: string;
  received_at: string;
  metric: string;
  value: number;
  unit: string;
  quality: ObservationQuality;
  quality_reason?: string | null;
  source: string;
  sequence_number?: number | null;
  ingestion_id: string;
  payload_hash?: string | null;
  provenance?: Record<string, any>;
}

export interface Sensor {
  id: string;
  sensor_code: string;
  sensor_type: SensorType;
  manufacturer: string;
  model: string;
  serial_reference: string;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  elevation_m?: number | null;
  organization_id: string;
  district_id: string;
  installation_site: string;
  status: SensorStatus;
  sampling_interval_seconds: number;
  measurement_units: string;
  calibration_metadata?: Record<string, any>;
  secret_key_hash?: string | null;
  last_seen_at?: string | null;
  last_observation_at?: string | null;
  created_at: string;
  updated_at: string;
  provenance?: Record<string, any>;
  freshness?: SensorFreshness;
  latest_observation?: SensorObservation | null;
  recent_observations?: SensorObservation[];
}

export interface SensorSummary {
  total_sensors: number;
  active_count: number;
  live_count: number;
  recent_count: number;
  stale_count: number;
  offline_count: number;
  calibration_required_count: number;
  by_type: Record<string, number>;
  district_id?: string | null;
  generated_at: string;
}

export interface SensorRegistrationRequest {
  sensor_code: string;
  sensor_type: SensorType;
  manufacturer: string;
  model: string;
  serial_reference: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  elevation_m?: number;
  district_id: string;
  installation_site: string;
  sampling_interval_seconds?: number;
  measurement_units: string;
  calibration_metadata?: Record<string, any>;
}

export interface TelemetryItem {
  metric: string;
  value: number;
  unit: string;
  observed_at: string;
  sequence_number?: number;
}

export interface SensorIngestionBatch {
  sensor_id: string;
  device_secret?: string;
  observations: TelemetryItem[];
}

export async function fetchSensors(params: {
  district_id?: string;
  sensor_type?: string;
  status?: string;
  skip?: number;
  limit?: number;
} = {}): Promise<{ items: Sensor[]; skip: number; limit: number }> {
  const q = new URLSearchParams();
  if (params.district_id) q.set('district_id', params.district_id);
  if (params.sensor_type) q.set('sensor_type', params.sensor_type);
  if (params.status) q.set('status', params.status);
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.limit != null) q.set('limit', String(params.limit));

  const res = await fetchFromAPI<{ success: boolean; data: { items: Sensor[]; skip: number; limit: number } }>(
    `/api/v1/sensors?${q.toString()}`
  );
  return res.data;
}

export async function fetchSensorsSummary(districtId?: string): Promise<SensorSummary> {
  const q = districtId ? `?district_id=${districtId}` : '';
  const res = await fetchFromAPI<{ success: boolean; data: SensorSummary }>(
    `/api/v1/sensors/summary${q}`
  );
  return res.data;
}

export async function fetchSensor(sensorId: string): Promise<Sensor> {
  const res = await fetchFromAPI<{ success: boolean; data: Sensor }>(
    `/api/v1/sensors/${sensorId}`
  );
  return res.data;
}

export async function registerSensor(payload: SensorRegistrationRequest): Promise<Sensor> {
  const res = await fetchFromAPI<{ success: boolean; data: Sensor; message: string }>(
    '/api/v1/sensors',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  return res.data;
}

export async function ingestSensorTelemetry(batch: SensorIngestionBatch): Promise<{
  ingestion_metadata: Record<string, any>;
  observations_count: number;
  observations: SensorObservation[];
}> {
  const res = await fetchFromAPI<{
    success: boolean;
    data: {
      ingestion_metadata: Record<string, any>;
      observations_count: number;
      observations: SensorObservation[];
    };
    message: string;
  }>('/api/v1/sensors/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  });
  return res.data;
}

export async function fetchSensorObservations(
  sensorId: string,
  params: {
    start_time?: string;
    end_time?: string;
    quality?: string;
    skip?: number;
    limit?: number;
  } = {}
): Promise<{ sensor_id: string; items: SensorObservation[]; skip: number; limit: number }> {
  const q = new URLSearchParams();
  if (params.start_time) q.set('start_time', params.start_time);
  if (params.end_time) q.set('end_time', params.end_time);
  if (params.quality) q.set('quality', params.quality);
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.limit != null) q.set('limit', String(params.limit));

  const res = await fetchFromAPI<{
    success: boolean;
    data: { sensor_id: string; items: SensorObservation[]; skip: number; limit: number };
  }>(`/api/v1/sensors/${sensorId}/observations?${q.toString()}`);
  return res.data;
}
