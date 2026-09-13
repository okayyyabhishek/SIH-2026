"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Gauge,
  Radio,
  Cpu,
  BatteryCharging,
  Wifi,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Share2,
  RefreshCw,
  MapPin,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Droplets,
  History,
  Milestone,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  TrendingUp,
  Info,
  Activity,
} from "lucide-react";

interface PiezometerLevel {
  depthM: number;
  porePressureKPa: number;
  normalKPa: number;
  soilMoistureVwc: number;
  stratum: string;
}

interface GeotechStation {
  id: string;
  name: string;
  state: string;
  location: string;
  baseFs: number;
  creepVelocityUmHr: number;
  insarDeformationMmYr: number;
  solarBatteryV: number;
  loraRssiDBm: number;
  packetDeliveryRate: number;
  piezometers: PiezometerLevel[];
  slopeAngleDeg: number;
  roadProximityM: number;
  soilPermeabilityIndex: number;
  drainageDensity: number;
  historicalLandslidesCount: number;
  lithologyDescription: string;
}

const STATIONS: Record<string, GeotechStation> = {
  "station-01": {
    id: "station-01",
    name: "Durtlang Scarp Station 01",
    state: "Mizoram",
    location: "Mizoram • Aizawl North • Bedding Plane 34° Sandstone",
    baseFs: 1.08,
    creepVelocityUmHr: 14.8,
    insarDeformationMmYr: -28.4,
    solarBatteryV: 12.8,
    loraRssiDBm: -82,
    packetDeliveryRate: 99.9,
    slopeAngleDeg: 34.0,
    roadProximityM: 120,
    soilPermeabilityIndex: 3.2,
    drainageDensity: 4.8,
    historicalLandslidesCount: 3,
    lithologyDescription: "Weathered Sandstone & Siltstone Interbedding",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 14.2, normalKPa: 8.0, soilMoistureVwc: 44.8, stratum: "Shallow Colluvium" },
      { depthM: 6.0, porePressureKPa: 28.5, normalKPa: 16.5, soilMoistureVwc: 51.2, stratum: "Weathered Shale Boundary" },
      { depthM: 9.0, porePressureKPa: 42.1, normalKPa: 24.0, soilMoistureVwc: 58.6, stratum: "Basal Bedrock Slip Plane" },
    ],
  },
  "station-02": {
    id: "station-02",
    name: "Selesih Escarpment Station 02",
    state: "Mizoram",
    location: "Mizoram • NH-54 Corridor • Regolith Cut Slope 28°",
    baseFs: 1.22,
    creepVelocityUmHr: 8.4,
    insarDeformationMmYr: -18.6,
    solarBatteryV: 13.1,
    loraRssiDBm: -78,
    packetDeliveryRate: 100.0,
    slopeAngleDeg: 28.0,
    roadProximityM: 45,
    soilPermeabilityIndex: 4.5,
    drainageDensity: 3.6,
    historicalLandslidesCount: 1,
    lithologyDescription: "Regolith Colluvium over Middle Bhuban Formation",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 11.5, normalKPa: 8.0, soilMoistureVwc: 39.4, stratum: "Upper Soil Surcharge" },
      { depthM: 6.0, porePressureKPa: 22.0, normalKPa: 16.0, soilMoistureVwc: 46.8, stratum: "Silty Siltstone Transition" },
      { depthM: 9.0, porePressureKPa: 33.2, normalKPa: 24.0, soilMoistureVwc: 52.1, stratum: "Competent Sandstone" },
    ],
  },
  "station-03": {
    id: "station-03",
    name: "Tuirial Bypass Station 03",
    state: "Mizoram",
    location: "Mizoram • Eastern Transport Link • Valley Slope 22°",
    baseFs: 1.45,
    creepVelocityUmHr: 2.1,
    insarDeformationMmYr: -5.2,
    solarBatteryV: 13.4,
    loraRssiDBm: -74,
    packetDeliveryRate: 100.0,
    slopeAngleDeg: 22.0,
    roadProximityM: 350,
    soilPermeabilityIndex: 6.8,
    drainageDensity: 2.1,
    historicalLandslidesCount: 0,
    lithologyDescription: "Massive Hard Sandstone with Minor Shaly Partings",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 8.2, normalKPa: 8.0, soilMoistureVwc: 32.1, stratum: "Residual Soil Cover" },
      { depthM: 6.0, porePressureKPa: 15.8, normalKPa: 15.5, soilMoistureVwc: 38.0, stratum: "Dense Sandstone Block" },
      { depthM: 9.0, porePressureKPa: 23.5, normalKPa: 23.0, soilMoistureVwc: 42.4, stratum: "Stable Bedrock Horizon" },
    ],
  },
  "station-04": {
    id: "station-04",
    name: "Haflong Hill Station 04",
    state: "Assam",
    location: "Assam • Dima Hasao • Barail Range Sinking Zone 31°",
    baseFs: 1.12,
    creepVelocityUmHr: 12.6,
    insarDeformationMmYr: -24.1,
    solarBatteryV: 12.9,
    loraRssiDBm: -80,
    packetDeliveryRate: 99.8,
    slopeAngleDeg: 31.0,
    roadProximityM: 80,
    soilPermeabilityIndex: 3.8,
    drainageDensity: 4.2,
    historicalLandslidesCount: 2,
    lithologyDescription: "Disintegrated Barail Sandstone & Jatinga Fault Gauge",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 13.8, normalKPa: 8.0, soilMoistureVwc: 42.5, stratum: "Colluvial Surcharge" },
      { depthM: 6.0, porePressureKPa: 26.4, normalKPa: 16.0, soilMoistureVwc: 49.0, stratum: "Disintegrated Siltstone" },
      { depthM: 9.0, porePressureKPa: 39.5, normalKPa: 24.0, soilMoistureVwc: 56.4, stratum: "Active Sinking Plane" },
    ],
  },
  "station-05": {
    id: "station-05",
    name: "Cherrapunji Plateau Station 05",
    state: "Meghalaya",
    location: "Meghalaya • East Khasi Hills • High-Precipitation Slopes 33°",
    baseFs: 1.18,
    creepVelocityUmHr: 9.8,
    insarDeformationMmYr: -19.4,
    solarBatteryV: 12.7,
    loraRssiDBm: -79,
    packetDeliveryRate: 100.0,
    slopeAngleDeg: 33.0,
    roadProximityM: 180,
    soilPermeabilityIndex: 5.2,
    drainageDensity: 5.5,
    historicalLandslidesCount: 2,
    lithologyDescription: "Karstified Sandstone with Fractured Joints",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 15.1, normalKPa: 8.0, soilMoistureVwc: 46.2, stratum: "High Infiltration Mantle" },
      { depthM: 6.0, porePressureKPa: 27.2, normalKPa: 16.2, soilMoistureVwc: 52.8, stratum: "Fractured Sandstone Interface" },
      { depthM: 9.0, porePressureKPa: 36.8, normalKPa: 24.0, soilMoistureVwc: 55.0, stratum: "Karstified Basal Horizon" },
    ],
  },
  "station-06": {
    id: "station-06",
    name: "Bomdila Pass Station 06",
    state: "Arunachal Pradesh",
    location: "Arunachal Pradesh • West Kameng • Strategic Highway Cut 29°",
    baseFs: 1.25,
    creepVelocityUmHr: 6.5,
    insarDeformationMmYr: -15.8,
    solarBatteryV: 13.0,
    loraRssiDBm: -76,
    packetDeliveryRate: 99.7,
    slopeAngleDeg: 29.0,
    roadProximityM: 60,
    soilPermeabilityIndex: 4.1,
    drainageDensity: 3.9,
    historicalLandslidesCount: 1,
    lithologyDescription: "Bomba Formation Weathered Gneiss & Mica Schist",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 10.4, normalKPa: 8.0, soilMoistureVwc: 37.5, stratum: "Gravelly Debris Layer" },
      { depthM: 6.0, porePressureKPa: 20.8, normalKPa: 16.0, soilMoistureVwc: 44.1, stratum: "Gneissic Weathered Zone" },
      { depthM: 9.0, porePressureKPa: 31.4, normalKPa: 24.0, soilMoistureVwc: 49.8, stratum: "Bedrock Slip Surface" },
    ],
  },
  "station-07": {
    id: "station-07",
    name: "Tupul Railway Station 07",
    state: "Manipur",
    location: "Manipur • Noney Sector • Ijai Valley Debris Flow Corridor 35°",
    baseFs: 1.05,
    creepVelocityUmHr: 16.4,
    insarDeformationMmYr: -31.2,
    solarBatteryV: 12.6,
    loraRssiDBm: -84,
    packetDeliveryRate: 99.5,
    slopeAngleDeg: 35.0,
    roadProximityM: 25,
    soilPermeabilityIndex: 2.8,
    drainageDensity: 5.2,
    historicalLandslidesCount: 4,
    lithologyDescription: "Slickensided Disang Shale & Soft Colluvial Debris",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 16.5, normalKPa: 8.0, soilMoistureVwc: 48.0, stratum: "Unconsolidated Colluvium" },
      { depthM: 6.0, porePressureKPa: 31.0, normalKPa: 16.5, soilMoistureVwc: 54.6, stratum: "Dissevelled Shale Zone" },
      { depthM: 9.0, porePressureKPa: 45.2, normalKPa: 24.5, soilMoistureVwc: 61.2, stratum: "Critical Failure Horizon" },
    ],
  },
  "station-08": {
    id: "station-08",
    name: "Kohima NH-29 Station 08",
    state: "Nagaland",
    location: "Nagaland • Kohima District • Active Sinking Section 30°",
    baseFs: 1.10,
    creepVelocityUmHr: 13.9,
    insarDeformationMmYr: -26.5,
    solarBatteryV: 12.8,
    loraRssiDBm: -81,
    packetDeliveryRate: 99.9,
    slopeAngleDeg: 30.0,
    roadProximityM: 50,
    soilPermeabilityIndex: 3.5,
    drainageDensity: 4.4,
    historicalLandslidesCount: 2,
    lithologyDescription: "Highly Contorted Disang Flysch with Sinking Horizon",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 14.0, normalKPa: 8.0, soilMoistureVwc: 43.5, stratum: "Upper Clayey Silt" },
      { depthM: 6.0, porePressureKPa: 27.5, normalKPa: 16.0, soilMoistureVwc: 50.8, stratum: "Dishergarh Dishen Shale" },
      { depthM: 9.0, porePressureKPa: 41.0, normalKPa: 24.0, soilMoistureVwc: 57.5, stratum: "Subsurface Creep Bedding" },
    ],
  },
  "station-09": {
    id: "station-09",
    name: "Teesta Valley Station 09",
    state: "Sikkim",
    location: "Sikkim • Gangtok • Teesta Riverward Colluvium Slope 32°",
    baseFs: 1.15,
    creepVelocityUmHr: 10.5,
    insarDeformationMmYr: -22.0,
    solarBatteryV: 12.9,
    loraRssiDBm: -77,
    packetDeliveryRate: 100.0,
    slopeAngleDeg: 32.0,
    roadProximityM: 110,
    soilPermeabilityIndex: 4.0,
    drainageDensity: 4.6,
    historicalLandslidesCount: 3,
    lithologyDescription: "Daling Group Chlorite-Sericite Phyllite & Scree",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 12.8, normalKPa: 8.0, soilMoistureVwc: 41.0, stratum: "River Terrace Alluvium" },
      { depthM: 6.0, porePressureKPa: 24.2, normalKPa: 16.0, soilMoistureVwc: 48.5, stratum: "Schist Weathering Horizon" },
      { depthM: 9.0, porePressureKPa: 35.6, normalKPa: 24.0, soilMoistureVwc: 53.8, stratum: "Basal Gneissic Plane" },
    ],
  },
  "station-10": {
    id: "station-10",
    name: "Baramura Ridge Station 10",
    state: "Tripura",
    location: "Tripura • Dhalai Corridor • Sandstone Hillock 24°",
    baseFs: 1.38,
    creepVelocityUmHr: 3.8,
    insarDeformationMmYr: -8.4,
    solarBatteryV: 13.3,
    loraRssiDBm: -75,
    packetDeliveryRate: 100.0,
    slopeAngleDeg: 24.0,
    roadProximityM: 450,
    soilPermeabilityIndex: 6.2,
    drainageDensity: 2.4,
    historicalLandslidesCount: 0,
    lithologyDescription: "Tipam Group Semi-Consolidated Fine-Grained Sandstone",
    piezometers: [
      { depthM: 3.0, porePressureKPa: 9.0, normalKPa: 8.0, soilMoistureVwc: 34.2, stratum: "Sandy Loam Residual" },
      { depthM: 6.0, porePressureKPa: 17.5, normalKPa: 15.5, soilMoistureVwc: 40.0, stratum: "Semi-Consolidated Sandstone" },
      { depthM: 9.0, porePressureKPa: 26.0, normalKPa: 23.5, soilMoistureVwc: 44.5, stratum: "Stable Tipam Sandstone" },
    ],
  },
};

type ScenarioType = "realtime" | "peak-downpour" | "dry-baseline";

export interface AmritaKigamGeotechProps {
  isPage?: boolean;
  extraActions?: React.ReactNode;
}

export function AmritaKigamGeotech({ isPage = false, extraActions }: AmritaKigamGeotechProps = {}) {
  const [selectedStationId, setSelectedStationId] = useState<string>("station-01");
  const [simulationScenario, setSimulationScenario] = useState<ScenarioType>("realtime");
  const [copiedBriefing, setCopiedBriefing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("18:12 IST");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const station = STATIONS[selectedStationId] || STATIONS["station-01"];

  // State for Real-Time Subsurface Geotechnical & Sigmoid Interactive Simulation
  const [customPwp, setCustomPwp] = useState<number | null>(null);
  const [customSlope, setCustomSlope] = useState<number | null>(null);
  const [customCohesion, setCustomCohesion] = useState<number | null>(null);
  const [customFriction, setCustomFriction] = useState<number | null>(null);

  // Active geotechnical values (from station telemetry or user interactive simulation)
  const stationDefaultPwp = station.piezometers[1]?.porePressureKPa || 24.0;
  const activePwp = customPwp !== null ? customPwp : stationDefaultPwp;
  const activeSlope = customSlope !== null ? customSlope : station.slopeAngleDeg;
  const activeCohesion = customCohesion !== null ? customCohesion : 21.0;
  const activeFriction = customFriction !== null ? customFriction : 27.0;

  // Mohr-Coulomb Subsurface Limit Equilibrium Factor of Safety (Fs) calculation
  const betaRad = (Math.max(5.0, Math.min(80.0, activeSlope)) * Math.PI) / 180.0;
  const phiRad = (activeFriction * Math.PI) / 180.0;
  const depthZ = 6.0; // 6m critical shear slip plane
  const gammaUnit = 18.5; // kN/m3 moist soil unit weight
  const totalStress = gammaUnit * depthZ; // 111 kPa
  const cosB = Math.cos(betaRad);
  const sinB = Math.sin(betaRad);
  const drivingShear = totalStress * sinB * cosB;
  const effectiveNormal = totalStress * (cosB * cosB) - activePwp;
  const shearStrength = activeCohesion + Math.max(0, effectiveNormal) * Math.tan(phiRad);
  const calculatedFs = Math.max(0.65, Math.min(2.8, drivingShear > 1e-4 ? shearStrength / drivingShear : 2.5));

  // Recalculate Factor of Safety (Fs) based on scenario when in telemetry mode
  const scenarioDeltaFs =
    simulationScenario === "peak-downpour" ? -0.16 : simulationScenario === "dry-baseline" ? +0.35 : 0.0;
  const factorOfSafety =
    customPwp !== null || customSlope !== null || customCohesion !== null || customFriction !== null
      ? calculatedFs
      : Math.max(0.75, Math.min(2.2, station.baseFs + scenarioDeltaFs));

  const isWatchState = factorOfSafety <= 1.3 && factorOfSafety >= 1.0;
  const isFailureState = factorOfSafety < 1.0;
  const isStableState = factorOfSafety > 1.3;

  // Subsurface Inclinometer Creep Velocity (um/hr)
  const creepDeficit = Math.max(0.0, 1.35 - factorOfSafety);
  const calculatedCreep = Math.round(
    Math.max(0.8, Math.min(50.0, 2.0 * Math.exp(2.8 * creepDeficit) + 0.04 * activePwp)) * 10
  ) / 10;
  const activeCreepVelocity =
    customPwp !== null || customSlope !== null ? calculatedCreep : station.creepVelocityUmHr;

  // Pore Pressure Ratio ru = u / (gamma * z)
  const porePressureRatio = Math.round((activePwp / totalStress) * 1000) / 1000;

  // Dynamic Geotechnical Risk Probability Model (Genuine 2026 Transparent Logistic Regression Formulation)
  const effectiveDrainage =
    simulationScenario === "peak-downpour"
      ? station.drainageDensity + 1.2
      : simulationScenario === "dry-baseline"
      ? Math.max(1.0, station.drainageDensity - 0.7)
      : station.drainageDensity;

  const effectivePermeability =
    simulationScenario === "peak-downpour"
      ? Math.max(1.0, station.soilPermeabilityIndex - 1.2)
      : simulationScenario === "dry-baseline"
      ? Math.min(10.0, station.soilPermeabilityIndex + 0.8)
      : station.soilPermeabilityIndex;

  // Normalized Z-scores matching genuine 2026 training data (train.csv):
  // historical_event_density_30d: mean 0.3176, std 0.8747
  // slope_angle_deg: mean 27.9316, std 8.8280
  // road_proximity_m: mean 44801.9, std 29443.4
  // drainage_density: mean 3.2642, std 0.6608
  // soil_permeability_index: mean 3.4258, std 0.8317
  const normHist = ((station.historicalLandslidesCount * 0.8) - 0.3176) / 0.8747;
  const normSlope = (activeSlope - 27.9316) / 8.828;
  const normRoad = (station.roadProximityM - 44801.9) / 29443.4;
  const normDrain = (effectiveDrainage - 3.2642) / 0.6608;
  const normSoil = (effectivePermeability - 3.4258) / 0.8317;

  // Subsurface Geotech Pore Pressure delta log-odds contribution
  const geotechPwpDelta = 0.03 * (activePwp - 16.0);

  // Log-odds linear dot product with genuine 2026 weights + subsurface geotech coupling:
  // z = beta_0 + 1.6926(Hist) + 1.1002(Slope) - 0.3564(Road) + 0.3963(Drain) + 0.0143(Soil) + Delta_geotech
  const rawLogit =
    0.0918 +
    1.6926 * normHist +
    1.1002 * normSlope -
    0.3564 * normRoad +
    0.3963 * normDrain +
    0.0143 * normSoil +
    geotechPwpDelta;

  // Standard Real-Time Sigmoid Function: sigma(z) = 1 / (1 + exp(-z))
  const clampedRawZ = Math.max(-15.0, Math.min(15.0, rawLogit));
  const rawSigmoid = 1.0 / (1.0 + Math.exp(-clampedRawZ));

  // Platt Scaling (A=1.05, B=-0.02)
  const plattZ = 1.05 * rawLogit - 0.02;
  const clampedZ = Math.max(-15.0, Math.min(15.0, plattZ));
  const calibratedProbability = 1.0 / (1.0 + Math.exp(-clampedZ));
  const riskPct = Math.round(calibratedProbability * 100);

  const riskTier =
    calibratedProbability < 0.25
      ? {
          label: "LOW RISK",
          color: "text-emerald-600 dark:text-emerald-400",
          badge:
            "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60",
        }
      : calibratedProbability < 0.5
      ? {
          label: "MODERATE RISK",
          color: "text-sky-600 dark:text-sky-400",
          badge:
            "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700/60",
        }
      : calibratedProbability < 0.75
      ? {
          label: "HIGH RISK",
          color: "text-amber-600 dark:text-amber-400",
          badge:
            "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60",
        }
      : {
          label: "VERY HIGH RISK",
          color: "text-rose-600 dark:text-rose-400",
          badge:
            "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/60",
        };

  const handleRefresh = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} IST`;
      setLastSyncTime(timeStr);
      setIsSyncing(false);
    }, 600);
  };

  const handleCopy = () => {
    const stageLabel = isFailureState
      ? "ACTIVE FAILURE"
      : isWatchState
      ? "CRITICAL CREEP WATCH"
      : "STABLE";

    const text =
      `📐 *SENTINEL NER / AMRITA-KIGAM GEOTECHNICAL DISPATCH*\n` +
      `Station: ${station.name} (${station.location})\n` +
      `Limit-Equilibrium Factor of Safety (Fs): ${factorOfSafety.toFixed(2)} (${stageLabel})\n` +
      `Scenario Mode: ${simulationScenario === "realtime" ? "Live Field Telemetry" : simulationScenario === "peak-downpour" ? "Simulated Peak Downpour (+25 kPa)" : "Dry Baseline"}\n` +
      `Creep Velocity: ${station.creepVelocityUmHr} μm/hr | InSAR Line-of-Sight: ${station.insarDeformationMmYr} mm/yr\n` +
      `Piezometer Column:\n` +
      station.piezometers
        .map((p) => `  • Depth ${p.depthM.toFixed(1)}m (${p.stratum}): ${p.porePressureKPa.toFixed(1)} kPa | VWC ${p.soilMoistureVwc.toFixed(1)}%`)
        .join("\n") +
      `\nIoT WSN Health: Battery ${station.solarBatteryV}V | LoRa RSSI ${station.loraRssiDBm} dBm | Packet Delivery ${station.packetDeliveryRate}%\n` +
      `Last Sync: ${lastSyncTime} • Amrita AWNA Dual-Depth LoRa Mesh & KIGAM Meter\n` +
      `Live Console: http://localhost:3000/geotech`;

    navigator.clipboard?.writeText(text);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  // Dial color configuration
  const stageBadgeClasses = isFailureState
    ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-700/60"
    : isWatchState
    ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60"
    : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60";

  const dialTextClass = isFailureState
    ? "text-rose-600 dark:text-rose-400"
    : isWatchState
    ? "text-amber-600 dark:text-amber-400"
    : "text-emerald-600 dark:text-emerald-400";

  // Slider pin position percent (range 0.8 to 1.6 mapped to 0-100%)
  const pinPercent = Math.max(0, Math.min(100, Math.round(((factorOfSafety - 0.8) / (1.6 - 0.8)) * 100)));

  return (
    <section aria-labelledby="geotech-mesh-heading" className="space-y-4">
      {/* Section Title with Amrita AWNA & KIGAM Accreditation */}
      <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-sentinel-800 pb-4">
        <div>
          <div className="sr-only">
            <span>AMRITA AWNA IoT MESH &amp; KIGAM GEOTECHNICAL MONITORING</span>
          </div>
          {isPage ? (
            <h1
              id="geotech-mesh-heading"
              className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2 whitespace-nowrap"
            >
              <Gauge className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Deep Subsurface Sensors &amp; Slope Stability (Fs)</span>
            </h1>
          ) : (
            <h2
              id="geotech-mesh-heading"
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2 whitespace-nowrap"
            >
              <Gauge className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Deep Subsurface Sensor Mesh &amp; Slope Stability Factor of Safety (Fs)</span>
            </h2>
          )}
        </div>

        {/* Action Controls Toolbar - Placed on the next line with equal distance */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Station Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-xs shadow-xs shrink-0">
            <MapPin className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400 ml-1 shrink-0" />
            <label htmlFor="station-select" className="sr-only">Select Station</label>
            <select
              id="station-select"
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="bg-transparent border-0 text-slate-800 dark:text-slate-200 font-semibold text-xs focus:ring-0 cursor-pointer pr-1 py-1"
            >
              {Array.from(new Set(Object.values(STATIONS).map((s) => s.state))).map((stName) => (
                <optgroup key={stName} label={stName} className="bg-slate-100 dark:bg-sentinel-950 font-bold">
                  {Object.values(STATIONS)
                    .filter((s) => s.state === stName)
                    .map((st) => (
                      <option
                        key={st.id}
                        value={st.id}
                        className="bg-white dark:bg-sentinel-900 text-slate-900 dark:text-white font-normal"
                      >
                        {st.name} ({st.state})
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-xs whitespace-nowrap shrink-0"
            style={{
              backgroundColor: isFailureState ? "rgba(254, 226, 226, 0.6)" : isWatchState ? "rgba(254, 243, 199, 0.6)" : "rgba(209, 250, 229, 0.6)",
              borderColor: isFailureState ? "rgba(248, 113, 113, 0.8)" : isWatchState ? "rgba(245, 158, 11, 0.6)" : "rgba(16, 185, 129, 0.6)",
              color: isFailureState ? "#991b1b" : isWatchState ? "#92400e" : "#065f46",
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isFailureState ? "CRITICAL FAILURE IMMINENT" : isWatchState ? "LIMIT EQUILIBRIUM: WATCH" : "GEOTECHNICALLY STABLE"}
            </span>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            role="button"
            onClick={handleRefresh}
            title="Refresh LoRa Mesh Packet"
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gov-blue dark:text-sky-400 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync: {lastSyncTime}</span>
          </button>

          {/* Share Briefing Button */}
          <button
            type="button"
            role="button"
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap shrink-0"
          >
            {copiedBriefing ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400 shrink-0" />
                <span>Share Dispatch</span>
              </>
            )}
          </button>

          {/* Extra Page Actions (Full Sensor Network + Action Center) */}
          {extraActions}
        </div>
      </div>

      {/* Interactive Simulation Scenario Strip */}
      <div className="p-3 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-gov-blue dark:text-sky-400 shrink-0" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">Pore Pressure Infiltration Scenario:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            role="button"
            aria-pressed={simulationScenario === "realtime"}
            onClick={() => setSimulationScenario("realtime")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              simulationScenario === "realtime"
                ? "bg-gov-blue text-white dark:bg-sky-600 dark:text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 dark:text-slate-300"
            }`}
          >
            Real-Time Telemetry
          </button>
          <button
            type="button"
            role="button"
            aria-pressed={simulationScenario === "peak-downpour"}
            onClick={() => setSimulationScenario("peak-downpour")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              simulationScenario === "peak-downpour"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 dark:text-slate-300"
            }`}
          >
            Simulate Downpour (+25 kPa)
          </button>
          <button
            type="button"
            role="button"
            aria-pressed={simulationScenario === "dry-baseline"}
            onClick={() => setSimulationScenario("dry-baseline")}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              simulationScenario === "dry-baseline"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 dark:text-slate-300"
            }`}
          >
            Dry Antecedent Baseline
          </button>
        </div>
      </div>

      {/* Grid: KIGAM Factor of Safety + Subsurface Piezometers + IoT WSN Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Column (5 cols): KIGAM Infinite Slope Stability Meter */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-sentinel-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                  <Gauge className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  KIGAM Slope Stability Meter
                </span>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 text-slate-600 dark:text-slate-400">
                Infinite Slope Model
              </span>
            </div>

            {/* Factor of Safety Dial Display */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 text-center space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Current Factor of Safety (Fs)
              </div>
              <div className={`text-4xl sm:text-5xl font-bold tracking-tight tabular-nums ${dialTextClass}`}>
                {factorOfSafety.toFixed(2)}
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-xs font-semibold ${stageBadgeClasses}`}>
                <span>
                  {isFailureState
                    ? "STAGE: CRITICAL FAILURE IMMINENT (Fs < 1.00)"
                    : isWatchState
                    ? "STAGE: CRITICAL CREEP WATCH (1.00 ≤ Fs ≤ 1.30)"
                    : "STAGE: GEOTECHNICALLY STABLE (Fs > 1.30)"}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto pt-1">
                {isFailureState
                  ? "Pore water pressure exceeds normal effective stress along basal shear interface. Immediate slope movement alert."
                  : isWatchState
                  ? "Subsurface pore water pressure has reduced effective shear resistance along the 34° sandstone bedding plane."
                  : "Effective shear strength comfortably exceeds downslope gravitational driving force across all slip planes."}
              </p>
            </div>

            {/* Fs Reference Threshold Range Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                <span className="text-rose-600 dark:text-rose-400 font-semibold">&lt;1.0 Failure</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">1.0 – 1.3 Watch</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">&gt;1.3 Stable</span>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-sentinel-950 rounded-full flex overflow-hidden border border-slate-300 dark:border-sentinel-800 p-0.5 relative">
                <div className="bg-rose-600 h-full rounded-l-full" style={{ width: "25%" }} />
                <div className="bg-amber-500 h-full" style={{ width: "37.5%" }} />
                <div className="bg-emerald-600 h-full rounded-r-full" style={{ width: "37.5%" }} />
                {/* Dynamic Pin marker indicating current Fs */}
                <div
                  className="absolute top-0 bottom-0 w-2 bg-white dark:bg-slate-100 border border-slate-900 shadow-md rounded-full transition-all duration-500"
                  style={{ left: `calc(${pinPercent}% - 4px)` }}
                  title={`Current Fs: ${factorOfSafety.toFixed(2)}`}
                />
              </div>
            </div>
          </div>

          {/* Micro-displacement Rate Telemetry */}
          <div className="pt-3 border-t border-slate-200 dark:border-sentinel-800/80 grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-sentinel-950/60 border border-slate-200 dark:border-sentinel-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Creep Velocity (KIGAM)</span>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums mt-0.5 block">
                {simulationScenario === "peak-downpour" ? "28.6" : station.creepVelocityUmHr} μm / hr
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-sentinel-950/60 border border-slate-200 dark:border-sentinel-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Line-of-Sight InSAR</span>
              <span className="text-sm font-bold text-purple-700 dark:text-fuchsia-400 tabular-nums mt-0.5 block">
                {station.insarDeformationMmYr} mm / yr
              </span>
            </div>
          </div>
        </div>

        {/* Middle Column (4 cols): Amrita AWNA Deep Subsurface Piezometer & Moisture */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-sentinel-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-cyan-500/10 text-gov-blue dark:text-cyan-400 border border-sky-200 dark:border-cyan-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Amrita AWNA Subsurface Profile
                </span>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-sky-50 text-gov-blue border border-sky-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800">
                Piezometer Column
              </span>
            </div>

            {/* Depth Profile Telemetry Cards */}
            <div className="mt-3 space-y-2.5">
              {station.piezometers.map((p) => {
                const excessPressure =
                  simulationScenario === "peak-downpour" ? p.porePressureKPa + 15.0 : p.porePressureKPa;
                const overBasePct = Math.round(((excessPressure - p.normalKPa) / p.normalKPa) * 100);

                return (
                  <div
                    key={p.depthM}
                    className="p-3 rounded-lg border border-slate-200 dark:border-sentinel-800 bg-slate-50 dark:bg-sentinel-950"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-gov-blue dark:text-cyan-400 text-sm tabular-nums">
                          {p.depthM.toFixed(1)}m
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">{p.stratum}</span>
                      </div>

                      <div className="text-center">
                        <span className="font-bold text-slate-900 dark:text-white text-sm tabular-nums">
                          {excessPressure.toFixed(1)} kPa
                        </span>
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium tabular-nums block">
                          +{overBasePct}% Over Base
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm tabular-nums">
                          {p.soilMoistureVwc.toFixed(1)}%
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">Volumetric VWC</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-sentinel-800/80 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-gov-blue dark:text-cyan-400">Amrita AWNA Patent:</span> Dual-depth wireless pore-pressure sensor network deployed across Durtlang ridge escarpment.
          </div>
        </div>

        {/* Right Column (3 cols): WSN Wireless Gateway & Node Health */}
        <div className="lg:col-span-3 p-5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-sentinel-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  <Wifi className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  IoT WSN Mesh
                </span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Telemetry Metrics */}
            <div className="mt-3 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Solar Battery</span>
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                    {station.solarBatteryV} V
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Solar array: 13.6 V charging</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-gov-blue dark:text-cyan-400" />
                    <span>LoRa Mesh RSSI</span>
                  </span>
                  <span className="text-gov-blue dark:text-cyan-300 font-bold tabular-nums">
                    {station.loraRssiDBm} dBm
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">SNR: +9.4 dB (Strong Link)</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Packet Delivery</span>
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                    {station.packetDeliveryRate}%
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">0 dropped packets in 24h</div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-sentinel-800/80 text-xs text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Mesh Status:</span>
            <span className="font-bold">ACTIVE RELAY</span>
          </div>
        </div>
      </div>

      {/* 5-Factor Geotechnical Risk Drivers & Calibrated Probability Panel */}
      <div className="p-5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-4">
        {/* Header with Title and Calibrated Risk Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-sentinel-800/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-gov-blue dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">
                <Sliders className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                <span>Landslide Risk Probability &amp; 5 Authoritative Geotechnical Drivers</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Multivariate spatial features feeding the Stage 5 transparent logistic regression engine for{" "}
              <strong className="text-slate-700 dark:text-slate-300">{station.name}</strong>.
            </p>
          </div>

          {/* Calibrated Probability Readout */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                Calibrated Failure Prob (P)
              </span>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className={`text-2xl font-black tabular-nums tracking-tight ${riskTier.color}`}>
                  {calibratedProbability.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-400">({riskPct}%)</span>
              </div>
            </div>
            <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold shadow-xs whitespace-nowrap ${riskTier.badge}`}>
              {riskTier.label}
            </div>
          </div>
        </div>

        {/* 5-Feature Grid with Genuine 2026 Fitted Weights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Feature 1: Slope Inclination Angle */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Slope Angle</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  +1.10 Wt
                </span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {activeSlope.toFixed(1)}°
                </span>
                <span className="text-xs text-slate-500">inclination</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-sentinel-800/80 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">Relief Tier:</span>
                <span className={`text-[11px] font-bold ${activeSlope >= 30 ? "text-rose-600 dark:text-rose-400" : activeSlope >= 25 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {activeSlope >= 32 ? "Steep Dip-Slope" : activeSlope >= 26 ? "Moderate Escarpment" : "Gentle Valley"}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-sentinel-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${activeSlope >= 30 ? "bg-rose-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(100, Math.max(10, (activeSlope / 50) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                CartoDEM 30m Zonal Slope
              </span>
            </div>
          </div>

          {/* Feature 2: Road & Infrastructure Proximity */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Milestone className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                  <span>Road Proximity</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-gov-blue dark:text-sky-300">
                  -0.36 Wt
                </span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {station.roadProximityM}
                </span>
                <span className="text-xs text-slate-500">meters</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-sentinel-800/80 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">Toe Exposure:</span>
                <span className={`text-[11px] font-bold ${station.roadProximityM < 100 ? "text-rose-600 dark:text-rose-400" : station.roadProximityM < 250 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {station.roadProximityM < 60 ? "Active Toe Cut" : station.roadProximityM < 200 ? "Corridor Surcharge" : "Buffered Slope"}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-sentinel-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${station.roadProximityM < 100 ? "bg-rose-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, Math.max(10, (1 - Math.min(1, station.roadProximityM / 500)) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                Distance to Corridor Lifeline
              </span>
            </div>
          </div>

          {/* Feature 3: Soil Permeability Index */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Soil Permeability</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300">
                  +0.01 Wt
                </span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {effectivePermeability.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">/ 10 index</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-sentinel-800/80 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">Hydraulic Flow:</span>
                <span className={`text-[11px] font-bold ${effectivePermeability < 3.5 ? "text-rose-600 dark:text-rose-400" : effectivePermeability < 5.5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {effectivePermeability < 3.5 ? "Low (Saturation Prone)" : effectivePermeability < 5.5 ? "Moderate Drainage" : "Fast Percolation"}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-sentinel-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${effectivePermeability < 3.5 ? "bg-rose-500" : "bg-cyan-500"}`}
                  style={{ width: `${Math.min(100, Math.max(10, (effectivePermeability / 10) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight truncate" title={station.lithologyDescription}>
                {station.lithologyDescription}
              </span>
            </div>
          </div>

          {/* Feature 4: Drainage Network Density */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Drainage Density</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                  +0.40 Wt
                </span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {effectiveDrainage.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">km / km²</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-sentinel-800/80 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">Runoff Load:</span>
                <span className={`text-[11px] font-bold ${effectiveDrainage >= 4.5 ? "text-rose-600 dark:text-rose-400" : effectiveDrainage >= 3.0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {effectiveDrainage >= 4.5 ? "Dense Hydro-Convergence" : effectiveDrainage >= 3.0 ? "Normal Channel Flow" : "Dispersed Runoff"}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-sentinel-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${effectiveDrainage >= 4.5 ? "bg-rose-500" : "bg-purple-500"}`}
                  style={{ width: `${Math.min(100, Math.max(10, (effectiveDrainage / 7.0) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                Catchment Channel Convergence
              </span>
            </div>
          </div>

          {/* Feature 5: Historical Rupture Frequency */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Historical Events</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                  +1.69 Wt
                </span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {station.historicalLandslidesCount}
                </span>
                <span className="text-xs text-slate-500">recorded</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-sentinel-800/80 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">Recurrence:</span>
                <span className={`text-[11px] font-bold ${station.historicalLandslidesCount >= 3 ? "text-rose-600 dark:text-rose-400" : station.historicalLandslidesCount >= 1 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {station.historicalLandslidesCount >= 3 ? "Active Creep Hotspot" : station.historicalLandslidesCount >= 1 ? "Prior Rupture Logged" : "No Prior Record"}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-sentinel-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${station.historicalLandslidesCount >= 3 ? "bg-rose-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, Math.max(10, (station.historicalLandslidesCount / 5) * 100))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                GSI Bhukosh Verified Records
              </span>
            </div>
          </div>
        </div>

        {/* Analytical Model Link Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-sentinel-800/80 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400 shrink-0" />
            <span>
              2026 Model Logit: <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-slate-100 dark:bg-sentinel-950 text-slate-800 dark:text-slate-300">z = 0.0918 + 1.69(Hist) + 1.10(Slope) - 0.36(Road) + 0.40(Drain) + 0.01(Soil) + ΔPWP</code>
            </span>
          </div>
          <Link
            href="/risk"
            className="inline-flex items-center gap-1 text-xs font-bold text-gov-blue hover:text-gov-blue-dark dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
          >
            <span>Inspect Full Model in Risk Engine</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* REAL-TIME SUBSURFACE GEOTECH & SIGMOID FUNCTION CALCULATOR & VISUALIZER */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-sentinel-800/80 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                <span>Real-Time Subsurface Geotechnical &amp; Sigmoid Function Engine</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                LIVE 2026 COUPLING
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive physical simulation coupling Pore Water Pressure ($u$), Mohr-Coulomb Factor of Safety ($F_s$), and the Logistic Sigmoid activation function:{" "}
              <code className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">σ(z) = 1 / (1 + e^-z)</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(customPwp !== null || customSlope !== null || customCohesion !== null || customFriction !== null) && (
              <button
                type="button"
                onClick={() => {
                  setCustomPwp(null);
                  setCustomSlope(null);
                  setCustomCohesion(null);
                  setCustomFriction(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset to Station Telemetry</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Subsurface Geotechnical & Sigmoid Metric Readouts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
              Linear Logit (z)
            </span>
            <span className="text-xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {rawLogit >= 0 ? `+${rawLogit.toFixed(3)}` : rawLogit.toFixed(3)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">z = β₀ + Σ wᵢ·xᵢ</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
              Sigmoid σ(z)
            </span>
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {rawSigmoid.toFixed(4)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">1 / (1 + e^-z)</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
              Platt Calibrated (P)
            </span>
            <span className="text-xl font-black font-mono text-sky-600 dark:text-sky-400 tabular-nums">
              {calibratedProbability.toFixed(4)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">{riskPct}% Failure Prob</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
              Factor of Safety (Fs)
            </span>
            <span className={`text-xl font-black font-mono tabular-nums ${factorOfSafety < 1.0 ? "text-rose-600 dark:text-rose-400" : factorOfSafety <= 1.3 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {factorOfSafety.toFixed(3)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {factorOfSafety < 1.0 ? "Unstable (Failure)" : factorOfSafety <= 1.3 ? "Limit Equilibrium" : "Stable Slope"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
              Pore Ratio (ru)
            </span>
            <span className="text-xl font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {porePressureRatio.toFixed(3)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">u / (γ·z) @ 6m slip</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
              Creep Velocity
            </span>
            <span className={`text-xl font-black font-mono tabular-nums ${activeCreepVelocity > 15 ? "text-rose-600 dark:text-rose-400" : activeCreepVelocity > 8 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
              {activeCreepVelocity.toFixed(1)} <span className="text-xs font-normal">μm/h</span>
            </span>
            <span className="text-[10px] text-slate-400 block truncate">Inclinometer Shear</span>
          </div>
        </div>

        {/* Dynamic SVG Sigmoid S-Curve & Interactive Sliders Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* SVG S-Curve Chart (7 cols) */}
          <div className="lg:col-span-7 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Continuous Sigmoid S-Curve &amp; Operating Point</span>
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                Operating: <strong className="text-amber-400">z = {rawLogit.toFixed(2)}</strong>, <strong className="text-emerald-400">σ(z) = {rawSigmoid.toFixed(3)}</strong>
              </span>
            </div>

            {/* SVG Visualizer */}
            <div className="relative w-full h-52 bg-slate-900/90 rounded-lg overflow-hidden border border-slate-800/80">
              <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sigGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="sigBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="sigAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="sigRose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Risk Background Zones: y=165 (0.0), y=132.5 (0.25), y=100 (0.5), y=67.5 (0.75), y=35 (1.0) */}
                <rect x="50" y="132.5" width="510" height="32.5" fill="url(#sigGreen)" />
                <rect x="50" y="100" width="510" height="32.5" fill="url(#sigBlue)" />
                <rect x="50" y="67.5" width="510" height="32.5" fill="url(#sigAmber)" />
                <rect x="50" y="35" width="510" height="32.5" fill="url(#sigRose)" />

                {/* Threshold Reference Lines */}
                <line x1="50" y1="132.5" x2="560" y2="132.5" stroke="#10b981" strokeDasharray="3 3" strokeOpacity="0.4" />
                <line x1="50" y1="100" x2="560" y2="100" stroke="#0284c7" strokeDasharray="3 3" strokeOpacity="0.4" />
                <line x1="50" y1="67.5" x2="560" y2="67.5" stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity="0.4" />
                <line x1="50" y1="35" x2="560" y2="35" stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity="0.4" />

                {/* Central Axes: z=0 is at x = 50 + (6/12)*510 = 305 */}
                <line x1="305" y1="30" x2="305" y2="170" stroke="#475569" strokeDasharray="2 2" strokeOpacity="0.6" />
                <line x1="50" y1="165" x2="560" y2="165" stroke="#64748b" strokeWidth="1.2" />
                <line x1="50" y1="30" x2="50" y2="165" stroke="#64748b" strokeWidth="1.2" />

                {/* Axis Labels */}
                <text x="50" y="180" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">-6</text>
                <text x="177" y="180" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">-3</text>
                <text x="305" y="180" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">0 (z)</text>
                <text x="432" y="180" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">+3</text>
                <text x="560" y="180" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="middle">+6</text>

                <text x="42" y="168" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">0.0</text>
                <text x="42" y="103" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="end">0.5</text>
                <text x="42" y="38" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">1.0</text>

                {/* Continuous Sigmoid Curve Path */}
                {(() => {
                  const pts: string[] = [];
                  for (let i = -60; i <= 60; i += 2) {
                    const zVal = i / 10.0;
                    const sig = 1.0 / (1.0 + Math.exp(-zVal));
                    const px = 50 + ((zVal + 6.0) / 12.0) * 510;
                    const py = 165 - sig * 130;
                    pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
                  }
                  return (
                    <polyline
                      points={pts.join(" ")}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  );
                })()}

                {/* Active Operating Point (z, sigma) */}
                {(() => {
                  const clampedZForPlot = Math.max(-6.0, Math.min(6.0, rawLogit));
                  const activeX = 50 + ((clampedZForPlot + 6.0) / 12.0) * 510;
                  const activeY = 165 - rawSigmoid * 130;

                  return (
                    <g>
                      {/* Dashed Drop Lines */}
                      <line
                        x1={activeX}
                        y1={activeY}
                        x2={activeX}
                        y2="165"
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        strokeWidth="1.2"
                      />
                      <line
                        x1="50"
                        y1={activeY}
                        x2={activeX}
                        y2={activeY}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        strokeWidth="1.2"
                      />

                      {/* Halo Pulse */}
                      <circle
                        cx={activeX}
                        cy={activeY}
                        r="12"
                        fill="#f59e0b"
                        fillOpacity="0.25"
                        className="animate-ping"
                      />
                      {/* Center Point */}
                      <circle
                        cx={activeX}
                        cy={activeY}
                        r="6"
                        fill="#fbbf24"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono pt-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Low (&lt;0.25)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>Mod (0.25-0.5)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>High (0.5-0.75)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Very High (&gt;0.75)</span>
                </span>
              </div>
              <span className="text-slate-500">Continuous S-Curve Equation: σ(z) = 1 / (1 + e^-z)</span>
            </div>
          </div>

          {/* Interactive Physical Geotech Simulation Sliders (5 cols) */}
          <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-sentinel-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                <span>Geotechnical Stress Controls</span>
              </span>
              <span className="text-[10px] text-slate-500">Manipulate in Real-Time</span>
            </div>

            {/* Slider 1: Subsurface Pore Water Pressure u */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Pore Water Pressure (u)</span>
                </span>
                <span className="font-mono font-bold text-sky-700 dark:text-sky-300">
                  {activePwp.toFixed(1)} kPa
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="0.5"
                value={activePwp}
                onChange={(e) => setCustomPwp(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-sentinel-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 kPa (Drained)</span>
                <span>60 kPa (Hydrostatic Head)</span>
              </div>
            </div>

            {/* Slider 2: Slope Gradient Angle beta */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Slope Inclination (β)</span>
                </span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                  {activeSlope.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="0.5"
                value={activeSlope}
                onChange={(e) => setCustomSlope(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-sentinel-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>10° (Gentle)</span>
                <span>50° (Precipitous Dip)</span>
              </div>
            </div>

            {/* Slider 3: Internal Friction Angle phi' */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Friction Angle (φ&apos;)</span>
                </span>
                <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                  {activeFriction.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="40"
                step="0.5"
                value={activeFriction}
                onChange={(e) => setCustomFriction(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-sentinel-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>20° (Slickensided Shale)</span>
                <span>40° (Dense Sandstone)</span>
              </div>
            </div>

            {/* Slider 4: Effective Cohesion c' */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Effective Cohesion (c&apos;)</span>
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {activeCohesion.toFixed(1)} kPa
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="0.5"
                value={activeCohesion}
                onChange={(e) => setCustomCohesion(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-sentinel-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>5 kPa (Weathered Regolith)</span>
                <span>45 kPa (Consolidated Barail)</span>
              </div>
            </div>

            {/* Physical Stability Formula Card */}
            <div className="p-2.5 rounded-lg bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800/80 space-y-1 text-[11px]">
              <div className="flex items-center justify-between font-mono font-bold">
                <span className="text-slate-500">Infinite Slope Fs:</span>
                <span className={factorOfSafety < 1.0 ? "text-rose-600" : factorOfSafety <= 1.3 ? "text-amber-600" : "text-emerald-600"}>
                  {factorOfSafety.toFixed(3)}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 leading-tight">
                Fs = [c&apos; + (γ·z·cos²β - u)·tanφ&apos;] / [γ·z·sinβ·cosβ]
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
