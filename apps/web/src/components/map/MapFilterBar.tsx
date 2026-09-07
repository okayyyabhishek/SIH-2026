"use client";

import React from "react";
import {
  Compass,
  Radar,
  Crosshair,
  RotateCcw,
  ListFilter,
  Map as MapIcon,
  Table as TableIcon,
} from "lucide-react";
import { District } from "@/lib/domain";

interface MapFilterBarProps {
  districts: District[];
  selectedDistrictId: string;
  onSelectDistrict: (districtId: string) => void;
  queryMode: "view" | "nearby" | "point";
  onChangeQueryMode: (mode: "view" | "nearby" | "point") => void;
  nearbyRadiusMeters: number;
  onChangeNearbyRadius: (radius: number) => void;
  activeView: "map" | "list";
  onChangeView: (view: "map" | "list") => void;
  onResetView: () => void;
  totalVisibleEntities: number;
  className?: string;
}

export default function MapFilterBar({
  districts,
  selectedDistrictId,
  onSelectDistrict,
  queryMode,
  onChangeQueryMode,
  nearbyRadiusMeters,
  onChangeNearbyRadius,
  activeView,
  onChangeView,
  onResetView,
  totalVisibleEntities,
  className = "",
}: MapFilterBarProps) {
  // Deduplicate and group districts by State for clean North East navigation
  const { states, groupedByState } = React.useMemo(() => {
    const seen = new Set<string>();
    const unique: District[] = [];
    for (const d of districts) {
      const key = (d.code || d.name || d.id).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(d);
      }
    }

    const grouped: Record<string, District[]> = {};
    for (const d of unique) {
      const stateName =
        d.state_name ||
        (d.state_code === "MZ"
          ? "Mizoram"
          : d.state_code === "AS"
          ? "Assam"
          : d.state_code === "ML"
          ? "Meghalaya"
          : d.state_code === "AR"
          ? "Arunachal Pradesh"
          : d.state_code === "MN"
          ? "Manipur"
          : d.state_code === "NL"
          ? "Nagaland"
          : d.state_code === "SK"
          ? "Sikkim"
          : d.state_code === "TR"
          ? "Tripura"
          : d.state_code || "North East");
      if (!grouped[stateName]) {
        grouped[stateName] = [];
      }
      grouped[stateName].push(d);
    }

    return {
      states: Object.keys(grouped).sort(),
      groupedByState: grouped,
    };
  }, [districts]);

  return (
    <div
      className={`bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 rounded-lg p-3 shadow-sm dark:shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${className}`}
      role="toolbar"
      aria-label="Map Operational Filters"
    >
      {/* Left: District & Scope Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
          <Compass className="w-4 h-4 text-gov-blue dark:text-sky-400" />
          <span>District:</span>
        </div>
        <select
          value={selectedDistrictId}
          onChange={(e) => onSelectDistrict(e.target.value)}
          className="w-full sm:w-auto bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
          aria-label="Filter by administrative district"
        >
          <option value="">All Authorized Districts (NER)</option>
          {states.map((state) => (
            <optgroup
              key={state}
              label={state}
              className="bg-slate-100 dark:bg-sentinel-900 text-slate-900 dark:text-slate-100 font-bold"
            >
              {groupedByState[state].map((d) => (
                <option
                  key={d.id}
                  value={d.id}
                  className="bg-white dark:bg-sentinel-950 text-slate-900 dark:text-slate-100 font-normal"
                >
                  {d.name} ({d.code})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Query Mode Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 rounded p-0.5 ml-1">
          <button
            type="button"
            onClick={() => onChangeQueryMode("view")}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
              queryMode === "view"
                ? "bg-gov-blue dark:bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            aria-pressed={queryMode === "view"}
          >
            <Compass className="w-3 h-3" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeQueryMode("nearby")}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
              queryMode === "nearby"
                ? "bg-gov-blue dark:bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            aria-pressed={queryMode === "nearby"}
          >
            <Radar className="w-3 h-3" />
            <span>Nearby</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeQueryMode("point")}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
              queryMode === "point"
                ? "bg-gov-blue dark:bg-sky-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            aria-pressed={queryMode === "point"}
          >
            <Crosshair className="w-3 h-3" />
            <span>Point Query</span>
          </button>
        </div>

        {/* Nearby Radius Slider (Visible in Nearby Mode) */}
        {queryMode === "nearby" && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-sentinel-950 border border-sky-300 dark:border-sky-800/60 rounded px-2.5 py-1">
            <span className="text-xs text-gov-blue dark:text-sky-300 font-medium tabular-nums">
              Radius: {(nearbyRadiusMeters / 1000).toFixed(1)} km
            </span>
            <input
              type="range"
              min="500"
              max="50000"
              step="500"
              value={nearbyRadiusMeters}
              onChange={(e) => onChangeNearbyRadius(Number(e.target.value))}
              className="w-24 h-1.5 bg-slate-200 dark:bg-sentinel-800 rounded-lg appearance-none cursor-pointer accent-gov-blue dark:accent-sky-500"
              aria-label="Proximity search radius slider (up to 50 km)"
            />
          </div>
        )}
      </div>

      {/* Right: Dual-View Mode & Reset */}
      <div className="flex items-center gap-2">
        {/* Count Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 rounded-md text-slate-700 dark:text-slate-300 font-medium text-xs">
          <ListFilter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="font-semibold tabular-nums">{totalVisibleEntities}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">entities</span>
        </div>

        {/* View Toggle: Map vs Accessible Tabular List */}
        <div className="flex items-center bg-slate-100 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 rounded p-0.5" role="group" aria-label="Interface presentation mode">
          <button
            type="button"
            onClick={() => onChangeView("map")}
            aria-label="Map Canvas"
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
              activeView === "map"
                ? "bg-white dark:bg-sentinel-800 text-slate-900 dark:text-white border border-slate-200 dark:border-sentinel-700 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            aria-pressed={activeView === "map"}
          >
            <MapIcon className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
            <span className="hidden sm:inline">Map Canvas</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeView("list")}
            aria-label="Data Roster"
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${
              activeView === "list"
                ? "bg-white dark:bg-sentinel-800 text-slate-900 dark:text-white border border-slate-200 dark:border-sentinel-700 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            aria-pressed={activeView === "list"}
          >
            <TableIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span className="hidden sm:inline">Data Roster</span>
          </button>
        </div>

        {/* Reset / Home View Button */}
        <button
          type="button"
          onClick={onResetView}
          className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-sentinel-950 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-700 rounded text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
          title="Reset map view to default operational boundary"
          aria-label="Reset map view to default operational boundary"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
