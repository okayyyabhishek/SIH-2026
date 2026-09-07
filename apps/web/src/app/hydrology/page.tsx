import React from "react";
import Link from "next/link";
import { NasaLhasaHydrology } from "@/components/home/NasaLhasaHydrology";
import { CloudRain, ChevronRight, Activity, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Hydrology & Precipitation Telemetry | Sentinel NER",
  description: "NASA LHASA v2 satellite precipitation anomaly, SMAP soil moisture saturation, and GPM IMERG 7-day Antecedent Rainfall Index for Northeast India corridors.",
};

export default function HydrologyPage() {
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
        <span className="text-gov-blue dark:text-sky-400 font-medium">Satellite Hydrological Telemetry</span>
      </nav>

      {/* Primary NASA LHASA Hydrology Component */}
      <NasaLhasaHydrology />

      {/* Hydrology Interpretation Protocol */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-sentinel-900 text-xs">
        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900/50 border border-slate-200 dark:border-sentinel-800/80 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-gov-blue dark:text-sky-300 font-bold">
            <Activity className="h-4 w-4" />
            <span>Antecedent Soil Moisture (SMAP)</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Volumetric Water Content (VWC) above 80% reduces shear strength across weathered sandstone planes. When combined with &gt;50mm 24h rainfall, catastrophic translational slips transition to high probability.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900/50 border border-slate-200 dark:border-sentinel-800/80 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold">
            <CloudRain className="h-4 w-4" />
            <span>7-Day ARI Accumulation</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            The Antecedent Rainfall Index correlates historical precipitation decay factors (alpha=0.8) to track deep groundwater recharge and perched water table elevation along critical highway cut slopes.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900/50 border border-slate-200 dark:border-sentinel-800/80 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold">
            <ShieldCheck className="h-4 w-4" />
            <span>Operational Trigger Action</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Trigger Level 3 (High) activates automated line-department pre-positioning at Selesih and Durtlang depots under GSI-NDMA Joint Standard Operating Procedures.
          </p>
        </div>
      </div>
    </div>
  );
}
