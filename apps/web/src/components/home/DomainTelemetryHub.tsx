"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NasaLhasaHydrology } from "./NasaLhasaHydrology";
import { LewsForecastAssistant } from "./LewsForecastAssistant";
import { AmritaKigamGeotech } from "./AmritaKigamGeotech";
import { BhuvanDisasterMonitor } from "./BhuvanDisasterMonitor";
import {
  CloudRain,
  AlertTriangle,
  Gauge,
  Truck,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  MapPin,
} from "lucide-react";

type DomainTab = "early-warning" | "hydrology" | "geotech" | "highways";

interface DomainMetric {
  label: string;
  value: string;
  hint: string;
}

interface DomainInfo {
  id: DomainTab;
  label: string;
  badge: string;
  source: string;
  icon: React.ComponentType<{ className?: string }>;
  pageHref: string;
  pageTitle: string;
  statusBadge: string;
  statusType: "red" | "saffron" | "blue" | "green";
  executiveSummary: string;
  metrics: DomainMetric[];
  highlightCorridor: string;
}

const DOMAINS: DomainInfo[] = [
  {
    id: "early-warning",
    label: "Early Warning & Threat Matrix",
    badge: "GSI & IIT Mandi",
    source: "Geological Survey of India & IIT Mandi GEE LEWS",
    icon: AlertTriangle,
    pageHref: "/early-warning",
    pageTitle: "Landslide Early Warning & Threat Matrix",
    statusBadge: "HIGH THREAT (96.4%)",
    statusType: "red",
    executiveSummary:
      "Calibrated forecasting flags elevated instability along the NH-54 corridor and Durtlang Ridge following 114.5mm/24h cumulative rainfall. Sentinel-1 InSAR confirms active subsidence (-28.4 mm/yr).",
    metrics: [
      { label: "Peak Probability", value: "96.4%", hint: "High Threat (Aizawl)" },
      { label: "24h Cumulative Rain", value: "114.5 mm", hint: "Threshold Breached" },
      { label: "Critical Corridors", value: "3", hint: "NH-54, NH-306, Tuirial" },
      { label: "Forecast Horizons", value: "24h • 48h • 72h", hint: "Multi-Model Ensemble" },
    ],
    highlightCorridor: "NH-54 (Aizawl-Lunglei) & NH-306 (Silchar Lifeline)",
  },
  {
    id: "hydrology",
    label: "Satellite Hydrology & SMAP",
    badge: "NASA LHASA v2",
    source: "NASA Goddard Space Flight Center & GPM IMERG",
    icon: CloudRain,
    pageHref: "/hydrology",
    pageTitle: "NASA LHASA v2 Satellite Hydrological Telemetry",
    statusBadge: "82.4% SATURATION",
    statusType: "saffron",
    executiveSummary:
      "Prolonged monsoon precipitation has elevated the 7-day Antecedent Rainfall Index to 286.4mm. SMAP satellite confirms soil at 82.4% saturation across central Mizoram basins.",
    metrics: [
      { label: "7-Day ARI Index", value: "286.4 mm", hint: "Severe Accumulation" },
      { label: "SMAP Soil Saturation", value: "82.4%", hint: "Critical Moisture" },
      { label: "LHASA Nowcast", value: "HIGH HAZARD", hint: "Multi-Satellite Blend" },
      { label: "Satellite Revisit", value: "12h Orbit", hint: "GPM Core Constellation" },
    ],
    highlightCorridor: "Tlawng River Basin & Western Ridge Terraces",
  },
  {
    id: "geotech",
    label: "Subsurface Sensor Mesh & Fs",
    badge: "AMRITA AWNA IoT",
    source: "Amrita Center for Wireless Networks & KIGAM Korea",
    icon: Gauge,
    pageHref: "/geotech",
    pageTitle: "AMRITA AWNA IoT Mesh & KIGAM Slope Stability",
    statusBadge: "Fs 1.08 WATCH",
    statusType: "saffron",
    executiveSummary:
      "KIGAM calculates minimum Factor of Safety Fs = 1.08 along the Durtlang scarp boundary. Subsurface piezometers record accelerated pore-water pressure buildup at 6.0m depth.",
    metrics: [
      { label: "Slope Stability", value: "1.08 Fs", hint: "Watch Threshold (< 1.15)" },
      { label: "Pore-Water Pressure", value: "48.2 kPa", hint: "6.0m Depth" },
      { label: "Borehole Tilt", value: "1.4°", hint: "Shear Plane Detected" },
      { label: "Mesh Uptime", value: "99.4%", hint: "Solar/Battery WSN" },
    ],
    highlightCorridor: "Durtlang Ridge Geological Monitoring Station",
  },
  {
    id: "highways",
    label: "Highway Corridors & Scarps",
    badge: "ISRO BHUVAN",
    source: "ISRO National Remote Sensing Centre (NRSC)",
    icon: Truck,
    pageHref: "/highways",
    pageTitle: "ISRO BHUVAN & Highway Corridor Status",
    statusBadge: "1 RESTRICTED",
    statusType: "blue",
    executiveSummary:
      "ISRO Bhuvan monitoring confirms 13 of 14 primary corridors clear. NH-54 exhibits single-lane controlled transit at KM 41 due to toe clearance operations.",
    metrics: [
      { label: "Corridors Passable", value: "13 of 14", hint: "92.8% Open" },
      { label: "Restriction", value: "NH-54 KM 41", hint: "Controlled Transit" },
      { label: "Satellite Scarps", value: "4 Zones", hint: "Bhuvan Optical" },
      { label: "QRT Assets", value: "2 Deployed", hint: "KM 40 & KM 42" },
    ],
    highlightCorridor: "NH-54 (Silchar-Aizawl-Lunglei Lifeline)",
  },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  red: "gov-badge gov-badge-red",
  saffron: "gov-badge gov-badge-saffron",
  blue: "gov-badge gov-badge-blue",
  green: "gov-badge gov-badge-green",
};

export function DomainTelemetryHub() {
  const [activeTab, setActiveTab] = useState<DomainTab>("early-warning");
  const [showInteractivePreview, setShowInteractivePreview] = useState(false);

  const currentDomain = DOMAINS.find((d) => d.id === activeTab) || DOMAINS[0];

  return (
    <section id="domain-hub" aria-labelledby="domain-hub-heading" className="space-y-6 scroll-mt-6">
      {/* Section Header */}
      <div className="gov-section-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="domain-hub-heading"
            className="text-xl font-heading font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Domain Intelligence & Telemetry Hub
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Multi-hazard observation domains. Select a domain below or open its dedicated workspace.
          </p>
        </div>

        <div className="flex flex-nowrap items-center gap-2 self-start sm:self-auto shrink-0 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {/* Feature Dropdown Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/90 border border-gray-300 dark:border-slate-700 px-2.5 py-1.5 rounded-lg shadow-xs shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400" />
            <label htmlFor="domain-feature-select" className="text-xs font-semibold text-gray-600 dark:text-slate-300 sr-only sm:not-sr-only">
              Domain:
            </label>
            <select
              id="domain-feature-select"
              aria-label="Switch Telemetry Feature Domain"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as DomainTab)}
              className="text-xs font-semibold bg-transparent text-gray-900 dark:text-white focus:outline-none cursor-pointer max-w-[200px] sm:max-w-none truncate"
            >
              <option value="early-warning" className="text-gray-900 bg-white dark:bg-slate-900">
                Threat Matrix (LEWS)
              </option>
              <option value="hydrology" className="text-gray-900 bg-white dark:bg-slate-900">
                Soil Moisture & Rain (SMAP)
              </option>
              <option value="geotech" className="text-gray-900 bg-white dark:bg-slate-900">
                Subsurface Sensors (AWNA)
              </option>
              <option value="highways" className="text-gray-900 bg-white dark:bg-slate-900">
                Corridors & Transit (NRSC)
              </option>
            </select>
          </div>

          <Link
            href={currentDomain.pageHref}
            className="gov-btn gov-btn-primary text-xs shrink-0 whitespace-nowrap"
          >
            <span>Open {currentDomain.label}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Tab Selector Cards */}
      <div
        role="tablist"
        aria-label="Hazard Telemetry Domains"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch"
      >
        {DOMAINS.map((domain) => {
          const Icon = domain.icon;
          const isActive = activeTab === domain.id;

          return (
            <button
              key={domain.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`domain-panel-${domain.id}`}
              id={`domain-tab-${domain.id}`}
              onClick={() => setActiveTab(domain.id)}
              className={`gov-card flex flex-col justify-between p-4 text-left transition-all cursor-pointer h-full min-h-[125px] ${
                isActive
                  ? "ring-2 ring-gov-blue border-gov-blue shadow-gov-md"
                  : "hover:shadow-gov-md"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-2 rounded-lg ${
                      isActive
                        ? "bg-gov-blue text-white"
                        : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={STATUS_BADGE_STYLES[domain.statusType]}>
                    {domain.statusBadge}
                  </span>
                </div>

                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mt-1">
                  {domain.badge}
                </div>
              </div>
              <div
                className={`text-sm font-semibold mt-2 line-clamp-2 ${
                  isActive ? "text-gov-blue dark:text-cyan-400" : "text-gray-700 dark:text-slate-200"
                }`}
              >
                {domain.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Domain Panel */}
      <div
        role="tabpanel"
        id={`domain-panel-${activeTab}`}
        aria-labelledby={`domain-tab-${activeTab}`}
        className="gov-card p-5 sm:p-6 space-y-5"
      >
        {/* Domain Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gov-blue dark:text-cyan-400 uppercase tracking-wide">
                {currentDomain.source}
              </span>
              <span className={STATUS_BADGE_STYLES[currentDomain.statusType]}>
                {currentDomain.statusBadge}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-heading font-bold text-gray-900 dark:text-white tracking-tight">
              {currentDomain.pageTitle}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 max-w-4xl leading-relaxed pt-1">
              {currentDomain.executiveSummary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              aria-expanded={showInteractivePreview}
              onClick={() => setShowInteractivePreview(!showInteractivePreview)}
              className="gov-btn gov-btn-secondary text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showInteractivePreview ? "Hide Workspace" : "Show Workspace"}</span>
              {showInteractivePreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <Link
              href={currentDomain.pageHref}
              className="gov-btn gov-btn-primary text-xs"
            >
              <span>Fullscreen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {currentDomain.metrics.map((m, idx) => (
            <div key={idx} className="gov-stat-card">
              <span className="text-[10px] uppercase font-semibold text-gray-400 dark:text-slate-400 tracking-wider block">
                {m.label}
              </span>
              <div className="text-lg sm:text-xl font-heading font-extrabold text-gov-blue dark:text-cyan-400 mt-0.5">
                {m.value}
              </div>
              <span className="text-[11px] text-gray-400 dark:text-slate-400 mt-1 block truncate">
                {m.hint}
              </span>
            </div>
          ))}
        </div>

        {/* Corridor Tag */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gov-blue dark:text-cyan-400" />
            <span>Priority Corridor:</span>
            <strong className="text-gray-800 dark:text-slate-100 font-semibold">{currentDomain.highlightCorridor}</strong>
          </div>
          <Link
            href="/map"
            className="text-gov-blue dark:text-cyan-400 hover:underline font-semibold inline-flex items-center gap-1 hidden sm:inline-flex"
          >
            <span>View on GIS Map</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Interactive Workspace Preview */}
        {showInteractivePreview && (
          <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-2 text-xs">
              <span className="text-gov-blue dark:text-cyan-400 font-semibold flex items-center gap-1.5">
                Interactive Workspace Active: {currentDomain.label}
              </span>
              <button
                type="button"
                onClick={() => setShowInteractivePreview(false)}
                className="text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white underline text-[11px]"
              >
                Close
              </button>
            </div>

            {activeTab === "early-warning" && <LewsForecastAssistant />}
            {activeTab === "hydrology" && <NasaLhasaHydrology />}
            {activeTab === "geotech" && <AmritaKigamGeotech />}
            {activeTab === "highways" && <BhuvanDisasterMonitor />}
          </div>
        )}
      </div>
    </section>
  );
}
