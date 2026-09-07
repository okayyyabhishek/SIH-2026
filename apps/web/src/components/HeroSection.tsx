"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  FileText,
  Zap,
  ChevronRight,
  Layers,
  AlertTriangle,
  Truck,
  MapPin,
  TrendingUp,
  Satellite,
  Search,
} from "lucide-react";

export function HeroSection() {
  const router = useRouter();
  const [activeSim, setActiveSim] = useState<"nominal" | "monsoon">("nominal");
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>("NH54-KM42");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");

  const isMonsoon = activeSim === "monsoon";

  // Telemetry values dynamically reflecting simulated conditions
  const probability = isMonsoon ? "98.7%" : "96.4%";
  const warningStatus = isMonsoon ? "CRITICAL EMERGENCY" : "ADVISORY";
  const rainfall24h = isMonsoon ? "184.2 mm" : "114.5 mm";
  const insarVelocity = isMonsoon ? "-42.8 mm/yr" : "-28.4 mm/yr";

  const hotspots = [
    {
      id: "NH54-KM42",
      name: "NH-54 KM 42+350 (Aizawl-Lunglei)",
      shortName: "NH-54 (Mizoram)",
      coords: { x: 38, y: 44 },
      risk: isMonsoon ? "CRITICAL (98.7%)" : "HIGH (96.4%)",
      status: "Tension Cracks Detected",
      agency: "PWD / Border Roads Organisation (BRO)",
      fs: isMonsoon ? "1.04 (Failure Imminent)" : "1.18 (Subcritical)",
      displacement: isMonsoon ? "-42.8 mm/yr LOS" : "-28.4 mm/yr LOS",
    },
    {
      id: "JATINGA",
      name: "NH-27 Jatinga Valley Chute (Dima Hasao)",
      shortName: "NH-27 (Assam)",
      coords: { x: 50, y: 35 },
      risk: isMonsoon ? "CRITICAL (98.9%)" : "HIGH (96.0%)",
      status: "Active Mudflow Zone",
      agency: "NHIDCL / Assam SDMA",
      fs: isMonsoon ? "1.02 (Failure Imminent)" : "1.15 (Subcritical)",
      displacement: isMonsoon ? "-48.2 mm/yr LOS" : "-32.5 mm/yr LOS",
    },
    {
      id: "SONAPUR",
      name: "NH-6 Sonapur Tunnel Rockfall Corridor",
      shortName: "NH-6 (Meghalaya)",
      coords: { x: 28, y: 55 },
      risk: isMonsoon ? "CRITICAL (99.1%)" : "HIGH (97.0%)",
      status: "Rockfall Detachment",
      agency: "BRO / Meghalaya PWD",
      fs: isMonsoon ? "0.98 (Failure Imminent)" : "1.12 (Subcritical)",
      displacement: isMonsoon ? "-39.4 mm/yr LOS" : "-26.8 mm/yr LOS",
    },
    {
      id: "TUPUL",
      name: "NH-37 Tupul Debris Flow Chute (Noney)",
      shortName: "NH-37 (Manipur)",
      coords: { x: 82, y: 48 },
      risk: isMonsoon ? "CRITICAL (99.5%)" : "HIGH (98.1%)",
      status: "Debris Flow Threat",
      agency: "Manipur SDRF / NF Railway",
      fs: isMonsoon ? "0.95 (Failure Imminent)" : "1.08 (Subcritical)",
      displacement: isMonsoon ? "-52.1 mm/yr LOS" : "-42.6 mm/yr LOS",
    },
    {
      id: "DURTLANG",
      name: "Durtlang Ridge Scarp Zone A",
      shortName: "Durtlang Scarp",
      coords: { x: 62, y: 28 },
      risk: isMonsoon ? "CRITICAL (97.2%)" : "ELEVATED (91.8%)",
      status: "InSAR Subsidence Active",
      agency: "District Disaster Management Authority (DDMA)",
      fs: isMonsoon ? "1.09" : "1.24",
      displacement: isMonsoon ? "-36.2 mm/yr LOS" : "-22.1 mm/yr LOS",
    },
  ];

  const handleQuickChip = (query: string, hotspotId: string) => {
    setSearchQuery(query);
    setSelectedHotspot(hotspotId);
  };

  return (
    <section className="relative w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-[#FAFBFD] to-[#F2F6FA] dark:from-[#070E1E] dark:via-[#091530] dark:to-[#0D1E42] shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] amrita-hero-section text-slate-900 dark:text-white transition-colors">
      {/* ── Official Indian Tricolor Ribbon Strip at top of Hero ── */}
      <div className="h-1.5 w-full flex shrink-0 shadow-sm" aria-hidden="true">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-[#FFFFFF] dark:bg-slate-700" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Grid line overlay for telemetry aesthetic */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 p-5 sm:p-7 lg:p-9">
        {/* ── Top Bar: Government Status, Corridor Scope, Simulation Mode ── */}
        <div className="flex flex-nowrap items-center justify-between gap-2 pb-5 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex flex-nowrap items-center gap-2 shrink-0">
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-400" />
              </span>
              <span>System Operational — Updated Hourly</span>
            </div>

            {/* Region Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
              <MapPin className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400" />
              <span>Northeast Region (NER) Strategic Corridors</span>
            </div>

            {/* InSAR Satellite Uplink Pill */}
            <div className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-cyan-950/40 border border-blue-200 dark:border-cyan-800/50 text-blue-800 dark:text-cyan-300 text-xs">
              <Satellite className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
              <span>Sentinel-1 Ascending Pass: T-03h 48m</span>
            </div>
          </div>

          {/* Operational Readiness / Simulation Switcher */}
          <div className="flex flex-nowrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 p-0.5 rounded-full shadow-inner shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 pl-2 pr-1">
              Scenario:
            </span>
            <button
              type="button"
              onClick={() => setActiveSim("nominal")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                !isMonsoon
                  ? "bg-gov-blue text-white shadow-sm dark:bg-cyan-500 dark:text-slate-950"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Baseline Nominal
            </button>
            <button
              type="button"
              onClick={() => setActiveSim("monsoon")}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                isMonsoon
                  ? "bg-rose-600 text-white shadow-sm animate-pulse dark:bg-rose-500"
                  : "text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300"
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>Monsoon Surge</span>
            </button>
          </div>
        </div>

        {/* ── Main Layout: Hero Content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
          {/* Official Headings, National Search Bar & CTAs */}
          <div className="lg:col-span-12 max-w-6xl space-y-5">
            {/* Bilingual Ministry Titles */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-gov-blue dark:text-amber-400 tracking-wider uppercase font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-gov-saffron" />
                <span className="font-semibold">भारत सरकार — राष्ट्रीय भूस्खलन पूर्व चेतावनी मंच</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-[26px] lg:text-[32px] xl:text-[38px] font-extrabold tracking-tight leading-[1.2] text-slate-900 dark:text-white amrita-hero-title sm:whitespace-nowrap">
                National Landslide Early Warning & Risk Management Platform
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Geological Survey of India (GSI) • National Disaster Management Authority (NDMA) • Ministry of Earth Sciences
              </p>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl amrita-hero-desc">
              Real-time geotechnical intelligence, calibrated slope-unit susceptibility models, and
              satellite surface deformation monitoring across India&apos;s most vulnerable transport
              corridors and mountain habitations.
            </p>

            {/* ── Government National Portal Search Bar ── */}
            <div className="w-full max-w-3xl p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const query = searchQuery.trim() || "NH-54";
                        const categoryParam = searchCategory !== "all" ? `&category=${searchCategory}` : "";
                        router.push(`/map?q=${encodeURIComponent(query)}${categoryParam}`);
                      }
                    }}
                    placeholder="Search Highway Corridor, Slope Unit, or Village (e.g., NH-54, KM 42+350)..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-gov-blue dark:focus:ring-cyan-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  aria-label="Filter Search by Category"
                  className="px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-blue font-medium"
                >
                  <option value="all">All Corridors</option>
                  <option value="highways">National Highways</option>
                  <option value="slopes">High-Risk Slopes</option>
                  <option value="settlements">Habitation Zones</option>
                </select>

                <Link
                  href={`/map?q=${encodeURIComponent(searchQuery.trim() || "NH-54")}${searchCategory !== "all" ? `&category=${searchCategory}` : ""}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gov-blue hover:bg-gov-blue-dark text-white font-bold text-xs shadow-sm transition-all dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Search</span>
                </Link>
              </div>

              {/* Quick Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Priority Zones:</span>
                <button
                  type="button"
                  aria-pressed={selectedHotspot === "NH54-KM42"}
                  onClick={() => handleQuickChip("NH-54 KM 42+350", "NH54-KM42")}
                  className={`px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
                    selectedHotspot === "NH54-KM42"
                      ? "bg-blue-100 dark:bg-cyan-950 border-blue-300 dark:border-cyan-700 text-gov-blue dark:text-cyan-300 font-semibold"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  NH-54 (Mizoram)
                </button>
                <button
                  type="button"
                  aria-pressed={selectedHotspot === "JATINGA"}
                  onClick={() => handleQuickChip("NH-27 Jatinga Valley", "JATINGA")}
                  className={`px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
                    selectedHotspot === "JATINGA"
                      ? "bg-blue-100 dark:bg-cyan-950 border-blue-300 dark:border-cyan-700 text-gov-blue dark:text-cyan-300 font-semibold"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  NH-27 (Assam)
                </button>
                <button
                  type="button"
                  aria-pressed={selectedHotspot === "SONAPUR"}
                  onClick={() => handleQuickChip("NH-6 Sonapur Tunnel", "SONAPUR")}
                  className={`px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
                    selectedHotspot === "SONAPUR"
                      ? "bg-blue-100 dark:bg-cyan-950 border-blue-300 dark:border-cyan-700 text-gov-blue dark:text-cyan-300 font-semibold"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  NH-6 (Meghalaya)
                </button>
                <button
                  type="button"
                  aria-pressed={selectedHotspot === "TUPUL"}
                  onClick={() => handleQuickChip("NH-37 Tupul Chute", "TUPUL")}
                  className={`px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
                    selectedHotspot === "TUPUL"
                      ? "bg-blue-100 dark:bg-cyan-950 border-blue-300 dark:border-cyan-700 text-gov-blue dark:text-cyan-300 font-semibold"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  NH-37 (Manipur)
                </button>
                <button
                  type="button"
                  aria-pressed={selectedHotspot === "DURTLANG"}
                  onClick={() => handleQuickChip("Durtlang Ridge Scarp", "DURTLANG")}
                  className={`px-2 py-0.5 rounded-md border text-[11px] transition-colors ${
                    selectedHotspot === "DURTLANG"
                      ? "bg-blue-100 dark:bg-cyan-950 border-blue-300 dark:border-cyan-700 text-gov-blue dark:text-cyan-300 font-semibold"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  Durtlang Scarp
                </button>
              </div>
            </div>

            {/* Official CTAs (Exact Test Link Assertions Preserved) */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gov-blue hover:bg-gov-blue-dark text-white font-bold text-sm shadow-md hover:shadow-lg transition-all dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950"
              >
                <Compass className="w-4 h-4" />
                <span>Launch GIS Map</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              <Link
                href="/early-warning"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-gov-blue dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm font-semibold shadow-xs transition-all"
              >
                <AlertTriangle className="w-4 h-4 text-gov-blue dark:text-cyan-400" />
                <span>Early Warning Dashboard</span>
              </Link>

              <Link
                href="/risk"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-gov-blue dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-sm font-semibold shadow-xs transition-all"
              >
                <FileText className="w-4 h-4 text-gov-blue dark:text-cyan-400" />
                <span>Forecast Bulletin</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ── Key Metrics Strip (Exact Assertions for Testing Preserved) ── */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Monitored Slope Units",
              value: "1,248",
              hint: "Aizawl & Durtlang Basin",
              icon: Layers,
              accentColor: "border-t-gov-blue",
              iconColor: "text-gov-blue dark:text-cyan-400",
              badge: "ML Inference Active",
            },
            {
              label: "Lifeline Corridors",
              value: "14 Routes",
              hint: "NH-54 Priority Track",
              icon: Truck,
              accentColor: "border-t-amber-500",
              iconColor: "text-amber-600 dark:text-amber-400",
              badge: "BRO Real-Time Patrol",
            },
            {
              label: "Peak InSAR Creep",
              value: insarVelocity,
              hint: "Sentinel-1 Ascending",
              icon: TrendingUp,
              accentColor: "border-t-purple-600",
              iconColor: "text-purple-600 dark:text-purple-400",
              badge: "-1.8 mm/wk Velocity",
            },
            {
              label: "Warning Status",
              value: warningStatus,
              hint: isMonsoon ? "Immediate Evacuation" : "3 Actions Pending",
              icon: AlertTriangle,
              accentColor: isMonsoon ? "border-t-rose-600" : "border-t-amber-500",
              iconColor: isMonsoon ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400",
              badge: isMonsoon ? "DEFCON 1 RED" : "DEFCON 2 AMBER",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 border-t-4 ${stat.accentColor} shadow-xs hover:shadow-md transition-all group`}
            >
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
                <span>{stat.label}</span>
                <stat.icon
                  className={`w-4 h-4 ${stat.iconColor} group-hover:scale-110 transition-transform`}
                />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black font-heading text-slate-900 dark:text-white tracking-tight">
                {stat.value}
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{stat.hint}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
