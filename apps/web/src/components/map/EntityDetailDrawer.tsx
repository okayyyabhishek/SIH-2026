"use client";

import React, { useEffect } from "react";
import { formatDateSafe, formatDateTimeSafe, formatNumberSafe } from "@/lib/formatters";
import {
  X,
  MapPin,
  Mountain,
  Navigation,
  Milestone,
  Home,
  Building2,
  AlertTriangle,
  Clock,
  Info,
} from "lucide-react";
import { SelectedEntity } from "./LeafletMapCanvas";
import {
  District,
  SlopeUnit,
  Road,
  RoadChainage,
  Village,
  Asset,
  LandslideEvent,
} from "@/lib/domain";

interface EntityDetailDrawerProps {
  selectedEntity: SelectedEntity | null;
  onClose: () => void;
  className?: string;
}

export default function EntityDetailDrawer({
  selectedEntity,
  onClose,
  className = "",
}: EntityDetailDrawerProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!selectedEntity) return null;

  const { type, data } = selectedEntity;

  // Render specific metadata based on entity type
  const renderDetails = () => {
    switch (type) {
      case "district": {
        const d = data as District;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
              <MapPin className="w-4 h-4" />
              <span>Administrative District</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{d.name}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-sentinel-950/60 p-2.5 rounded border border-slate-200 dark:border-sentinel-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">DISTRICT CODE</span>
                <span className="text-slate-900 dark:text-white font-medium">{d.code}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">STATE</span>
                <span className="text-slate-900 dark:text-white font-medium">{d.state_name} ({d.state_code})</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">STATUS</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{d.status}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">GEOMETRY TYPE</span>
                <span className="text-slate-700 dark:text-slate-300">{d.geometry?.type || "Polygon"}</span>
              </div>
            </div>
          </div>
        );
      }

      case "slope_unit": {
        const su = data as SlopeUnit;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <Mountain className="w-4 h-4" />
              <span>Terrain Slope Unit</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{su.code}</h3>
            {su.name && <p className="text-xs text-slate-600 dark:text-slate-300 -mt-2">{su.name}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-sentinel-950/60 p-2.5 rounded border border-slate-200 dark:border-sentinel-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">DISTRICT ID</span>
                <span className="text-slate-900 dark:text-white font-medium">{su.district_id}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">STATE</span>
                <span className="text-slate-900 dark:text-white font-medium">{su.state_code}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">STATUS</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{su.status}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">UNIT ID</span>
                <span className="text-slate-700 dark:text-slate-300 truncate block">{su.id}</span>
              </div>
            </div>
          </div>
        );
      }

      case "road": {
        const r = data as Road;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm">
              <Navigation className="w-4 h-4" />
              <span>Transportation Corridor</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{r.name}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-sentinel-950/60 p-2.5 rounded border border-slate-200 dark:border-sentinel-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ROAD CODE</span>
                <span className="text-slate-900 dark:text-white font-bold">{r.road_code}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">CLASSIFICATION</span>
                <span className="text-slate-900 dark:text-white">{r.road_type}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">MANAGING AUTHORITY</span>
                <span className="text-gov-blue dark:text-sky-300 font-medium">{r.authority_organization_id}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">STATUS</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{r.operational_status}</span>
              </div>
            </div>
          </div>
        );
      }

      case "road_chainage": {
        const ch = data as RoadChainage;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold text-sm">
              <Milestone className="w-4 h-4" />
              <span>Kilometer Reference Post</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              KM {ch.chainage_km} Marker
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-sentinel-950/60 p-2.5 rounded border border-slate-200 dark:border-sentinel-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">PARENT ROAD</span>
                <span className="text-slate-900 dark:text-white font-medium">{ch.road_id}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">DISTRICT</span>
                <span className="text-slate-900 dark:text-white font-medium">{ch.district_id}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">COORDINATES</span>
                <span className="text-slate-700 dark:text-slate-300 truncate block">
                  {ch.geometry?.coordinates && ch.geometry.coordinates[0] != null && ch.geometry.coordinates[1] != null
                    ? `[${ch.geometry.coordinates[0].toFixed(3)}, ${ch.geometry.coordinates[1].toFixed(3)}]`
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ID</span>
                <span className="text-slate-700 dark:text-slate-300 truncate block">{ch.id}</span>
              </div>
            </div>
          </div>
        );
      }

      case "village": {
        const v = data as Village;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
              <Home className="w-4 h-4" />
              <span>Habitation Settlement</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{v.name}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-sentinel-950/60 p-2.5 rounded border border-slate-200 dark:border-sentinel-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">VILLAGE CODE</span>
                <span className="text-slate-900 dark:text-white font-medium">{v.village_code || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">DISTRICT</span>
                <span className="text-slate-900 dark:text-white font-medium">{v.district_id}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">STATUS</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{v.status}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">OFFICIAL POPULATION</span>
                <span className="text-slate-900 dark:text-white font-bold" suppressHydrationWarning>
                  {v.population !== undefined && v.population !== null ? formatNumberSafe(v.population) : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        );
      }

      case "asset": {
        const a = data as Asset;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-sm">
              <Building2 className="w-4 h-4" />
              <span>Lifeline Asset / Infrastructure</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{a.name}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-sentinel-950/60 p-2.5 rounded border border-slate-200 dark:border-sentinel-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">ASSET TYPE</span>
                <span className="text-slate-900 dark:text-white font-medium">{a.asset_type}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">OPERATIONAL STATUS</span>
                <span className={a.operational_status === "OPERATIONAL" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-amber-600 dark:text-amber-400 font-semibold"}>
                  {a.operational_status}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">MANAGING ORG</span>
                <span className="text-gov-blue dark:text-sky-300 font-medium">{a.organization_id}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">DISTRICT</span>
                <span className="text-slate-900 dark:text-white font-medium">{a.district_id}</span>
              </div>
            </div>
          </div>
        );
      }

      case "landslide_event": {
        const ev = data as LandslideEvent;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Historical Landslide Record</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{ev.event_reference}</h3>
            {ev.description && <p className="text-xs text-slate-600 dark:text-slate-300">{ev.description}</p>}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-sentinel-950/60 p-2.5 rounded border border-slate-200 dark:border-sentinel-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">SOURCE PROVENANCE</span>
                <span className="text-slate-900 dark:text-white font-medium">{ev.source}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">RECORD STATUS</span>
                <span className="text-orange-600 dark:text-orange-400 font-semibold">{ev.status}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">OCCURRENCE TIME</span>
                <span className="text-slate-700 dark:text-slate-300 text-[11px]" suppressHydrationWarning>
                  {formatDateTimeSafe(ev.event_time)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">SOURCE REF</span>
                <span className="text-slate-700 dark:text-slate-300">{ev.source_reference || "None"}</span>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <aside
      className={`bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 rounded-lg p-4 shadow-sm dark:shadow-2xl backdrop-blur-md max-w-sm w-full flex flex-col justify-between transition-colors ${className}`}
      aria-label="Selected Entity Operational Metadata"
    >
      <div>
        {/* Header with Close button */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-sentinel-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
            FACTUAL OPERATIONAL METADATA
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-sentinel-800 transition-colors"
            aria-label="Close entity detail drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="py-3">
          {renderDetails()}
        </div>

        {/* Stage Boundary Separation Banner */}
        <div className="mt-2 p-2.5 bg-blue-50/60 dark:bg-sentinel-950/80 border border-blue-200 dark:border-sentinel-800 rounded text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300 font-semibold text-xs">
            <Info className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400 shrink-0" />
            <span>Downstream Intelligence Notice</span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
            Hazard predictions, rainfall susceptibility, InSAR creep, and road isolation consequences are scheduled for Stages 5–7. This interface displays verified physical spatial facts only.
          </p>
        </div>
      </div>

      {/* Footer Timestamp */}
      <div className="pt-3 mt-3 border-t border-slate-200 dark:border-sentinel-800/80 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5" suppressHydrationWarning>
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          Updated: {formatDateSafe(data.updated_at || "2026-09-05")}
        </span>
        <span className="text-slate-500 dark:text-slate-400">EPSG:4326</span>
      </div>
    </aside>
  );
}
