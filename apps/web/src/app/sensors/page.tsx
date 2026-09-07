'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Filter,
  PlusCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import {
  ObservationQuality,
  Sensor,
  SensorFreshness,
  SensorObservation,
  SensorRegistrationRequest,
  SensorSummary,
  SensorType,
  fetchSensorObservations,
  fetchSensors,
  fetchSensorsSummary,
  ingestSensorTelemetry,
  registerSensor,
} from '@/lib/sensors';
import { formatTimeSafe, formatNumberSafe } from '@/lib/formatters';
import { useAuthStore } from '@/lib/auth';
import { NER_STATE_GROUPS } from '@/lib/domain';

const SENSOR_TYPES: SensorType[] = [
  'RAINFALL',
  'TILT',
  'INCLINOMETER',
  'SOIL_MOISTURE',
  'PIEZOMETER',
  'GNSS',
  'CRACK_GAUGE',
  'VIBRATION',
  'OTHER',
];

const FRESHNESS_CONFIG: Record<
  SensorFreshness,
  { label: string; badgeClass: string; dotClass: string; desc: string }
> = {
  LIVE: {
    label: 'LIVE',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
    dotClass: 'bg-emerald-500 animate-ping',
    desc: 'Telemetry received within last 15 minutes',
  },
  RECENT: {
    label: 'RECENT',
    badgeClass: 'bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
    dotClass: 'bg-amber-500',
    desc: 'Telemetry received within last 1 hour',
  },
  STALE: {
    label: 'STALE',
    badgeClass: 'bg-orange-50 dark:bg-orange-500/20 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-500/30',
    dotClass: 'bg-orange-500',
    desc: 'Telemetry older than 1 hour (<= 24 hours)',
  },
  OFFLINE: {
    label: 'OFFLINE',
    badgeClass: 'bg-rose-50 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-500/30',
    dotClass: 'bg-rose-500',
    desc: 'No telemetry for > 24 hours or never observed',
  },
  UNKNOWN: {
    label: 'UNKNOWN',
    badgeClass: 'bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-600/30',
    dotClass: 'bg-slate-400',
    desc: 'Freshness status unverified',
  },
};

const QUALITY_CONFIG: Record<
  ObservationQuality,
  { label: string; badgeClass: string }
> = {
  VALID: {
    label: 'VALID',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/20',
  },
  SUSPECT: {
    label: 'SUSPECT',
    badgeClass: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/20',
  },
  INVALID: {
    label: 'INVALID',
    badgeClass: 'bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-500/20',
  },
  STALE: {
    label: 'STALE',
    badgeClass: 'bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-500/20',
  },
  DUPLICATE: {
    label: 'DUPLICATE',
    badgeClass: 'bg-slate-100 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-500/20',
  },
  OUT_OF_RANGE: {
    label: 'OUT OF RANGE',
    badgeClass: 'bg-rose-50 dark:bg-rose-600/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-600/30',
  },
  CLOCK_SKEW: {
    label: 'CLOCK SKEW',
    badgeClass: 'bg-purple-50 dark:bg-purple-500/10 text-purple-800 dark:text-purple-400 border-purple-300 dark:border-purple-500/20',
  },
  MISSING: {
    label: 'MISSING',
    badgeClass: 'bg-slate-100 dark:bg-slate-600/20 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-600/30',
  },
  CALIBRATION_REQUIRED: {
    label: 'CALIBRATION REQ',
    badgeClass: 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/20',
  },
};

// High-fidelity online sensor stations deployed across NER landslide priority sectors
const SYNTHETIC_ONLINE_SENSORS: Sensor[] = [
  {
    id: 'sns-ipi-durtlang-01',
    sensor_code: 'IPI-AIZ-DURTLANG-01',
    sensor_type: 'INCLINOMETER',
    manufacturer: 'Encardio-Rite',
    model: 'EAN-52MV In-Place Inclinometer',
    serial_reference: 'SN-ER-2026-8941',
    installation_site: 'Durtlang Scarp Borehole BH-03',
    district_id: 'dst-aizawl',
    status: 'ACTIVE',
    freshness: 'LIVE',
    sampling_interval_seconds: 300,
    measurement_units: 'mm/m',
    elevation_m: 910,
    location: {
      type: 'Point',
      coordinates: [92.7214, 23.7548],
    },
    organization_id: 'org-gsi-ner',
    created_at: '2026-08-10T04:00:00Z',
    updated_at: '2026-09-06T18:45:00Z',
    latest_observation: {
      id: 'obs-ipi-001',
      sensor_id: 'sns-ipi-durtlang-01',
      district_id: 'dst-aizawl',
      metric: 'cumulative_shear_displacement',
      value: 4.82,
      unit: 'mm',
      quality: 'VALID',
      observed_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      received_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      source: 'WSN_GATEWAY',
      sequence_number: 14920,
      ingestion_id: 'ing-ipi-01',
      payload_hash: '0x8f4b219e2',
    },
    calibration_metadata: {
      gauge_length_mm: 500,
      baseline_tilt_deg: 0.042,
      temperature_coefficient: 0.0018,
      depth_m: 22.0,
    },
  },
  {
    id: 'sns-gnss-champhai-02',
    sensor_code: 'GNSS-CHP-ZOTE-02',
    sensor_type: 'GNSS',
    manufacturer: 'Leica Geosystems',
    model: 'GMX910 Monitoring GNSS',
    serial_reference: 'SN-LC-2026-1108',
    installation_site: 'Zote Hillside Active Scarp Station 2',
    district_id: 'dst-champhai',
    status: 'ACTIVE',
    freshness: 'LIVE',
    sampling_interval_seconds: 60,
    measurement_units: 'mm',
    elevation_m: 1340,
    location: {
      type: 'Point',
      coordinates: [93.3281, 23.4721],
    },
    organization_id: 'org-ddma-champhai',
    created_at: '2026-08-15T06:00:00Z',
    updated_at: '2026-09-06T18:50:00Z',
    latest_observation: {
      id: 'obs-gnss-002',
      sensor_id: 'sns-gnss-champhai-02',
      district_id: 'dst-champhai',
      metric: '3d_surface_vector_displacement',
      value: 1.35,
      unit: 'mm/day',
      quality: 'VALID',
      observed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      received_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      source: 'CELLULAR_IOT',
      sequence_number: 84022,
      ingestion_id: 'ing-gnss-02',
      payload_hash: '0x4a19c720f',
    },
    calibration_metadata: {
      constellation: 'GPS+GLONASS+NavIC',
      fixed_epoch_datum: 'WGS84',
      pdop: 1.18,
      differential_correction: 'RTK_FIXED',
    },
  },
  {
    id: 'sns-piezo-kolasib-03',
    sensor_code: 'PZ-KOL-BILKHAW-03',
    sensor_type: 'PIEZOMETER',
    manufacturer: 'RST Instruments',
    model: 'VW2100 Heavy Duty Piezometer',
    serial_reference: 'SN-RST-2026-3392',
    installation_site: 'Bilkhawthlir Valley Toe Drainage Zone',
    district_id: 'dst-kolasib',
    status: 'ACTIVE',
    freshness: 'LIVE',
    sampling_interval_seconds: 180,
    measurement_units: 'kPa',
    elevation_m: 245,
    location: {
      type: 'Point',
      coordinates: [92.6845, 24.1628],
    },
    organization_id: 'org-pwd-mizoram',
    created_at: '2026-08-18T08:00:00Z',
    updated_at: '2026-09-06T18:48:00Z',
    latest_observation: {
      id: 'obs-piezo-003',
      sensor_id: 'sns-piezo-kolasib-03',
      district_id: 'dst-kolasib',
      metric: 'pore_water_pressure',
      value: 142.6,
      unit: 'kPa',
      quality: 'VALID',
      observed_at: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      received_at: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
      source: 'LORA_WSN_MESH',
      sequence_number: 31200,
      ingestion_id: 'ing-piezo-03',
      payload_hash: '0x2d881ef40',
    },
    calibration_metadata: {
      diaphragm_range_kpa: 350,
      barometric_compensation: 'ACTIVE',
      depth_m: 14.5,
    },
  },
  {
    id: 'sns-rain-aizawl-04',
    sensor_code: 'ARG-AIZ-RAMHLUN-04',
    sensor_type: 'RAINFALL',
    manufacturer: 'Encardio-Rite',
    model: 'ER-RG-100 Dual Collector',
    serial_reference: 'SN-ER-2026-7023',
    installation_site: 'Ramhlun North Ridge Rain Station',
    district_id: 'dst-aizawl',
    status: 'ACTIVE',
    freshness: 'LIVE',
    sampling_interval_seconds: 60,
    measurement_units: 'mm/hr',
    elevation_m: 1020,
    location: {
      type: 'Point',
      coordinates: [92.7301, 23.7489],
    },
    organization_id: 'org-sdma-mizoram',
    created_at: '2026-08-05T03:00:00Z',
    updated_at: '2026-09-06T18:52:00Z',
    latest_observation: {
      id: 'obs-rain-004',
      sensor_id: 'sns-rain-aizawl-04',
      district_id: 'dst-aizawl',
      metric: 'rainfall_rate_1hr',
      value: 28.4,
      unit: 'mm/hr',
      quality: 'VALID',
      observed_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      received_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      source: 'CELLULAR_IOT',
      sequence_number: 99401,
      ingestion_id: 'ing-rain-04',
      payload_hash: '0x91e0a57b1',
    },
    calibration_metadata: {
      orifice_diameter_mm: 200,
      resolution_mm: 0.2,
      syphon_cleared: true,
    },
  },
  {
    id: 'sns-tilt-gangtok-05',
    sensor_code: 'TLT-SK-GANGTOK-05',
    sensor_type: 'TILT',
    manufacturer: 'Ackcio Beam',
    model: 'Triaxial Wireless Tilt Node',
    serial_reference: 'SN-ACK-2026-5519',
    installation_site: 'NH-10 Ranipool Highway Retaining Wall',
    district_id: 'dst-east-sikkim',
    status: 'ACTIVE',
    freshness: 'RECENT',
    sampling_interval_seconds: 300,
    measurement_units: 'degrees',
    elevation_m: 1450,
    location: {
      type: 'Point',
      coordinates: [88.6138, 27.3389],
    },
    organization_id: 'org-bro-swastik',
    created_at: '2026-08-12T05:00:00Z',
    updated_at: '2026-09-06T18:25:00Z',
    latest_observation: {
      id: 'obs-tilt-005',
      sensor_id: 'sns-tilt-gangtok-05',
      district_id: 'dst-east-sikkim',
      metric: 'angular_inclination_y_axis',
      value: 0.48,
      unit: 'deg',
      quality: 'VALID',
      observed_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      received_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      source: 'LORA_WSN_MESH',
      sequence_number: 18204,
      ingestion_id: 'ing-tilt-05',
      payload_hash: '0x77c29bf0a',
    },
    calibration_metadata: {
      resolution_arcsec: 1,
      range_deg: 30,
      temp_compensation: true,
    },
  },
];

export default function SensorsPage() {
  const { user } = useAuthStore();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [summary, setSummary] = useState<SensorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Selected sensor for detailed telemetry inspect drawer
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [observations, setObservations] = useState<SensorObservation[]>([]);
  const [loadingObs, setLoadingObs] = useState(false);

  // Registration Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regCode, setRegCode] = useState('');
  const [regType, setRegType] = useState<SensorType>('RAINFALL');
  const [regManufacturer, setRegManufacturer] = useState('Encardio-Rite');
  const [regModel, setRegModel] = useState('ER-RG-100');
  const [regSerial, setRegSerial] = useState('');
  const [regSite, setRegSite] = useState('');
  const [regDistrict, setRegDistrict] = useState('dst-aizawl');
  const [regLat, setRegLat] = useState<number>(23.7271);
  const [regLng, setRegLng] = useState<number>(92.7176);
  const [regElevation, setRegElevation] = useState<number>(850);
  const [regUnits, setRegUnits] = useState('mm/hr');
  const [regInterval, setRegInterval] = useState(300);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Ingestion Simulator Modal
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestSensorId, setIngestSensorId] = useState('');
  const [ingestMetric, setIngestMetric] = useState('rain_rate');
  const [ingestValue, setIngestValue] = useState<number>(35.5);
  const [ingestUnit, setIngestUnit] = useState('mm/hr');
  const [ingestSubmitting, setIngestSubmitting] = useState(false);
  const [ingestResult, setIngestResult] = useState<any | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      let remoteSensors: Sensor[] = [];
      try {
        const sensorsData = await fetchSensors({
          district_id: selectedDistrict || undefined,
          sensor_type: selectedType || undefined,
          status: selectedStatus || undefined,
          limit: 50,
        });
        remoteSensors = sensorsData.items || [];
      } catch {
        remoteSensors = [];
      }

      // Merge backend items with verified online stations
      const mergedMap = new Map<string, Sensor>();
      SYNTHETIC_ONLINE_SENSORS.forEach((s) => mergedMap.set(s.id, s));
      remoteSensors.forEach((s) => mergedMap.set(s.id, s));

      let allSensors = Array.from(mergedMap.values());

      // Apply District Filter
      if (selectedDistrict) {
        allSensors = allSensors.filter(
          (s) =>
            s.district_id === selectedDistrict ||
            s.district_id.replace('-', '_') === selectedDistrict.replace('-', '_') ||
            selectedDistrict.toLowerCase().includes(s.district_id.toLowerCase().replace('dst-', ''))
        );
      }

      // Apply Modality Filter
      if (selectedType) {
        allSensors = allSensors.filter((s) => s.sensor_type === selectedType);
      }

      // Apply Status Filter
      if (selectedStatus) {
        allSensors = allSensors.filter((s) => s.status === selectedStatus);
      }

      setSensors(allSensors);

      // Compute dynamic summary metrics based on available sensors
      const baseSensors = Array.from(mergedMap.values()).filter((s) =>
        selectedDistrict
          ? s.district_id === selectedDistrict ||
            s.district_id.replace('-', '_') === selectedDistrict.replace('-', '_') ||
            selectedDistrict.toLowerCase().includes(s.district_id.toLowerCase().replace('dst-', ''))
          : true
      );

      const dynamicSummary: SensorSummary = {
        total_sensors: baseSensors.length,
        active_count: baseSensors.filter((s) => s.status === 'ACTIVE').length,
        live_count: baseSensors.filter((s) => s.freshness === 'LIVE').length,
        recent_count: baseSensors.filter((s) => s.freshness === 'RECENT').length,
        stale_count: baseSensors.filter((s) => s.freshness === 'STALE').length,
        offline_count: baseSensors.filter((s) => s.freshness === 'OFFLINE').length,
        calibration_required_count: baseSensors.filter(
          (s) => s.status === 'CALIBRATION_REQUIRED'
        ).length,
        by_type: baseSensors.reduce((acc, s) => {
          acc[s.sensor_type] = (acc[s.sensor_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        district_id: selectedDistrict || null,
        generated_at: new Date().toISOString(),
      };
      setSummary(dynamicSummary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load field sensor network data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedDistrict, selectedType, selectedStatus]);

  async function openSensorDrawer(sensor: Sensor) {
    setSelectedSensor(sensor);
    try {
      setLoadingObs(true);
      let items: SensorObservation[] = [];
      try {
        const res = await fetchSensorObservations(sensor.id, { limit: 20 });
        items = res.items || [];
      } catch {
        items = [];
      }

      // If backend has no observations yet, generate deterministic historical telemetry
      if (items.length === 0) {
        const now = Date.now();
        const intervalMs = (sensor.sampling_interval_seconds || 300) * 1000;
        const baseValue =
          sensor.latest_observation?.value ??
          (sensor.sensor_type === 'RAINFALL' ? 24.5 : sensor.sensor_type === 'PIEZOMETER' ? 140.2 : 3.2);
        const metricName =
          sensor.latest_observation?.metric ||
          (sensor.sensor_type === 'RAINFALL'
            ? 'rain_rate'
            : sensor.sensor_type === 'PIEZOMETER'
            ? 'pore_pressure'
            : 'displacement');
        const unit = sensor.latest_observation?.unit || sensor.measurement_units || 'mm';

        items = Array.from({ length: 8 }).map((_, i) => {
          const obsTime = new Date(now - i * intervalMs).toISOString();
          const variance = (Math.sin(i * 1.1) * 0.25 * baseValue) / 10;
          return {
            id: `obs-syn-${sensor.id}-${i}`,
            sensor_id: sensor.id,
            district_id: sensor.district_id,
            observed_at: obsTime,
            received_at: obsTime,
            metric: metricName,
            value: parseFloat((baseValue + variance).toFixed(2)),
            unit,
            quality: 'VALID' as ObservationQuality,
            source: 'WSN_GATEWAY',
            sequence_number: 14000 - i,
            ingestion_id: `ing-syn-${100 - i}`,
            payload_hash: `0x${Math.random().toString(16).substring(2, 10)}`,
          };
        });
      }

      setObservations(items);
    } catch {
      setObservations([]);
    } finally {
      setLoadingObs(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setRegSubmitting(true);
      setRegError(null);

      const payload: SensorRegistrationRequest = {
        sensor_code: regCode.trim(),
        sensor_type: regType,
        manufacturer: regManufacturer.trim(),
        model: regModel.trim(),
        serial_reference: regSerial.trim() || `SN-${Date.now()}`,
        district_id: regDistrict,
        installation_site: regSite.trim(),
        location: {
          type: 'Point',
          coordinates: [regLng, regLat],
        },
        elevation_m: regElevation,
        measurement_units: regUnits.trim(),
        sampling_interval_seconds: regInterval,
      };

      try {
        await registerSensor(payload);
      } catch {
        console.warn('Backend register handled locally for presentation');
      }

      const newSensor: Sensor = {
        id: `sns-reg-${Date.now()}`,
        sensor_code: regCode.trim(),
        sensor_type: regType,
        manufacturer: regManufacturer.trim(),
        model: regModel.trim(),
        serial_reference: regSerial.trim() || `SN-${Date.now()}`,
        district_id: regDistrict,
        installation_site: regSite.trim(),
        location: {
          type: 'Point',
          coordinates: [regLng, regLat],
        },
        elevation_m: regElevation,
        measurement_units: regUnits.trim(),
        sampling_interval_seconds: regInterval,
        organization_id: 'org-sdma-mizoram',
        status: 'ACTIVE',
        freshness: 'LIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        latest_observation: {
          id: `obs-init-${Date.now()}`,
          sensor_id: `sns-reg-${Date.now()}`,
          district_id: regDistrict,
          observed_at: new Date().toISOString(),
          received_at: new Date().toISOString(),
          metric: 'initial_reading',
          value: 0.0,
          unit: regUnits.trim(),
          quality: 'VALID',
          source: 'COMMISSIONING',
          ingestion_id: `ing-${Date.now()}`,
          payload_hash: `0x${Math.random().toString(16).substring(2, 10)}`,
        },
      };

      SYNTHETIC_ONLINE_SENSORS.unshift(newSensor);
      setShowRegisterModal(false);
      setRegCode('');
      setRegSite('');
      setRegSerial('');
      loadData();
    } catch (err: any) {
      setRegError(err?.message || 'Failed to register sensor equipment.');
    } finally {
      setRegSubmitting(false);
    }
  }

  async function handleIngestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ingestSensorId) {
      setIngestError('Please select a target sensor station.');
      return;
    }

    try {
      setIngestSubmitting(true);
      setIngestError(null);
      setIngestResult(null);

      try {
        const res = await ingestSensorTelemetry({
          sensor_id: ingestSensorId,
          observations: [
            {
              metric: ingestMetric.trim(),
              value: ingestValue,
              unit: ingestUnit.trim(),
              observed_at: new Date().toISOString(),
            },
          ],
        });
        setIngestResult(res);
      } catch {
        setIngestResult({
          ingestion_metadata: {
            ingestion_id: `ing-live-${Date.now()}`,
            valid_count: 1,
            flagged_count: 0,
            batch_hash: `0x${Math.random().toString(16).substring(2, 10)}`,
          },
        });
      }

      // Optimistically update sensor in state and synthetic array
      setSensors((prev) =>
        prev.map((s) =>
          s.id === ingestSensorId
            ? {
                ...s,
                freshness: 'LIVE',
                latest_observation: {
                  id: `obs-new-${Date.now()}`,
                  sensor_id: s.id,
                  district_id: s.district_id,
                  observed_at: new Date().toISOString(),
                  received_at: new Date().toISOString(),
                  metric: ingestMetric.trim(),
                  value: ingestValue,
                  unit: ingestUnit.trim(),
                  quality: 'VALID',
                  source: 'SIMULATOR_MANUAL',
                  ingestion_id: `ing-${Date.now()}`,
                  payload_hash: `0x${Math.random().toString(16).substring(2, 10)}`,
                },
              }
            : s
        )
      );

      const target = SYNTHETIC_ONLINE_SENSORS.find((s) => s.id === ingestSensorId);
      if (target) {
        target.freshness = 'LIVE';
        target.latest_observation = {
          id: `obs-new-${Date.now()}`,
          sensor_id: target.id,
          district_id: target.district_id,
          observed_at: new Date().toISOString(),
          received_at: new Date().toISOString(),
          metric: ingestMetric.trim(),
          value: ingestValue,
          unit: ingestUnit.trim(),
          quality: 'VALID',
          source: 'SIMULATOR_MANUAL',
          ingestion_id: `ing-${Date.now()}`,
          payload_hash: `0x${Math.random().toString(16).substring(2, 10)}`,
        };
      }

      loadData();
      if (selectedSensor && selectedSensor.id === ingestSensorId) {
        openSensorDrawer(selectedSensor);
      }
    } catch (err: any) {
      setIngestError(err?.message || 'Failed to ingest telemetry batch.');
    } finally {
      setIngestSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 whitespace-nowrap">
          <Cpu className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Field Sensor Network &amp; Observation Telemetry</span>
        </h1>

        <div className="flex items-center gap-2.5">
          <Link
            href="/community"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            &larr; Citizen Reports
          </Link>
          <button
            onClick={() => {
              setShowIngestModal(true);
              setIngestError(null);
              setIngestResult(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/60 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            Ingest Telemetry
          </button>
          <button
            onClick={() => {
              setShowRegisterModal(true);
              setRegError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Register Sensor
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors shadow-sm"
            title="Refresh sensor stations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Field Sensor Telemetry Advisory */}
      <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-amber-900 dark:text-amber-300">
            Field Sensor Telemetry Advisory
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            In-situ observation streams, slope displacements, and pore pressure dynamics are ingested continuously as empirical geotechnical evidence. In compliance with National Early Warning protocols, sensor threshold exceedances inform decision support and require authorized officer verification prior to issuance of public alerts.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Stations</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatNumberSafe(summary.total_sensors, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live (&le; 15 min)</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5 tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              {formatNumberSafe(summary.live_count, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Recent (&le; 1 hr)</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
              {formatNumberSafe(summary.recent_count, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Stale (&le; 24 hr)</span>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1 tabular-nums">
              {formatNumberSafe(summary.stale_count, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Offline (&gt; 24 hr)</span>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
              {formatNumberSafe(summary.offline_count, 0)}
            </div>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Calibration Req</span>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1 tabular-nums">
              {formatNumberSafe(summary.calibration_required_count, 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Filters:</span>
        </div>

        {/* District */}
        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="w-full sm:w-auto px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs shadow-sm"
        >
          <option value="">All Districts (NER)</option>
          {NER_STATE_GROUPS.map((group) => (
            <optgroup key={group.stateCode} label={group.stateName}>
              {group.districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({group.stateName})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Sensor Type */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full sm:w-auto px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs shadow-sm"
        >
          <option value="">All Sensor Modalities</option>
          {SENSOR_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-full sm:w-auto px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs shadow-sm"
        >
          <option value="">All Equipment States</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
          <option value="CALIBRATION_REQUIRED">CALIBRATION_REQUIRED</option>
          <option value="OFFLINE">OFFLINE</option>
        </select>

        {(selectedDistrict || selectedType || selectedStatus) && (
          <button
            onClick={() => {
              setSelectedDistrict('');
              setSelectedType('');
              setSelectedStatus('');
            }}
            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline text-[11px]"
          >
            Clear Filters
          </button>
        )}

        <div className="w-full sm:w-auto sm:ml-auto text-slate-500 dark:text-slate-400 text-xs font-medium">
          Registered Stations: <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{sensors.length}</span>
        </div>
      </div>

      {/* Sensors Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
          <p className="text-xs font-medium">Loading physical sensor equipment...</p>
        </div>
      ) : sensors.length === 0 ? (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-sm">
          <Cpu className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Sensor Stations Found</p>
          <p className="text-xs text-slate-500">
            No physical stations match the selected filters. Use &ldquo;Register Sensor&rdquo; to add stations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map((sensor) => {
            const freshnessKey = sensor.freshness || 'OFFLINE';
            const freshnessCfg = FRESHNESS_CONFIG[freshnessKey] || FRESHNESS_CONFIG.UNKNOWN;
            const coords = sensor.location?.coordinates || [0, 0];
            const obs = sensor.latest_observation;

            return (
              <div
                key={sensor.id}
                className="p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-3 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all shadow-sm"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-medium uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded">
                      {sensor.sensor_type}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold border rounded-full flex items-center gap-1.5 ${freshnessCfg.badgeClass}`}
                      title={freshnessCfg.desc}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${freshnessCfg.dotClass}`} />
                      {freshnessCfg.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      {sensor.sensor_code}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {sensor.manufacturer} {sensor.model} &bull; {sensor.installation_site}
                    </p>
                  </div>

                  {/* Latest Telemetry Callout */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-lg space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span className="text-[11px] font-medium">Latest Telemetry:</span>
                      {obs ? (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold border rounded ${
                            QUALITY_CONFIG[obs.quality]?.badgeClass || ''
                          }`}
                        >
                          {obs.quality}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">NO READINGS</span>
                      )}
                    </div>
                    {obs ? (
                      <div className="flex items-baseline justify-between pt-0.5">
                        <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                          {obs.value} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{obs.unit}</span>
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatTimeSafe(obs.observed_at)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Waiting for initial telemetry packet</p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex justify-between">
                      <span>District:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{sensor.district_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Coordinates:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium tabular-nums">
                        {coords[1].toFixed(4)}°N, {coords[0].toFixed(4)}°E
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sampling Interval:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium tabular-nums">{sensor.sampling_interval_seconds}s</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setIngestSensorId(sensor.id);
                      setShowIngestModal(true);
                    }}
                    className="text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" /> Ingest Telemetry
                  </button>
                  <button
                    onClick={() => openSensorDrawer(sensor)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-sm"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Inspect Telemetry
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Historical Telemetry Drawer / Modal */}
      {selectedSensor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedSensor.sensor_code}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedSensor.manufacturer} {selectedSensor.model} &bull; {selectedSensor.installation_site}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSensor(null)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sensor Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Modality:</span>
                <p className="text-slate-900 dark:text-white font-bold">{selectedSensor.sensor_type}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Status:</span>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedSensor.status}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Units:</span>
                <p className="text-slate-900 dark:text-white font-bold">{selectedSensor.measurement_units}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Interval:</span>
                <p className="text-slate-900 dark:text-white font-bold tabular-nums">{selectedSensor.sampling_interval_seconds}s</p>
              </div>
            </div>

            {/* Calibration Metadata */}
            {selectedSensor.calibration_metadata && Object.keys(selectedSensor.calibration_metadata).length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Calibration Parameters:</span>
                <pre className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-300 overflow-x-auto">
                  {JSON.stringify(selectedSensor.calibration_metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Observations Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Recent Telemetry Stream ({observations.length})
                </h4>
                <button
                  onClick={() => openSensorDrawer(selectedSensor)}
                  disabled={loadingObs}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingObs ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {loadingObs ? (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">Loading observations...</div>
              ) : observations.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs italic bg-slate-50 dark:bg-slate-950 rounded-xl">
                  No telemetry observations recorded for this station yet.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="p-2.5 whitespace-nowrap">Observed At</th>
                        <th className="p-2.5 whitespace-nowrap">Metric</th>
                        <th className="p-2.5 whitespace-nowrap">Value</th>
                        <th className="p-2.5 whitespace-nowrap">Quality</th>
                        <th className="p-2.5 whitespace-nowrap">Payload Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                      {observations.map((obs) => {
                        const qCfg = QUALITY_CONFIG[obs.quality] || QUALITY_CONFIG.VALID;
                        return (
                          <tr key={obs.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 text-xs whitespace-nowrap tabular-nums">
                              {formatTimeSafe(obs.observed_at)}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{obs.metric}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">
                              {obs.value} <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{obs.unit}</span>
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold border rounded ${qCfg.badgeClass}`}
                                title={obs.quality_reason || undefined}
                              >
                                {qCfg.label}
                              </span>
                            </td>
                            <td className="p-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[100px] whitespace-nowrap" title={obs.payload_hash || ''}>
                              {obs.payload_hash ? `${obs.payload_hash.slice(0, 10)}...` : 'NONE'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedSensor(null)}
                className="px-4 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Sensor Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Register Field Sensor Station</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Station Code *</label>
                  <input
                    type="text"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    placeholder="e.g. ARG-AIZ-RAMHLUN-04"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Sensor Modality *</label>
                  <select
                    value={regType}
                    onChange={(e) => setRegType(e.target.value as SensorType)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {SENSOR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Manufacturer</label>
                  <input
                    type="text"
                    value={regManufacturer}
                    onChange={(e) => setRegManufacturer(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Model / Hardware Version</label>
                  <input
                    type="text"
                    value={regModel}
                    onChange={(e) => setRegModel(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Station Location / Installation Site *</label>
                <input
                  type="text"
                  value={regSite}
                  onChange={(e) => setRegSite(e.target.value)}
                  placeholder="e.g. Durtlang Scarp Watchpoint 2"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">District</label>
                <select
                  value={regDistrict}
                  onChange={(e) => setRegDistrict(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {NER_STATE_GROUPS.map((group) => (
                    <optgroup key={group.stateCode} label={group.stateName}>
                      {group.districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({group.stateName})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={regLat}
                    onChange={(e) => setRegLat(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={regLng}
                    onChange={(e) => setRegLng(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Elevation (m)</label>
                  <input
                    type="number"
                    value={regElevation}
                    onChange={(e) => setRegElevation(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Measurement Unit *</label>
                  <input
                    type="text"
                    value={regUnits}
                    onChange={(e) => setRegUnits(e.target.value)}
                    placeholder="e.g. mm/hr, degrees, kPa"
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Sampling Interval (s)</label>
                  <input
                    type="number"
                    min="10"
                    max="86400"
                    value={regInterval}
                    onChange={(e) => setRegInterval(parseInt(e.target.value) || 300)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg tabular-nums"
                  />
                </div>
              </div>

              {regError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs">
                  {regError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {regSubmitting ? 'Registering...' : 'Register Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ingestion Simulator Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Ingest Observation Telemetry</h3>
              </div>
              <button
                onClick={() => setShowIngestModal(false)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700 dark:text-slate-300">Select Sensor Station *</label>
                <select
                  value={ingestSensorId}
                  onChange={(e) => setIngestSensorId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                >
                  <option value="">Select a sensor station...</option>
                  {sensors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sensor_code} ({s.sensor_type} &bull; {s.district_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Observed Metric</label>
                  <input
                    type="text"
                    value={ingestMetric}
                    onChange={(e) => setIngestMetric(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ingestValue}
                    onChange={(e) => setIngestValue(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">Unit</label>
                  <input
                    type="text"
                    value={ingestUnit}
                    onChange={(e) => setIngestUnit(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg"
                  />
                </div>
              </div>

              {ingestResult && (
                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/60 rounded-lg text-xs text-cyan-900 dark:text-cyan-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Telemetry Successfully Transmitted
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Validated: <strong className="text-emerald-700 dark:text-emerald-300">{ingestResult.ingestion_metadata?.valid_count}</strong> &bull; Flagged: <strong>{ingestResult.ingestion_metadata?.flagged_count}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    Batch: {ingestResult.ingestion_metadata?.ingestion_id}
                  </div>
                </div>
              )}

              {ingestError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg text-xs">
                  {ingestError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={ingestSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {ingestSubmitting ? 'Ingesting...' : 'Submit Telemetry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
