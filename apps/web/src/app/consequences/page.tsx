"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/auth";
import { formatDateSafe, formatDateTimeSafe, formatNumberSafe } from "@/lib/formatters";
import {
  ConsequenceRelationship,
  ConsequenceRun,
  ConsequenceSummary,
  NON_AUTONOMOUS_DISCLAIMER,
  ROAD_EXPOSURE_TERMINOLOGY,
  ASSET_EXPOSURE_TERMINOLOGY,
  VILLAGE_EXPOSURE_TERMINOLOGY,
  CHAINAGE_DATA_UNAVAILABLE_CODE,
  RISK_DATA_UNAVAILABLE_CODE,
  fetchConsequenceRelationships,
  fetchConsequenceSummary,
  triggerConsequenceRun,
} from "@/lib/consequence";
import { NER_STATE_GROUPS } from "@/lib/domain";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Filter,
  Layers,
  Milestone,
  Navigation,
  Play,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  X,
} from "lucide-react";

const FALLBACK_CONSEQUENCE_FIXTURES: ConsequenceRelationship[] = [
  {
    id: "rel-demo-road-01",
    source_type: "SLOPE_UNIT",
    source_id: "su-aizawl-101",
    source_name: "SU-AIZ-101",
    target_type: "ROAD",
    target_id: "road-nh54-aizawl",
    target_name: "National Highway 54",
    target_code: "NH-54",
    relationship_type: "TRANSPORT_CORRIDOR_EXPOSURE",
    spatial_relation: "INTERSECTS",
    distance_meters: 0.0,
    intersection_ratio: 1.0,
    exposure_basis:
      "Road NH-54 (National Highway 54) is POTENTIALLY AFFECTED / SPATIALLY EXPOSED: " +
      "Spatial relation 'INTERSECTS' with Slope Unit SU-AIZ-101 at 0.0m distance. " +
      "Chainage KM 12.5 identified in exposure zone. Stage 5 Risk: HIGH.",
    evidence_ids: ["su-aizawl-101", "road-nh54-aizawl", "pred-demo-01", "insar-demo-01"],
    risk_prediction_id: "pred-demo-01",
    risk_level: "HIGH",
    satellite_observation_id: "insar-demo-01",
    insar_deformation_mm_yr: -28.4,
    criticality: "UNKNOWN",
    confidence: "HIGH",
    uncertainty: "LOW",
    assumptions: [
      "Proximity buffer threshold of 250m applied.",
      "Terrain elevation difference not modeled; spatial exposure reflects 2D buffer.",
      ROAD_EXPOSURE_TERMINOLOGY,
    ],
    organization_id: "org-bro-pushpak",
    authority_name: "Border Roads Organisation",
    chainage_km: 12.5,
    chainage_status: "KM_12.5",
    district_id: "dst-aizawl",
    state_code: "MZ",
    generated_at: "2026-09-04T12:00:00Z",
    valid_from: "2026-09-04T12:00:00Z",
    algorithm_version: "sentinel-consequence-v1.0.0",
    status: "ACTIVE",
    metadata: { operational_status: "OPERATIONAL" },
    is_demo_fixture: true,
  },
  {
    id: "rel-demo-asset-02",
    source_type: "SLOPE_UNIT",
    source_id: "su-aizawl-101",
    source_name: "SU-AIZ-101",
    target_type: "ASSET",
    target_id: "ast-tuirial-bridge",
    target_name: "Tuirial Major Bridge No. 4",
    target_code: "BRIDGE",
    relationship_type: "CRITICAL_INFRASTRUCTURE_EXPOSURE",
    spatial_relation: "NEARBY",
    distance_meters: 145.0,
    exposure_basis:
      "Asset 'Tuirial Major Bridge No. 4' (BRIDGE) is POTENTIALLY EXPOSED: " +
      "Spatial relation 'NEARBY' with Slope Unit SU-AIZ-101 at 145.0m. " +
      "Criticality: CRITICAL. Operational status remains OPERATIONAL.",
    evidence_ids: ["su-aizawl-101", "ast-tuirial-bridge"],
    risk_prediction_id: "pred-demo-01",
    risk_level: "HIGH",
    satellite_observation_id: "insar-demo-01",
    insar_deformation_mm_yr: -28.4,
    criticality: "CRITICAL",
    confidence: "MEDIUM",
    uncertainty: "MEDIUM",
    assumptions: [
      "Proximity buffer threshold of 300m applied.",
      "Potential spatial exposure does NOT imply physical structural failure or outage.",
      ASSET_EXPOSURE_TERMINOLOGY,
    ],
    organization_id: "org-bro-pushpak",
    authority_name: "Border Roads Organisation",
    chainage_km: undefined,
    chainage_status: CHAINAGE_DATA_UNAVAILABLE_CODE,
    district_id: "dst-aizawl",
    state_code: "MZ",
    generated_at: "2026-09-04T12:00:00Z",
    valid_from: "2026-09-04T12:00:00Z",
    algorithm_version: "sentinel-consequence-v1.0.0",
    status: "ACTIVE",
    metadata: { operational_status: "OPERATIONAL" },
    is_demo_fixture: true,
  },
  {
    id: "rel-demo-village-03",
    source_type: "SLOPE_UNIT",
    source_id: "su-aizawl-101",
    source_name: "SU-AIZ-101",
    target_type: "VILLAGE",
    target_id: "vil-durtlang",
    target_name: "Durtlang North",
    target_code: "VIL-MZ-DUR-01",
    relationship_type: "VILLAGE_PROXIMITY",
    spatial_relation: "NEARBY",
    distance_meters: 310.0,
    exposure_basis:
      "Village 'Durtlang North' (Population: 12400) is SPATIALLY EXPOSED / PROXIMITY IDENTIFIED: " +
      "Located 310.0m from Slope Unit SU-AIZ-101. " +
      "Settlement is NOT classified as unsafe; operational disaster status remains ACTIVE.",
    evidence_ids: ["su-aizawl-101", "vil-durtlang"],
    risk_prediction_id: "pred-demo-01",
    risk_level: "HIGH",
    criticality: "UNKNOWN",
    confidence: "MEDIUM",
    uncertainty: "MEDIUM",
    assumptions: [
      "Proximity buffer threshold of 500m applied.",
      "Proximity denotes spatial geographic relationship only; no evacuation order is inferred or issued.",
      VILLAGE_EXPOSURE_TERMINOLOGY,
    ],
    chainage_status: CHAINAGE_DATA_UNAVAILABLE_CODE,
    district_id: "dst-aizawl",
    state_code: "MZ",
    generated_at: "2026-09-04T12:00:00Z",
    valid_from: "2026-09-04T12:00:00Z",
    algorithm_version: "sentinel-consequence-v1.0.0",
    status: "ACTIVE",
    metadata: { population: 12400 },
    is_demo_fixture: true,
  },
];

export default function ConsequenceCommandCenter() {
  const { accessToken } = useAuthStore();

  const isProduction = process.env.NODE_ENV === "production";
  const [relationships, setRelationships] = useState<ConsequenceRelationship[]>(
    isProduction ? [] : FALLBACK_CONSEQUENCE_FIXTURES
  );
  const [summary, setSummary] = useState<ConsequenceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [selectedDistrict, setSelectedDistrict] = useState("dst-aizawl");
  const [targetTypeFilter, setTargetTypeFilter] = useState("ALL");
  const [criticalityFilter, setCriticalityFilter] = useState("ALL");
  const [relationFilter, setRelationFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Drawer / Inspection State
  const [selectedRel, setSelectedRel] = useState<ConsequenceRelationship | null>(null);

  // Run Dispatch Modal State
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runDistrict, setRunDistrict] = useState("dst-aizawl");
  const [runDistanceThreshold, setRunDistanceThreshold] = useState(300);
  const [runDispatching, setRunDispatching] = useState(false);
  const [runSuccess, setRunSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const authToken = accessToken || "";
      const relData = await fetchConsequenceRelationships(authToken, {
        district_id: selectedDistrict,
        limit: 100,
      });
      if (relData && relData.items) {
        setRelationships(relData.items);
      }

      const sumData = await fetchConsequenceSummary(authToken, selectedDistrict);
      if (sumData) {
        setSummary(sumData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === "production") {
        setRelationships([]);
        setError("Unable to load operational consequence relationships from authoritative API.");
      } else {
        console.warn("Failed to load consequence data from API; retaining development demo fixtures.", msg);
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, selectedDistrict]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTriggerRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunDispatching(true);
    setRunSuccess(null);
    setError(null);
    try {
      const authToken = accessToken || "";
      const runRes = await triggerConsequenceRun(authToken, {
        district_id: runDistrict,
        distance_threshold_m: runDistanceThreshold,
        include_satellite_evidence: true,
        include_risk_predictions: true,
      });
      setRunSuccess(`Run ${runRes.id} completed. Generated ${runRes.relationship_count} consequence relationships.`);
      setTimeout(() => {
        setIsRunModalOpen(false);
        setRunSuccess(null);
        loadData();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Run trigger failed: ${msg}`);
    } finally {
      setRunDispatching(false);
    }
  };

  // Filtered Items
  const filteredRels = relationships.filter((rel) => {
    if (targetTypeFilter !== "ALL" && rel.target_type !== targetTypeFilter) return false;
    if (criticalityFilter !== "ALL" && rel.criticality !== criticalityFilter) return false;
    if (relationFilter !== "ALL" && rel.spatial_relation !== relationFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchSource = rel.source_name?.toLowerCase().includes(term) || rel.source_id.toLowerCase().includes(term);
      const matchTarget =
        rel.target_name?.toLowerCase().includes(term) ||
        rel.target_code?.toLowerCase().includes(term) ||
        rel.target_id.toLowerCase().includes(term);
      if (!matchSource && !matchTarget) return false;
    }
    return true;
  });

  const affectedRoadsCount = summary?.potentially_affected_roads_count ?? new Set(relationships.filter((r) => r.target_type === "ROAD").map((r) => r.target_id)).size;
  const linkedChainagesCount = summary?.linked_chainages_count ?? relationships.filter((r) => r.chainage_km != null).length;
  const criticalAssetsCount = summary?.critical_assets_count ?? relationships.filter((r) => r.target_type === "ASSET" && (r.criticality === "HIGH" || r.criticality === "CRITICAL")).length;
  const villagesCount = summary?.nearby_villages_count ?? new Set(relationships.filter((r) => r.target_type === "VILLAGE").map((r) => r.target_id)).size;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-sentinel-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Road &amp; Asset Consequence Intelligence
              </h1>
              <p className="sr-only">
                Stage 7 — Operational Lifeline Exposure &amp; Spatial Relationship Analysis
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 dark:border-sentinel-700 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRunModalOpen(true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Trigger Analysis Run</span>
          </button>
        </div>
      </div>

      {/* Mandatory Operational Boundary Disclaimer (Visually hidden per operator directive) */}
      <div className="sr-only" role="alert">
        <p className="font-bold">
          STAGE 7 NON-AUTONOMOUS OPERATIONAL BOUNDARY NOTICE
        </p>
        <p>{NON_AUTONOMOUS_DISCLAIMER}</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3 sm:p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Potentially Affected Roads</span>
            <Navigation className="w-4 h-4 text-gov-blue dark:text-sky-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{affectedRoadsCount}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Spatially exposed corridors</p>
        </div>

        <div className="bg-white dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3 sm:p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Linked Road Chainages</span>
            <Milestone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{linkedChainagesCount}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">KM marker posts correlated</p>
        </div>

        <div className="bg-white dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3 sm:p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Critical Assets Exposed</span>
            <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{criticalAssetsCount}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">High &amp; Critical facilities</p>
        </div>

        <div className="bg-white dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3 sm:p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Nearby Habitations</span>
            <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{villagesCount}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Villages in proximity zone</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-sentinel-900/40 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search road, asset, village, or slope unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* District Selector */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500"
              aria-label="Filter by district"
            >
              {NER_STATE_GROUPS.map((group) => (
                <optgroup key={group.stateCode} label={group.stateName}>
                  {group.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Target Type Filter */}
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500"
              aria-label="Filter by target type"
            >
              <option value="ALL">All Infrastructure Types</option>
              <option value="ROAD">Roads</option>
              <option value="ASSET">Assets &amp; Facilities</option>
              <option value="VILLAGE">Villages</option>
            </select>

            {/* Spatial Relation Filter */}
            <select
              value={relationFilter}
              onChange={(e) => setRelationFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500"
              aria-label="Filter by spatial relation"
            >
              <option value="ALL">All Spatial Relations</option>
              <option value="INTERSECTS">Intersects (0m)</option>
              <option value="NEARBY">Nearby Proximity</option>
              <option value="WITHIN">Within</option>
              <option value="OVERLAPS">Overlaps</option>
            </select>

            {/* Criticality Filter */}
            <select
              value={criticalityFilter}
              onChange={(e) => setCriticalityFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500"
              aria-label="Filter by criticality"
            >
              <option value="ALL">All Criticality Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MODERATE">Moderate</option>
              <option value="LOW">Low</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-sentinel-800 bg-slate-50 dark:bg-sentinel-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            CONSEQUENCE RELATIONSHIPS ({filteredRels.length})
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Deterministic Spatial Exposure Graph</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300" aria-label="Consequence Relationships Table">
            <thead className="bg-slate-50 dark:bg-sentinel-900/80 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-sentinel-800 whitespace-nowrap">
              <tr>
                <th className="px-3.5 py-2.5">Source (Hazard)</th>
                <th className="px-3.5 py-2.5">Target (Infrastructure)</th>
                <th className="px-3.5 py-2.5">Category</th>
                <th className="px-3.5 py-2.5">Spatial Relation</th>
                <th className="px-3.5 py-2.5">Distance</th>
                <th className="px-3.5 py-2.5">Chainage / Details</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-sentinel-800/60 whitespace-nowrap">
              {filteredRels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Shield className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-1" />
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                        {relationships.length === 0
                          ? "No operational consequence relationships available."
                          : "No consequence relationships matching configured filters."}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                        {relationships.length === 0
                          ? "No operational consequence relationships have been computed or published for this district scope in the authoritative registry."
                          : "Adjust your filter criteria (Infrastructure Type, Spatial Relation, or Criticality) to view relationships."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRels.map((rel) => {
                  const isIntersects = rel.spatial_relation === "INTERSECTS";

                  return (
                    <tr
                      key={rel.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-sentinel-900/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedRel(rel)}
                    >
                      {/* Source */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{rel.source_name || rel.source_id}</span>
                          {rel.is_demo_fixture && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              DEMO / TEST DATA
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{rel.source_type}</div>
                      </td>

                      {/* Target */}
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{rel.target_name || rel.target_code || rel.target_id}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                          <span>{rel.target_type}</span>
                          {rel.authority_name && (
                            <>
                              <span>•</span>
                              <span>{rel.authority_name}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            rel.relationship_type.includes("CRITICAL") || rel.relationship_type.includes("TRANSPORT")
                              ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                              : rel.relationship_type.includes("ROAD")
                              ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                              : "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {rel.relationship_type.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Spatial Relation */}
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isIntersects
                              ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                              : "bg-slate-100 dark:bg-sentinel-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-sentinel-700"
                          }`}
                        >
                          {rel.spatial_relation}
                        </span>
                      </td>

                      {/* Distance */}
                      <td className="px-3.5 py-2.5 font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        {rel.distance_meters != null ? `${rel.distance_meters.toFixed(1)} m` : "0.0 m"}
                      </td>

                      {/* Chainage / Details */}
                      <td className="px-3.5 py-2.5">
                        {rel.chainage_km != null ? (
                          <span className="text-gov-blue dark:text-sky-300 font-bold tabular-nums">KM {rel.chainage_km.toFixed(1)}</span>
                        ) : rel.target_type === "ROAD" ? (
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">{rel.chainage_status || "UNAVAILABLE"}</span>
                        ) : rel.target_type === "ASSET" ? (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold ${
                              rel.criticality === "CRITICAL"
                                ? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                : rel.criticality === "HIGH"
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                : "bg-slate-100 dark:bg-sentinel-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            Criticality: {rel.criticality}
                          </span>
                        ) : rel.target_type === "VILLAGE" ? (
                          <span className="text-slate-600 dark:text-slate-400 text-xs font-medium" suppressHydrationWarning>
                            Pop: {rel.metadata?.population ? formatNumberSafe(rel.metadata.population as number) : "N/A"}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRel(rel);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-700 text-gov-blue dark:text-sky-400 text-xs font-semibold rounded-lg transition-all shadow-2xs inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Detail Drawer */}
      {selectedRel && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs z-50 flex justify-end" data-testid="consequence-drawer">
          <div className="w-full max-w-xl bg-white dark:bg-sentinel-950 border-l border-slate-200 dark:border-sentinel-800 p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-sentinel-800 pb-4">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
                  {selectedRel.relationship_type.replace(/_/g, " ")}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedRel.target_name || selectedRel.target_id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRel(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-sentinel-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                aria-label="Close detail drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Demo Provenance Warning Banner */}
            {selectedRel.is_demo_fixture && (
              <div
                className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 flex items-start gap-3 shadow-xs"
                role="alert"
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 tracking-wide uppercase">
                      CLIENT DEMONSTRATION RECORD
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      DEMO / TEST DATA
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                    This consequence relationship is a development fixture containing simulated demonstration evidence (e.g. pred-demo-01, insar-demo-01) for UI verification. It does not represent authoritative operational intelligence.
                  </p>
                </div>
              </div>
            )}

            {/* Exposure Basis Narrative */}
            <div className="bg-slate-50 dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Spatial Exposure Basis</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{selectedRel.exposure_basis}</p>
            </div>

            {/* Key Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Spatial Relation</span>
                <p className="font-bold text-slate-900 dark:text-white mt-1">{selectedRel.spatial_relation}</p>
              </div>

              <div className="bg-slate-50 dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Minimum Distance</span>
                <p className="font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                  {selectedRel.distance_meters != null ? `${selectedRel.distance_meters.toFixed(1)} meters` : "0.0 meters"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Stage 5 Model Risk</span>
                <p className="font-bold text-slate-900 dark:text-white mt-1">
                  {selectedRel.risk_level && selectedRel.risk_level !== RISK_DATA_UNAVAILABLE_CODE
                    ? selectedRel.risk_level
                    : "UNAVAILABLE"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Stage 6 InSAR LOS Deform</span>
                <p className="font-bold text-fuchsia-600 dark:text-fuchsia-400 tabular-nums mt-1">
                  {selectedRel.insar_deformation_mm_yr != null
                    ? `${selectedRel.insar_deformation_mm_yr.toFixed(1)} mm/yr`
                    : "UNAVAILABLE"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Road Chainage Marker</span>
                <p className="font-bold text-gov-blue dark:text-sky-300 tabular-nums mt-1">
                  {selectedRel.chainage_km != null ? `KM ${selectedRel.chainage_km.toFixed(1)}` : selectedRel.chainage_status || "UNAVAILABLE"}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Asset Criticality</span>
                <p className="font-bold text-slate-900 dark:text-white mt-1">{selectedRel.criticality}</p>
              </div>
            </div>

            {/* Assumptions & Methodological Lineage */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Analysis Assumptions &amp; Caveats</h4>
              <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                {((selectedRel.assumptions || (selectedRel as unknown as { assumptions_used?: string[] }).assumptions_used || [])).map((assump: string, idx: number) => (
                  <li key={idx}>{assump}</li>
                ))}
              </ul>
            </div>

            {/* Provenance & Reproducibility */}
            <div className="bg-slate-50 dark:bg-sentinel-900/40 border border-slate-200 dark:border-sentinel-800 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Algorithm Version:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">{selectedRel.algorithm_version || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Generated Timestamp:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold" suppressHydrationWarning>{selectedRel.generated_at ? formatDateTimeSafe(selectedRel.generated_at) : "N/A"}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="font-medium">Evidence Records:</span>
                <div className="text-right">
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{(selectedRel.evidence_ids || []).join(", ") || "None"}</span>
                  {selectedRel.is_demo_fixture && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-sans mt-0.5">
                      (Simulated Fixture Evidence)
                    </div>
                  )}
                </div>
              </div>
              {selectedRel.is_demo_fixture && (
                <div className="flex justify-between border-t border-slate-200 dark:border-sentinel-800 pt-2 text-amber-700 dark:text-amber-400">
                  <span className="font-medium">Provenance Status:</span>
                  <span className="font-bold">CLIENT DEMONSTRATION RECORD</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trigger Analysis Run Modal */}
      {isRunModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-700 rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-sentinel-800 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-rose-600 dark:text-rose-400 fill-current" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Execute Consequence Analysis</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRunModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/40 rounded-lg text-red-700 dark:text-red-200 text-xs">
                {error}
              </div>
            )}

            {runSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/40 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{runSuccess}</span>
              </div>
            )}

            <form onSubmit={handleTriggerRun} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">Target District Scope</label>
                <select
                  value={runDistrict}
                  onChange={(e) => setRunDistrict(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-sentinel-900 border border-slate-300 dark:border-sentinel-700 text-slate-900 dark:text-white rounded-lg p-2.5 focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500 font-medium"
                >
                  {NER_STATE_GROUPS.map((group) => (
                    <optgroup key={group.stateCode} label={group.stateName}>
                      {group.districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({group.stateName})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 dark:text-slate-300 font-semibold block">
                  Proximity Threshold: {runDistanceThreshold} meters
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={runDistanceThreshold}
                  onChange={(e) => setRunDistanceThreshold(Number(e.target.value))}
                  className="w-full accent-rose-600 bg-slate-200 dark:bg-sentinel-900"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>50 m</span>
                  <span>300 m (Default)</span>
                  <span>1000 m</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p>• Correlates Stage 3 geography (roads, chainages, assets, villages)</p>
                <p>• Correlates Stage 5 calibrated risk estimates</p>
                <p>• Correlates Stage 6 InSAR line-of-sight telemetry</p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-sentinel-800">
                <button
                  type="button"
                  onClick={() => setIsRunModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={runDispatching}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-xs"
                >
                  {runDispatching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Dispatch Run</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
