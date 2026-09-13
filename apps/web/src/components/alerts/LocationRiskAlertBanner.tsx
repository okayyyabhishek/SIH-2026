"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  MapPin,
  PhoneCall,
  ChevronDown,
  ChevronUp,
  X,
  Building,
  Navigation,
  Activity,
  Gauge,
  CloudRain,
  ExternalLink,
} from "lucide-react";
import {
  LocationRiskEvaluation,
  HazardZone,
  EvacuationShelter,
} from "@/lib/locationRiskAlert";

interface LocationRiskAlertBannerProps {
  evaluation: LocationRiskEvaluation;
  onDismiss: () => void;
  onOpenDrawer: () => void;
  onSelectSafePreset: () => void;
}

export function LocationRiskAlertBanner({
  evaluation,
  onDismiss,
  onOpenDrawer,
  onSelectSafePreset,
}: LocationRiskAlertBannerProps) {
  const [expanded, setExpanded] = useState(false);

  // If user is in safe location or low risk, do not show emergency alert banner
  if (evaluation.overallRiskLevel === "LOW") {
    return null;
  }

  const isCritical = evaluation.overallRiskLevel === "CRITICAL";
  const isHigh = evaluation.overallRiskLevel === "HIGH";
  const zone = evaluation.nearestZone;
  const shelter = evaluation.nearestShelter;

  const distanceText =
    evaluation.distanceToNearestMeters < 1000
      ? `${evaluation.distanceToNearestMeters}m`
      : `${(evaluation.distanceToNearestMeters / 1000).toFixed(1)} km`;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full border-b transition-all duration-300 shadow-md ${
        isCritical
          ? "bg-rose-950/95 text-rose-50 border-rose-600/80 backdrop-blur-md"
          : isHigh
          ? "bg-amber-950/95 text-amber-50 border-amber-600/80 backdrop-blur-md"
          : "bg-slate-900/95 text-slate-100 border-yellow-500/60 backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
        {/* Top Summary Bar */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-2.5 min-w-0 flex-1">
            {/* Flashing Danger Beacon */}
            <div
              className={`p-1.5 rounded-lg shrink-0 mt-0.5 sm:mt-0 ${
                isCritical
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-amber-500 text-slate-950"
              }`}
            >
              <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span
                  className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded tracking-wider uppercase font-mono ${
                    isCritical
                      ? "bg-rose-500 text-white shadow-xs"
                      : "bg-amber-400 text-slate-950"
                  }`}
                >
                  {isCritical ? "⚠️ CRITICAL HAZARD" : "⚠️ HIGH RISK ADVISORY"}
                </span>

                <span className="text-xs sm:text-sm font-bold truncate">
                  {zone.name} ({zone.district}, {zone.state})
                </span>

                <span
                  className={`text-[11px] font-mono px-1.5 py-0.2 rounded font-semibold hidden md:inline-block ${
                    evaluation.isInsideDangerZone
                      ? "bg-rose-900/80 text-rose-200 border border-rose-500/60"
                      : "bg-amber-900/80 text-amber-200 border border-amber-500/60"
                  }`}
                >
                  📍 {distanceText} away •{" "}
                  {evaluation.isInsideDangerZone
                    ? "INSIDE ACTIVE DANGER PERIMETER"
                    : "APPROACHING WARNING ZONE"}
                </span>
              </div>

              {/* Immediate Danger Headline */}
              <p className="text-xs sm:text-sm text-white/95 font-medium line-clamp-1 mt-0.5">
                {zone.currentSituation}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Quick Helpline */}
            <a
              href="tel:1078"
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-colors"
              title="Dial National Disaster Helpline 1078 (Toll Free 24x7)"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">NDMA</span>
              <span>1078</span>
            </a>

            {/* Toggle Detailed Intel */}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center space-x-1 px-2 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              aria-expanded={expanded}
              aria-label="Toggle Hazard Details"
            >
              <span className="hidden sm:inline">
                {expanded ? "Less Info" : "Hazard Intel"}
              </span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Manage / Simulator button */}
            <button
              type="button"
              onClick={onOpenDrawer}
              className="px-2 py-1.5 rounded-md bg-cyan-600/80 hover:bg-cyan-600 text-white text-xs font-semibold transition-colors hidden md:inline-flex items-center gap-1"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Location Radar</span>
            </button>

            {/* Dismiss Banner */}
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Minimize warning banner"
              title="Minimize warning to floating status indicator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Expandable Technical Intelligence & Shelter Drawer */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/15 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs animate-in fade-in duration-200">
            {/* Geotechnical Live Telemetry */}
            <div className="bg-black/30 p-2.5 rounded-lg border border-white/10 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
                <Activity className="h-3.5 w-3.5" />
                <span>Geotechnical Instability Metrics</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-white/60 block">Displacement Creep</span>
                  <span className="font-mono font-bold text-rose-300 text-xs">
                    {zone.geotechMetrics.displacementRateMmDay} mm/day
                  </span>
                </div>
                <div>
                  <span className="text-white/60 block">Pore Water Saturation</span>
                  <span className="font-mono font-bold text-amber-300 text-xs">
                    {zone.geotechMetrics.poreWaterPressureKPa} kPa
                  </span>
                </div>
                <div>
                  <span className="text-white/60 block">Factor of Safety (FoS)</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      zone.geotechMetrics.factorOfSafety < 1.0
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {zone.geotechMetrics.factorOfSafety.toFixed(2)}{" "}
                    {zone.geotechMetrics.factorOfSafety < 1.0 ? "(UNSTABLE)" : "(STABLE)"}
                  </span>
                </div>
                <div>
                  <span className="text-white/60 block">24h Cumulative Rain</span>
                  <span className="font-mono font-bold text-cyan-300 text-xs">
                    {zone.geotechMetrics.rainfallPast24hMm} mm
                  </span>
                </div>
              </div>
            </div>

            {/* Road Status & Operational Action */}
            <div className="bg-black/30 p-2.5 rounded-lg border border-white/10 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Road Transit & Citizen Action</span>
              </div>
              <p className="text-amber-200/90 font-semibold leading-relaxed text-[11px]">
                {zone.roadTransitStatus}
              </p>
              <p className="text-white/80 text-[11px] leading-relaxed">
                {zone.requiredAction}
              </p>
            </div>

            {/* Evacuation Shelter & Safe Route */}
            <div className="bg-black/30 p-2.5 rounded-lg border border-white/10 space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-emerald-300 font-bold uppercase tracking-wider text-[11px]">
                  <Building className="h-3.5 w-3.5" />
                  <span>Nearest Safe Evacuation Shelter</span>
                </div>
                {shelter ? (
                  <div className="mt-1 space-y-0.5 text-[11px]">
                    <p className="font-bold text-white text-xs">{shelter.name}</p>
                    <p className="text-white/70">{shelter.address}</p>
                    <p className="text-emerald-300 font-semibold">
                      📍 Approx.{" "}
                      {shelter.distanceMeters && shelter.distanceMeters < 1000
                        ? `${shelter.distanceMeters}m`
                        : `${((shelter.distanceMeters || 800) / 1000).toFixed(1)} km`}{" "}
                      away • Capacity: {shelter.capacity} persons
                    </p>
                  </div>
                ) : (
                  <p className="text-white/60 text-[11px] mt-1">
                    Contact District Emergency Operation Center (1078) for designated relief point.
                  </p>
                )}
              </div>

              {/* Simulation Quick Safe Jump */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="text-[10px] text-white/50">Testing on localhost?</span>
                <button
                  type="button"
                  onClick={onSelectSafePreset}
                  className="px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors shrink-0"
                >
                  ✓ Simulate Moving to Safe Zone
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
