"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  AlertCircle,
  RefreshCw,
  Shield,
  Layers,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import {
  District,
  SlopeUnit,
  Road,
  RoadChainage,
  Village,
  Asset,
  LandslideEvent,
  fetchDistricts,
  fetchSlopeUnits,
  fetchRoads,
  fetchRoadChainages,
  fetchVillages,
  fetchAssets,
  fetchLandslideEvents,
  fetchSpatialNearby,
  fetchSpatialPointInGeometry,
} from "@/lib/domain";
import MapLayerControl from "@/components/map/MapLayerControl";
import MapFilterBar from "@/components/map/MapFilterBar";
import EntityDetailDrawer from "@/components/map/EntityDetailDrawer";
import AccessibleEntityList from "@/components/map/AccessibleEntityList";
import { SelectedEntity } from "@/components/map/LeafletMapCanvas";

// Dynamically import Leaflet map to prevent SSR window errors
const LeafletMapCanvas = dynamic(
  () => import("@/components/map/LeafletMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] bg-white dark:bg-sentinel-900 flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 gap-3 border border-slate-200 dark:border-sentinel-800 rounded-lg shadow-sm">
        <RefreshCw className="w-6 h-6 animate-spin text-gov-blue dark:text-sky-400" />
        <span className="text-xs font-medium">Loading geospatial layers...</span>
      </div>
    ),
  }
);

export default function OperationalMapPage() {
  const { user } = useAuthStore();

  // Spatial data state
  const [districts, setDistricts] = useState<District[]>([]);
  const [slopeUnits, setSlopeUnits] = useState<SlopeUnit[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [roadChainages, setRoadChainages] = useState<RoadChainage[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [landslideEvents, setLandslideEvents] = useState<LandslideEvent[]>([]);

  // UI state
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    districts: true,
    slope_units: true,
    roads: true,
    road_chainages: true,
    villages: true,
    assets: true,
    landslide_events: true,
    insar_deformation: true,
    consequences: true,
  });

  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [queryMode, setQueryMode] = useState<"view" | "nearby" | "point">("view");
  const [nearbyCenter, setNearbyCenter] = useState<[number, number] | null>(null);
  const [nearbyRadiusMeters, setNearbyRadiusMeters] = useState<number>(5000);
  const [activeView, setActiveView] = useState<"map" | "list">("map");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load Domain Entities from Stage 3 API
  const loadDomainData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const distParams = selectedDistrictId ? { district_id: selectedDistrictId } : {};

      const [
        dRes,
        suRes,
        rRes,
        rcRes,
        vRes,
        aRes,
        leRes,
      ] = await Promise.allSettled([
        fetchDistricts({ limit: 100 }),
        fetchSlopeUnits(distParams),
        fetchRoads(distParams),
        fetchRoadChainages(distParams),
        fetchVillages(distParams),
        fetchAssets(distParams),
        fetchLandslideEvents(distParams),
      ]);

      const districtsData = dRes.status === "fulfilled" ? dRes.value.items || [] : [];
      const slopeUnitsData = suRes.status === "fulfilled" ? suRes.value.items || [] : [];
      const roadsData = rRes.status === "fulfilled" ? rRes.value.items || [] : [];
      const roadChainagesData = rcRes.status === "fulfilled" ? rcRes.value.items || [] : [];
      const villagesData = vRes.status === "fulfilled" ? vRes.value.items || [] : [];
      const assetsData = aRes.status === "fulfilled" ? aRes.value.items || [] : [];
      const landslideEventsData = leRes.status === "fulfilled" ? leRes.value.items || [] : [];

      setDistricts(districtsData);
      setSlopeUnits(slopeUnitsData);
      setRoads(roadsData);
      setRoadChainages(roadChainagesData);
      setVillages(villagesData);
      setAssets(assetsData);
      setLandslideEvents(landslideEventsData);

      const allFailed = [dRes, suRes, rRes, rcRes, vRes, aRes, leRes].every((r) => r.status === "rejected");
      if (allFailed) {
        const firstError = [dRes, suRes, rRes, rcRes, vRes, aRes, leRes].find((r) => r.status === "rejected") as PromiseRejectedResult;
        setError(firstError?.reason?.message || "Unable to reach the Sentinel NER API.");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load spatial data from authoritative backend.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDistrictId]);

  useEffect(() => {
    loadDomainData();
  }, [loadDomainData]);

  // Handle Layer Toggle
  const handleToggleLayer = (layerId: string) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  // Handle Map Click based on query mode
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (queryMode === "nearby") {
      setNearbyCenter([lat, lng]);
      try {
        const nearbyRes = await fetchSpatialNearby({
          lon: lng,
          lat,
          radius_meters: nearbyRadiusMeters,
        });

        // If specific entities returned, we can highlight them
        if (nearbyRes.items && nearbyRes.items.length > 0) {
          const first = nearbyRes.items[0];
          // Optionally select nearest entity
          if (first.id) {
            setSelectedEntity({
              type: "asset",
              data: first as unknown as Asset,
            });
          }
        }
      } catch {
        // Handled silently for smooth UX
      }
    } else if (queryMode === "point") {
      try {
        const pointRes = await fetchSpatialPointInGeometry({
          lon: lng,
          lat,
        });
        if (pointRes.slope_units && pointRes.slope_units.length > 0) {
          setSelectedEntity({
            type: "slope_unit",
            data: pointRes.slope_units[0],
          });
        } else if (pointRes.districts && pointRes.districts.length > 0) {
          setSelectedEntity({
            type: "district",
            data: pointRes.districts[0],
          });
        }
      } catch {
        // Handled gracefully
      }
    }
  }, [queryMode, nearbyRadiusMeters]);

  const handleSelectEntity = useCallback((entity: SelectedEntity | null) => {
    setSelectedEntity(entity);
    if (entity?.type === "district" && entity.data?.id) {
      setSelectedDistrictId(entity.data.id);
    }
  }, []);

  // RBAC Exclusion: Citizen Reporter check
  if (user && user.role === "CITIZEN_REPORTER") {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-12">
        <div className="bg-white dark:bg-sentinel-900 border border-amber-300 dark:border-amber-500/50 rounded-lg p-6 text-center shadow-sm dark:shadow-xl">
          <Shield className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
            OPERATIONAL SPATIAL MAP RESTRICTED
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
            The operational geospatial command map is restricted to emergency management authorities, infrastructure agencies, and field officers. Citizen hazard reporting is managed through the Community portal.
          </p>
          <div className="mt-4 inline-block px-3 py-1 bg-amber-50 dark:bg-sentinel-950 border border-amber-200 dark:border-sentinel-800 rounded text-xs font-medium text-amber-800 dark:text-amber-300">
            Access Level: Emergency Authority Personnel Only
          </div>
        </div>
      </div>
    );
  }

  // Count calculations
  const layerCounts: Record<string, number> = {
    districts: districts.length,
    slope_units: slopeUnits.length,
    roads: roads.length,
    road_chainages: roadChainages.length,
    villages: villages.length,
    assets: assets.length,
    landslide_events: landslideEvents.length,
    insar_deformation: 0,
    consequences: 0,
  };

  const totalVisibleEntities = Object.entries(layerCounts).reduce(
    (acc, [k, v]) => (visibleLayers[k] ? acc + v : acc),
    0
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-sentinel-800">
        <div>
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-gov-blue dark:text-sky-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Operational Geospatial Map
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-sky-950 border border-blue-200 dark:border-sky-800 text-gov-blue dark:text-sky-300">
              Live Spatial Layers
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Authoritative spatial exploration across administrative boundaries, lifeline infrastructure, and historical landslide occurrences.
          </p>
        </div>

        {/* Spatial Coordinate System */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tabular-nums">CRS: WGS 84 / EPSG:4326</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <MapFilterBar
        districts={districts}
        selectedDistrictId={selectedDistrictId}
        onSelectDistrict={setSelectedDistrictId}
        queryMode={queryMode}
        onChangeQueryMode={setQueryMode}
        nearbyRadiusMeters={nearbyRadiusMeters}
        onChangeNearbyRadius={setNearbyRadiusMeters}
        activeView={activeView}
        onChangeView={setActiveView}
        onResetView={() => {
          setSelectedDistrictId("");
          setSelectedEntity(null);
          setNearbyCenter(null);
          setQueryMode("view");
        }}
        totalVisibleEntities={totalVisibleEntities}
      />

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadDomainData}
            className="px-2.5 py-1 bg-red-900 hover:bg-red-800 text-white rounded text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Workspace: Spatial Canvas or Accessible Entity List */}
      {activeView === "map" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 relative">
          {/* Left Column: Layer Controls */}
          <div className="lg:col-span-1 space-y-3">
            <MapLayerControl
              visibleLayers={visibleLayers}
              onToggleLayer={handleToggleLayer}
              counts={layerCounts}
            />
          </div>

          {/* Center Column: Map Canvas */}
          <div className={`${selectedEntity ? "lg:col-span-2" : "lg:col-span-3"} h-[380px] sm:h-[460px] lg:h-[540px] rounded-lg overflow-hidden border border-slate-200 dark:border-sentinel-800 shadow-sm dark:shadow-2xl bg-white dark:bg-sentinel-950 relative`}>
            <LeafletMapCanvas
              districts={districts}
              slopeUnits={slopeUnits}
              roads={roads}
              roadChainages={roadChainages}
              villages={villages}
              assets={assets}
              landslideEvents={landslideEvents}
              visibleLayers={visibleLayers}
              selectedDistrictId={selectedDistrictId}
              selectedEntity={selectedEntity}
              onSelectEntity={handleSelectEntity}
              queryMode={queryMode}
              nearbyCenter={nearbyCenter}
              nearbyRadiusMeters={nearbyRadiusMeters}
              onMapClick={handleMapClick}
              className="w-full h-full"
              errorMessage={error}
              isLoading={isLoading}
              onRetry={loadDomainData}
            />
          </div>

          {/* Right Column: Entity Detail Drawer (if selected) */}
          {selectedEntity && (
            <div className="lg:col-span-1 h-[420px] lg:h-[540px] flex">
              <EntityDetailDrawer
                selectedEntity={selectedEntity}
                onClose={() => setSelectedEntity(null)}
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      ) : (
        /* Accessible Dual Mode: Tabular List */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={selectedEntity ? "lg:col-span-2" : "lg:col-span-3"}>
            <AccessibleEntityList
              districts={districts}
              slopeUnits={slopeUnits}
              roads={roads}
              roadChainages={roadChainages}
              villages={villages}
              assets={assets}
              landslideEvents={landslideEvents}
              visibleLayers={visibleLayers}
              selectedEntity={selectedEntity}
              onSelectEntity={handleSelectEntity}
            />
          </div>

          {/* Detail Drawer in List View */}
          {selectedEntity && (
            <div className="lg:col-span-1">
              <EntityDetailDrawer
                selectedEntity={selectedEntity}
                onClose={() => setSelectedEntity(null)}
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
