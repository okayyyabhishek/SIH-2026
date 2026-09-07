"use client";

import React, { useState } from "react";
import {
  Satellite,
  CloudRain,
  Radio,
  Building2,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Layers,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface DependencyFeed {
  id: string;
  name: string;
  agency: string;
  category: "NATIONAL_AGENCY" | "SATELLITE_RADAR" | "FIELD_IOT";
  state: "STANDBY" | "NOT_CONFIGURED" | "ACTIVE";
  stateLabel: string;
  lastSync: string;
  provenanceNote: string;
}

const EXTERNAL_FEEDS: DependencyFeed[] = [
  {
    id: "feed-gsi",
    name: "GSI / NLFC Landslide Susceptibility",
    agency: "Geological Survey of India",
    category: "NATIONAL_AGENCY",
    state: "STANDBY",
    stateLabel: "Adapter Standby",
    lastSync: "Stage 5 Interface Contract",
    provenanceNote: "Susceptibility mapping baseline dependency. Never recreated or overridden.",
  },
  {
    id: "feed-imd",
    name: "IMD Doppler Radar & Precipitation Grid",
    agency: "India Meteorological Department",
    category: "NATIONAL_AGENCY",
    state: "STANDBY",
    stateLabel: "Adapter Standby",
    lastSync: "Stage 5 Telemetry Hook",
    provenanceNote: "Antecedent rainfall feature input. Awaiting active district API key.",
  },
  {
    id: "feed-isro",
    name: "ISRO / NRSC Bhuvan Disaster Services",
    agency: "National Remote Sensing Centre",
    category: "NATIONAL_AGENCY",
    state: "STANDBY",
    stateLabel: "Adapter Standby",
    lastSync: "Stage 5 Cadastral Link",
    provenanceNote: "Slope deformation & baseline optical imagery verification feed.",
  },
  {
    id: "feed-insar",
    name: "Sentinel-1 InSAR / MintPy Pipeline",
    agency: "ESA / InSAR Processing Unit",
    category: "SATELLITE_RADAR",
    state: "STANDBY",
    stateLabel: "Pipeline Standby",
    lastSync: "Stage 6 Creep Target",
    provenanceNote: "Line-of-sight displacement velocity & slope creep anomaly engine.",
  },
  {
    id: "feed-iot",
    name: "Geotechnical Piezometers & Tiltmeters",
    agency: "State Disaster Management Authority",
    category: "FIELD_IOT",
    state: "NOT_CONFIGURED",
    stateLabel: "Not Configured",
    lastSync: "Stage 10 Sensor Ops",
    provenanceNote: "Direct MQTT field sensors for rapid threshold escalation.",
  },
];

export function OperationalMetrics() {
  return (
    <section aria-label="Operational Metrics Overview">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="liquid-panel p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">MONITORED CORRIDORS</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">2 Primary</div>
          <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium mt-1">NH-54 & Sairang Cut</div>
        </div>

        <div className="liquid-panel p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">SLOPE UNITS INDEXED</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">1,420 Units</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">Stage 3 Schema Ready</div>
        </div>

        <div className="liquid-panel p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">ACTIVE ACTIONS</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">3 In Queue</div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400/80 font-medium mt-1">1 P1 Critical • 1 P2 Urgent</div>
        </div>

        <div className="liquid-panel p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">LEDGER AUDIT STATE</div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">Locked</div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400/80 font-medium mt-1">Tamper-evident chain</div>
        </div>
      </div>
    </section>
  );
}

export function ExternalFeeds() {
  const [isFeedsExpanded, setIsFeedsExpanded] = useState(false);

  return (
    <section aria-labelledby="external-feeds-title" className="space-y-4">
      <div 
        className="flex flex-row flex-nowrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden min-h-[44px]"
        onClick={() => setIsFeedsExpanded(!isFeedsExpanded)}
      >
        <div className="flex items-start gap-2 overflow-hidden">
          <button
            type="button"
            aria-expanded={isFeedsExpanded}
            aria-controls="external-feeds-items"
            className="mt-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
          >
            {isFeedsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="overflow-hidden">
            <h3 id="external-feeds-title" className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-heading truncate whitespace-nowrap">
              DEPENDENCY STATUS & TELEMETRY (EXTERNAL FEEDS)
            </h3>
          </div>
        </div>
        <div className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-sans font-semibold text-slate-700 dark:text-cyan-300 whitespace-nowrap shrink-0">
          5 Registered Adapters
        </div>
      </div>

      {isFeedsExpanded && (
      <div id="external-feeds-items" className="grid grid-cols-1 gap-3">
        {EXTERNAL_FEEDS.map((feed) => (
          <div
            key={feed.id}
            className="p-3.5 rounded-lg bg-white dark:bg-sentinel-950/60 border border-slate-200 dark:border-sentinel-800/70 hover:border-slate-300 dark:hover:border-sentinel-700/80 transition-colors space-y-2 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{feed.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{feed.agency}</div>
              </div>

              <span
                className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded border shrink-0 ${
                  feed.state === "STANDBY"
                    ? "bg-blue-50 dark:bg-cyan-950/70 text-gov-blue dark:text-cyan-300 border-blue-200 dark:border-cyan-800/60"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                }`}
              >
                {feed.stateLabel}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{feed.provenanceNote}</p>

            <div className="pt-2 border-t border-slate-100 dark:border-sentinel-900 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-sans">
              <span>Target: {feed.lastSync}</span>
              <span>Type: {feed.category}</span>
            </div>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
