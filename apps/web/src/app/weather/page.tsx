import React from "react";
import Link from "next/link";
import { LiveWeatherForecast } from "@/components/weather/LiveWeatherForecast";
import { CloudRain, ChevronRight, ShieldCheck, Radio } from "lucide-react";

export const metadata = {
  title: "Live Weather & 7-Day Forecast | Sentinel NER",
  description:
    "Real-time IMD Doppler radar weather telemetry, next-day operational rainfall surge outlook, and 7-day synoptic meteorological updates for Northeast India landslide corridors.",
};

export default function WeatherPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <h1 className="sr-only">
        Live Meteorological Telemetry &amp; 7-Day Synoptic Weather Forecast — Northeast India
      </h1>

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center space-x-2 text-xs font-sans text-slate-500 dark:text-slate-400"
      >
        <Link href="/" className="hover:text-gov-blue dark:hover:text-sky-300 transition-colors">
          Command Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <Link
          href="/early-warning"
          className="hover:text-gov-blue dark:hover:text-sky-300 transition-colors"
        >
          Early Warning &amp; Threat Matrix
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-gov-blue dark:text-sky-400 font-semibold">
          Live Weather &amp; 7-Day Updates
        </span>
      </nav>

      {/* Primary Weather Component */}
      <LiveWeatherForecast />

      {/* Meteorological Interpretation & Standard Operating Procedures */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-sentinel-800 text-xs">
        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 space-y-2 shadow-sm">
          <div className="flex items-center space-x-2 text-gov-blue dark:text-sky-400 font-bold font-heading">
            <Radio className="h-4 w-4 shrink-0" />
            <span>Doppler Weather Radar Integration</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            S-band and C-band dual-polarization Doppler Radars at Silchar, Sohra (Cherrapunji), and
            Mohanbari provide 15-minute high-resolution rain rates. Echo intensities exceeding 45 dBZ
            indicate convective downpours capable of rapid gully mobilization.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 space-y-2 shadow-sm">
          <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-400 font-bold font-heading">
            <CloudRain className="h-4 w-4 shrink-0" />
            <span>Next-Day Rainfall Thresholds</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            When forecasted 24-hour rainfall exceeds 100mm on slopes with antecedent soil saturation
            &gt;75% VWC, the platform recommends pre-emptive patrol deployment and staging heavy
            earthmoving machinery under BRO/NHIDCL SOPs.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 space-y-2 shadow-sm">
          <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-400 font-bold font-heading">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Multi-Model 7-Day Ensemble</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            The 7-day horizon integrates NCMRWF global unified models, ECMWF deterministic feeds,
            and GSI empirical rainfall thresholds to project weekly pore pressure accumulation
            across critical arterial highways.
          </p>
        </div>
      </div>
    </div>
  );
}

