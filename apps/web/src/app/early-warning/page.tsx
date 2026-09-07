import React from "react";
import Link from "next/link";
import { LewsForecastAssistant } from "@/components/home/LewsForecastAssistant";
import { AlertTriangle, ChevronRight, Compass, ArrowRight, ShieldCheck, MapPin, Radio } from "lucide-react";

export const metadata = {
  title: "Landslide Early Warning & Threat Matrix | Sentinel NER",
  description: "GSI Bhusanket & IIT Mandi GEE Landslide Early Warning System (LEWS) 4-Tier Threat Matrix with 24h/48h/72h bulletin horizons and automated operational briefing assistant.",
};

export default function EarlyWarningPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-gov-blue dark:hover:text-sky-300 transition-colors">
          Command Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-slate-700 dark:text-slate-300">Early Warning &amp; Intel</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-gov-blue dark:text-sky-400 font-medium">Landslide Early Warning &amp; Threat Matrix</span>
      </nav>

      {/* Primary LewsForecastAssistant Component with Header + Raster Window (Image 2 Style) + Actions */}
      <LewsForecastAssistant
        isPageTitle
        headerActions={
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/creep-watch"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <Radio className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">InSAR Creep Watch</span>
            </Link>
            <Link
              href="/map"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gov-blue hover:bg-gov-blue-dark dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-medium shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <Compass className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">Inspect on 3D GIS Map</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>
        }
      />

      {/* Standard Operating Procedure (SOP) Action Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-sentinel-900 text-xs">
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between font-bold text-red-800 dark:text-red-300">
            <span>EXTREME (≥98%)</span>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Immediate mandatory evacuation order for toe-settlement zones. Full arterial closure of NH-54 with heavy detour routing via Serchhip.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between font-bold text-amber-800 dark:text-amber-300">
            <span>HIGH (95–98%)</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Controlled one-lane convoy transit. Pre-stage heavy excavators at KM 40 &amp; KM 42 depot. Alert Quick Reaction Teams (QRT).
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between font-bold text-sky-800 dark:text-sky-300">
            <span>MODERATE (90–95%)</span>
            <span className="h-2 w-2 rounded-full bg-sky-500" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Enhanced geotechnical observation. Piezometer frequency boosted to 15-minute polling intervals. Warning bulletin broadcast to local community coordinators.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
            <span>LOW (&lt;90%)</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Nominal highway operations. Baseline continuous satellite SAR deformation and weather radar monitoring active.
          </p>
        </div>
      </div>
    </div>
  );
}
