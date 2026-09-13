"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ShieldAlert,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Bell,
  MapPin,
  Volume2,
} from "lucide-react";
import {
  LocationCoordinates,
  LocationRiskEvaluation,
  LocationAlertNotification,
  LocationPreset,
  LOCATION_PRESETS,
  evaluateLocationRisk,
  playEmergencyAlarmAudio,
  dispatchNativeBrowserNotification,
  getStoredLocationAlerts,
  saveLocationAlert,
  clearStoredLocationAlerts,
} from "@/lib/locationRiskAlert";
import { LocationRiskAlertBanner } from "./LocationRiskAlertBanner";
import { LocationRiskDrawer } from "./LocationRiskDrawer";

const STORAGE_KEY_LOCATION = "sentinel_current_location_coords";
const STORAGE_KEY_AUDIO = "sentinel_location_audio_enabled";

export function LocationRiskSentinel() {
  // Default to Durtlang Ridge hotspot so evaluators instantly see the working prototype alert on localhost
  const [coords, setCoords] = useState<LocationCoordinates>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_LOCATION);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return LOCATION_PRESETS[0].coordinates; // Durtlang Ridge (CRITICAL)
  });

  const [evaluation, setEvaluation] = useState<LocationRiskEvaluation>(() =>
    evaluateLocationRisk(LOCATION_PRESETS[0].coordinates)
  );

  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AUDIO);
        return saved === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const [notifications, setNotifications] = useState<LocationAlertNotification[]>(() =>
    getStoredLocationAlerts()
  );

  const lastAlertedZoneRef = useRef<string | null>(null);

  // Evaluate risk whenever coordinates change
  const updateCoordinates = useCallback(
    (newCoords: LocationCoordinates) => {
      setCoords(newCoords);
      try {
        localStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(newCoords));
      } catch {
        // ignore
      }

      const ev = evaluateLocationRisk(newCoords);
      setEvaluation(ev);

      // Un-dismiss banner if entering a new critical/high risk zone
      if (ev.overallRiskLevel === "CRITICAL" || ev.overallRiskLevel === "HIGH") {
        setBannerDismissed(false);

        // Deduplicate audio & push notifications per zone encounter
        const zoneKey = `${ev.nearestZone.id}-${ev.overallRiskLevel}`;
        if (lastAlertedZoneRef.current !== zoneKey) {
          lastAlertedZoneRef.current = zoneKey;

          // Sound alarm if enabled
          if (audioEnabled) {
            playEmergencyAlarmAudio();
          }

          // Browser Web Notification
          dispatchNativeBrowserNotification(
            `⚠️ Sentinel NER Hazard: ${ev.nearestZone.name}`,
            `${ev.headline}. ${ev.nearestZone.roadStatus}`
          );

          // Record in notification inbox
          const newNotif: LocationAlertNotification = {
            id: `loc-alert-${Date.now()}`,
            timestamp: new Date().toISOString(),
            zoneId: ev.nearestZone.id,
            zoneName: ev.nearestZone.name,
            riskLevel: ev.overallRiskLevel,
            distanceMeters: ev.distanceToNearestMeters,
            headline: ev.headline,
            message: ev.detailedAdvisory,
            actionRequired: ev.nearestZone.requiredAction,
            read: false,
          };

          const updated = saveLocationAlert(newNotif);
          setNotifications(updated);
        }
      } else {
        lastAlertedZoneRef.current = null;
      }
    },
    [audioEnabled]
  );

  // Toggle audio
  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY_AUDIO, String(next));
    } catch {
      // ignore
    }
    if (next) {
      playEmergencyAlarmAudio();
    }
  };

  // Hardware GPS detection
  const handleRequestGPS = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      alert("HTML5 Geolocation is not supported by this browser.");
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        updateCoordinates({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          name: "Live Device Location (GPS)",
          source: "GPS",
        });
      },
      (err) => {
        setIsGpsLoading(false);
        console.warn("Geolocation acquisition error:", err);
        alert(
          `Unable to read live GPS: ${err.message}. You can use the 1-click test simulation presets in the radar drawer.`
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Select a preset location
  const handleSelectPreset = (preset: LocationPreset) => {
    updateCoordinates(preset.coordinates);
  };

  // Quick switch to safe preset (Guwahati)
  const handleSelectSafePreset = () => {
    const safePreset = LOCATION_PRESETS.find((p) => p.id === "preset-guwahati-safe") || LOCATION_PRESETS[5];
    updateCoordinates(safePreset.coordinates);
  };

  // Clear alert history
  const handleClearNotifications = () => {
    clearStoredLocationAlerts();
    setNotifications([]);
  };

  const isDanger = evaluation.isInsideDangerZone;
  const isHigh = evaluation.overallRiskLevel === "HIGH";
  const isCritical = evaluation.overallRiskLevel === "CRITICAL";
  const isSafe = evaluation.overallRiskLevel === "LOW";

  const distText =
    evaluation.distanceToNearestMeters < 1000
      ? `${evaluation.distanceToNearestMeters}m`
      : `${(evaluation.distanceToNearestMeters / 1000).toFixed(1)} km`;

  return (
    <>
      {/* ── Fixed High-Visibility Alert Warning Banner (Top of Screen) ── */}
      {!bannerDismissed && (
        <div className="sticky top-0 z-50 animate-in slide-in-from-top-2 duration-300">
          <LocationRiskAlertBanner
            evaluation={evaluation}
            onDismiss={() => setBannerDismissed(true)}
            onOpenDrawer={() => setDrawerOpen(true)}
            onSelectSafePreset={handleSelectSafePreset}
          />
        </div>
      )}

      {/* ── Persistent Floating Location Sentinel Pill (Bottom-Left) ── */}
      <aside
        aria-label="Location Risk Sentinel Status"
        className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`flex items-center space-x-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full shadow-lg border backdrop-blur-md transition-all duration-200 group cursor-pointer hover:scale-105 active:scale-95 ${
            isCritical
              ? "bg-rose-950/90 text-rose-100 border-rose-500 shadow-rose-950/40 ring-2 ring-rose-500/50"
              : isHigh
              ? "bg-amber-950/90 text-amber-100 border-amber-500 shadow-amber-950/40 ring-2 ring-amber-500/50"
              : "bg-slate-900/90 text-slate-100 border-emerald-500/80 shadow-slate-950/30"
          }`}
          title="Open Location Risk Radar & Simulator"
        >
          {/* Status Indicator Dot / Icon */}
          <div className="relative shrink-0 flex items-center justify-center">
            {isCritical ? (
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
              </span>
            ) : isHigh ? (
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500" />
              </span>
            ) : (
              <span className="h-3 w-3 rounded-full bg-emerald-400 shrink-0" />
            )}
          </div>

          <div className="text-left leading-tight pr-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider font-mono">
                {isCritical
                  ? "DANGER ZONE"
                  : isHigh
                  ? "HIGH RISK"
                  : "SAFE AREA"}
              </span>
              <span className="text-[9px] opacity-70 hidden sm:inline">
                ({coords.source === "GPS" ? "GPS" : "SIM"})
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-bold truncate max-w-[140px] xs:max-w-[190px] sm:max-w-[220px]">
              {isSafe ? coords.name || "Safe Location" : `${evaluation.nearestZone.name} (${distText})`}
            </p>
          </div>

          {/* Quick Indicator Badge */}
          <div className="pl-1 border-l border-white/20 shrink-0">
            <Navigation className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform duration-200 text-cyan-400" />
          </div>
        </button>
      </aside>

      {/* ── Interactive Radar & Simulation Drawer ── */}
      <LocationRiskDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentCoords={coords}
        evaluation={evaluation}
        onSelectPreset={handleSelectPreset}
        onRequestGPS={handleRequestGPS}
        isGpsLoading={isGpsLoading}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        notifications={notifications}
        onClearNotifications={handleClearNotifications}
      />
    </>
  );
}
