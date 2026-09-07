"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Radio,
  Compass,
  Layers,
  FileCheck2,
  Users,
  ArrowRight,
  ChevronRight,
  Filter,
} from "lucide-react";

interface MissionCategory {
  id: string;
  stage: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badgeType: string;
  metrics: string;
  category: "hazard-ai" | "spatial-lifelines" | "operations-field";
}

const MISSION_CATEGORIES: MissionCategory[] = [
  {
    id: "risk-engine",
    stage: "Stage 5",
    title: "Quantitative Risk Engine",
    description:
      "Transparent multivariate logistic regression predicting landslide probability per slope unit with verified mathematical provenance.",
    href: "/risk",
    icon: Activity,
    iconBg: "bg-rose-600 dark:bg-rose-500",
    badgeType: "gov-badge-red dark:bg-rose-950/80 dark:border-rose-700/60 dark:text-rose-300",
    metrics: "5 Verified Features • Zero Black-Box",
    category: "hazard-ai",
  },
  {
    id: "creep-watch",
    stage: "Stage 6",
    title: "InSAR Creep Watch",
    description:
      "Sentinel-1 satellite interferometry detecting millimetric ground deformation and line-of-sight acceleration along critical transit routes.",
    href: "/creep-watch",
    icon: Radio,
    iconBg: "bg-purple-600 dark:bg-purple-500",
    badgeType: "gov-badge-blue dark:bg-purple-950/80 dark:border-purple-700/60 dark:text-purple-300",
    metrics: "-28.4 mm/yr Velocity",
    category: "hazard-ai",
  },
  {
    id: "spatial-map",
    stage: "Stage 4",
    title: "Slope Unit GIS & Corridors",
    description:
      "Topological slope unit polygons, arterial highway corridors (NH-54, NH-108), and spatial hazard zoning across Aizawl and Lunglei.",
    href: "/map",
    icon: Compass,
    iconBg: "bg-gov-blue dark:bg-cyan-500",
    badgeType: "gov-badge-blue dark:bg-cyan-950/80 dark:border-cyan-700/60 dark:text-cyan-300",
    metrics: "CARTO Open-Source",
    category: "spatial-lifelines",
  },
  {
    id: "consequence-intel",
    stage: "Stage 7",
    title: "Consequence Intelligence",
    description:
      "Graph-based vulnerability modeling mapping slope units to physical lifeline infrastructure, population nodes, and single-access bridges.",
    href: "/consequences",
    icon: Layers,
    iconBg: "bg-amber-600 dark:bg-amber-500",
    badgeType: "gov-badge-saffron dark:bg-amber-950/80 dark:border-amber-700/60 dark:text-amber-300",
    metrics: "Graph Impact Analysis",
    category: "spatial-lifelines",
  },
  {
    id: "action-ledger",
    stage: "Stage 8",
    title: "Action & Warning Ledger",
    description:
      "Immutable cryptographic audit log with dual-custody authorization for evacuation alerts, road closures, and excavator dispatch.",
    href: "/ledger",
    icon: FileCheck2,
    iconBg: "bg-blue-600 dark:bg-blue-500",
    badgeType: "gov-badge-blue dark:bg-blue-950/80 dark:border-blue-700/60 dark:text-blue-300",
    metrics: "SHA-256 Chaining",
    category: "operations-field",
  },
  {
    id: "field-community",
    stage: "Stage 10",
    title: "Field & Community Reporting",
    description:
      "Decentralized ground-truth observations, community crack sensors, and volunteer warning relays across isolated hill settlements.",
    href: "/community",
    icon: Users,
    iconBg: "bg-green-600 dark:bg-emerald-500",
    badgeType: "gov-badge-green dark:bg-emerald-950/80 dark:border-emerald-700/60 dark:text-emerald-300",
    metrics: "Crowdsourced Validation",
    category: "operations-field",
  },
];

export function IndiaGovMissionGrid() {
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const visibleItems =
    filterCategory === "all"
      ? MISSION_CATEGORIES
      : MISSION_CATEGORIES.filter((item) => item.category === filterCategory);

  return (
    <section aria-labelledby="mission-categories-heading" className="space-y-6">
      {/* Section Header */}
      <div className="gov-section-header flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-gov-saffron uppercase mb-1">
            National Infrastructure Categories
          </p>
          <h2
            id="mission-categories-heading"
            className="text-xl font-heading font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Operational Mission Categories
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-xl">
            Aligned with GSI (Bhusanket) and NDMA standard operating protocols for landslide disaster resilience.
          </p>
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800/90 border border-gray-300 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-xs">
            <Filter className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400" />
            <label htmlFor="mission-filter-select" className="text-xs font-semibold text-gray-600 dark:text-slate-300 sr-only sm:not-sr-only">
              Filter:
            </label>
            <select
              id="mission-filter-select"
              aria-label="Filter Mission Categories"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs font-semibold bg-transparent text-gray-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="text-gray-900 bg-white dark:bg-slate-900">All Mission Features (6)</option>
              <option value="hazard-ai" className="text-gray-900 bg-white dark:bg-slate-900">Predictive Hazard & AI (2)</option>
              <option value="spatial-lifelines" className="text-gray-900 bg-white dark:bg-slate-900">Spatial GIS & Infrastructure (2)</option>
              <option value="operations-field" className="text-gray-900 bg-white dark:bg-slate-900">Operations & Field Ledger (2)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group liquid-panel gov-card flex flex-col justify-between p-5 rounded-2xl transition-all duration-300 hover:scale-[1.02] border border-slate-200 dark:border-slate-800/90 hover:border-gov-blue dark:hover:border-cyan-500/60 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] h-full min-h-[230px]"
            >
              <div>
                {/* Header: Icon + Badge */}
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`h-12 w-12 shrink-0 rounded-xl ${item.iconBg} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${item.badgeType}`}>
                      {item.stage}
                    </span>
                    <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-slate-800/80 group-hover:bg-gov-blue dark:group-hover:bg-cyan-500 group-hover:text-white dark:group-hover:text-slate-950 flex items-center justify-center text-gray-400 dark:text-slate-400 transition-colors shadow-sm">
                      <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-4">
                  <h3 className="text-sm font-heading font-bold text-gray-900 dark:text-white group-hover:text-gov-blue dark:group-hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500 font-mono">
                <span>{item.metrics}</span>
                <span className="text-gov-blue dark:text-cyan-400 font-semibold group-hover:underline flex items-center space-x-1">
                  <span>Enter</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
