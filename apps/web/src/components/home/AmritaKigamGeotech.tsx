"use client";

import React, { useState } from "react";
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
  const [selectedDepthM, setSelectedDepthM] = useState<number>(9.0);
  const [copiedBriefing, setCopiedBriefing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("18:12 IST");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const station = STATIONS[selectedStationId] || STATIONS["station-01"];

  // Recalculate Factor of Safety (Fs) and pore pressures based on active scenario
  const scenarioDeltaFs =
    simulationScenario === "peak-downpour" ? -0.16 : simulationScenario === "dry-baseline" ? +0.35 : 0.0;
  const factorOfSafety = Math.max(0.75, Math.min(2.2, station.baseFs + scenarioDeltaFs));

  const isWatchState = factorOfSafety <= 1.3 && factorOfSafety >= 1.0;
  const isFailureState = factorOfSafety < 1.0;
  const isStableState = factorOfSafety > 1.3;

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

            {/* Depth Profile Table with Interactive Selection */}
            <div className="mt-3 space-y-2.5">
              {station.piezometers.map((p) => {
                const isSelected = selectedDepthM === p.depthM;
                const excessPressure =
                  simulationScenario === "peak-downpour" ? p.porePressureKPa + 15.0 : p.porePressureKPa;
                const overBasePct = Math.round(((excessPressure - p.normalKPa) / p.normalKPa) * 100);

                return (
                  <div
                    key={p.depthM}
                    onClick={() => setSelectedDepthM(p.depthM)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/70 dark:bg-sentinel-800/90 border-gov-blue dark:border-sky-500 ring-2 ring-gov-blue/20 dark:ring-sky-500/30 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100/80 dark:bg-sentinel-950 dark:hover:bg-sentinel-800/50 border-slate-200 dark:border-sentinel-800"
                    }`}
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
    </section>
  );
}
