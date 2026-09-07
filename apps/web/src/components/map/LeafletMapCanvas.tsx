"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, Info } from "lucide-react";
import { getBasemapConfig } from "@/lib/basemap";
import {
  District,
  SlopeUnit,
  Road,
  RoadChainage,
  Village,
  Asset,
  LandslideEvent,
} from "@/lib/domain";

export interface SelectedEntity {
  type: "district" | "slope_unit" | "road" | "road_chainage" | "village" | "asset" | "landslide_event";
  data: District | SlopeUnit | Road | RoadChainage | Village | Asset | LandslideEvent;
}

interface LeafletMapCanvasProps {
  districts: District[];
  slopeUnits: SlopeUnit[];
  roads: Road[];
  roadChainages: RoadChainage[];
  villages: Village[];
  assets: Asset[];
  landslideEvents: LandslideEvent[];
  visibleLayers: Record<string, boolean>;
  selectedDistrictId?: string;
  selectedEntity: SelectedEntity | null;
  onSelectEntity: (entity: SelectedEntity | null) => void;
  queryMode: "view" | "nearby" | "point";
  nearbyCenter: [number, number] | null;
  nearbyRadiusMeters: number;
  onMapClick: (lat: number, lng: number) => void;
  className?: string;
  errorMessage?: string | null;
  isLoading?: boolean;
  onRetry?: () => void;
}

// Defensive patch for Leaflet bug (issues #3689, #6857) where _onZoomTransitionEnd or _getMapPanePos
// is invoked during or after unmount when map._mapPane has already been removed/deleted,
// causing: TypeError: Cannot read properties of undefined (reading '_leaflet_pos')
if (typeof window !== "undefined" && L && L.Map) {
  const mapProto = L.Map.prototype as any;
  if (!mapProto._nerPatched) {
    mapProto._nerPatched = true;

    const origGetMapPanePos = mapProto._getMapPanePos;
    mapProto._getMapPanePos = function () {
      if (!this._mapPane) {
        return new L.Point(0, 0);
      }
      try {
        return origGetMapPanePos.call(this);
      } catch {
        return new L.Point(0, 0);
      }
    };

    const origOnZoomTransitionEnd = mapProto._onZoomTransitionEnd;
    mapProto._onZoomTransitionEnd = function () {
      if (!this._mapPane) {
        this._animatingZoom = false;
        return;
      }
      try {
        origOnZoomTransitionEnd.call(this);
      } catch {
        this._animatingZoom = false;
      }
    };

    if (L.DomUtil && L.DomUtil.getPosition) {
      const origGetPosition = L.DomUtil.getPosition;
      L.DomUtil.getPosition = function (el: HTMLElement) {
        if (!el) return new L.Point(0, 0);
        try {
          return origGetPosition(el);
        } catch {
          return (el as any)?._leaflet_pos || new L.Point(0, 0);
        }
      };
    }
  }
}

export default function LeafletMapCanvas({
  districts,
  slopeUnits,
  roads,
  roadChainages,
  villages,
  assets,
  landslideEvents,
  visibleLayers,
  selectedDistrictId = "",
  selectedEntity,
  onSelectEntity,
  queryMode,
  nearbyCenter,
  nearbyRadiusMeters,
  onMapClick,
  className = "",
  errorMessage = null,
  isLoading = false,
  onRetry,
}: LeafletMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{ [key: string]: L.LayerGroup }>({});
  const nearbyCircleRef = useRef<L.Circle | null>(null);
  const [basemapError, setBasemapError] = useState(false);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const onSelectEntityRef = useRef(onSelectEntity);
  useEffect(() => {
    onSelectEntityRef.current = onSelectEntity;
  }, [onSelectEntity]);

  const basemapConfig = getBasemapConfig();

  // 1. Initialize Map on Mount (Centered on North East Region)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Center around Northeast India (spanning Assam, Mizoram, Meghalaya, Arunachal, etc.)
    const map = L.map(containerRef.current, {
      center: [25.5, 93.0],
      zoom: 7,
      zoomControl: false,
    });

    // Zoom control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Operational basemap layer resolved from authoritative configuration
    const tileLayerOptions: L.TileLayerOptions = {
      attribution: basemapConfig.attribution,
      maxZoom: basemapConfig.maxZoom,
      subdomains: basemapConfig.subdomains ?? "abc",
    };
    if (basemapConfig.className) {
      tileLayerOptions.className = basemapConfig.className;
    }

    const tileLayer = L.tileLayer(basemapConfig.url, tileLayerOptions).addTo(map);

    tileLayer.on("tileerror", () => {
      setBasemapError(true);
    });
    tileLayer.on("load", () => {
      setBasemapError(false);
    });

    // Initialize layer groups
    const groups: { [key: string]: L.LayerGroup } = {
      districts: L.layerGroup().addTo(map),
      slope_units: L.layerGroup().addTo(map),
      roads: L.layerGroup().addTo(map),
      road_chainages: L.layerGroup().addTo(map),
      villages: L.layerGroup().addTo(map),
      assets: L.layerGroup().addTo(map),
      landslide_events: L.layerGroup().addTo(map),
      insar_deformation: L.layerGroup().addTo(map),
      consequences: L.layerGroup().addTo(map),
    };
    layerGroupsRef.current = groups;
    mapRef.current = map;

    // Handle Map Click for spatial querying
    map.on("click", (e: L.LeafletMouseEvent) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      try {
        map.stop();
        (map as any)._animatingZoom = false;
        map.remove();
      } catch {
        // Prevent crashes on unmount
      }
      mapRef.current = null;
    };
  }, [
    basemapConfig.url,
    basemapConfig.attribution,
    basemapConfig.maxZoom,
    basemapConfig.subdomains,
    basemapConfig.className,
  ]);

  // Dynamic Viewport Adjustment: Pan & Zoom to Selected District or Full North East Region
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._mapPane) return;

    if (selectedDistrictId) {
      const targetDistrict = districts.find(
        (d) => d.id === selectedDistrictId || d.code === selectedDistrictId
      );
      if (targetDistrict?.geometry) {
        try {
          const geoLayer = L.geoJSON(targetDistrict.geometry as GeoJSON.GeoJsonObject);
          const bounds = geoLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [45, 45],
              maxZoom: 12,
              animate: true,
              duration: 1.0,
            });
            return;
          }
        } catch {
          // fallback
        }
      }
    } else {
      // Default: Overview of North East Region (NER)
      try {
        const nerBounds = L.latLngBounds([21.8, 88.0], [29.5, 97.5]);
        map.fitBounds(nerBounds, {
          padding: [25, 25],
          animate: true,
          duration: 1.0,
        });
      } catch {
        // fallback
      }
    }
  }, [selectedDistrictId, districts]);

  // Dynamic Viewport Adjustment: Fly to Selected Specific Entity
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._mapPane || !selectedEntity) return;

    if (selectedEntity.type === "district") return;

    const data = selectedEntity.data;
    if (data && "geometry" in data && data.geometry) {
      try {
        const geoLayer = L.geoJSON(data.geometry as GeoJSON.GeoJsonObject);
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          if (data.geometry.type === "Point") {
            const coords = (data.geometry as GeoJSON.Point).coordinates;
            map.flyTo([coords[1], coords[0]], Math.max(map.getZoom(), 13), {
              animate: true,
              duration: 0.8,
            });
          } else {
            map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 14,
              animate: true,
              duration: 0.8,
            });
          }
        }
      } catch {
        // fallback
      }
    }
  }, [selectedEntity]);

  // 2. Handle Nearby Search Circle Overlay
  useEffect(() => {
    if (!mapRef.current) return;

    if (nearbyCircleRef.current) {
      nearbyCircleRef.current.remove();
      nearbyCircleRef.current = null;
    }

    if (queryMode === "nearby" && nearbyCenter) {
      const circle = L.circle([nearbyCenter[0], nearbyCenter[1]], {
        radius: nearbyRadiusMeters,
        color: "#38bdf8",
        fillColor: "#0284c7",
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: "4, 6",
      }).addTo(mapRef.current);
      nearbyCircleRef.current = circle;
    }
  }, [queryMode, nearbyCenter, nearbyRadiusMeters]);

  // 3. Render Districts Layer
  useEffect(() => {
    const group = layerGroupsRef.current["districts"];
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers["districts"]) return;

    districts.forEach((d) => {
      if (!d.geometry) return;
      const isSelected = selectedEntity?.type === "district" && selectedEntity.data.id === d.id;
      const layer = L.geoJSON(d.geometry as GeoJSON.GeoJsonObject, {
        style: {
          color: isSelected ? "#a855f7" : "#6366f1",
          weight: isSelected ? 3 : 2,
          dashArray: "6, 6",
          fillColor: "#6366f1",
          fillOpacity: isSelected ? 0.2 : 0.05,
        },
      });

      layer.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectEntity({ type: "district", data: d });
      });

      layer.bindTooltip(`<strong>${d.name}</strong> (${d.code})<br/><span style="font-size:11px;color:#94a3b8">${d.state_name}</span>`, {
        sticky: true,
        className: "sentinel-map-tooltip",
      });

      group.addLayer(layer);
    });
  }, [districts, visibleLayers, selectedEntity, onSelectEntity]);

  // 4. Render Slope Units Layer
  useEffect(() => {
    const group = layerGroupsRef.current["slope_units"];
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers["slope_units"]) return;

    slopeUnits.forEach((su) => {
      if (!su.geometry) return;
      const isSelected = selectedEntity?.type === "slope_unit" && selectedEntity.data.id === su.id;
      const layer = L.geoJSON(su.geometry as GeoJSON.GeoJsonObject, {
        style: {
          color: isSelected ? "#f59e0b" : "#10b981",
          weight: isSelected ? 2.5 : 1.5,
          fillColor: isSelected ? "#f59e0b" : "#10b981",
          fillOpacity: isSelected ? 0.35 : 0.15,
        },
      });

      layer.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectEntity({ type: "slope_unit", data: su });
      });

      layer.bindTooltip(`<strong>${su.code}</strong>${su.name ? ` — ${su.name}` : ""}<br/><span style="font-size:11px;color:#94a3b8">Slope Management Unit</span>`, {
        sticky: true,
        className: "sentinel-map-tooltip",
      });

      group.addLayer(layer);
    });
  }, [slopeUnits, visibleLayers, selectedEntity, onSelectEntity]);

  // 5. Render Roads Layer
  useEffect(() => {
    const group = layerGroupsRef.current["roads"];
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers["roads"]) return;

    roads.forEach((r) => {
      if (!r.geometry) return;
      const isSelected = selectedEntity?.type === "road" && selectedEntity.data.id === r.id;
      const layer = L.geoJSON(r.geometry as GeoJSON.GeoJsonObject, {
        style: {
          color: isSelected ? "#38bdf8" : "#2563eb",
          weight: isSelected ? 6 : 4,
          opacity: 0.9,
        },
      });

      layer.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectEntity({ type: "road", data: r });
      });

      layer.bindTooltip(`<strong>${r.name}</strong> [${r.road_code}]<br/><span style="font-size:11px;color:#94a3b8">${r.road_type} (${r.operational_status})</span>`, {
        sticky: true,
        className: "sentinel-map-tooltip",
      });

      group.addLayer(layer);
    });
  }, [roads, visibleLayers, selectedEntity, onSelectEntity]);

  // 6. Render Road Chainages Layer
  useEffect(() => {
    const group = layerGroupsRef.current["road_chainages"];
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers["road_chainages"]) return;

    roadChainages.forEach((ch) => {
      if (!ch.geometry || !ch.geometry.coordinates) return;
      const [lng, lat] = ch.geometry.coordinates;
      const isSelected = selectedEntity?.type === "road_chainage" && selectedEntity.data.id === ch.id;

      const icon = L.divIcon({
        className: "custom-chainage-marker",
        html: `
          <div style="
            width: ${isSelected ? "20px" : "16px"};
            height: ${isSelected ? "20px" : "16px"};
            background-color: #06b6d4;
            border: 2px solid ${isSelected ? "#ffffff" : "#083344"};
            border-radius: 50%;
            box-shadow: 0 0 6px rgba(6,182,212,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #083344;
            font-size: 9px;
            font-weight: 700;
          ">
            KM
          </div>
        `,
        iconSize: isSelected ? [20, 20] : [16, 16],
        iconAnchor: isSelected ? [10, 10] : [8, 8],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectEntity({ type: "road_chainage", data: ch });
      });

      marker.bindTooltip(`<strong>Chainage: ${ch.chainage_km} km</strong><br/><span style="font-size:11px;color:#94a3b8">Road: ${ch.road_id}</span>`, {
        sticky: true,
        className: "sentinel-map-tooltip",
      });

      group.addLayer(marker);
    });
  }, [roadChainages, visibleLayers, selectedEntity, onSelectEntity]);

  // 7. Render Villages Layer
  useEffect(() => {
    const group = layerGroupsRef.current["villages"];
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers["villages"]) return;

    villages.forEach((v) => {
      if (!v.geometry || !("coordinates" in v.geometry)) return;
      const coords = v.geometry.coordinates;
      if (!Array.isArray(coords) || typeof coords[0] !== "number") return;
      const [lng, lat] = coords as [number, number];
      const isSelected = selectedEntity?.type === "village" && selectedEntity.data.id === v.id;

      const icon = L.divIcon({
        className: "custom-village-marker",
        html: `
          <div style="
            width: ${isSelected ? "22px" : "18px"};
            height: ${isSelected ? "22px" : "18px"};
            background-color: #f59e0b;
            border: 2px solid ${isSelected ? "#ffffff" : "#451a03"};
            border-radius: 4px;
            box-shadow: 0 0 8px rgba(245,158,11,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
          ">
            🏠
          </div>
        `,
        iconSize: isSelected ? [22, 22] : [18, 18],
        iconAnchor: isSelected ? [11, 11] : [9, 9],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectEntity({ type: "village", data: v });
      });

      marker.bindTooltip(`<strong>${v.name}</strong><br/><span style="font-size:11px;color:#94a3b8">Status: ${v.status} | Pop: ${v.population ?? "Unknown"}</span>`, {
        sticky: true,
        className: "sentinel-map-tooltip",
      });

      group.addLayer(marker);
    });
  }, [villages, visibleLayers, selectedEntity, onSelectEntity]);

  // 8. Render Assets Layer
  useEffect(() => {
    const group = layerGroupsRef.current["assets"];
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers["assets"]) return;

    assets.forEach((a) => {
      if (!a.geometry || !("coordinates" in a.geometry)) return;
      const coords = a.geometry.coordinates;
      if (!Array.isArray(coords) || typeof coords[0] !== "number") return;
      const [lng, lat] = coords as [number, number];
      const isSelected = selectedEntity?.type === "asset" && selectedEntity.data.id === a.id;

      const icon = L.divIcon({
        className: "custom-asset-marker",
        html: `
          <div style="
            width: ${isSelected ? "24px" : "20px"};
            height: ${isSelected ? "24px" : "20px"};
            background-color: #8b5cf6;
            border: 2px solid ${isSelected ? "#ffffff" : "#2e1065"};
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(139,92,246,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: white;
          ">
            🏥
          </div>
        `,
        iconSize: isSelected ? [24, 24] : [20, 20],
        iconAnchor: isSelected ? [12, 12] : [10, 10],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectEntity({ type: "asset", data: a });
      });

      marker.bindTooltip(`<strong>${a.name}</strong><br/><span style="font-size:11px;color:#94a3b8">${a.asset_type} (${a.operational_status})</span>`, {
        sticky: true,
        className: "sentinel-map-tooltip",
      });

      group.addLayer(marker);
    });
  }, [assets, visibleLayers, selectedEntity, onSelectEntity]);

  // 9. Render Landslide Events Layer
  useEffect(() => {
    const group = layerGroupsRef.current["landslide_events"];
    if (!group) return;
    group.clearLayers();

    if (!visibleLayers["landslide_events"]) return;

    landslideEvents.forEach((ev) => {
      if (!ev.geometry || !("coordinates" in ev.geometry)) return;
      const coords = ev.geometry.coordinates;
      if (!Array.isArray(coords) || typeof coords[0] !== "number") return;
      const [lng, lat] = coords as [number, number];
      const isSelected = selectedEntity?.type === "landslide_event" && selectedEntity.data.id === ev.id;

      const icon = L.divIcon({
        className: "custom-landslide-marker",
        html: `
          <div style="
            width: ${isSelected ? "24px" : "18px"};
            height: ${isSelected ? "24px" : "18px"};
            background-color: #f97316;
            border: 2px solid ${isSelected ? "#ffffff" : "#431407"};
            transform: rotate(45deg);
            box-shadow: 0 0 8px rgba(249,115,22,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="transform: rotate(-45deg); font-size: 10px; font-weight: bold; color: white;">!</span>
          </div>
        `,
        iconSize: isSelected ? [24, 24] : [18, 18],
        iconAnchor: isSelected ? [12, 12] : [9, 9],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectEntity({ type: "landslide_event", data: ev });
      });

      marker.bindTooltip(`<strong>${ev.event_reference}</strong><br/><span style="font-size:11px;color:#94a3b8">Source: ${ev.source} | Status: ${ev.status}</span><br/><span style="font-size:10px;color:#cbd5e1">Historical Occurrence</span>`, {
        sticky: true,
        className: "sentinel-map-tooltip",
      });

      group.addLayer(marker);
    });
  }, [landslideEvents, visibleLayers, selectedEntity, onSelectEntity]);

  return (
    <div className={`relative w-full h-full min-h-[480px] bg-slate-100 dark:bg-sentinel-950 ${className}`}>
      <div
        ref={containerRef}
        id="leaflet-map-container"
        data-testid="leaflet-map-canvas"
        role="region"
        aria-label="Sentinel NER Operational Spatial Map"
        className="w-full h-full z-0 outline-none"
      />
      {queryMode !== "view" && (
        <div className="absolute top-3 left-3 z-[400] bg-white/95 dark:bg-sentinel-900/95 border border-blue-200 dark:border-sky-500/50 rounded-md px-3 py-2 text-xs text-slate-800 dark:text-sky-200 backdrop-blur-md flex items-center gap-2 shadow-md">
          <span className="inline-block w-2 h-2 rounded-full bg-gov-blue dark:bg-sky-400 animate-pulse" />
          <span className="font-medium">
            {queryMode === "nearby"
              ? "Proximity Query: Select any location to define radius boundary."
              : "Spatial Inspection: Click terrain geometry to view attributes."}
          </span>
        </div>
      )}

      {/* Basemap Configuration Notice (Fallback from unauthenticated CARTO) */}
      {basemapConfig.fallbackNotice && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-3 right-3 z-[400] bg-white/95 dark:bg-sentinel-900/95 border border-slate-200 dark:border-sky-500/50 rounded-md px-3 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 backdrop-blur-md flex items-center gap-1.5 shadow-md max-w-sm"
        >
          <Info className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400 shrink-0" />
          <span>{basemapConfig.fallbackNotice}</span>
        </div>
      )}

      {/* Graceful Basemap Error Indicator (Operational layers remain unaffected) */}
      {basemapError && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-sentinel-900/95 border border-amber-300 dark:border-amber-500/50 rounded-md px-3 py-2 text-xs text-amber-800 dark:text-amber-200 backdrop-blur-md flex items-center gap-2 shadow-md max-w-md"
        >
          <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <span>
            Cartographic tiles unavailable. Spatial vector layers remain operational.
          </span>
        </div>
      )}

      {/* Backend Database Outage / Degraded State Overlay */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="absolute inset-0 z-[500] bg-white/80 dark:bg-sentinel-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="max-w-md bg-white dark:bg-sentinel-900 border border-amber-300 dark:border-amber-500/60 rounded-lg p-6 shadow-2xl space-y-3">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm tracking-wide">
              <AlertTriangle className="w-5 h-5" />
              <span>DATABASE UNAVAILABLE / DEGRADED</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {errorMessage}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Operational entities cannot be displayed while the authoritative database is disconnected.
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition-colors"
              >
                Retry Database Query
              </button>
            )}
          </div>
        </div>
      )}

      {/* Valid query returned 0 entities indicator */}
      {!errorMessage && !isLoading && (districts.length + slopeUnits.length + roads.length + villages.length + assets.length + landslideEvents.length === 0) && (
        <div
          role="status"
          aria-live="polite"
          className="absolute top-3 right-3 z-[400] bg-white/95 dark:bg-sentinel-900/90 border border-slate-200 dark:border-sentinel-700 rounded-md px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 backdrop-blur-md flex items-center gap-2 shadow-md"
        >
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>No entities found matching query criteria (0 records).</span>
        </div>
      )}
    </div>
  );
}
