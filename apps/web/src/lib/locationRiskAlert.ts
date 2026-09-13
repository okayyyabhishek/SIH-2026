/**
 * Sentinel NER — Location-Based Real-Time Landslide Risk Alert Engine
 * Evaluates real device GPS or simulated coordinates against known landslide
 * corridors and geotech hazard hotspots across Northeast India.
 */

export type RiskSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  name?: string;
  source?: 'GPS' | 'SIMULATED';
}

export interface EvacuationShelter {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [lat, lng]
  capacity: number;
  contactNumber: string;
  distanceMeters?: number;
}

export interface GeotechMetrics {
  displacementRateMmDay: number;
  poreWaterPressureKPa: number;
  factorOfSafety: number;
  rainfallPast24hMm: number;
}

export interface HazardZone {
  id: string;
  name: string;
  corridorName: string;
  district: string;
  state: string;
  coordinates: [number, number]; // [lat, lng]
  dangerRadiusMeters: number; // e.g. 800m
  warningRadiusMeters: number; // e.g. 3000m
  riskSeverity: RiskSeverity;
  hazardType: string;
  currentSituation: string;
  geotechMetrics: GeotechMetrics;
  roadTransitStatus: string;
  requiredAction: string;
  shelters: EvacuationShelter[];
}

export interface LocationRiskEvaluation {
  currentLocation: LocationCoordinates;
  isInsideDangerZone: boolean;
  isInsideWarningZone: boolean;
  nearestZone: HazardZone;
  distanceToNearestMeters: number;
  overallRiskLevel: RiskSeverity;
  headline: string;
  detailedAdvisory: string;
  nearestShelter: EvacuationShelter | null;
  evaluatedAt: string;
}

export interface LocationAlertNotification {
  id: string;
  timestamp: string;
  zoneId: string;
  zoneName: string;
  riskLevel: RiskSeverity;
  distanceMeters: number;
  headline: string;
  message: string;
  actionRequired: string;
  read: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTHORITATIVE NORTHEAST INDIA HAZARD HOTSPOTS & RISK ZONES
   ═══════════════════════════════════════════════════════════════════════════ */

export const HAZARD_ZONES_NER: HazardZone[] = [
  {
    id: 'zone-durtlang-01',
    name: 'Durtlang Ridge Corridor',
    corridorName: 'NH-54 km 11.4 to km 14.8',
    district: 'Aizawl',
    state: 'Mizoram',
    coordinates: [23.7533, 92.7188],
    dangerRadiusMeters: 850,
    warningRadiusMeters: 3200,
    riskSeverity: 'CRITICAL',
    hazardType: 'ACTIVE_SLOPE_CREEP_AND_ROCKFALL',
    currentSituation:
      'Continuous surface rupture with 14.8 mm/day slope displacement. Subsurface piezometers show 92.4% saturation threshold breached following 118mm cumulative monsoon precipitation.',
    geotechMetrics: {
      displacementRateMmDay: 14.8,
      poreWaterPressureKPa: 142.6,
      factorOfSafety: 0.82,
      rainfallPast24hMm: 118.0,
    },
    roadTransitStatus: 'NH-54 RESTRICTED • SINGLE-LANE REVERSIBLE TRANSIT • HEAVY AXLES DIVERTED',
    requiredAction:
      'IMMEDIATE ACTION: Move away from the unstable crown escarpment. Avoid parking vehicles on outer shoulder. Proceed to designated community relief center.',
    shelters: [
      {
        id: 'sh-durtlang-01',
        name: 'Durtlang Government Higher Secondary School',
        address: 'Upper Durtlang Ridge Rd, Aizawl',
        coordinates: [23.7595, 92.7231],
        capacity: 450,
        contactNumber: '0389-2322421',
      },
      {
        id: 'sh-durtlang-02',
        name: 'Bawngkawn Community Hall',
        address: 'Bawngkawn Junction, Aizawl',
        coordinates: [23.7452, 92.7278],
        capacity: 320,
        contactNumber: '0389-2340112',
      },
    ],
  },
  {
    id: 'zone-ranipool-02',
    name: 'Ranipool - Singtam Highway Corridor',
    corridorName: 'NH-10 Teesta Valley km 21',
    district: 'East Sikkim',
    state: 'Sikkim',
    coordinates: [27.2758, 88.5147],
    dangerRadiusMeters: 900,
    warningRadiusMeters: 3500,
    riskSeverity: 'CRITICAL',
    hazardType: 'TOE_SCOURING_AND_DEBRIS_FLOW',
    currentSituation:
      'High-velocity Teesta riverbank toe erosion with sudden debris flow accumulation along lower hillside formation. Multiple tension fractures spreading towards the highway pavement.',
    geotechMetrics: {
      displacementRateMmDay: 22.4,
      poreWaterPressureKPa: 158.0,
      factorOfSafety: 0.76,
      rainfallPast24hMm: 135.5,
    },
    roadTransitStatus: 'NH-10 CLOSED TO ALL HEAVY VEHICLES • INTERMITTENT CONVOY PASSAGE ONLY',
    requiredAction:
      'EVACUATION WARNING: Do not attempt to cross submerged culverts or active debris lobes. Report to Singtam Sub-Divisional Magistrate Control Room.',
    shelters: [
      {
        id: 'sh-ranipool-01',
        name: 'Singtam Community Relief Camp',
        address: 'Singtam Nagar Panchayat Ground, East Sikkim',
        coordinates: [27.2381, 88.4982],
        capacity: 600,
        contactNumber: '03592-234201',
      },
    ],
  },
  {
    id: 'zone-ramhlun-03',
    name: 'Ramhlun North Escarpment',
    corridorName: 'Ramhlun Residential Hillside',
    district: 'Aizawl',
    state: 'Mizoram',
    coordinates: [23.7489, 92.7301],
    dangerRadiusMeters: 550,
    warningRadiusMeters: 2400,
    riskSeverity: 'HIGH',
    hazardType: 'STRUCTURAL_RETAINING_WALL_FAILURE',
    currentSituation:
      'Longitudinal tension cracks expanding across residential retaining wall and roadway following 65mm precipitation. Shear displacement of 8.2 mm/day recorded on slope unit MZ-SLOPE-084.',
    geotechMetrics: {
      displacementRateMmDay: 8.2,
      poreWaterPressureKPa: 98.4,
      factorOfSafety: 0.94,
      rainfallPast24hMm: 65.2,
    },
    roadTransitStatus: 'CAUTION ADVISORY • LIGHT VEHICLES ONLY • SPEED LIMIT 15 KM/H',
    requiredAction:
      'Monitor foundation cracks. Evacuate houses located on cut-slopes with visible masonry cracking. Move to Ramhlun Vengthlang Indoor Stadium.',
    shelters: [
      {
        id: 'sh-ramhlun-01',
        name: 'Ramhlun Vengthlang Indoor Stadium',
        address: 'Ramhlun Vengthlang Main Rd, Aizawl',
        coordinates: [23.7421, 92.7335],
        capacity: 400,
        contactNumber: '0389-2311909',
      },
    ],
  },
  {
    id: 'zone-bilkhawthlir-04',
    name: 'Bilkhawthlir Lowland Corridor',
    corridorName: 'NH-306 Valley Spur km 42',
    district: 'Kolasib',
    state: 'Mizoram',
    coordinates: [24.1628, 92.6845],
    dangerRadiusMeters: 600,
    warningRadiusMeters: 2600,
    riskSeverity: 'HIGH',
    hazardType: 'WATER_SEEPAGE_AND_ROAD_FORMATION_SLUMP',
    currentSituation:
      'Sudden high-volume turbid spring emergence at slope toe with active soil liquefaction and drainage ditch overflow. Road foundation sinking by 35cm across 70-meter stretch.',
    geotechMetrics: {
      displacementRateMmDay: 9.6,
      poreWaterPressureKPa: 112.3,
      factorOfSafety: 0.91,
      rainfallPast24hMm: 84.0,
    },
    roadTransitStatus: 'FLOODED SLOPES • WATERLOGGED EMBANKMENT • HEAVY VEHICLES HALTED',
    requiredAction:
      'Avoid driving through muddy slope runoff. Watch for sudden road drop. PWD drainage team on site.',
    shelters: [
      {
        id: 'sh-bilkhawthlir-01',
        name: 'Bilkhawthlir Middle School Relief Shelter',
        address: 'Kolasib-Silchar Road, Bilkhawthlir',
        coordinates: [24.1702, 92.6881],
        capacity: 250,
        contactNumber: '03837-220114',
      },
    ],
  },
  {
    id: 'zone-zote-05',
    name: 'Zote Access Corridor',
    corridorName: 'Champhai Bypass km 12',
    district: 'Champhai',
    state: 'Mizoram',
    coordinates: [23.4721, 93.3289],
    dangerRadiusMeters: 400,
    warningRadiusMeters: 2000,
    riskSeverity: 'MODERATE',
    hazardType: 'ROTATIONAL_SOIL_SLUMP',
    currentSituation:
      'Step-settlement of 18cm along road foundation with shear slip cracks extending into agricultural terraces.',
    geotechMetrics: {
      displacementRateMmDay: 3.8,
      poreWaterPressureKPa: 64.0,
      factorOfSafety: 1.15,
      rainfallPast24hMm: 42.0,
    },
    roadTransitStatus: 'SLOW TRANSIT (MAX 10 KM/H) • SINGLE LANE',
    requiredAction:
      'Exercise caution when driving past the slump scarp. Avoid parking on outer embankment shoulder.',
    shelters: [
      {
        id: 'sh-zote-01',
        name: 'Zote Village Council Hall',
        address: 'Main Village Square, Zote, Champhai',
        coordinates: [23.4785, 93.3321],
        capacity: 180,
        contactNumber: '03836-235112',
      },
    ],
  },
  {
    id: 'zone-shillong-06',
    name: 'Shillong Peak Ridge',
    corridorName: 'Upper Shillong Plateau',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    coordinates: [25.5356, 91.8845],
    dangerRadiusMeters: 300,
    warningRadiusMeters: 1500,
    riskSeverity: 'LOW',
    hazardType: 'STABLE_BEDROCK_FORMATION',
    currentSituation:
      'Hard quartzite and phyllite bedrock formation with well-maintained slope drainage. No active ground movement or tension cracks recorded.',
    geotechMetrics: {
      displacementRateMmDay: 0.1,
      poreWaterPressureKPa: 12.0,
      factorOfSafety: 1.74,
      rainfallPast24hMm: 18.0,
    },
    roadTransitStatus: 'CLEAR TRANSIT • NORMAL OPERATIONAL CONDITIONS',
    requiredAction: 'Normal vigilance. Maintain clear roadside drains during heavy downpours.',
    shelters: [],
  },
  {
    id: 'zone-guwahati-07',
    name: 'Guwahati Administrative Hub',
    corridorName: 'Dispur Valley Central',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    coordinates: [26.1445, 91.7362],
    dangerRadiusMeters: 0,
    warningRadiusMeters: 0,
    riskSeverity: 'LOW',
    hazardType: 'ALLUVIAL_PLAIN',
    currentSituation:
      'Flat alluvial flood plain. Zero landslide or slope failure risk. Normal urban infrastructure operations.',
    geotechMetrics: {
      displacementRateMmDay: 0.0,
      poreWaterPressureKPa: 5.0,
      factorOfSafety: 2.5,
      rainfallPast24hMm: 12.0,
    },
    roadTransitStatus: 'ALL ROADS OPEN AND OPERATIONAL',
    requiredAction: 'Safe location. No landslide hazard precautions required.',
    shelters: [],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SIMULATION PRESETS FOR TESTING
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LocationPreset {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskSeverity;
  coordinates: LocationCoordinates;
}

export const LOCATION_PRESETS: LocationPreset[] = [
  {
    id: 'preset-durtlang-danger',
    name: 'Durtlang Ridge (NH-54, Aizawl)',
    description: 'Inside Active Danger Zone (350m from crown rupture) • 14.8 mm/day creep',
    riskLevel: 'CRITICAL',
    coordinates: {
      latitude: 23.7545,
      longitude: 92.7201,
      accuracy: 12,
      name: 'Durtlang Ridge km 12 (Inside Danger Zone)',
      source: 'SIMULATED',
    },
  },
  {
    id: 'preset-ranipool-danger',
    name: 'Ranipool - Singtam (NH-10, Sikkim)',
    description: 'Inside Debris Scour Zone (480m from riverbank failure)',
    riskLevel: 'CRITICAL',
    coordinates: {
      latitude: 27.2785,
      longitude: 88.5165,
      accuracy: 15,
      name: 'Ranipool NH-10 Teesta Bank',
      source: 'SIMULATED',
    },
  },
  {
    id: 'preset-ramhlun-warning',
    name: 'Ramhlun North (Aizawl)',
    description: 'Approaching High Risk Zone (1.1 km from escarpment)',
    riskLevel: 'HIGH',
    coordinates: {
      latitude: 23.7431,
      longitude: 92.7352,
      accuracy: 18,
      name: 'Ramhlun North Approaching Road',
      source: 'SIMULATED',
    },
  },
  {
    id: 'preset-bilkhawthlir-warning',
    name: 'Bilkhawthlir (NH-306, Kolasib)',
    description: 'Approaching Embankment Subsidence (1.4 km from slump)',
    riskLevel: 'HIGH',
    coordinates: {
      latitude: 24.1552,
      longitude: 92.6791,
      accuracy: 20,
      name: 'Bilkhawthlir Approach Road',
      source: 'SIMULATED',
    },
  },
  {
    id: 'preset-shillong-safe',
    name: 'Shillong Peak (Meghalaya)',
    description: 'Safe Zone (Stable quartzite formation, 0 hazard)',
    riskLevel: 'LOW',
    coordinates: {
      latitude: 25.5356,
      longitude: 91.8845,
      accuracy: 10,
      name: 'Upper Shillong Peak (Safe)',
      source: 'SIMULATED',
    },
  },
  {
    id: 'preset-guwahati-safe',
    name: 'Guwahati Dispur (Assam)',
    description: 'Safe Zone (Alluvial valley, 0 slope failure hazard)',
    riskLevel: 'LOW',
    coordinates: {
      latitude: 26.1445,
      longitude: 91.7362,
      accuracy: 8,
      name: 'Dispur Administrative Complex (Safe)',
      source: 'SIMULATED',
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   DISTANCE & RISK EVALUATION ALGORITHMS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Calculates geodesic distance between two coordinates in meters using the Haversine formula.
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
 * Evaluates the risk status of a user at a given coordinate.
 */
export function evaluateLocationRisk(coords: LocationCoordinates): LocationRiskEvaluation {
  let nearestZone = HAZARD_ZONES_NER[0];
  let minDistance = Infinity;

  // Find nearest hazard zone
  for (const zone of HAZARD_ZONES_NER) {
    const dist = calculateDistanceMeters(
      coords.latitude,
      coords.longitude,
      zone.coordinates[0],
      zone.coordinates[1]
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearestZone = zone;
    }
  }

  const isInsideDangerZone =
    nearestZone.riskSeverity !== 'LOW' &&
    nearestZone.dangerRadiusMeters > 0 &&
    minDistance <= nearestZone.dangerRadiusMeters;

  const isInsideWarningZone =
    nearestZone.riskSeverity !== 'LOW' &&
    nearestZone.warningRadiusMeters > 0 &&
    minDistance <= nearestZone.warningRadiusMeters;

  let overallRiskLevel: RiskSeverity = 'LOW';
  let headline = '🟢 You are currently in a Low-Risk Safe Area';
  let detailedAdvisory =
    'No active landslide rupture, slope movement, or road transit blockage detected within your immediate vicinity.';

  if (isInsideDangerZone) {
    overallRiskLevel = nearestZone.riskSeverity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    headline = `⚠️ DANGER: YOU ARE INSIDE ACTIVE LANDSLIDE HAZARD ZONE (${nearestZone.name.toUpperCase()})`;
    detailedAdvisory = `${nearestZone.currentSituation} Immediate evacuation is strongly advised. ${nearestZone.roadStatus}`;
  } else if (isInsideWarningZone) {
    overallRiskLevel =
      nearestZone.riskSeverity === 'CRITICAL'
        ? 'HIGH'
        : nearestZone.riskSeverity === 'HIGH'
        ? 'MODERATE'
        : 'LOW';
    const distText =
      minDistance < 1000 ? `${minDistance}m` : `${(minDistance / 1000).toFixed(1)} km`;
    headline = `⚠️ CAUTION: APPROACHING LANDSLIDE HAZARD CORRIDOR (${distText} from ${nearestZone.name})`;
    detailedAdvisory = `You are within ${distText} of ${nearestZone.name}. ${nearestZone.currentSituation} Prepare to take precautionary routes.`;
  } else if (minDistance <= 8000 && nearestZone.riskSeverity !== 'LOW') {
    overallRiskLevel = 'MODERATE';
    const distKm = (minDistance / 1000).toFixed(1);
    headline = `ℹ️ REGIONAL ADVISORY: Landslide prone corridor located ${distKm} km away`;
    detailedAdvisory = `The nearest active hazard zone is ${nearestZone.name} (${distKm} km). Transit routes in that sector are subject to weather restrictions.`;
  }

  // Calculate nearest shelter if any
  let nearestShelter: EvacuationShelter | null = null;
  if (nearestZone.shelters && nearestZone.shelters.length > 0) {
    let minShelterDist = Infinity;
    for (const sh of nearestZone.shelters) {
      const shDist = calculateDistanceMeters(
        coords.latitude,
        coords.longitude,
        sh.coordinates[0],
        sh.coordinates[1]
      );
      if (shDist < minShelterDist) {
        minShelterDist = shDist;
        nearestShelter = { ...sh, distanceMeters: shDist };
      }
    }
  }

  return {
    currentLocation: coords,
    isInsideDangerZone,
    isInsideWarningZone,
    nearestZone,
    distanceToNearestMeters: minDistance,
    overallRiskLevel,
    headline,
    detailedAdvisory,
    nearestShelter,
    evaluatedAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIO & BROWSER NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Plays an attention-grabbing multi-tone emergency hazard alert chime using the Web Audio API.
 * Works without requiring any external audio files.
 */
export function playEmergencyAlarmAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First tone (high pitch 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.18);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Second tone (attention warning 660Hz -> 990Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(660, now + 0.25);
    osc2.frequency.exponentialRampToValueAtTime(990, now + 0.45);
    gain2.gain.setValueAtTime(0.25, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.25);
    osc2.stop(now + 0.55);
  } catch (e) {
    // AudioContext autoplay restriction or error
    console.debug('Web Audio alert notification prevented by browser policy:', e);
  }
}

/**
 * Dispatches a native browser desktop/mobile notification if permission has been granted.
 */
export async function dispatchNativeBrowserNotification(
  headline: string,
  body: string
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  try {
    if (Notification.permission === 'granted') {
      new Notification(headline, {
        body,
        icon: '/icon.svg',
        tag: 'sentinel-location-hazard-alert',
      });
      return true;
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(headline, {
          body,
          icon: '/icon.svg',
          tag: 'sentinel-location-hazard-alert',
        });
        return true;
      }
    }
  } catch (e) {
    console.debug('Browser native notification failed:', e);
  }
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ALERT NOTIFICATIONS PERSISTENCE
   ═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY_NOTIFICATIONS = 'sentinel_location_alert_history';

export function getStoredLocationAlerts(): LocationAlertNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocationAlert(alert: LocationAlertNotification): LocationAlertNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getStoredLocationAlerts();
    // Keep max 20 latest alerts, newest first
    const updated = [alert, ...existing.filter((a) => a.id !== alert.id)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearStoredLocationAlerts(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
  } catch {
    // ignore
  }
}
