"use client";

import React, { useState } from "react";
import {
  X,
  MapPin,
  Compass,
  Volume2,
  VolumeX,
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Radio,
  Building,
  RefreshCw,
  PhoneCall,
  Clock,
  Trash2,
  HelpCircle,
} from "lucide-react";
import {
  LocationCoordinates,
  LocationRiskEvaluation,
  LocationAlertNotification,
  LOCATION_PRESETS,
  LocationPreset,
  dispatchNativeBrowserNotification,
} from "@/lib/locationRiskAlert";

interface LocationRiskDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: LocationCoordinates;
  evaluation: LocationRiskEvaluation;
  onSelectPreset: (preset: LocationPreset) => void;
  onRequestGPS: () => void;
  isGpsLoading: boolean;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  notifications: LocationAlertNotification[];
  onClearNotifications: () => void;
}

export function LocationRiskDrawer({
  isOpen,
  onClose,
  currentCoords,
  evaluation,
  onSelectPreset,
  onRequestGPS,
  isGpsLoading,
  audioEnabled,
  onToggleAudio,
  notifications,
  onClearNotifications,
}: LocationRiskDrawerProps) {
  const [activeTab, setActiveTab] = useState<"location" | "notifications" | "shelters">("location");
  const [pushStatus, setPushStatus] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  if (!isOpen) return null;

  const handleRequestPush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const res = await Notification.requestPermission();
      setPushStatus(res);
      if (res === "granted") {
        dispatchNativeBrowserNotification(
          "Sentinel NER Location Alert Enabled",
          "You will receive immediate notifications if you enter landslide prone corridors."
        );
      }
    } catch {
      // ignore
    }
  };

  const isDanger = evaluation.isInsideDangerZone;
  const isWarning = evaluation.isInsideWarningZone;
  const zone = evaluation.nearestZone;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#070D18] border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0B132B]">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-2 rounded-lg bg-gov-blue text-white shrink-0">
              <Compass className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="drawer-title"
                className="text-sm font-bold text-slate-900 dark:text-white truncate"
              >
                Location Risk Alert Radar
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Real-Time Geofenced Landslide Sentinel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Location Status Card */}
        <div
          className={`p-3.5 border-b transition-colors ${
            isDanger
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60"
              : isWarning
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60"
              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isDanger
                    ? "bg-rose-600 animate-ping"
                    : isWarning
                    ? "bg-amber-500 animate-pulse"
                    : "bg-emerald-500"
                }`}
              />
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  isDanger
                    ? "text-rose-700 dark:text-rose-400"
                    : isWarning
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {isDanger
                  ? "CRITICAL DANGER ZONE"
                  : isWarning
                  ? "HIGH RISK PROXIMITY"
                  : "SAFE / LOW RISK LOCATION"}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/70 dark:bg-black/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              {currentCoords.source === "GPS" ? "📡 LIVE GPS" : "🧪 SIMULATED"}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {currentCoords.name || `${currentCoords.latitude.toFixed(4)}°N, ${currentCoords.longitude.toFixed(4)}°E`}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
              {evaluation.headline}
            </p>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-3 pt-1">
              <span>Lat: {currentCoords.latitude.toFixed(5)}</span>
              <span>Lng: {currentCoords.longitude.toFixed(5)}</span>
              <span>Dist: {(evaluation.distanceToNearestMeters / 1000).toFixed(2)} km</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("location")}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === "location"
                ? "border-gov-blue text-gov-blue dark:text-cyan-400 dark:border-cyan-400 bg-blue-50/50 dark:bg-cyan-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Location Simulator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center space-x-1.5 ${
              activeTab === "notifications"
                ? "border-gov-blue text-gov-blue dark:text-cyan-400 dark:border-cyan-400 bg-blue-50/50 dark:bg-cyan-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>Alerts Log</span>
            {notifications.length > 0 && (
              <span className="h-4 w-4 rounded-full bg-rose-600 text-white text-[9px] flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shelters")}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === "shelters"
                ? "border-gov-blue text-gov-blue dark:text-cyan-400 dark:border-cyan-400 bg-blue-50/50 dark:bg-cyan-950/20"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Shelters & Help
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* TAB 1: LOCATION CONTROLS & TEST PRESETS */}
          {activeTab === "location" && (
            <div className="space-y-4">
              {/* Audio Alarm & Browser Push Toggles */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onToggleAudio}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-left transition-all ${
                    audioEnabled
                      ? "bg-blue-50 dark:bg-cyan-950/40 border-blue-200 dark:border-cyan-800 text-gov-blue dark:text-cyan-300"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <p className="font-bold text-[11px]">Audio Siren</p>
                    <p className="text-[10px] opacity-75 truncate">
                      {audioEnabled ? "Alert Sound ON" : "Muted"}
                    </p>
                  </div>
                  {audioEnabled ? (
                    <Volume2 className="h-4 w-4 shrink-0 text-gov-blue dark:text-cyan-400" />
                  ) : (
                    <VolumeX className="h-4 w-4 shrink-0 opacity-50" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRequestPush}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-left transition-all ${
                    pushStatus === "granted"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <p className="font-bold text-[11px]">Web Push</p>
                    <p className="text-[10px] opacity-75 truncate">
                      {pushStatus === "granted" ? "Active" : "Enable Push"}
                    </p>
                  </div>
                  <Bell className="h-4 w-4 shrink-0" />
                </button>
              </div>

              {/* Real GPS button */}
              <div className="space-y-1.5">
                <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                  Hardware Sensor
                </p>
                <button
                  type="button"
                  onClick={onRequestGPS}
                  disabled={isGpsLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg bg-gov-blue hover:bg-gov-blue-dark text-white font-bold transition-all disabled:opacity-60 shadow-xs cursor-pointer"
                >
                  <MapPin className={`h-4 w-4 ${isGpsLoading ? "animate-spin" : ""}`} />
                  <span>{isGpsLoading ? "Acquiring GPS Signal..." : "Detect My Real Device GPS"}</span>
                </button>
              </div>

              {/* 1-Click Prototype Simulation Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    Prototype Test Hotspots (Northeast India)
                  </p>
                  <span className="text-[10px] text-slate-400">1-Click Test</span>
                </div>

                <div className="space-y-1.5">
                  {LOCATION_PRESETS.map((preset) => {
                    const isSelected =
                      currentCoords.latitude === preset.coordinates.latitude &&
                      currentCoords.longitude === preset.coordinates.longitude;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onSelectPreset(preset)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                          isSelected
                            ? "border-gov-blue dark:border-cyan-500 bg-blue-50/70 dark:bg-cyan-950/40 shadow-xs ring-1 ring-gov-blue dark:ring-cyan-500"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase font-mono ${
                                preset.riskLevel === "CRITICAL"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                  : preset.riskLevel === "HIGH"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              }`}
                            >
                              {preset.riskLevel}
                            </span>
                            <p className="font-bold text-slate-900 dark:text-white truncate text-xs">
                              {preset.name}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {preset.description}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-gov-blue dark:text-cyan-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS LOG */}
          {activeTab === "notifications" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">
                  Total Recorded Alerts: {notifications.length}
                </span>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearNotifications}
                    className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold flex items-center space-x-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <Bell className="h-8 w-8 mx-auto opacity-30" />
                  <p className="font-medium text-xs">No hazard alerts triggered yet.</p>
                  <p className="text-[11px] max-w-xs mx-auto">
                    When you move or simulate moving within 3 km of a landslide-prone zone, automatic alerts will be logged here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                            notif.riskLevel === "CRITICAL"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : notif.riskLevel === "HIGH"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {notif.riskLevel} ALERT
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(notif.timestamp).toLocaleTimeString()}</span>
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">
                        {notif.headline}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                        Action: {notif.actionRequired}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SHELTERS & EMERGENCY CONTACTS */}
          {activeTab === "shelters" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                  Nearest Evacuation Shelters for {zone.name}
                </p>

                {zone.shelters && zone.shelters.length > 0 ? (
                  <div className="space-y-2">
                    {zone.shelters.map((sh) => (
                      <div
                        key={sh.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 dark:text-white text-xs">
                            {sh.name}
                          </p>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                            Capacity: {sh.capacity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{sh.address}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                          <a
                            href={`tel:${sh.contactNumber}`}
                            className="text-gov-blue dark:text-cyan-400 font-bold flex items-center space-x-1 text-[11px]"
                          >
                            <PhoneCall className="h-3 w-3" />
                            <span>{sh.contactNumber}</span>
                          </a>
                          <span className="text-[10px] text-slate-400">
                            Authorized NDMA Relief Camp
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-center">
                    No active evacuation camp deployed for this sector. Call 1078 for nearest district shelter.
                  </div>
                )}
              </div>

              {/* Emergency Helplines Card */}
              <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
                <p className="font-bold text-rose-900 dark:text-rose-200 text-xs flex items-center space-x-1.5">
                  <PhoneCall className="h-4 w-4" />
                  <span>24x7 Government Disaster Helplines</span>
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">NDMA National Helpline</span>
                    <a href="tel:1078" className="font-bold text-rose-700 dark:text-rose-400">
                      1078 (Toll Free)
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">National Emergency Number</span>
                    <a href="tel:112" className="font-bold text-rose-700 dark:text-rose-400">
                      112
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Mizoram State EOC</span>
                    <a href="tel:0389-2322238" className="font-bold text-rose-700 dark:text-rose-400">
                      0389-2322238
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300">Sikkim State EOC</span>
                    <a href="tel:03592-201075" className="font-bold text-rose-700 dark:text-rose-400">
                      03592-201075
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070D18] flex items-center justify-between text-[11px] text-slate-500">
          <span>Sentinel NER • NLEWS GSI</span>
          <a
            href="tel:1078"
            className="font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
          >
            <PhoneCall className="h-3 w-3" />
            <span>Call 1078</span>
          </a>
        </div>
      </div>
    </div>
  );
}
