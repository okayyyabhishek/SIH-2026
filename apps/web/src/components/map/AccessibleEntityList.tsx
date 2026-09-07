"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
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

interface AccessibleEntityListProps {
  districts: District[];
  slopeUnits: SlopeUnit[];
  roads: Road[];
  roadChainages: RoadChainage[];
  villages: Village[];
  assets: Asset[];
  landslideEvents: LandslideEvent[];
  visibleLayers: Record<string, boolean>;
  selectedEntity: SelectedEntity | null;
  onSelectEntity: (entity: SelectedEntity | null) => void;
  className?: string;
}

interface UnifiedItem {
  id: string;
  name: string;
  code: string;
  type: SelectedEntity["type"];
  typeLabel: string;
  districtId: string;
  status: string;
  raw: SelectedEntity["data"];
}

export default function AccessibleEntityList({
  districts,
  slopeUnits,
  roads,
  roadChainages,
  villages,
  assets,
  landslideEvents,
  visibleLayers,
  selectedEntity,
  onSelectEntity,
  className = "",
}: AccessibleEntityListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Compile visible entities into a single accessible list
  const unifiedItems: UnifiedItem[] = useMemo(() => {
    const list: UnifiedItem[] = [];

    if (visibleLayers["districts"]) {
      districts.forEach((d) => {
        list.push({
          id: d.id,
          name: d.name,
          code: d.code,
          type: "district",
          typeLabel: "District",
          districtId: d.id,
          status: d.status,
          raw: d,
        });
      });
    }

    if (visibleLayers["slope_units"]) {
      slopeUnits.forEach((su) => {
        list.push({
          id: su.id,
          name: su.name || su.code,
          code: su.code,
          type: "slope_unit",
          typeLabel: "Slope Unit",
          districtId: su.district_id,
          status: su.status,
          raw: su,
        });
      });
    }

    if (visibleLayers["roads"]) {
      roads.forEach((r) => {
        list.push({
          id: r.id,
          name: r.name,
          code: r.road_code,
          type: "road",
          typeLabel: "Road",
          districtId: r.district_id,
          status: r.operational_status,
          raw: r,
        });
      });
    }

    if (visibleLayers["road_chainages"]) {
      roadChainages.forEach((ch) => {
        list.push({
          id: ch.id,
          name: `KM ${ch.chainage_km} Marker`,
          code: `${ch.chainage_km} km`,
          type: "road_chainage",
          typeLabel: "Road Chainage",
          districtId: ch.district_id,
          status: "ACTIVE",
          raw: ch,
        });
      });
    }

    if (visibleLayers["villages"]) {
      villages.forEach((v) => {
        list.push({
          id: v.id,
          name: v.name,
          code: v.village_code || "N/A",
          type: "village",
          typeLabel: "Village",
          districtId: v.district_id,
          status: v.status,
          raw: v,
        });
      });
    }

    if (visibleLayers["assets"]) {
      assets.forEach((a) => {
        list.push({
          id: a.id,
          name: a.name,
          code: a.asset_type,
          type: "asset",
          typeLabel: "Asset",
          districtId: a.district_id,
          status: a.operational_status,
          raw: a,
        });
      });
    }

    if (visibleLayers["landslide_events"]) {
      landslideEvents.forEach((ev) => {
        list.push({
          id: ev.id,
          name: ev.event_reference,
          code: ev.source,
          type: "landslide_event",
          typeLabel: "Landslide Event",
          districtId: ev.district_id,
          status: ev.status,
          raw: ev,
        });
      });
    }

    return list;
  }, [
    districts,
    slopeUnits,
    roads,
    roadChainages,
    villages,
    assets,
    landslideEvents,
    visibleLayers,
  ]);

  // Filter based on search term and type
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.districtId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === "all" || item.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [unifiedItems, searchTerm, typeFilter]);

  return (
    <div
      className={`bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 rounded-lg p-4 shadow-sm dark:shadow-xl flex flex-col h-full min-h-[480px] transition-colors ${className}`}
      role="region"
      aria-label="Accessible Operational Entity Roster"
    >
      {/* Header with Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-sentinel-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>VISIBLE OPERATIONAL ENTITIES</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums bg-blue-50 dark:bg-sky-950 border border-blue-200 dark:border-sky-800 text-gov-blue dark:text-sky-400">
              {filteredItems.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Accessible, keyboard-navigable spatial data representation complying with WCAG 2.2 AA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by name, code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-44"
              aria-label="Filter entities by keyword"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded-md px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            aria-label="Filter by entity type"
          >
            <option value="all">All Types</option>
            <option value="district">Districts</option>
            <option value="slope_unit">Slope Units</option>
            <option value="road">Roads</option>
            <option value="road_chainage">Road Chainages</option>
            <option value="village">Villages</option>
            <option value="asset">Assets</option>
            <option value="landslide_event">Landslide Events</option>
          </select>
        </div>
      </div>

      {/* Tabular List Table */}
      <div className="flex-1 overflow-y-auto mt-3">
        {filteredItems.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs text-center p-4">
            <p className="font-semibold text-slate-700 dark:text-slate-300">No operational entities match query filters.</p>
            <p className="text-xs text-slate-500 mt-1">
              Verify layer toggles in the Operational Layers panel or adjust the district filter.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs" aria-label="Operational entities table">
            <thead>
              <tr className="border-b border-slate-200 dark:border-sentinel-800 text-xs font-semibold text-slate-600 dark:text-slate-400 tracking-wider uppercase bg-slate-50/60 dark:bg-sentinel-950/40">
                <th className="py-2.5 px-3">TYPE</th>
                <th className="py-2.5 px-3">NAME / IDENTIFIER</th>
                <th className="py-2.5 px-3">CODE</th>
                <th className="py-2.5 px-3">DISTRICT</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-sentinel-800/50">
              {filteredItems.map((item) => {
                const isSelected = selectedEntity?.data.id === item.id;
                return (
                  <tr
                    key={`${item.type}-${item.id}`}
                    onClick={() => onSelectEntity({ type: item.type, data: item.raw })}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-sky-950/40 border-l-2 border-gov-blue dark:border-sky-500 text-slate-900 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-sentinel-800/50 text-slate-700 dark:text-slate-300"
                    }`}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectEntity({ type: item.type, data: item.raw });
                      }
                    }}
                  >
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-sentinel-800 border border-slate-200 dark:border-sentinel-700 text-slate-700 dark:text-slate-300">
                        {item.typeLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                      {item.code}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                      {item.districtId}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.status}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEntity({ type: item.type, data: item.raw });
                        }}
                        className="inline-flex items-center gap-1 text-xs text-gov-blue dark:text-sky-400 hover:text-blue-700 dark:hover:text-sky-300 font-medium"
                        aria-label={`View details for ${item.name}`}
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
