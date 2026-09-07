"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  Satellite,
  AlertTriangle,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Layers,
  MapPin,
  Search,
  RefreshCw,
  X,
  Eye,
  Copy,
  Check,
  Wrench,
  Activity,
  ChevronRight,
} from "lucide-react";

export interface RoadCorridorStatus {
  route: string;
  name: string;
  state?: string;
  chainage: string;
  status: "OBSTRUCTED" | "SINGLE_LANE" | "CLEAR";
  debrisVolumeM3: number;
  clearingAgency: string;
  etaClearance: string;
  coordinates?: string;
  equipmentOnSite?: string;
  advisoryNotice?: string;
}

export const CORRIDOR_RECORDS: RoadCorridorStatus[] = [
  {
    route: "NH-54",
    name: "Aizawl — Lunglei Main Arterial Highway",
    state: "Mizoram",
    chainage: "km 42.4 (Selesih Sector)",
    status: "SINGLE_LANE",
    debrisVolumeM3: 650,
    clearingAgency: "Border Roads Organisation (BRO / Project Pushpak)",
    etaClearance: "4 Hours (Heavy Excavators On-Site)",
    coordinates: "23.812°N, 92.735°E",
    equipmentOnSite: "2x CAT 320D Excavators, 1x Hydraulic Rock Breaker, 4x Tipper Trucks",
    advisoryNotice: "Traffic regulated alternatively in 15-minute intervals. Light vehicles only; heavy logistics diverted to NH-108.",
  },
  {
    route: "NH-108",
    name: "Bairabi — Sairang Rail Link Access Corridor",
    state: "Mizoram",
    chainage: "km 18.2 (Tlawng Bridge North)",
    status: "CLEAR",
    debrisVolumeM3: 0,
    clearingAgency: "Mizoram State PWD (Highway Division)",
    etaClearance: "Continuous Patrol Active",
    coordinates: "23.755°N, 92.651°E",
    equipmentOnSite: "Mobile PWD Quick-Reaction Patrol Vehicle & Drone Recon Team",
    advisoryNotice: "Full dual-lane open flow. Recommended heavy freight detour while NH-54 clearance finishes.",
  },
  {
    route: "Lengpui Road",
    name: "Aizawl Airport Lifeline Express Route",
    state: "Mizoram",
    chainage: "km 9.8 (Tanhril Slopes)",
    status: "CLEAR",
    debrisVolumeM3: 0,
    clearingAgency: "State Disaster Response Force & PWD",
    etaClearance: "Nominal Open Flow",
    coordinates: "23.738°N, 92.628°E",
    equipmentOnSite: "SDRF Emergency Clearing Dozer Staged at Tanhril Junction",
    advisoryNotice: "Airport link operating nominally. Emergency medical ambulances prioritized at all checkpoints.",
  },
  {
    route: "NH-27",
    name: "Lumding — Silchar East-West Expressway",
    state: "Assam",
    chainage: "km 132.5 (Jatinga Valley / Dima Hasao)",
    status: "CLEAR",
    debrisVolumeM3: 0,
    clearingAgency: "National Highways & Infrastructure Development Corp (NHIDCL)",
    etaClearance: "Patrol Active (Speed Restricted)",
    coordinates: "25.074°N, 93.031°E",
    equipmentOnSite: "3x L&T Komatsu Excavators, 2x Wheel Loaders, 6x Dump Trucks",
    advisoryNotice: "Dual-lane open flow with caution through Jatinga bypass cut. Heavy freight trailers held at Lumding check-post.",
  },
  {
    route: "NH-6",
    name: "Shillong — Silchar Arterial Hill Corridor",
    state: "Meghalaya",
    chainage: "km 88.0 (Sonapur Tunnel Approach / East Jaintia)",
    status: "OBSTRUCTED",
    debrisVolumeM3: 1450,
    clearingAgency: "Meghalaya PWD & NHAI Emergency Clearing Cell",
    etaClearance: "6 Hours (Mass Rockfall Clearance)",
    coordinates: "25.109°N, 92.366°E",
    equipmentOnSite: "2x Heavy Hydraulic Breakers, 3x Excavators, Emergency Rock-Drill Rig",
    advisoryNotice: "Full blockage near Sonapur tunnel entrance due to heavy overhang slip. Light vehicles diverted via Umkiang loop.",
  },
  {
    route: "NH-13",
    name: "Trans-Arunachal Strategic Highway",
    state: "Arunachal Pradesh",
    chainage: "km 114.2 (Nechiphu — Sela Pass Link)",
    status: "CLEAR",
    debrisVolumeM3: 0,
    clearingAgency: "Border Roads Organisation (BRO / Project Vartak)",
    etaClearance: "Open Flow Under Escort",
    coordinates: "27.352°N, 92.421°E",
    equipmentOnSite: "2x BRO Snow-Cutters, 2x JCB 3DX Backhoe Loaders",
    advisoryNotice: "Clear convoy movement under BRO military escort. High-altitude anti-skid chains mandated.",
  },
  {
    route: "NH-29",
    name: "Dimapur — Kohima Asian Highway AH-1",
    state: "Nagaland",
    chainage: "km 34.8 (Pagla Pahar / Dzüdza Valley Sector)",
    status: "OBSTRUCTED",
    debrisVolumeM3: 980,
    clearingAgency: "Border Roads Organisation (BRO / Project Sewak)",
    etaClearance: "5 Hours (Retaining Wall Rebuild)",
    coordinates: "25.748°N, 93.921°E",
    equipmentOnSite: "2x CAT Excavators, 1x Piling Rig, 4x Tipper Trucks",
    advisoryNotice: "Subsided lane demarcated with concrete barriers. Heavy goods transport routed via Niuland-Kohima bypass.",
  },
  {
    route: "NH-37",
    name: "Imphal — Jiribam National Lifeline",
    state: "Manipur",
    chainage: "km 58.4 (Tupul — Khongsang Ridge Sector)",
    status: "OBSTRUCTED",
    debrisVolumeM3: 2100,
    clearingAgency: "NHIDCL & Manipur PWD Highway Strike Team",
    etaClearance: "8 Hours (Major Saturated Slump Clearing)",
    coordinates: "24.819°N, 93.634°E",
    equipmentOnSite: "4x Heavy Crawlers, 2x High-Capacity Dozers, SDRF SAR Support Unit",
    advisoryNotice: "Highway closed at Tupul following major debris flow. Essential fuel and oxygen convoys queued under police escort.",
  },
  {
    route: "NH-10",
    name: "Sevoke — Gangtok Himalayan Lifeline",
    state: "Sikkim",
    chainage: "km 29.5 (29th Mile / Teesta River Gorge)",
    status: "CLEAR",
    debrisVolumeM3: 0,
    clearingAgency: "Border Roads Organisation (BRO / Project Swastik)",
    etaClearance: "Dual Lane Open Flow",
    coordinates: "27.135°N, 88.487°E",
    equipmentOnSite: "2x Hydraulic Excavators, 1x Front-End Loader, 3x Dump Trucks",
    advisoryNotice: "Teesta river high-water warning active; night travel restricted between 20:00 - 06:00.",
  },
  {
    route: "NH-8",
    name: "Churaibari — Agartala National Corridor",
    state: "Tripura",
    chainage: "km 46.0 (Atharamura Hill Section / Teliamura)",
    status: "CLEAR",
    debrisVolumeM3: 0,
    clearingAgency: "Tripura State PWD (NH Wing)",
    etaClearance: "Continuous Patrol Active",
    coordinates: "23.831°N, 91.682°E",
    equipmentOnSite: "Mobile PWD Patrol Dozer & Emergency Recovery Crane",
    advisoryNotice: "Dual-lane traffic operating smoothly. Catch-water drains cleaned along mountain slopes.",
  },
];

export interface BhuvanScarpRecord {
  id: string;
  location: string;
  state?: string;
  coordinates: string;
  trigger: string;
  estimatedVolume: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE";
  sensor?: string;
  threatAssessment?: string;
}

export const SCARP_INVENTORY: BhuvanScarpRecord[] = [
  {
    id: "BHU-MZ-2026-004",
    location: "Durtlang Scarp Zone A",
    state: "Mizoram",
    coordinates: "23.774°N, 92.718°E",
    trigger: "114.5mm Monsoon Deluge",
    estimatedVolume: "1,200 m³ Regolith",
    severity: "CRITICAL",
    sensor: "Cartosat-3 Optical + Sentinel-1 C-Band InSAR",
    threatAssessment: "Active head scarp retrogressing towards primary Durtlang hill crest; downslope village road threatened.",
  },
  {
    id: "BHU-MZ-2026-003",
    location: "NH-54 Selesih Cut-Slope",
    state: "Mizoram",
    coordinates: "23.812°N, 92.735°E",
    trigger: "Toe-cut Road Surcharge",
    estimatedVolume: "650 m³ Sandstone Debris",
    severity: "HIGH",
    sensor: "ISRO Bhuvan DMS Quick-Look Reconnaissance",
    threatAssessment: "Roadside cut-slope overhang collapsed onto outer carriage; ongoing BRO debris removal in progress.",
  },
  {
    id: "BHU-MZ-2026-002",
    location: "Tuirial Hydro Catchment",
    state: "Mizoram",
    coordinates: "23.689°N, 92.810°E",
    trigger: "Pore Pressure Transmissivity",
    estimatedVolume: "420 m³ Colluvium",
    severity: "MODERATE",
    sensor: "Cartosat-3 High-Resolution Ortho Imagery",
    threatAssessment: "Colluvial debris slide stabilized on lower bench; river bed clear with continuous reservoir inflow tracking.",
  },
  {
    id: "BHU-AS-2026-012",
    location: "Jatinga Valley Scarp",
    state: "Assam",
    coordinates: "25.074°N, 93.031°E",
    trigger: "142mm Deluge & Shale Weakening",
    estimatedVolume: "2,400 m³ Regolith",
    severity: "CRITICAL",
    sensor: "Cartosat-3 Optical + RISAT-1A C-SAR",
    threatAssessment: "Deep translational slump above NH-27 alignment. Retrogressive tension cracks extending 45m upslope.",
  },
  {
    id: "BHU-ML-2026-008",
    location: "Sonapur Ridge Escarpment",
    state: "Meghalaya",
    coordinates: "25.109°N, 92.366°E",
    trigger: "128.5mm Orographic Precipitation",
    estimatedVolume: "1,650 m³ Limestone-Sandstone Overhang",
    severity: "CRITICAL",
    sensor: "Cartosat-3 Stereo Pair + Sentinel-1 InSAR",
    threatAssessment: "Planar slide detachment above NH-6 tunnel approach; unstable rock mass poses acute hazard to transport.",
  },
  {
    id: "BHU-AR-2026-005",
    location: "Sela Pass North Scarp",
    state: "Arunachal Pradesh",
    coordinates: "27.502°N, 92.105°E",
    trigger: "Freeze-Thaw Wedge Failure",
    estimatedVolume: "850 m³ Fractured Gneiss",
    severity: "HIGH",
    sensor: "Resourcesat-2A LISS-IV + Sentinel-2 MSI",
    threatAssessment: "Frost wedging in jointed metamorphic bedrock. Rockfall nets strained along military transit artery.",
  },
  {
    id: "BHU-MN-2026-015",
    location: "Tupul Railway Cut Scarp",
    state: "Manipur",
    coordinates: "24.819°N, 93.634°E",
    trigger: "135mm Extreme Saturation & Slope Cut",
    estimatedVolume: "3,100 m³ Saturated Debris",
    severity: "CRITICAL",
    sensor: "Cartosat-3 Optical High-Res + ALOS-2 PALSAR-2",
    threatAssessment: "Massive debris flow initiation zone in unconsolidated Disang shale. Impoundment warning for downstream Ijai river channel.",
  },
  {
    id: "BHU-NL-2026-011",
    location: "Pagla Pahar Slope Failure",
    state: "Nagaland",
    coordinates: "25.748°N, 93.921°E",
    trigger: "River Toe Undercutting & Surcharge",
    estimatedVolume: "1,800 m³ Colluvium",
    severity: "HIGH",
    sensor: "Bhuvan DMS Multi-Mission Ortho Imagery",
    threatAssessment: "Dzüdza river scouring slope base causing progressive upward headscarp retreat toward NH-29 roadway.",
  },
  {
    id: "BHU-SK-2026-009",
    location: "Teesta 29th Mile Scarp",
    state: "Sikkim",
    coordinates: "27.135°N, 88.487°E",
    trigger: "108mm Rainstorm & Flash Surcharge",
    estimatedVolume: "1,100 m³ Channelling Colluvium",
    severity: "HIGH",
    sensor: "Cartosat-3 + Sentinel-1 C-Band InSAR",
    threatAssessment: "Gully erosion expanding into active debris chute directly above NH-10 road deck.",
  },
  {
    id: "BHU-TR-2026-003",
    location: "Longthorai Hill Ridge Scarp",
    state: "Tripura",
    coordinates: "23.831°N, 91.682°E",
    trigger: "Pore Pressure Rise in Weathered Sandstone",
    estimatedVolume: "480 m³ Weathered Sandstone",
    severity: "MODERATE",
    sensor: "Resourcesat-2 LISS-III Quick-Look",
    threatAssessment: "Shallow skin slide on forested 35° slope. Road ditch clear with minimal immediate transport impact.",
  },
];

export interface BhuvanDisasterMonitorProps {
  isPage?: boolean;
}

export function BhuvanDisasterMonitor({ isPage = false }: BhuvanDisasterMonitorProps = {}) {
  const [activeTab, setActiveTab] = useState<"corridors" | "scarps">("corridors");
  const [searchQuery, setSearchQuery] = useState("");
  const [corridorStatusFilter, setCorridorStatusFilter] = useState<string>("ALL");
  const [scarpSeverityFilter, setScarpSeverityFilter] = useState<string>("ALL");
  const [selectedCorridor, setSelectedCorridor] = useState<RoadCorridorStatus | null>(null);
  const [selectedScarp, setSelectedScarp] = useState<BhuvanScarpRecord | null>(null);
  const [copiedCoordinates, setCopiedCoordinates] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setActionNotice("Telemetry refreshed from ISRO Bhuvan DMS and BRO Project Pushpak registry.");
      setTimeout(() => setActionNotice(null), 4000);
    }, 600);
  };

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedCoordinates(true);
    setTimeout(() => setCopiedCoordinates(false), 2000);
  };

  const filteredCorridors = CORRIDOR_RECORDS.filter((corridor) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      corridor.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
      corridor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      corridor.chainage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (corridor.state && corridor.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
      corridor.clearingAgency.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      corridorStatusFilter === "ALL" || corridor.status === corridorStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredScarps = SCARP_INVENTORY.filter((scarp) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      scarp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scarp.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scarp.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (scarp.state && scarp.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
      scarp.coordinates.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      scarpSeverityFilter === "ALL" || scarp.severity === scarpSeverityFilter;

    return matchesSearch && matchesSeverity;
  });

  return (
    <section aria-labelledby="bhuvan-dms-heading" className="space-y-4">
      {/* Header with ISRO Bhuvan DMS Accreditation */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-slate-200 dark:border-sentinel-800 pb-3">
        <div className="min-w-0">
          <div className="sr-only">
            <span>ISRO BHUVAN DISASTER MANAGEMENT SUPPORT (DMS)</span>
          </div>
          {isPage ? (
            <h1
              id="bhuvan-dms-heading"
              className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2"
            >
              <Satellite className="w-5 h-5 text-gov-blue dark:text-sky-400 shrink-0" />
              <span>Arterial Highway Obstructions &amp; Satellite Event Inventory</span>
            </h1>
          ) : (
            <h2
              id="bhuvan-dms-heading"
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2"
            >
              <Satellite className="w-5 h-5 text-gov-blue dark:text-sky-400 shrink-0" />
              <span>Arterial Highway Obstructions &amp; Satellite Event Inventory</span>
            </h2>
          )}
        </div>

        {/* Tab Switcher & Quick Actions - adjusted in single line */}
        <div className="flex items-center gap-2 whitespace-nowrap overflow-x-auto shrink-0 pb-1 lg:pb-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap shrink-0"
            aria-label="Refresh telemetry from Bhuvan DMS"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gov-blue dark:text-sky-400 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <div className="p-1 rounded-xl bg-slate-100 dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 flex items-center gap-1 text-xs whitespace-nowrap shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab("corridors");
                setSearchQuery("");
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === "corridors"
                  ? "bg-gov-blue dark:bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Lifeline Corridors ({CORRIDOR_RECORDS.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("scarps");
                setSearchQuery("");
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap shrink-0 ${
                activeTab === "scarps"
                  ? "bg-gov-blue dark:bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Satellite Scarp Inventory ({SCARP_INVENTORY.length})
            </button>
          </div>

          {isPage && (
            <Link
              href="/consequences"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <Layers className="h-3.5 w-3.5 text-gov-blue dark:text-sky-400 shrink-0" />
              <span>Lifeline Consequence Graph</span>
            </Link>
          )}

          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/80 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800 text-gov-blue dark:text-sky-300 text-xs font-semibold transition-all shadow-xs whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>View 3D <span className="sr-only">Bhuvan </span>GIS</span>
          </Link>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-4">
        {/* Search and Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-sentinel-800/80">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                activeTab === "corridors"
                  ? "Search by route (e.g. NH-54) or sector..."
                  : "Search by event ID (e.g. BHU-MZ-2026-004) or location..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded-lg text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "corridors" ? (
              <>
                <label htmlFor="corridor-status-filter" className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  Status:
                </label>
                <select
                  id="corridor-status-filter"
                  value={corridorStatusFilter}
                  onChange={(e) => setCorridorStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SINGLE_LANE">Single-Lane Restricted</option>
                  <option value="CLEAR">Clear Flow Only</option>
                  <option value="OBSTRUCTED">Fully Obstructed</option>
                </select>
              </>
            ) : (
              <>
                <label htmlFor="scarp-severity-filter" className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  Severity:
                </label>
                <select
                  id="scarp-severity-filter"
                  value={scarpSeverityFilter}
                  onChange={(e) => setScarpSeverityFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500"
                >
                  <option value="ALL">ALL SEVERITIES</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MODERATE">MODERATE</option>
                </select>
              </>
            )}
          </div>
        </div>

        {activeTab === "corridors" ? (
          /* Lifeline Road Corridors View */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-2">
              <span className="uppercase font-bold text-slate-800 dark:text-slate-200">
                National Highway &amp; Strategic Arterial Link Status
              </span>
              <span className="text-xs font-medium text-gov-blue dark:text-sky-400">
                Coordinated with BRO, NHIDCL, &amp; State PWDs across NER
              </span>
            </div>

            {filteredCorridors.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-sentinel-950/40 rounded-xl border border-slate-200 dark:border-sentinel-800 text-xs text-slate-500 dark:text-slate-400">
                No highway corridors match the selected filter criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredCorridors.map((corridor, idx) => {
                  const isSingleLane = corridor.status === "SINGLE_LANE";
                  const isObstructed = corridor.status === "OBSTRUCTED";
                  const isClear = corridor.status === "CLEAR";
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        isObstructed
                          ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 shadow-xs"
                          : isSingleLane
                          ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 shadow-xs"
                          : "bg-slate-50/70 dark:bg-sentinel-950 border-slate-200 dark:border-sentinel-800 shadow-xs"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white dark:bg-sentinel-800 border border-slate-200 dark:border-sentinel-700 text-slate-900 dark:text-white">
                              {corridor.route}
                            </span>
                            {corridor.state && (
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                {corridor.state}
                              </span>
                            )}
                          </div>
                          {isSingleLane ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>SINGLE LANE</span>
                            </span>
                          ) : isObstructed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                              <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              <span>OBSTRUCTED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>CLEAR</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2.5 leading-snug">
                          {corridor.name}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-gov-blue dark:text-sky-400 shrink-0" />
                          <span>{corridor.chainage}</span>
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-sentinel-800/70 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Debris Obstruction:</span>
                          <span className="text-slate-900 dark:text-slate-200 font-bold tabular-nums">
                            {corridor.debrisVolumeM3 > 0 ? `${corridor.debrisVolumeM3} m³` : "0 m³"}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Clearance ETA:</span>
                          <span className="text-amber-700 dark:text-amber-300 font-semibold">{corridor.etaClearance}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate pt-0.5">
                          Agency: {corridor.clearingAgency}
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedCorridor(corridor)}
                            className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-700 text-gov-blue dark:text-sky-400 text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect Telemetry</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Satellite Scarp Inventory View */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-2">
              <span className="uppercase font-bold text-slate-800 dark:text-slate-200">
                <span className="sr-only">Bhuvan </span>Cartosat-3 &amp; Sentinel-1 InSAR Event Inventory
              </span>
              <span className="text-xs font-medium text-gov-blue dark:text-sky-400">
                Geotagged Scarp Extents &amp; Regolith Mass Estimation
              </span>
            </div>

            {filteredScarps.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-sentinel-950/40 rounded-xl border border-slate-200 dark:border-sentinel-800 text-xs text-slate-500 dark:text-slate-400">
                No scarp records match the selected filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-sentinel-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-sentinel-900/80">
                    <tr className="border-b border-slate-200 dark:border-sentinel-800 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase whitespace-nowrap">
                      <th className="py-2.5 px-3.5">EVENT ID</th>
                      <th className="py-2.5 px-3.5">LOCATION &amp; CHAINAGE</th>
                      <th className="py-2.5 px-3.5">GEO-COORDINATES</th>
                      <th className="py-2.5 px-3.5">PRIMARY TRIGGER</th>
                      <th className="py-2.5 px-3.5">ESTIMATED VOLUME</th>
                      <th className="py-2.5 px-3.5">SEVERITY</th>
                      <th className="py-2.5 px-3.5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-sentinel-800/60 whitespace-nowrap">
                    {filteredScarps.map((scarp) => (
                      <tr key={scarp.id} className="hover:bg-slate-50/80 dark:hover:bg-sentinel-800/30 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-gov-blue dark:text-sky-400 tabular-nums">{scarp.id}</td>
                        <td className="py-3 px-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          <span>{scarp.location}</span>
                          {scarp.state && (
                            <span className="ml-1.5 text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 dark:bg-sentinel-800 text-slate-600 dark:text-slate-400">
                              {scarp.state}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 tabular-nums font-medium">{scarp.coordinates}</td>
                        <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300">{scarp.trigger}</td>
                        <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-slate-200 tabular-nums">{scarp.estimatedVolume}</td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              scarp.severity === "CRITICAL"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                : scarp.severity === "HIGH"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800"
                            }`}
                          >
                            {scarp.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedScarp(scarp)}
                            className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-700 text-gov-blue dark:text-sky-400 text-xs font-semibold transition-all shadow-2xs"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer info strip */}
        <div className="pt-3 border-t border-slate-200 dark:border-sentinel-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <span className="text-[11px]">
            Telemetry ingested from NRSC Bhuvan Disaster Management Support &amp; Regional Highway Division.
          </span>
          <Link
            href="/map"
            className="text-gov-blue dark:text-sky-400 hover:text-gov-blue-dark dark:hover:text-sky-300 font-semibold inline-flex items-center gap-1 text-xs"
          >
            <span>Interactive Highway Obstruction Overlay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Corridor Telemetry Inspector Modal */}
      {selectedCorridor && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="corridor-dialog-title"
        >
          <div className="bg-white dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-sentinel-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-sentinel-800 border border-slate-300 dark:border-sentinel-700 text-slate-900 dark:text-white">
                    {selectedCorridor.route}
                  </span>
                  <h2 id="corridor-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedCorridor.name}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                  <span>{selectedCorridor.chainage} ({selectedCorridor.coordinates})</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCorridor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sentinel-800 transition-all"
                aria-label="Close corridor dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-sentinel-900/50 rounded-xl border border-slate-200 dark:border-sentinel-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">PASSAGE STATUS</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedCorridor.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">DEBRIS VOLUME</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                    {selectedCorridor.debrisVolumeM3 > 0 ? `${selectedCorridor.debrisVolumeM3} m³` : "0 m³"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">CLEARANCE ETA</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedCorridor.etaClearance}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">RESPONSIBLE AGENCY</span>
                  <span className="font-bold text-gov-blue dark:text-sky-300">{selectedCorridor.clearingAgency}</span>
                </div>
              </div>

              {selectedCorridor.equipmentOnSite && (
                <div className="p-3 bg-blue-50/60 dark:bg-sky-950/30 border border-blue-200 dark:border-sky-800/60 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-gov-blue dark:text-sky-300">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Active Equipment &amp; Field Crew</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedCorridor.equipmentOnSite}
                  </p>
                </div>
              )}

              {selectedCorridor.advisoryNotice && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Operational Traffic Advisory</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedCorridor.advisoryNotice}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-sentinel-800">
              <button
                type="button"
                onClick={() => {
                  if (selectedCorridor.coordinates) {
                    handleCopy(selectedCorridor.coordinates);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-sentinel-700 hover:bg-slate-100 dark:hover:bg-sentinel-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                {copiedCoordinates ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied Coordinates!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Coordinates</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedCorridor(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all shadow-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scarp Details Modal */}
      {selectedScarp && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scarp-dialog-title"
        >
          <div className="bg-white dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-sentinel-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                    {selectedScarp.id}
                  </span>
                  <h2 id="scarp-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedScarp.location}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                  <span>{selectedScarp.coordinates}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedScarp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sentinel-800 transition-all"
                aria-label="Close scarp dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-sentinel-900/50 rounded-xl border border-slate-200 dark:border-sentinel-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">PRIMARY TRIGGER</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedScarp.trigger}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">REGOLITH MASS</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums">{selectedScarp.estimatedVolume}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">SEVERITY RATING</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{selectedScarp.severity}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-medium">INGESTION SENSOR</span>
                  <span className="font-bold text-gov-blue dark:text-sky-300">{selectedScarp.sensor || "ISRO Bhuvan Cartosat-3"}</span>
                </div>
              </div>

              {selectedScarp.threatAssessment && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>Downslope Hazard Threat Assessment</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedScarp.threatAssessment}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-sentinel-800">
              <button
                type="button"
                onClick={() => handleCopy(selectedScarp.coordinates)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-sentinel-700 hover:bg-slate-100 dark:hover:bg-sentinel-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                {copiedCoordinates ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied Coordinates!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Coordinates</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedScarp(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all shadow-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
