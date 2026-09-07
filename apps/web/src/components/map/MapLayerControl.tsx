"use client";

import React, { useState } from "react";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  MapPin,
  Mountain,
  Navigation,
  Milestone,
  Home,
  Building2,
  AlertTriangle,
  Radio,
} from "lucide-react";

interface LayerConfig {
  id: string;
  label: string;
  count: number;
  color: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MapLayerControlProps {
  visibleLayers: Record<string, boolean>;
  onToggleLayer: (layerId: string) => void;
  counts: Record<string, number>;
  className?: string;
}

export default function MapLayerControl({
  visibleLayers,
  onToggleLayer,
  counts,
  className = "",
}: MapLayerControlProps) {
  const [isOpen, setIsOpen] = useState(true);

  const layers: LayerConfig[] = [
    {
      id: "districts",
      label: "Districts",
      count: counts["districts"] || 0,
      color: "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700",
      subtitle: "Administrative boundary polygons",
      icon: MapPin,
    },
    {
      id: "slope_units",
      label: "Slope Units",
      count: counts["slope_units"] || 0,
      color: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
      subtitle: "Terrain slope management polygons",
      icon: Mountain,
    },
    {
      id: "roads",
      label: "Roads",
      count: counts["roads"] || 0,
      color: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700",
      subtitle: "Linear highway corridors",
      icon: Navigation,
    },
    {
      id: "road_chainages",
      label: "Road Chainages",
      count: counts["road_chainages"] || 0,
      color: "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-700",
      subtitle: "Kilometer reference markers",
      icon: Milestone,
    },
    {
      id: "villages",
      label: "Villages",
      count: counts["villages"] || 0,
      color: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
      subtitle: "Habitation settlement points",
      icon: Home,
    },
    {
      id: "assets",
      label: "Assets & Facilities",
      count: counts["assets"] || 0,
      color: "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700",
      subtitle: "Critical lifeline infrastructure",
      icon: Building2,
    },
    {
      id: "landslide_events",
      label: "Landslide Events",
      count: counts["landslide_events"] || 0,
      color: "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700",
      subtitle: "Recorded historical occurrences",
      icon: AlertTriangle,
    },
    {
      id: "insar_deformation",
      label: "InSAR Change Evidence",
      count: counts["insar_deformation"] || 0,
      color: "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-700",
      subtitle: "Measured LOS displacement",
      icon: Radio,
    },
    {
      id: "consequences",
      label: "Consequence Relationships",
      count: counts["consequences"] || 0,
      color: "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700",
      subtitle: "Spatial exposure links",
      icon: Layers,
    },
  ];

  const activeCount = layers.filter((l) => visibleLayers[l.id]).length;

  return (
    <div
      className={`bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 rounded-lg shadow-sm dark:shadow-xl overflow-hidden transition-colors ${className}`}
      aria-label="Map Layer Control"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 dark:bg-sentinel-800/60 dark:hover:bg-sentinel-800 text-left text-xs font-semibold text-slate-800 dark:text-white tracking-wide border-b border-slate-200 dark:border-sentinel-700/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gov-blue dark:text-sky-400" />
          <span>OPERATIONAL LAYERS</span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            ({activeCount}/{layers.length})
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        )}
      </button>

      {/* Layer List */}
      {isOpen && (
        <div className="p-2.5 space-y-1.5 text-xs">
          <div className="space-y-1">
            {layers.map((layer) => {
              const Icon = layer.icon;
              const isChecked = !!visibleLayers[layer.id];

              return (
                <label
                  key={layer.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer border transition-colors ${
                    isChecked
                      ? "bg-blue-50/70 border-blue-200 text-slate-900 dark:bg-sentinel-800/80 dark:border-sentinel-700 dark:text-white"
                      : "bg-slate-50/50 border-slate-200/80 text-slate-600 hover:bg-slate-100 dark:bg-sentinel-950/40 dark:border-sentinel-900 dark:text-slate-400 dark:hover:bg-sentinel-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleLayer(layer.id)}
                      className="rounded border-slate-300 dark:border-sentinel-700 bg-white dark:bg-sentinel-950 text-gov-blue dark:text-sky-500 focus:ring-sky-500/40 w-3.5 h-3.5 cursor-pointer shrink-0"
                      aria-label={`Toggle ${layer.label} layer`}
                    />
                    <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-xs leading-tight truncate">
                        {layer.label}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate mt-0.5">
                        {layer.subtitle}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold tabular-nums border shrink-0 min-w-[24px] text-center ${layer.color}`}
                    title={`${layer.count} loaded entities`}
                  >
                    {layer.count}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
