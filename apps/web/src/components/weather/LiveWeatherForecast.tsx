"use client";

import React, { useState, useTransition, useMemo } from "react";
import {
  CloudRain,
  CloudLightning,
  Cloud,
  Sun,
  Droplets,
  Wind,
  Thermometer,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Calendar,
  Radio,
  Info,
  Clock,
  Gauge,
  Activity,
  Layers,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import {
  WEATHER_STATIONS,
  WeatherStation,
  WeatherConditionCode,
  LandslideRiskTier,
  WeatherAlertLevel,
  NE_STATES,
  NEState,
} from "@/lib/weather";

function getWeatherIcon(code: WeatherConditionCode, className = "h-5 w-5") {
  switch (code) {
    case "thunderstorm":
      return <CloudLightning className={`${className} text-amber-500 dark:text-amber-400 shrink-0`} />;
    case "rain_heavy":
      return <CloudRain className={`${className} text-blue-600 dark:text-sky-400 shrink-0`} />;
    case "rain_moderate":
    case "drizzle":
      return <Droplets className={`${className} text-cyan-600 dark:text-cyan-400 shrink-0`} />;
    case "overcast":
      return <Cloud className={`${className} text-slate-500 dark:text-slate-400 shrink-0`} />;
    case "partly_cloudy":
      return <Cloud className={`${className} text-sky-500 dark:text-sky-300 shrink-0`} />;
    case "clear":
      return <Sun className={`${className} text-amber-500 dark:text-amber-300 shrink-0`} />;
    default:
      return <CloudRain className={`${className} text-blue-500 shrink-0`} />;
  }
}

function getRiskBadge(tier: LandslideRiskTier) {
  switch (tier) {
    case "CRITICAL":
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700/60">
          CRITICAL RISK
        </span>
      );
    case "ELEVATED":
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
          ELEVATED RISK
        </span>
      );
    case "MODERATE":
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60">
          MODERATE
        </span>
      );
    case "LOW":
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60">
          NOMINAL / LOW
        </span>
      );
  }
}

function getAlertStyle(level: WeatherAlertLevel) {
  switch (level) {
    case "RED":
      return {
        bg: "bg-red-50 dark:bg-red-950/40",
        border: "border-l-4 border-l-red-600 border border-red-200 dark:border-red-800/70",
        badge: "bg-red-600 text-white",
        text: "text-red-900 dark:text-red-200",
        icon: "text-red-600 dark:text-red-400",
      };
    case "ORANGE":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/40",
        border: "border-l-4 border-l-amber-500 border border-amber-200 dark:border-amber-800/70",
        badge: "bg-amber-600 text-white",
        text: "text-amber-900 dark:text-amber-200",
        icon: "text-amber-600 dark:text-amber-400",
      };
    case "YELLOW":
      return {
        bg: "bg-yellow-50 dark:bg-yellow-950/40",
        border: "border-l-4 border-l-yellow-500 border border-yellow-200 dark:border-yellow-800/70",
        badge: "bg-yellow-600 text-white",
        text: "text-yellow-900 dark:text-yellow-200",
        icon: "text-yellow-600 dark:text-yellow-400",
      };
    case "GREEN":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-l-4 border-l-emerald-500 border border-emerald-200 dark:border-emerald-800/70",
        badge: "bg-emerald-600 text-white",
        text: "text-emerald-900 dark:text-emerald-200",
        icon: "text-emerald-600 dark:text-emerald-400",
      };
  }
}

function getStateAlertLevel(state: NEState): WeatherAlertLevel {
  if (state === "All Northeast") return "RED";
  const stn = WEATHER_STATIONS.find((s) => s.state === state);
  return stn?.live.alertLevel || "GREEN";
}

function getAlertDot(level: WeatherAlertLevel) {
  switch (level) {
    case "RED":
      return <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" title="Red Alert" />;
    case "ORANGE":
      return <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="Orange Alert" />;
    case "YELLOW":
      return <span className="h-2 w-2 rounded-full bg-yellow-500 shrink-0" title="Yellow Watch" />;
    case "GREEN":
      return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Normal" />;
  }
}

export function LiveWeatherForecast() {
  const [selectedState, setSelectedState] = useState<NEState>("All Northeast");
  const [selectedStationId, setSelectedStationId] = useState<string>("aizawl-nh54");
  const [selectedForecastDay, setSelectedForecastDay] = useState<number>(1); // Day 1 = Tomorrow
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("Just now");
  const [, startTransition] = useTransition();

  // Filter stations based on selected state
  const filteredStations = useMemo(() => {
    if (selectedState === "All Northeast") {
      return WEATHER_STATIONS;
    }
    return WEATHER_STATIONS.filter((s) => s.state === selectedState);
  }, [selectedState]);

  // Current active station
  const currentStation = useMemo(() => {
    const found = WEATHER_STATIONS.find((s) => s.id === selectedStationId);
    if (found) return found;
    return filteredStations[0] || WEATHER_STATIONS[0];
  }, [selectedStationId, filteredStations]);

  const live = currentStation.live;
  const forecast7 = currentStation.forecast7Day;
  const selectedDayData =
    forecast7.find((d) => d.dayOffset === selectedForecastDay) || forecast7[0];

  // Next Day (Tomorrow) is always index 0 (dayOffset: 1)
  const nextDay = forecast7[0];
  const total7DayRainMm = forecast7.reduce((sum, d) => sum + d.expectedRainfallMm, 0);

  // All 8 North East states primary stations for regional overview
  const regionalStatesSummary = useMemo(() => {
    const stateNames: Exclude<NEState, "All Northeast">[] = [
      "Mizoram",
      "Sikkim",
      "Assam",
      "Meghalaya",
      "Arunachal Pradesh",
      "Nagaland",
      "Manipur",
      "Tripura",
    ];

    return stateNames.map((stName) => {
      const stn = WEATHER_STATIONS.find((s) => s.state === stName) || WEATHER_STATIONS[0];
      return {
        state: stName,
        station: stn,
        live: stn.live,
        tomorrow: stn.forecast7Day[0],
      };
    });
  }, []);

  const handleStateChange = (state: NEState) => {
    setSelectedState(state);
    if (state !== "All Northeast") {
      const firstInState = WEATHER_STATIONS.find((s) => s.state === state);
      if (firstInState) {
        setSelectedStationId(firstInState.id);
      }
    }
  };

  const handleStationSelect = (stationId: string) => {
    setSelectedStationId(stationId);
    const stn = WEATHER_STATIONS.find((s) => s.id === stationId);
    if (stn && selectedState !== "All Northeast" && stn.state !== selectedState) {
      setSelectedState(stn.state);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      startTransition(() => {
        setIsRefreshing(false);
        setLastRefreshedAt(
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      });
    }, 600);
  };

  const alertStyle = getAlertStyle(live.alertLevel);

  return (
    <div className="space-y-6">
      {/* 1. North East Region State Selector Bar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gov-blue dark:text-sky-400 shrink-0" />
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              North East Region State Selector
            </span>
          </div>
          <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
            Monitoring all 8 Northeast states across critical arterial corridors
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {NE_STATES.map((state) => {
            const isSelected = selectedState === state;
            const alertLevel = getStateAlertLevel(state);
            return (
              <button
                key={state}
                type="button"
                onClick={() => handleStateChange(state)}
                aria-label={`Filter by ${state}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? "bg-gov-blue text-white border-gov-blue shadow-sm dark:bg-sky-600 dark:border-sky-500 font-semibold"
                    : "bg-slate-50 dark:bg-sentinel-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-sentinel-700 hover:bg-slate-100 dark:hover:bg-sentinel-700 hover:text-slate-900 dark:hover:text-white"
                }`}
                aria-pressed={isSelected}
              >
                {getAlertDot(alertLevel)}
                <span>{state}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-cyan-400 font-sans">
              IMD LIVE DOPPLER &amp; REGIONAL WEATHER RADAR
            </span>
          </div>
          <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white">
            Live Weather &amp; 7-Day Forecast
          </h2>
          <p className="text-xs font-sans text-slate-600 dark:text-slate-400">
            Authoritative meteorological telemetry for Northeast India landslide corridors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Corridor Station Selector */}
          <div className="relative">
            <label htmlFor="station-selector" className="sr-only">
              Select Weather Station
            </label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-sentinel-800/90 border border-slate-300 dark:border-sentinel-700 text-xs text-slate-900 dark:text-white">
              <MapPin className="h-3.5 w-3.5 text-gov-blue dark:text-sky-400 shrink-0" />
              <select
                id="station-selector"
                value={currentStation.id}
                onChange={(e) => handleStationSelect(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer"
              >
                {filteredStations.map((station) => (
                  <option
                    key={station.id}
                    value={station.id}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {station.name} ({station.state} • {station.highwayCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gov-blue dark:bg-sky-600 text-white hover:bg-gov-blue-dark dark:hover:bg-sky-500 transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            aria-label="Refresh live weather telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Live Sync"}</span>
          </button>
        </div>
      </div>

      {/* 3. Official Weather Alert Banner */}
      <div className={`p-4 rounded-xl ${alertStyle.bg} ${alertStyle.border} shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-white/90 dark:bg-black/40 ${alertStyle.icon} shrink-0 mt-0.5 shadow-xs`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${alertStyle.badge}`}
                >
                  IMD {live.alertLevel} ALERT
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                  {live.alertHeadline}
                </span>
              </div>
              <p className={`text-xs leading-relaxed font-sans ${alertStyle.text}`}>
                {live.alertDescription}
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0 self-end sm:self-center">
            Updated: {lastRefreshedAt}
          </div>
        </div>
      </div>

      {/* 4. Live Weather Current Conditions & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Live Card (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-3 border-b border-slate-100 dark:border-sentinel-800 font-sans">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <MapPin className="h-3.5 w-3.5 text-gov-blue dark:text-sky-400 shrink-0" />
                <span>{currentStation.name}</span>
              </div>
              <span className="font-mono text-[11px] tabular-nums">Alt: {currentStation.elevationM}m MSL</span>
            </div>

            {/* Temperature & Main Condition */}
            <div className="py-6 flex items-center justify-between">
              <div>
                <div className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white font-heading tabular-nums">
                  {live.tempC.toFixed(1)}°C
                </div>
                <div className="text-xs font-sans text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <span>Feels like {live.feelsLikeC.toFixed(1)}°C</span>
                  <span>•</span>
                  <span className="font-mono tabular-nums">
                    H: {live.tempMaxTodayC}° / L: {live.tempMinTodayC}°
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-sentinel-800/80 border border-slate-200 dark:border-sentinel-700 shadow-xs">
                {getWeatherIcon(live.conditionCode, "h-12 w-12")}
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center mt-1.5 max-w-[130px] line-clamp-2 font-sans">
                  {live.condition}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-status: Doppler Radar & Air Quality */}
          <div className="pt-3 border-t border-slate-100 dark:border-sentinel-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-sans">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                <Radio className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400 shrink-0" />
                <span>Doppler Radar Echo</span>
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-cyan-300 tabular-nums">
                {live.dopplerEchoDbz} dBZ
              </span>
            </div>
            <div className="text-[11px] font-sans text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-sentinel-950/80 p-2 rounded-lg border border-slate-200 dark:border-sentinel-800">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Radar Status: </span>
              {live.dopplerRadarStatus}
            </div>
          </div>
        </div>

        {/* Telemetry Metric Cards (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* 24h Rain Accumulation */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-sans">
              <span className="text-[11px] font-bold uppercase tracking-wider">24h Rainfall</span>
              <CloudRain className="h-4 w-4 text-blue-600 dark:text-sky-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {live.rainAccumulated24hMm.toFixed(1)}
                <span className="text-xs font-normal text-slate-500 ml-1">mm</span>
              </div>
            </div>
            <div className="text-[10px] text-red-600 dark:text-red-400 font-medium font-sans">
              Threshold Breached (&gt;100mm)
            </div>
          </div>

          {/* Current Precip Rate */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-sans">
              <span className="text-[11px] font-bold uppercase tracking-wider">Precip Rate</span>
              <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-cyan-700 dark:text-cyan-300 tabular-nums">
                {live.precipitationRateMmH.toFixed(1)}
                <span className="text-xs font-normal text-slate-500 ml-1">mm/h</span>
              </div>
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium font-sans">
              High Downpour Rate
            </div>
          </div>

          {/* Soil Moisture (VWC) */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-sans">
              <span className="text-[11px] font-bold uppercase tracking-wider">Soil Saturation</span>
              <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-300 tabular-nums">
                {live.soilMoistureVwc.toFixed(1)}%
              </div>
            </div>
            <div className="text-[10px] text-purple-700 dark:text-purple-400 font-medium font-sans">
              Upper Regolith (SMAP VWC)
            </div>
          </div>

          {/* Wind & Gusts */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-sans">
              <span className="text-[11px] font-bold uppercase tracking-wider">Wind &amp; Gusts</span>
              <Wind className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {live.windSpeedKmh}
                <span className="text-xs font-normal text-slate-500 ml-1">km/h</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium font-sans">
              Dir: {live.windDirection} • Gusts: {live.windGustKmh} km/h
            </div>
          </div>

          {/* Humidity & Dew Point */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-sans">
              <span className="text-[11px] font-bold uppercase tracking-wider">Humidity</span>
              <Thermometer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                {live.humidityPct}%
              </div>
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium font-sans">
              Dew Point: {live.dewPointC}°C
            </div>
          </div>

          {/* Atmospheric Pressure */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-sans">
              <span className="text-[11px] font-bold uppercase tracking-wider">Barometer</span>
              <Gauge className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                {live.pressureHpa.toFixed(0)}
                <span className="text-xs font-normal text-slate-500 ml-1">hPa</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium font-sans">
              Visibility: {live.visibilityKm} km
            </div>
          </div>
        </div>
      </div>

      {/* 5. All-Northeast Regional Synopsis Matrix (Visible when All Northeast is selected) */}
      {selectedState === "All Northeast" && (
        <section
          aria-labelledby="ne-regional-overview-heading"
          className="p-4 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-sentinel-800">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gov-blue dark:text-sky-400 uppercase tracking-wider font-sans">
                <Layers className="h-3.5 w-3.5" />
                <span>All North East Region Synoptic Matrix</span>
              </div>
              <h3
                id="ne-regional-overview-heading"
                className="text-base font-heading font-bold text-slate-900 dark:text-white"
              >
                Situational Overview Across All 8 Northeast States
              </h3>
            </div>
            <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
              Click any state card to inspect corridor telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {regionalStatesSummary.map((item) => {
              const isActive = currentStation.id === item.station.id;
              return (
                <button
                  key={item.state}
                  type="button"
                  onClick={() => {
                    setSelectedState(item.state);
                    setSelectedStationId(item.station.id);
                  }}
                  aria-label={`Inspect ${item.state} corridor telemetry`}
                  className={`p-3 rounded-lg text-left transition-all border flex flex-col justify-between cursor-pointer space-y-2 ${
                    isActive
                      ? "bg-gov-blue/5 dark:bg-sentinel-800 border-gov-blue dark:border-sky-400 ring-1 ring-gov-blue/20 dark:ring-sky-400/30 shadow-sm"
                      : "bg-slate-50 dark:bg-sentinel-950/60 border-slate-200 dark:border-sentinel-800 hover:border-slate-300 dark:hover:border-sentinel-700 hover:bg-white dark:hover:bg-sentinel-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                      {item.state}
                    </span>
                    {getAlertDot(item.live.alertLevel)}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-sans text-slate-700 dark:text-slate-300">
                    {getWeatherIcon(item.live.conditionCode, "h-4 w-4")}
                    <span className="font-mono font-semibold tabular-nums">{item.live.tempC.toFixed(1)}°C</span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span className="truncate text-[11px]">{item.station.highwayCode}</span>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 dark:border-sentinel-800/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500 dark:text-slate-400">
                      24h: <strong className="text-blue-600 dark:text-sky-400">{item.live.rainAccumulated24hMm.toFixed(0)}mm</strong>
                    </span>
                    {getRiskBadge(item.tomorrow.landslideRiskTier)}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Next Day (Tomorrow) Operational Spotlight */}
      <section
        aria-labelledby="next-day-forecast-heading"
        className="p-5 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border border-blue-800/60 shadow-md space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/30 border border-blue-400/50 text-blue-200 text-[10px] font-mono font-bold uppercase tracking-wider">
                NEXT DAY OPERATIONAL SPOTLIGHT
              </span>
              <span className="text-xs text-blue-200 font-mono">
                {nextDay.dayName}, {nextDay.dateFormatted}
              </span>
            </div>
            <h3 id="next-day-forecast-heading" className="text-lg font-bold font-heading text-white">
              Tomorrow&apos;s Forecast &amp; Immediate Landslide Threat
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-200 font-sans">Trigger State:</span>
            {getRiskBadge(nextDay.landslideRiskTier)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-300 font-semibold font-sans">
              <CloudRain className="h-4 w-4" />
              <span>Expected 24h Rain</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              {nextDay.expectedRainfallMm.toFixed(1)} mm
            </div>
            <p className="text-[11px] text-blue-200/80 font-sans">
              Precipitation Probability: {nextDay.precipitationChancePct}%
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-semibold font-sans">
              <AlertTriangle className="h-4 w-4" />
              <span>Highway Impact Risk</span>
            </div>
            <div className="text-sm font-bold text-white leading-snug font-sans">
              {nextDay.condition}
            </div>
            <p className="text-[11px] text-amber-200/80 font-sans">
              Peak Wind: {nextDay.windSpeedMaxKmh} km/h • Humidity: {nextDay.humidityAvgPct}%
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold font-sans">
              <ShieldCheck className="h-4 w-4" />
              <span>Recommended Action</span>
            </div>
            <p className="text-[11px] text-blue-100/90 leading-relaxed font-sans">
              {nextDay.landslideRiskSummary}
            </p>
          </div>
        </div>

        {/* Tomorrow Hourly Precipitation Progression */}
        <div className="space-y-2 pt-2">
          <div className="text-[11px] font-mono text-blue-200 flex items-center justify-between">
            <span>Tomorrow&apos;s Hourly Rain Distribution (mm/h)</span>
            <span>00:00 to 20:00 IST</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {nextDay.hourlyPreview.map((slot) => (
              <div
                key={slot.time}
                className="p-2 rounded-lg bg-black/30 border border-white/10 text-center space-y-1"
              >
                <div className="text-[10px] font-mono text-blue-300">{slot.time}</div>
                <div className="flex justify-center my-0.5">
                  {getWeatherIcon(slot.conditionCode, "h-4 w-4")}
                </div>
                <div className="text-xs font-mono font-bold text-white tabular-nums">
                  {slot.rainRateMmH.toFixed(1)}
                  <span className="text-[9px] text-blue-300 font-normal ml-0.5">mm</span>
                </div>
                <div className="text-[9px] text-blue-200 font-mono">{slot.rainChancePct}% rain</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Next 7 Days Synoptic Forecast Matrix */}
      <section aria-labelledby="seven-day-forecast-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-sentinel-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gov-blue dark:text-sky-400 uppercase tracking-wider font-sans">
              <Calendar className="h-3.5 w-3.5" />
              <span>7-Day Synoptic Weather Outlook</span>
            </div>
            <h3
              id="seven-day-forecast-heading"
              className="text-lg font-heading font-bold text-slate-900 dark:text-white"
            >
              Day-by-Day Forecast &amp; Ground Saturation Timeline
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs font-sans">
            <span className="text-slate-600 dark:text-slate-400">
              Total 7-Day Expected Rain:
            </span>
            <span className="font-mono font-bold text-gov-blue dark:text-sky-400 text-sm tabular-nums">
              {total7DayRainMm.toFixed(1)} mm
            </span>
          </div>
        </div>

        {/* 7-Day Interactive Card Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {forecast7.map((day) => {
            const isSelected = selectedForecastDay === day.dayOffset;
            return (
              <button
                key={day.dayOffset}
                type="button"
                onClick={() => setSelectedForecastDay(day.dayOffset)}
                className={`p-3.5 rounded-xl text-left transition-all border flex flex-col justify-between cursor-pointer space-y-3 ${
                  isSelected
                    ? "bg-gov-blue/5 dark:bg-sentinel-800 border-gov-blue dark:border-sky-400 shadow-sm ring-1 ring-gov-blue/20 dark:ring-sky-400/30"
                    : "bg-white dark:bg-sentinel-900/80 border-slate-200 dark:border-sentinel-800 hover:border-slate-300 dark:hover:border-sentinel-700 hover:bg-slate-50 dark:hover:bg-sentinel-800/40 shadow-sm"
                }`}
                aria-pressed={isSelected}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-sans">
                      {day.dayOffset === 1 ? "Tomorrow" : day.dayName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {day.dateFormatted}
                    </span>
                  </div>

                  <div className="my-3 flex items-center justify-center">
                    {getWeatherIcon(day.conditionCode, "h-8 w-8")}
                  </div>

                  <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 line-clamp-2 text-center h-8 font-sans">
                    {day.condition}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-sentinel-800/80">
                  {/* Min / Max Temp */}
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="font-bold text-slate-900 dark:text-white">{day.tempMaxC}°</span>
                    <span className="text-slate-400">{day.tempMinC}°</span>
                  </div>

                  {/* Rain & mm */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    <span className="text-blue-600 dark:text-sky-400 font-bold">
                      {day.precipitationChancePct}%
                    </span>
                    <span>{day.expectedRainfallMm.toFixed(0)} mm</span>
                  </div>

                  {/* Risk Tier Badge */}
                  <div className="pt-1 flex justify-center">{getRiskBadge(day.landslideRiskTier)}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Detailed Breakdown Drawer */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-sentinel-800">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gov-blue dark:text-sky-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                Detailed Outlook for {selectedDayData.dayName}, {selectedDayData.dateFormatted} (
                {selectedDayData.dayOffset === 1
                  ? "Tomorrow"
                  : `Day +${selectedDayData.dayOffset}`}
                )
              </span>
            </div>

            <div className="flex items-center gap-2 font-sans">
              <span className="text-xs text-slate-500">Hazard Trigger:</span>
              {getRiskBadge(selectedDayData.landslideRiskTier)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
            <div className="p-3 rounded-lg bg-white dark:bg-sentinel-800/80 border border-slate-200 dark:border-sentinel-700">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Condition</span>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedDayData.condition}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-sentinel-800/80 border border-slate-200 dark:border-sentinel-700">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Expected Rain</span>
              <div className="font-mono font-bold text-blue-600 dark:text-sky-400 mt-0.5 tabular-nums">
                {selectedDayData.expectedRainfallMm.toFixed(1)} mm ({selectedDayData.precipitationChancePct}% probability)
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-sentinel-800/80 border border-slate-200 dark:border-sentinel-700">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Wind &amp; Humidity</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                Max {selectedDayData.windSpeedMaxKmh} km/h ({selectedDayData.windDirection}) •{" "}
                {selectedDayData.humidityAvgPct}% RH
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-sentinel-800/80 border border-slate-200 dark:border-sentinel-700">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Corridor Safety Directive
              </span>
              <div className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed mt-0.5">
                {selectedDayData.landslideRiskSummary}
              </div>
            </div>
          </div>

          {/* Hourly Timeline for Selected Day */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              6-Hour Synoptic Interval Breakdown
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {selectedDayData.hourlyPreview.map((slot) => (
                <div
                  key={slot.time}
                  className="p-2 rounded-lg bg-white dark:bg-sentinel-800/60 border border-slate-200 dark:border-sentinel-700 flex items-center justify-between"
                >
                  <div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {slot.time}
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {slot.tempC}°C
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex justify-end">{getWeatherIcon(slot.conditionCode, "h-3.5 w-3.5")}</div>
                    <div className="text-[10px] font-mono text-blue-600 dark:text-sky-400 tabular-nums">
                      {slot.rainRateMmH.toFixed(1)} mm/h
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Scientific Data Provenance & Agency Linkage Footer */}
      <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-sentinel-950/80 border border-slate-200 dark:border-sentinel-800 text-xs text-slate-600 dark:text-slate-400 flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gov-blue dark:text-sky-400 shrink-0" />
          <span>
            <strong>Data Lineage:</strong> India Meteorological Department (IMD) Northeast Regional
            Centre, NCMRWF Numerical Weather Prediction, NASA GPM IMERG, and Sentinel-1 InSAR
            hydrological coupling.
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono shrink-0">
          <span>Model: IMD-GEE-WRF-4km</span>
          <span>•</span>
          <span>Cycle: 06:00 UTC</span>
        </div>
      </div>
    </div>
  );
}
