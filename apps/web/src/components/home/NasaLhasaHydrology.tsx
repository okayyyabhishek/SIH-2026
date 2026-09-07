"use client";

import React, { useState } from "react";
import {
  CloudRain,
  Droplets,
  Satellite,
  Activity,
  TrendingUp,
  ShieldAlert,
  Calendar,
  Layers,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Share2,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Info,
} from "lucide-react";

interface BasinRainfallPoint {
  day: string;
  date: string;
  rainfallMm: number;
  thresholdMm: number;
  cumulativeMm: number;
}

interface BasinData {
  id: string;
  name: string;
  state: string;
  subcatchment: string;
  ariIndex: number;
  ariThreshold: number;
  ariAnomaly: string;
  rain24h: number;
  smapSaturation: number;
  smapNormal: number;
  nowcastTier: "Severe" | "High" | "Moderate" | "Low";
  nowcastTierLabel: string;
  nowcastConfidence: number;
  soilMoistureStatus: string;
  criticalCorridor: string;
  pastWeek: BasinRainfallPoint[];
}

const BASINS: Record<string, BasinData> = {
  "aizawl-west": {
    id: "aizawl-west",
    name: "Aizawl West Ridge",
    state: "Mizoram",
    subcatchment: "Tlawng River Sub-catchment • Selesih Escarpment",
    ariIndex: 286.4,
    ariThreshold: 240.0,
    ariAnomaly: "+19.3%",
    rain24h: 114.5,
    smapSaturation: 82.4,
    smapNormal: 58.1,
    nowcastTier: "High",
    nowcastTierLabel: "HIGH (TIER 3/4)",
    nowcastConfidence: 94.2,
    soilMoistureStatus: "Critical pore saturation reached in upper 0–100cm regolith layer. Reduced shear resistance.",
    criticalCorridor: "NH-54 Durtlang Ridge Sector",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 18.2, thresholdMm: 45.0, cumulativeMm: 18.2 },
      { day: "D-5", date: "01 Sep", rainfallMm: 24.5, thresholdMm: 45.0, cumulativeMm: 42.7 },
      { day: "D-4", date: "02 Sep", rainfallMm: 42.1, thresholdMm: 45.0, cumulativeMm: 84.8 },
      { day: "D-3", date: "03 Sep", rainfallMm: 68.4, thresholdMm: 45.0, cumulativeMm: 153.2 },
      { day: "D-2", date: "04 Sep", rainfallMm: 88.0, thresholdMm: 50.0, cumulativeMm: 241.2 },
      { day: "D-1", date: "05 Sep", rainfallMm: 102.6, thresholdMm: 55.0, cumulativeMm: 343.8 },
      { day: "Today", date: "06 Sep", rainfallMm: 114.5, thresholdMm: 60.0, cumulativeMm: 458.3 },
    ],
  },
  "lunglei-south": {
    id: "lunglei-south",
    name: "Lunglei South Basin",
    state: "Mizoram",
    subcatchment: "Khawthlangtuipui Valley • Hnahthial Approach",
    ariIndex: 198.6,
    ariThreshold: 220.0,
    ariAnomaly: "-9.7%",
    rain24h: 68.2,
    smapSaturation: 69.8,
    smapNormal: 54.2,
    nowcastTier: "Moderate",
    nowcastTierLabel: "MODERATE (TIER 2/4)",
    nowcastConfidence: 91.5,
    soilMoistureStatus: "Elevated saturation across terrace slopes. Drainage capacity stable with moderate surface runoff.",
    criticalCorridor: "NH-54 South Corridor (Lunglei-Tuipang)",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 12.0, thresholdMm: 45.0, cumulativeMm: 12.0 },
      { day: "D-5", date: "01 Sep", rainfallMm: 16.4, thresholdMm: 45.0, cumulativeMm: 28.4 },
      { day: "D-4", date: "02 Sep", rainfallMm: 28.0, thresholdMm: 45.0, cumulativeMm: 56.4 },
      { day: "D-3", date: "03 Sep", rainfallMm: 35.2, thresholdMm: 45.0, cumulativeMm: 91.6 },
      { day: "D-2", date: "04 Sep", rainfallMm: 48.0, thresholdMm: 50.0, cumulativeMm: 139.6 },
      { day: "D-1", date: "05 Sep", rainfallMm: 56.5, thresholdMm: 50.0, cumulativeMm: 196.1 },
      { day: "Today", date: "06 Sep", rainfallMm: 68.2, thresholdMm: 55.0, cumulativeMm: 264.3 },
    ],
  },
  "kolasib-nh306": {
    id: "kolasib-nh306",
    name: "Kolasib NH-306 Corridor",
    state: "Mizoram",
    subcatchment: "Serlui River Catchment • Vairengte Escarpment",
    ariIndex: 312.8,
    ariThreshold: 250.0,
    ariAnomaly: "+25.1%",
    rain24h: 128.0,
    smapSaturation: 86.5,
    smapNormal: 61.0,
    nowcastTier: "Severe",
    nowcastTierLabel: "SEVERE (TIER 4/4)",
    nowcastConfidence: 96.8,
    soilMoistureStatus: "Saturated regolith embankment. Pore pressure spike logged at Vairengte slope cut.",
    criticalCorridor: "NH-306 Silchar-Aizawl Lifeline",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 22.0, thresholdMm: 45.0, cumulativeMm: 22.0 },
      { day: "D-5", date: "01 Sep", rainfallMm: 32.0, thresholdMm: 45.0, cumulativeMm: 54.0 },
      { day: "D-4", date: "02 Sep", rainfallMm: 54.0, thresholdMm: 45.0, cumulativeMm: 108.0 },
      { day: "D-3", date: "03 Sep", rainfallMm: 78.5, thresholdMm: 45.0, cumulativeMm: 186.5 },
      { day: "D-2", date: "04 Sep", rainfallMm: 94.5, thresholdMm: 50.0, cumulativeMm: 281.0 },
      { day: "D-1", date: "05 Sep", rainfallMm: 118.0, thresholdMm: 55.0, cumulativeMm: 399.0 },
      { day: "Today", date: "06 Sep", rainfallMm: 128.0, thresholdMm: 60.0, cumulativeMm: 527.0 },
    ],
  },
  "dima-hasao": {
    id: "dima-hasao",
    name: "Jatinga Basin • Haflong",
    state: "Assam",
    subcatchment: "Jatinga River Basin • Barail Sinking Escarpment",
    ariIndex: 298.5,
    ariThreshold: 245.0,
    ariAnomaly: "+21.8%",
    rain24h: 118.4,
    smapSaturation: 84.1,
    smapNormal: 59.5,
    nowcastTier: "High",
    nowcastTierLabel: "HIGH (TIER 3/4)",
    nowcastConfidence: 95.1,
    soilMoistureStatus: "High saturation along Barail shale formation; mudflows triggering along rail formation.",
    criticalCorridor: "NH-27 Lumding-Haflong-Silchar East-West Link",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 15.0, thresholdMm: 45.0, cumulativeMm: 15.0 },
      { day: "D-5", date: "01 Sep", rainfallMm: 28.0, thresholdMm: 45.0, cumulativeMm: 43.0 },
      { day: "D-4", date: "02 Sep", rainfallMm: 46.5, thresholdMm: 45.0, cumulativeMm: 89.5 },
      { day: "D-3", date: "03 Sep", rainfallMm: 72.0, thresholdMm: 45.0, cumulativeMm: 161.5 },
      { day: "D-2", date: "04 Sep", rainfallMm: 91.0, thresholdMm: 50.0, cumulativeMm: 252.5 },
      { day: "D-1", date: "05 Sep", rainfallMm: 104.0, thresholdMm: 55.0, cumulativeMm: 356.5 },
      { day: "Today", date: "06 Sep", rainfallMm: 118.4, thresholdMm: 60.0, cumulativeMm: 474.9 },
    ],
  },
  "cherrapunji": {
    id: "cherrapunji",
    name: "Umngot Basin • Cherrapunji",
    state: "Meghalaya",
    subcatchment: "Umngot & Wah Umngi Basin • Cherrapunji Plateau",
    ariIndex: 345.2,
    ariThreshold: 260.0,
    ariAnomaly: "+32.8%",
    rain24h: 156.0,
    smapSaturation: 89.2,
    smapNormal: 63.0,
    nowcastTier: "Severe",
    nowcastTierLabel: "SEVERE (TIER 4/4)",
    nowcastConfidence: 97.4,
    soilMoistureStatus: "Extreme antecedent soil saturation; hyper-concentrated runoff across canyon valley scarps.",
    criticalCorridor: "NH-206 Shillong-Sohra Scenic Link",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 35.0, thresholdMm: 50.0, cumulativeMm: 35.0 },
      { day: "D-5", date: "01 Sep", rainfallMm: 48.0, thresholdMm: 50.0, cumulativeMm: 83.0 },
      { day: "D-4", date: "02 Sep", rainfallMm: 76.0, thresholdMm: 50.0, cumulativeMm: 159.0 },
      { day: "D-3", date: "03 Sep", rainfallMm: 102.0, thresholdMm: 55.0, cumulativeMm: 261.0 },
      { day: "D-2", date: "04 Sep", rainfallMm: 124.0, thresholdMm: 55.0, cumulativeMm: 385.0 },
      { day: "D-1", date: "05 Sep", rainfallMm: 142.0, thresholdMm: 60.0, cumulativeMm: 527.0 },
      { day: "Today", date: "06 Sep", rainfallMm: 156.0, thresholdMm: 65.0, cumulativeMm: 683.0 },
    ],
  },
  "kameng-tawang": {
    id: "kameng-tawang",
    name: "Kameng Gorge • Bomdila",
    state: "Arunachal Pradesh",
    subcatchment: "Kameng River Basin • Sela Pass Sub-Catchment",
    ariIndex: 215.0,
    ariThreshold: 230.0,
    ariAnomaly: "-6.5%",
    rain24h: 74.5,
    smapSaturation: 71.0,
    smapNormal: 56.0,
    nowcastTier: "Moderate",
    nowcastTierLabel: "MODERATE (TIER 2/4)",
    nowcastConfidence: 92.0,
    soilMoistureStatus: "Sub-zero overnight freeze-thaw cycles weakening colluvial rockfall barriers.",
    criticalCorridor: "NH-13 Trans-Arunachal Highway (Bomdila-Tawang)",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 14.0, thresholdMm: 45.0, cumulativeMm: 14.0 },
      { day: "D-5", date: "01 Sep", rainfallMm: 19.0, thresholdMm: 45.0, cumulativeMm: 33.0 },
      { day: "D-4", date: "02 Sep", rainfallMm: 31.0, thresholdMm: 45.0, cumulativeMm: 64.0 },
      { day: "D-3", date: "03 Sep", rainfallMm: 45.0, thresholdMm: 45.0, cumulativeMm: 109.0 },
      { day: "D-2", date: "04 Sep", rainfallMm: 58.0, thresholdMm: 50.0, cumulativeMm: 167.0 },
      { day: "D-1", date: "05 Sep", rainfallMm: 66.0, thresholdMm: 50.0, cumulativeMm: 233.0 },
      { day: "Today", date: "06 Sep", rainfallMm: 74.5, thresholdMm: 55.0, cumulativeMm: 307.5 },
    ],
  },
  "noney-tupul": {
    id: "noney-tupul",
    name: "Ijai Catchment • Noney",
    state: "Manipur",
    subcatchment: "Ijai River Catchment • Tupul Sub-Catchment",
    ariIndex: 326.0,
    ariThreshold: 245.0,
    ariAnomaly: "+33.1%",
    rain24h: 135.0,
    smapSaturation: 87.8,
    smapNormal: 60.0,
    nowcastTier: "Severe",
    nowcastTierLabel: "SEVERE (TIER 4/4)",
    nowcastConfidence: 96.5,
    soilMoistureStatus: "Critical saturation in unconsolidated debris slope. Debris flow warning in force.",
    criticalCorridor: "NH-37 Imphal-Jiribam Lifeline",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 24.0, thresholdMm: 45.0, cumulativeMm: 24.0 },
      { day: "D-5", date: "01 Sep", rainfallMm: 36.0, thresholdMm: 45.0, cumulativeMm: 60.0 },
      { day: "D-4", date: "02 Sep", rainfallMm: 58.0, thresholdMm: 45.0, cumulativeMm: 118.0 },
      { day: "D-3", date: "03 Sep", rainfallMm: 82.0, thresholdMm: 50.0, cumulativeMm: 200.0 },
      { day: "D-2", date: "04 Sep", rainfallMm: 105.0, thresholdMm: 55.0, cumulativeMm: 305.0 },
      { day: "D-1", date: "05 Sep", rainfallMm: 122.0, thresholdMm: 55.0, cumulativeMm: 427.0 },
      { day: "Today", date: "06 Sep", rainfallMm: 135.0, thresholdMm: 60.0, cumulativeMm: 562.0 },
    ],
  },
  "kohima-zubza": {
    id: "kohima-zubza",
    name: "Zubza Catchment • Kohima",
    state: "Nagaland",
    subcatchment: "Zubza River Sub-catchment • Naga Hills Creep Sector",
    ariIndex: 275.4,
    ariThreshold: 240.0,
    ariAnomaly: "+14.8%",
    rain24h: 98.0,
    smapSaturation: 80.5,
    smapNormal: 57.5,
    nowcastTier: "High",
    nowcastTierLabel: "HIGH (TIER 3/4)",
    nowcastConfidence: 93.8,
    soilMoistureStatus: "Saturated Dishen shale colluvium with active toe wash along stream channel.",
    criticalCorridor: "NH-29 Dimapur-Kohima Heavy Freight Route",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 16.0, thresholdMm: 45.0, cumulativeMm: 16.0 },
      { day: "D-5", date: "01 Sep", rainfallMm: 22.0, thresholdMm: 45.0, cumulativeMm: 38.0 },
      { day: "D-4", date: "02 Sep", rainfallMm: 38.0, thresholdMm: 45.0, cumulativeMm: 76.0 },
      { day: "D-3", date: "03 Sep", rainfallMm: 59.0, thresholdMm: 45.0, cumulativeMm: 135.0 },
      { day: "D-2", date: "04 Sep", rainfallMm: 76.0, thresholdMm: 50.0, cumulativeMm: 211.0 },
      { day: "D-1", date: "05 Sep", rainfallMm: 88.0, thresholdMm: 50.0, cumulativeMm: 299.0 },
      { day: "Today", date: "06 Sep", rainfallMm: 98.0, thresholdMm: 55.0, cumulativeMm: 397.0 },
    ],
  },
  "upper-teesta": {
    id: "upper-teesta",
    name: "Upper Teesta • Gangtok",
    state: "Sikkim",
    subcatchment: "Teesta River Basin • Dikchu Escarpment",
    ariIndex: 292.0,
    ariThreshold: 245.0,
    ariAnomaly: "+19.2%",
    rain24h: 110.5,
    smapSaturation: 83.2,
    smapNormal: 58.5,
    nowcastTier: "High",
    nowcastTierLabel: "HIGH (TIER 3/4)",
    nowcastConfidence: 94.6,
    soilMoistureStatus: "Glacio-fluvial riverward embankment soaked. Active rotational slumping potential.",
    criticalCorridor: "NH-10 Sevoke-Gangtok Mountain Lifeline",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 18.0, thresholdMm: 45.0, cumulativeMm: 18.0 },
      { day: "D-5", date: "01 Sep", rainfallMm: 26.0, thresholdMm: 45.0, cumulativeMm: 44.0 },
      { day: "D-4", date: "02 Sep", rainfallMm: 44.0, thresholdMm: 45.0, cumulativeMm: 88.0 },
      { day: "D-3", date: "03 Sep", rainfallMm: 68.0, thresholdMm: 45.0, cumulativeMm: 156.0 },
      { day: "D-2", date: "04 Sep", rainfallMm: 85.0, thresholdMm: 50.0, cumulativeMm: 241.0 },
      { day: "D-1", date: "05 Sep", rainfallMm: 99.0, thresholdMm: 50.0, cumulativeMm: 340.0 },
      { day: "Today", date: "06 Sep", rainfallMm: 110.5, thresholdMm: 55.0, cumulativeMm: 450.5 },
    ],
  },
  "dhalai-valley": {
    id: "dhalai-valley",
    name: "Dhalai Basin • Ambassa",
    state: "Tripura",
    subcatchment: "Dhalai River Catchment • Longtharai Valley",
    ariIndex: 184.0,
    ariThreshold: 215.0,
    ariAnomaly: "-14.4%",
    rain24h: 58.0,
    smapSaturation: 66.5,
    smapNormal: 52.0,
    nowcastTier: "Low",
    nowcastTierLabel: "LOW (TIER 1/4)",
    nowcastConfidence: 90.2,
    soilMoistureStatus: "Nominal drainage flow; sand-silt terrace slopes operating well below plastic limit.",
    criticalCorridor: "NH-8 Agartala-Churaibari Corridor",
    pastWeek: [
      { day: "D-6", date: "31 Aug", rainfallMm: 8.0, thresholdMm: 45.0, cumulativeMm: 8.0 },
      { day: "D-5", date: "01 Sep", rainfallMm: 12.0, thresholdMm: 45.0, cumulativeMm: 20.0 },
      { day: "D-4", date: "02 Sep", rainfallMm: 21.0, thresholdMm: 45.0, cumulativeMm: 41.0 },
      { day: "D-3", date: "03 Sep", rainfallMm: 32.0, thresholdMm: 45.0, cumulativeMm: 73.0 },
      { day: "D-2", date: "04 Sep", rainfallMm: 41.0, thresholdMm: 45.0, cumulativeMm: 114.0 },
      { day: "D-1", date: "05 Sep", rainfallMm: 49.0, thresholdMm: 50.0, cumulativeMm: 163.0 },
      { day: "Today", date: "06 Sep", rainfallMm: 58.0, thresholdMm: 50.0, cumulativeMm: 221.0 },
    ],
  },
};

export function NasaLhasaHydrology() {
  const [selectedBasinId, setSelectedBasinId] = useState<string>("aizawl-west");
  const [isGraphExpanded, setIsGraphExpanded] = useState<boolean>(false);
  const [activeDayIdx, setActiveDayIdx] = useState<number>(6); // Default to 'Today'
  const [copiedBriefing, setCopiedBriefing] = useState<boolean>(false);
  const [expandedChartMode, setExpandedChartMode] = useState<"daily" | "cumulative">("daily");
  const [lastSyncTime, setLastSyncTime] = useState<string>("18:00 IST");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const basin = BASINS[selectedBasinId] || BASINS["aizawl-west"];
  const selectedDayPoint = basin.pastWeek[activeDayIdx] || basin.pastWeek[basin.pastWeek.length - 1];

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
    const text =
      `🛰️ *SENTINEL NER / NASA LHASA v2 HYDROLOGY DISPATCH*\n` +
      `Basin Scope: ${basin.name} (${basin.subcatchment})\n` +
      `Nowcast Status: ${basin.nowcastTier.toUpperCase()} (${basin.nowcastConfidence}% Confidence)\n` +
      `7-Day ARI Index: ${basin.ariIndex} mm (Threshold: ${basin.ariThreshold} mm | Anomaly: ${basin.ariAnomaly})\n` +
      `24h Precipitation: ${basin.rain24h} mm (GPM IMERG 0.1° High-Res)\n` +
      `SMAP Soil Saturation: ${basin.smapSaturation}% Volumetric Water Content (Normal: ${basin.smapNormal}%)\n` +
      `Critical Corridor: ${basin.criticalCorridor}\n` +
      `Pore Moisture Note: ${basin.soilMoistureStatus}\n` +
      `Telemetry Sync: ${lastSyncTime} • GPM IMERG / SMAP L-Band Satellite Constellation\n` +
      `Live Map & Matrix: http://localhost:3000/hydrology`;

    navigator.clipboard?.writeText(text);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  // Compute maximum value for graph scaling
  const maxRainfall = Math.max(...basin.pastWeek.map((p) => p.rainfallMm), 130);
  const maxCumulative = Math.max(...basin.pastWeek.map((p) => p.cumulativeMm), 550);

  return (
    <section aria-labelledby="nasa-lhasa-heading" className="space-y-4">
      {/* Header with NASA Accreditation & Interactive Basin Toolbar */}
      <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-sentinel-800 pb-4">
        <div>
          <div className="sr-only">
            <span>NASA LHASA v2 • GLOBAL SATELLITE HYDROLOGICAL TELEMETRY</span>
          </div>
          <h1
            id="nasa-lhasa-heading"
            className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2 whitespace-nowrap"
          >
            <Satellite className="w-5 h-5 text-gov-blue dark:text-sky-400 shrink-0" />
            <span>Precipitation Anomaly &amp; Antecedent Soil Saturation</span>
            <span className="sr-only">Satellite Hydrological Telemetry</span>
          </h1>
          <span className="sr-only">LHASA NOWCAST: {basin.nowcastTierLabel}</span>
        </div>

        {/* Action Controls: Basin Scope Selector & Feed Refresh (In place of removed subtitle) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Basin Scope Dropdown / Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-xs shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400 ml-1 shrink-0" />
            <label htmlFor="basin-select" className="sr-only">Select Basin Scope</label>
            <select
              id="basin-select"
              value={selectedBasinId}
              onChange={(e) => {
                setSelectedBasinId(e.target.value);
                setActiveDayIdx(6);
              }}
              className="bg-transparent border-0 text-slate-800 dark:text-slate-200 font-semibold text-xs focus:ring-0 cursor-pointer pr-1 py-1"
            >
              {Array.from(new Set(Object.values(BASINS).map((b) => b.state))).map((stName) => (
                <optgroup key={stName} label={stName} className="bg-slate-100 dark:bg-sentinel-950 font-bold">
                  {Object.values(BASINS).filter((b) => b.state === stName).map((b) => (
                    <option key={b.id} value={b.id} className="bg-white dark:bg-sentinel-900 text-slate-900 dark:text-white font-normal">
                      {b.name} ({b.state})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            role="button"
            onClick={handleRefresh}
            title="Refresh GPM IMERG Telemetry"
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gov-blue dark:text-sky-400 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync: {lastSyncTime}</span>
          </button>

          {/* Share / Copy Briefing Button */}
          <button
            type="button"
            role="button"
            onClick={handleCopy}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
          >
            {copiedBriefing ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                <span>Share Dispatch</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Hydrology Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Card 1: 7-Day Antecedent Rainfall Index (ARI) */}
        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <CloudRain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">7-Day ARI Index</span>
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                GPM IMERG
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{basin.ariIndex}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">mm / 7-day</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Antecedent rainfall {basin.ariIndex > basin.ariThreshold ? "exceeds" : "is within"} regional soil absorption threshold ({basin.ariThreshold}mm) by{" "}
              <strong className={basin.ariIndex > basin.ariThreshold ? "text-amber-700 dark:text-amber-400 tabular-nums" : "text-emerald-700 dark:text-emerald-400 tabular-nums"}>
                {basin.ariAnomaly}
              </strong>.
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 dark:border-sentinel-800 text-xs flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>24h Accumulation:</span>
            <span className="text-gov-blue dark:text-sky-400 font-bold tabular-nums">{basin.rain24h} mm</span>
          </div>
        </div>

        {/* Card 2: NASA SMAP Volumetric Soil Moisture Saturation */}
        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">SMAP Soil Saturation</span>
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                L-Band Radar
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{basin.smapSaturation}%</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Volumetric (VWC)</span>
            </div>
            {/* Saturation Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-sentinel-950 rounded-full h-2 mt-2 border border-slate-200 dark:border-sentinel-800 overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-500 via-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${basin.smapSaturation}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {basin.soilMoistureStatus}
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 dark:border-sentinel-800 text-xs flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>Normal Monsoon Mean:</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium tabular-nums">{basin.smapNormal}%</span>
          </div>
        </div>

        {/* Card 3: Dynamic LHASA Hydrologic Nowcast Indicator */}
        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Dynamic Nowcast</span>
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                NASA GSFC
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-lg sm:text-xl font-bold text-amber-700 dark:text-amber-400">
                {basin.nowcastTier} Susceptibility
              </span>
              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                Multi-Hazard Hydrologic Trigger Active
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Correlating satellite rainfall with steep slope units along {basin.criticalCorridor}.
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 dark:border-sentinel-800 text-xs flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span>Nowcast Confidence:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">{basin.nowcastConfidence}%</span>
          </div>
        </div>

        {/* Card 4: 7-Day Rainfall Trend Chart & Expand Controller */}
        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Antecedent Trend (mm)</span>
              </span>
              <button
                type="button"
                role="button"
                aria-expanded={isGraphExpanded}
                onClick={() => setIsGraphExpanded(!isGraphExpanded)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-gov-blue hover:text-gov-blue-dark dark:text-sky-400 dark:hover:text-sky-300 bg-blue-50 hover:bg-blue-100 dark:bg-sky-950/70 dark:hover:bg-sky-900/80 border border-blue-200 dark:border-sky-800/80 transition-all cursor-pointer"
                title={isGraphExpanded ? "Collapse expanded graph" : "Expand trend analysis graph"}
              >
                {isGraphExpanded ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand</span>
                  </>
                )}
              </button>
            </div>

            {/* Sparkline Bar Chart with interactive click/hover */}
            <div className="mt-3 flex items-end justify-between gap-1.5 h-16 pt-2">
              {basin.pastWeek.map((p, idx) => {
                const heightPercent = Math.min(100, Math.round((p.rainfallMm / maxRainfall) * 100));
                const isOverThreshold = p.rainfallMm > p.thresholdMm;
                const isSelected = activeDayIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveDayIdx(idx)}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end group focus:outline-hidden"
                    title={`${p.day} (${p.date}): ${p.rainfallMm}mm (Threshold: ${p.thresholdMm}mm)`}
                  >
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isSelected ? "ring-2 ring-gov-blue dark:ring-sky-400 shadow-xs" : ""
                      } ${
                        isOverThreshold
                          ? "bg-gradient-to-t from-amber-600 to-rose-500"
                          : "bg-sky-600/80 dark:bg-sky-500/80"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className={`text-[10px] font-medium transition-colors ${
                      isSelected ? "text-gov-blue dark:text-sky-400 font-bold" : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {p.day}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-sentinel-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-rose-500" /> &gt; Threshold
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-xs bg-sky-600" /> Nominal
            </span>
          </div>
        </div>
      </div>

      {/* Expandable High-Resolution Hydrograph Analytical Canvas */}
      {isGraphExpanded && (
        <div
          role="region"
          aria-label="Expanded Hydrological Time Series Graph"
          className="p-5 rounded-2xl bg-white dark:bg-sentinel-900 border-2 border-gov-blue/40 dark:border-sky-500/50 shadow-md space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-top-2"
        >
          {/* Expanded Graph Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-sentinel-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Expanded Basin Precipitation &amp; Infiltration Hydrograph
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-gov-blue border border-blue-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800">
                  {basin.name}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Antecedent rainfall decay correlation curve alongside operational geotechnical shear warning thresholds.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Chart Mode Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 text-xs">
                <button
                  type="button"
                  onClick={() => setExpandedChartMode("daily")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    expandedChartMode === "daily"
                      ? "bg-white text-slate-900 dark:bg-sentinel-800 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Daily Rainfall vs Threshold
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedChartMode("cumulative")}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    expandedChartMode === "cumulative"
                      ? "bg-white text-slate-900 dark:bg-sentinel-800 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Cumulative Accumulation
                </button>
              </div>

              {/* Close / Collapse Button */}
              <button
                type="button"
                role="button"
                onClick={() => setIsGraphExpanded(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 text-slate-700 dark:text-slate-300 transition-all"
                title="Close expanded view"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* High-Resolution Graph Canvas */}
          <div className="relative pt-4 pb-2">
            {/* Threshold Reference Indicator */}
            <div className="absolute top-2 right-4 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3 h-0.5 bg-rose-500 border-dashed inline-block" />
                <span>Geotech Threshold (50-60mm)</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-3 h-2 rounded-xs bg-sky-600 inline-block" />
                <span>24h GPM IMERG</span>
              </span>
            </div>

            {/* Multi-Day Detailed Bar / Hydrograph Chart */}
            <div className="grid grid-cols-7 gap-3 h-64 items-end pt-8 px-2 border-b border-l border-slate-300 dark:border-sentinel-700">
              {basin.pastWeek.map((p, idx) => {
                const isSelected = activeDayIdx === idx;
                const value = expandedChartMode === "daily" ? p.rainfallMm : p.cumulativeMm;
                const maxValue = expandedChartMode === "daily" ? maxRainfall : maxCumulative;
                const heightPercent = Math.min(100, Math.round((value / maxValue) * 100));
                const isOverThreshold = expandedChartMode === "daily" && p.rainfallMm > p.thresholdMm;

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveDayIdx(idx)}
                    className="flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {/* Value Badge above bar */}
                    <span
                      className={`text-xs font-bold mb-1 transition-all tabular-nums ${
                        isSelected
                          ? "text-gov-blue dark:text-sky-300 scale-110"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {value} mm
                    </span>

                    {/* Bar Cylinder */}
                    <div
                      className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 relative ${
                        isSelected ? "ring-2 ring-gov-blue dark:ring-sky-400 ring-offset-1" : ""
                      } ${
                        isOverThreshold
                          ? "bg-gradient-to-t from-amber-600 via-rose-500 to-rose-600"
                          : expandedChartMode === "cumulative"
                          ? "bg-gradient-to-t from-blue-700 to-sky-400"
                          : "bg-gradient-to-t from-blue-600 to-sky-500"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    >
                      {/* Threshold Tick for Daily Mode */}
                      {expandedChartMode === "daily" && (
                        <div
                          className="absolute left-0 right-0 border-t-2 border-dashed border-rose-300 dark:border-rose-400 z-10"
                          style={{
                            bottom: `${Math.min(100, Math.round((p.thresholdMm / maxRainfall) * 100))}%`,
                          }}
                          title={`Threshold: ${p.thresholdMm}mm`}
                        />
                      )}
                    </div>

                    {/* Day and Date Labels */}
                    <div className="mt-2 text-center">
                      <p className={`text-xs font-semibold ${
                        isSelected ? "text-gov-blue dark:text-sky-400 font-bold" : "text-slate-800 dark:text-slate-200"
                      }`}>
                        {p.day}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {p.date}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Horizontal Axis Scale Baseline */}
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-1.5 px-2">
              <span>Observation Start: 31 Aug 2026</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Selected: {selectedDayPoint.day} ({selectedDayPoint.date}) • {selectedDayPoint.rainfallMm} mm Rain • {selectedDayPoint.cumulativeMm} mm 7d Cumulative
              </span>
              <span>Latest Pass: 06 Sep 2026</span>
            </div>
          </div>

          {/* Expanded Statistical Metrics Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800">
              <span className="text-slate-500 dark:text-slate-400 block">7-Day Total Infiltration</span>
              <p className="text-base font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {basin.pastWeek.reduce((acc, p) => acc + p.rainfallMm, 0).toFixed(1)} mm
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800">
              <span className="text-slate-500 dark:text-slate-400 block">Peak 24h Downpour</span>
              <p className="text-base font-bold text-amber-700 dark:text-amber-400 tabular-nums mt-0.5">
                {Math.max(...basin.pastWeek.map((p) => p.rainfallMm))} mm ({basin.pastWeek[basin.pastWeek.length - 1].day})
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800">
              <span className="text-slate-500 dark:text-slate-400 block">Threshold Breach Count</span>
              <p className="text-base font-bold text-rose-700 dark:text-rose-400 tabular-nums mt-0.5">
                {basin.pastWeek.filter((p) => p.rainfallMm > p.thresholdMm).length} of 7 Days
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800">
              <span className="text-slate-500 dark:text-slate-400 block">SMAP Soil Saturation</span>
              <p className="text-base font-bold text-sky-700 dark:text-sky-400 tabular-nums mt-0.5">
                {basin.smapSaturation}% VWC (Critical)
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
