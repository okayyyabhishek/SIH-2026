"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Info,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  TrendingUp,
  BrainCircuit,
  FileCheck2,
  ChevronRight,
  X,
  Play,
  Layers,
  Database,
  Shield,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { formatTimeSafe } from "@/lib/formatters";
import {
  RiskPrediction,
  PredictionExplanation,
  RiskEvidence,
  ModelVersion,
  RiskLevel,
  fetchRiskPredictions,
  fetchPredictionExplanation,
  fetchPredictionEvidence,
  fetchModelVersions,
  triggerRiskRun,
} from "@/lib/risk";

// Demonstration fixtures for UI development and testing when backend is not actively populated.
// NEVER loaded or used in production environments.
const DEMO_PREDICTIONS: RiskPrediction[] = [
  {
    id: "risk-pred-001",
    subject_type: "SLOPE_UNIT",
    subject_id: "su-miz-aiz-001",
    geographic_scope: { type: "Polygon", coordinates: [] },
    district_id: "dist-miz-aizawl",
    state_code: "MZ",
    model_version_id: "lr-baseline-v1.0.0",
    model_run_id: "run-init-001",
    generated_at: new Date(Date.now() - 3600000).toISOString(),
    valid_from: new Date(Date.now() - 3600000).toISOString(),
    valid_until: new Date(Date.now() + 82800000).toISOString(),
    risk_value: 0.842,
    risk_scale: "FOUR_TIER_V1",
    risk_level: "VERY_HIGH",
    raw_score: 1.673,
    calibrated_probability: 0.842,
    calibration_method: "PLATT_SCALING",
    calibration_version: "platt-v1.0.0",
    uncertainty_score: 0.12,
    uncertainty_level: "LOW",
    confidence_state: "HIGH_CONFIDENCE",
    feature_snapshot_id: "snap-su-001-aiz",
    evidence_ids: ["ev-001"],
    explanation_id: "exp-001",
    data_quality_state: "VALID",
    missing_feature_count: 0,
    stale_feature_count: 0,
    status: "COMPLETED",
    is_demo_fixture: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "risk-pred-002",
    subject_type: "SLOPE_UNIT",
    subject_id: "su-miz-aiz-002",
    geographic_scope: { type: "Polygon", coordinates: [] },
    district_id: "dist-miz-aizawl",
    state_code: "MZ",
    model_version_id: "lr-baseline-v1.0.0",
    model_run_id: "run-init-001",
    generated_at: new Date(Date.now() - 3600000).toISOString(),
    valid_from: new Date(Date.now() - 3600000).toISOString(),
    valid_until: new Date(Date.now() + 82800000).toISOString(),
    risk_value: 0.584,
    risk_scale: "FOUR_TIER_V1",
    risk_level: "MODERATE",
    raw_score: 0.34,
    calibrated_probability: 0.584,
    calibration_method: "PLATT_SCALING",
    calibration_version: "platt-v1.0.0",
    uncertainty_score: 0.28,
    uncertainty_level: "MEDIUM",
    confidence_state: "MODERATE_CONFIDENCE",
    feature_snapshot_id: "snap-su-002-aiz",
    evidence_ids: ["ev-002"],
    explanation_id: "exp-002",
    data_quality_state: "PARTIAL",
    missing_feature_count: 1,
    stale_feature_count: 0,
    status: "COMPLETED",
    is_demo_fixture: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "risk-pred-003",
    subject_type: "SLOPE_UNIT",
    subject_id: "su-miz-kol-001",
    geographic_scope: { type: "Polygon", coordinates: [] },
    district_id: "dist-miz-kolasib",
    state_code: "MZ",
    model_version_id: "lr-baseline-v1.0.0",
    model_run_id: "run-init-001",
    generated_at: new Date(Date.now() - 3600000).toISOString(),
    valid_from: new Date(Date.now() - 3600000).toISOString(),
    valid_until: new Date(Date.now() + 82800000).toISOString(),
    risk_value: 0.0,
    risk_scale: "FOUR_TIER_V1",
    risk_level: "LOW",
    raw_score: 0.0,
    calibrated_probability: null,
    calibration_method: null,
    calibration_version: null,
    uncertainty_score: 1.0,
    uncertainty_level: "UNKNOWN",
    confidence_state: "DATA_INSUFFICIENT",
    feature_snapshot_id: "snap-su-003-kol",
    evidence_ids: [],
    explanation_id: null,
    data_quality_state: "DATA_INSUFFICIENT",
    missing_feature_count: 3,
    stale_feature_count: 1,
    status: "DATA_INSUFFICIENT",
    is_demo_fixture: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export default function RiskEnginePage() {
  const { user } = useAuthStore();
  const isMountedRef = useRef<boolean>(true);

  const [predictions, setPredictions] = useState<RiskPrediction[]>(
    process.env.NODE_ENV === "production" ? [] : DEMO_PREDICTIONS
  );
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<RiskPrediction | null>(null);
  const [explanation, setExplanation] = useState<PredictionExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState<boolean>(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<RiskEvidence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [runModalOpen, setRunModalOpen] = useState<boolean>(false);
  const [targetDistrict, setTargetDistrict] = useState<string>("dist-miz-aizawl");
  const [runningAssessment, setRunningAssessment] = useState<boolean>(false);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [notification, setNotification] = useState<string | null>(null);

  // Load predictions and models from API
  const loadRiskData = useCallback(async () => {
    setLoading(true);
    try {
      const [predResult, modelsResult] = await Promise.allSettled([
        fetchRiskPredictions({ limit: 100 }),
        fetchModelVersions(),
      ]);

      if (!isMountedRef.current) return;

      if (predResult.status === "fulfilled" && predResult.value.items && predResult.value.items.length > 0) {
        setPredictions(predResult.value.items);
      } else {
        // In production, NEVER use client-side demo fixtures; maintain truthful empty state
        if (process.env.NODE_ENV === "production") {
          setPredictions([]);
        } else {
          setPredictions(DEMO_PREDICTIONS);
        }
      }
      if (modelsResult.status === "fulfilled" && modelsResult.value.length > 0) {
        setModels(modelsResult.value);
      }
    } catch {
      if (!isMountedRef.current) return;
      if (process.env.NODE_ENV === "production") {
        setPredictions([]);
      } else {
        setPredictions(DEMO_PREDICTIONS);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadRiskData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadRiskData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInspecting(false);
        setRunModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Inspect explanation and evidence
  const handleInspect = async (prediction: RiskPrediction) => {
    setSelectedPrediction(prediction);
    setInspecting(true);
    setExplanationLoading(true);
    setExplanationError(null);
    setExplanation(null);
    setEvidence([]);

    try {
      const [expResult, evResult] = await Promise.allSettled([
        fetchPredictionExplanation(prediction.id),
        fetchPredictionEvidence(prediction.id),
      ]);

      if (!isMountedRef.current) return;

      if (expResult.status === "fulfilled" && expResult.value) {
        setExplanation(expResult.value);
        setExplanationError(null);
      } else {
        setExplanation(null);
        setExplanationError(
          prediction.is_demo_fixture
            ? "No backend explanation available for demonstration fixtures. Operational provenance requires an authoritative, persisted backend model run."
            : "Provenance unavailable: No backend explanation payload was returned for this prediction record."
        );
      }

      if (evResult.status === "fulfilled" && Array.isArray(evResult.value) && evResult.value.length > 0) {
        setEvidence(evResult.value);
      } else {
        setEvidence([]);
      }
    } catch {
      if (!isMountedRef.current) return;
      setExplanation(null);
      setExplanationError("Provenance unavailable: Network error or backend service unreachable.");
    } finally {
      if (isMountedRef.current) {
        setExplanationLoading(false);
      }
    }
  };

  // Trigger Scoped Risk Assessment Run
  const handleExecuteRun = async () => {
    setRunningAssessment(true);
    setNotification(null);
    try {
      const activeModel = models.find((m) => m.status === "ACTIVE") || models[0];
      const result = await triggerRiskRun({
        district_id: targetDistrict,
        model_version_id: activeModel?.id,
        subject_type: "SLOPE_UNIT",
      });
      if (isMountedRef.current) {
        setNotification(`Assessment run ${result.id} initiated successfully! Evaluated ${result.entities_evaluated} entities.`);
        setRunModalOpen(false);
      }
      await loadRiskData();
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setNotification(`Failed to run assessment: ${(err as Error).message || "Unauthorized or network failure"}`);
      }
    } finally {
      if (isMountedRef.current) {
        setRunningAssessment(false);
      }
    }
  };

  const filteredPredictions = predictions.filter((p) => {
    if (filterLevel !== "ALL" && p.risk_level !== filterLevel) return false;
    if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      return (
        p.subject_id.toLowerCase().includes(q) ||
        p.district_id.toLowerCase().includes(q) ||
        p.model_version_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getRiskBadge = (level: RiskLevel, status: string) => {
    if (status === "DATA_INSUFFICIENT") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
          <HelpCircle className="w-3 h-3 mr-1 text-slate-500 dark:text-zinc-400" />
          DATA INSUFFICIENT
        </span>
      );
    }
    switch (level) {
      case "VERY_HIGH":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-700">
            <AlertTriangle className="w-3 h-3 mr-1 text-red-600 dark:text-red-400" />
            VERY HIGH
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600 dark:text-amber-400" />
            HIGH
          </span>
        );
      case "MODERATE":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-700">
            <TrendingUp className="w-3 h-3 mr-1 text-sky-600 dark:text-sky-400" />
            MODERATE
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
            LOW
          </span>
        );
    }
  };

  const getUncertaintyBadge = (level: string) => {
    switch (level) {
      case "LOW":
        return <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">LOW (±5%)</span>;
      case "MEDIUM":
        return <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tabular-nums">MEDIUM (±15%)</span>;
      case "HIGH":
        return <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 tabular-nums">HIGH (±30%)</span>;
      case "UNKNOWN":
      default:
        return <span className="text-xs font-semibold text-slate-500">UNKNOWN</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-gov-blue dark:hover:text-sky-300 transition-colors">
          Command Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-slate-700 dark:text-slate-300">Predictive Hazard &amp; AI</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-gov-blue dark:text-sky-400 font-medium">Quantitative Risk Modeling</span>
      </nav>

      {/* Top Banner & Governance Boundary (Visually removed per operator directive) */}
      <div className="sr-only">
        <strong>Stage 5 Operational Boundary — Human Decision Support Only</strong>
        Risk estimates represent machine-learning associations derived from observational data. They are NOT official public warnings, evacuation orders, or road closures. Human authorization is required for any operational intervention.
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-sentinel-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Activity className="h-6 w-6 text-gov-blue dark:text-sky-400" />
            <span>TRANSPARENT RISK ENGINE</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Explainable, reproducible, uncertainty-quantified landslide hazard modeling (Stage 5 Architecture).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user && ["DDMA", "STATE_AUTHORITY", "PLATFORM_ADMIN"].includes(user.role) && (
            <button
              onClick={() => setRunModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-gov-blue hover:bg-gov-blue-dark dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs"
              aria-label="Trigger new model execution run"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Assessment</span>
            </button>
          )}

          <button
            onClick={loadRiskData}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 border border-slate-200 dark:border-sentinel-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
            aria-label="Refresh risk predictions"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gov-blue dark:text-sky-400 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notification toast if any */}
      {notification && (
        <div className="p-3 bg-blue-50 dark:bg-sentinel-900 border border-blue-200 dark:border-sentinel-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Model Transparency Cards */}
      <div className="sr-only">
        <div>
          <div>Active Model Version</div>
          <span>lr-baseline-v1.0.0</span>
          <div>Transparent Logistic Regression</div>
        </div>
        <div>
          <div>Validation Status</div>
          <span>DETERMINISTIC SUITE</span>
          <div>Not operationally validated in field</div>
        </div>
        <div>
          <div>Probability Calibration</div>
          <span>Platt Scaling (v1.0.0)</span>
          <div>Brier Score: 0.082 (on test fixture)</div>
        </div>
        <div>
          <div>Active Predictions</div>
          <span>{predictions.length} Entities</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-sentinel-900/40 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by entity ID (e.g. su-miz-aiz-001) or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded-lg text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500 font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="risk-level-filter" className="text-xs text-slate-600 dark:text-slate-400 font-semibold shrink-0">
              Risk Level:
            </label>
            <select
              id="risk-level-filter"
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500"
            >
              <option value="ALL">ALL LEVELS</option>
              <option value="VERY_HIGH">VERY HIGH</option>
              <option value="HIGH">HIGH</option>
              <option value="MODERATE">MODERATE</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="risk-status-filter" className="text-xs text-slate-600 dark:text-slate-400 font-semibold shrink-0">
              Status:
            </label>
            <select
              id="risk-status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-sentinel-950 border border-slate-300 dark:border-sentinel-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500"
            >
              <option value="ALL">ALL STATES</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DATA_INSUFFICIENT">DATA INSUFFICIENT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accessible Predictions Roster Table */}
      <div className="bg-white dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-sentinel-800 bg-slate-50 dark:bg-sentinel-900/40 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-gov-blue dark:text-sky-400" />
            <span>Operational Landslide Risk Estimates Roster</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {predictions.some((p) => p.is_demo_fixture)
              ? `Showing ${filteredPredictions.length} of ${predictions.length} demo fixtures (offline/test mode)`
              : `Showing ${filteredPredictions.length} of ${predictions.length} estimates`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full text-left text-xs"
            role="table"
            aria-label="Operational Landslide Risk Predictions"
          >
            <thead className="bg-slate-50 dark:bg-sentinel-900/80 text-slate-600 dark:text-slate-400 font-semibold uppercase text-xs border-b border-slate-200 dark:border-sentinel-800 whitespace-nowrap">
              <tr>
                <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Subject Entity</th>
                <th scope="col" className="px-3 py-2.5 whitespace-nowrap">District</th>
                <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Estimated Risk</th>
                <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Calibrated Prob / Score</th>
                <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Uncertainty</th>
                <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Data Quality</th>
                <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Generated At</th>
                <th scope="col" className="px-3 py-2.5 text-right whitespace-nowrap">Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-sentinel-800/60 whitespace-nowrap">
              {filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {predictions.length === 0
                      ? "No operational risk predictions available. Trigger a risk assessment run to evaluate terrain entities."
                      : "No risk predictions match the selected filter criteria."}
                  </td>
                </tr>
              ) : (
                filteredPredictions.map((pred) => (
                  <tr key={pred.id} className="hover:bg-slate-50/80 dark:hover:bg-sentinel-900/40 transition-colors">
                    <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                      <div className="flex items-center gap-2 whitespace-nowrap flex-nowrap">
                        <span className="w-2 h-2 rounded-full bg-gov-blue dark:bg-sky-400 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{pred.subject_id}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-700 font-medium whitespace-nowrap shrink-0">
                          {pred.subject_type}
                        </span>
                        {pred.is_demo_fixture && (
                          <span className="sr-only">
                            DEMO / TEST DATA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{pred.district_id}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{getRiskBadge(pred.risk_level, pred.status)}</td>
                    <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {pred.calibrated_probability !== null && pred.calibrated_probability !== undefined ? (
                        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                          <span className="font-bold text-gov-blue dark:text-sky-300 tabular-nums">
                            {(pred.calibrated_probability * 100).toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-slate-500">calibrated prob</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                          <span className="text-slate-600 dark:text-slate-400 tabular-nums font-semibold">
                            {pred.raw_score != null ? pred.raw_score.toFixed(3) : "N/A"}
                          </span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">raw logit score</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{getUncertaintyBadge(pred.uncertainty_level)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {pred.data_quality_state === "VALID" ? (
                        <span className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold whitespace-nowrap">VALID (5/5)</span>
                      ) : pred.data_quality_state === "PARTIAL" ? (
                        <span className="text-amber-700 dark:text-amber-400 text-xs font-semibold whitespace-nowrap">
                          PARTIAL ({pred.missing_feature_count} missing)
                        </span>
                      ) : (
                        <span className="text-rose-700 dark:text-rose-400 text-xs font-semibold whitespace-nowrap">INSUFFICIENT</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 text-xs tabular-nums whitespace-nowrap" suppressHydrationWarning>
                      {formatTimeSafe(pred.generated_at)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleInspect(pred)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-sentinel-900 dark:hover:bg-sky-900/60 border border-slate-200 dark:border-sentinel-700 hover:border-gov-blue dark:hover:border-sky-500 text-gov-blue dark:text-sky-400 hover:text-gov-blue-dark dark:hover:text-sky-200 text-xs font-semibold transition-all shadow-xs whitespace-nowrap"
                        aria-label={`Inspect explanation and evidence for ${pred.subject_id}`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanation & Provenance Inspector Modal / Slide-Over */}
      {inspecting && selectedPrediction && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="explanation-dialog-title"
        >
          <div className="bg-white dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-sentinel-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="explanation-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                    PREDICTION EXPLANATION &amp; PROVENANCE
                  </h2>
                  {getRiskBadge(selectedPrediction.risk_level, selectedPrediction.status)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Subject: <span className="text-gov-blue dark:text-sky-300 font-bold">{selectedPrediction.subject_id}</span> ({selectedPrediction.subject_type})
                  {" "}| District: <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedPrediction.district_id}</span>
                </div>
              </div>
              <button
                onClick={() => setInspecting(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sentinel-800 shrink-0 ml-2 transition-all"
                aria-label="Close explanation dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Provenance Metadata Trace */}
            <div className="bg-slate-50 dark:bg-sentinel-900/50 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">PREDICTION ID</span>
                <span className="text-slate-800 dark:text-slate-300 truncate block font-mono">{selectedPrediction.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">MODEL VERSION</span>
                <span className="text-gov-blue dark:text-sky-300 truncate block font-mono">{selectedPrediction.model_version_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">FEATURE SNAPSHOT</span>
                <span className="text-slate-800 dark:text-slate-300 truncate block font-mono">{selectedPrediction.feature_snapshot_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">UNCERTAINTY LEVEL</span>
                <span className="text-slate-800 dark:text-slate-300 block font-semibold">{selectedPrediction.uncertainty_level}</span>
              </div>
            </div>

            {/* Client Demonstration Fixture Notice */}
            {selectedPrediction.is_demo_fixture && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">CLIENT DEMONSTRATION RECORD</strong>
                  <span>This entity is a client-side test fixture for UI development. It was not generated by an operational backend model run.</span>
                </div>
              </div>
            )}

            {/* Authoritative Model Explanation or Truthful Unavailable State */}
            {explanationLoading ? (
              <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-sentinel-900/30 border border-slate-200 dark:border-sentinel-800 rounded-xl">
                <RefreshCw className="w-6 h-6 text-gov-blue dark:text-sky-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Retrieving authoritative provenance and feature contributions from Risk Engine API...
                </p>
              </div>
            ) : explanation ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50 dark:bg-sky-950/30 border border-blue-200 dark:border-sky-800/50 rounded-xl space-y-1.5">
                  <div className="text-xs font-bold text-gov-blue dark:text-sky-300 flex items-center gap-1.5 uppercase">
                    <TrendingUp className="w-4 h-4" />
                    <span>Summary Association Narrative</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {explanation.summary_narrative}
                  </p>
                </div>

                {/* Feature Contribution Breakdown */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                    <span>Features that Contributed to the Model Estimate</span>
                  </h3>
                  <div className="space-y-2">
                    {explanation.top_contributing_features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-sentinel-900/40 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 dark:text-slate-200">{feat.feature_name}</span>
                          <span className="text-gov-blue dark:text-sky-400 font-semibold tabular-nums">
                            Value: {feat.feature_value !== null && feat.feature_value !== undefined ? feat.feature_value : "MISSING"}
                          </span>
                        </div>
                        {/* Contribution Bar */}
                        <div className="w-full bg-slate-200 dark:bg-sentinel-950 h-2 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full ${
                              feat.direction_of_influence === "INCREASES_RISK"
                                ? "bg-rose-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(10, feat.normalized_weight * 100))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>{feat.association_statement}</span>
                          <span className="text-slate-500 tabular-nums font-medium">
                            Weight: {feat.normalized_weight != null ? (feat.normalized_weight * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scientific & Operational Disclaimer */}
                <div className="p-3 bg-slate-100 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-700 dark:text-zinc-400 space-y-1">
                  <strong className="text-slate-900 dark:text-zinc-300 block font-bold">NON-CAUSAL DISCLAIMER:</strong>
                  {explanation.disclaimer}
                </div>
              </div>
            ) : (
              <div className="p-6 bg-amber-50/50 dark:bg-sentinel-900/30 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-3 text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/60 flex items-center justify-center mx-auto text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
                    Provenance &amp; Explanation Unavailable
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90 max-w-md mx-auto leading-relaxed">
                    {explanationError || "No backend explanation available for this prediction."}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-sentinel-950/70 border border-slate-200 dark:border-sentinel-800 rounded-lg text-left text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-1 text-slate-800 dark:text-slate-300 font-semibold">
                    <Info className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                    <span>Operational Provenance Guarantee</span>
                  </div>
                  <p>
                    Sentinel NER enforces strict anti-hallucination standards. Feature contribution weights, mathematical log-odds, and association statements are displayed exclusively when verified and persisted by an authoritative backend model run (<code className="text-gov-blue dark:text-sky-300 font-mono">GET /api/v1/risk/predictions/:id/explanation</code>).
                  </p>
                </div>
              </div>
            )}

            {/* Evidence & Historical Events */}
            {Array.isArray(evidence) && evidence.length > 0 && evidence[0] ? (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-sentinel-800">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                  <span>Ground-Truth Historical Evidence</span>
                </h3>
                <div className="bg-slate-50 dark:bg-sentinel-900/40 border border-slate-200 dark:border-sentinel-800 rounded-xl p-3 text-xs space-y-1.5">
                  <div>
                    Historical Landslides Intersecting Unit:{" "}
                    <span className="text-amber-800 dark:text-amber-300 font-bold tabular-nums">{evidence[0].historical_events_count}</span>
                  </div>
                  {evidence[0].historical_event_ids.length > 0 && (
                    <div className="text-slate-600 dark:text-slate-400 text-xs">
                      Linked Event IDs: {evidence[0].historical_event_ids.join(", ")}
                    </div>
                  )}
                  <div className="text-slate-600 dark:text-slate-400 text-xs">{evidence[0].spatial_relation_notes}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-sentinel-800">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
                  <span>Ground-Truth Historical Evidence</span>
                </h3>
                <div className="p-3 bg-slate-50 dark:bg-sentinel-900/20 border border-slate-200 dark:border-sentinel-800/60 rounded-xl text-xs text-slate-500">
                  No ground-truth historical landslide events or observational evidence records linked to this prediction.
                </div>
              </div>
            )}

            {/* Model Limitations Checklist */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-sentinel-800">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Known Model Limitations</span>
              </h3>
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-0.5 leading-relaxed">
                <li>Requires localized precipitation gauges; spatial interpolation subject to elevation bias.</li>
                <li>Linear log-odds relationship assumed; does not model complex fluid-pore interactions.</li>
                <li>Historical landslide catalog exhibits reporting bias towards paved road corridors.</li>
                <li>Not trained or validated on unpaved village track slope cuts.</li>
              </ul>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-sentinel-800">
              <button
                onClick={() => setInspecting(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-sentinel-800 dark:hover:bg-sentinel-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all shadow-xs"
              >
                Close Provenance Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model Execution Run Modal */}
      {runModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="run-assessment-dialog-title"
        >
          <div className="bg-white dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-700 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-sentinel-800 pb-3">
              <div>
                <h2 id="run-assessment-dialog-title" className="text-base font-bold text-slate-900 dark:text-white tracking-wide">
                  TRIGGER RISK ASSESSMENT RUN
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Execute bounded model inference for authoritative jurisdiction.
                </p>
              </div>
              <button
                onClick={() => setRunModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sentinel-800 transition-all"
                aria-label="Cancel run"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Target District Scope:</label>
                <select
                  value={targetDistrict}
                  onChange={(e) => setTargetDistrict(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-sentinel-900 border border-slate-300 dark:border-sentinel-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-200 font-medium focus:outline-hidden focus:ring-1 focus:ring-gov-blue dark:focus:ring-sky-500"
                >
                  <option value="dist-miz-aizawl">Aizawl District (MZ-AIZ)</option>
                  <option value="dist-miz-kolasib">Kolasib District (MZ-KOL)</option>
                </select>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Enforces server-side tenancy scoping. Officers cannot evaluate external jurisdictions.
                </span>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Model Architecture:</label>
                <input
                  type="text"
                  disabled
                  value="lr-baseline-v1.0.0 (Transparent Logistic Regression)"
                  className="w-full bg-slate-100 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 rounded-lg px-3 py-2 text-slate-500 dark:text-slate-400 font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 font-semibold block mb-1">Feature Snapshot Policy:</label>
                <div className="p-2.5 bg-slate-50 dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>• SHA-256 deterministic snapshot generated per run</div>
                  <div>• 3+ missing features triggers DATA_INSUFFICIENT refusal</div>
                  <div>• Platt scaling calibration applied for probabilities</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-sentinel-800">
              <button
                onClick={() => setRunModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRun}
                disabled={runningAssessment}
                className="px-4 py-1.5 rounded-lg bg-gov-blue hover:bg-gov-blue-dark dark:bg-sky-600 dark:hover:bg-sky-500 disabled:bg-slate-400 dark:disabled:bg-sky-900 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              >
                {runningAssessment ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Execute</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
