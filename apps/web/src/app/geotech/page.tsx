import React from "react";
import Link from "next/link";
import { AmritaKigamGeotech } from "@/components/home/AmritaKigamGeotech";
import { Cpu, ChevronRight, ArrowRight, Wifi, Activity } from "lucide-react";

export const metadata = {
  title: "Subsurface Geotechnical Sensor Mesh & Factor of Safety | Sentinel NER",
  description: "Amrita AWNA deep subsurface piezometer array and KIGAM geotechnical slope stability monitoring with real-time Factor of Safety (Fs) calculation.",
};

export default function GeotechPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-gov-blue dark:hover:text-sky-300 transition-colors">
          Command Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-slate-700 dark:text-slate-300">Geotechnical &amp; Sensors</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-gov-blue dark:text-sky-400 font-medium">Subsurface Mesh &amp; Slope Stability (Fs)</span>
      </nav>

      {/* Primary Geotechnical Telemetry Component with unified header and actions */}
      <AmritaKigamGeotech
        isPage={true}
        extraActions={
          <>
            <Link
              href="/sensors"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <Wifi className="h-3.5 w-3.5 text-gov-blue dark:text-sky-400 shrink-0" />
              <span>Full Sensor Network</span>
            </Link>
            <Link
              href="/operations"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gov-blue hover:bg-gov-blue-dark dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-medium shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <span>Action Center</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </>
        }
      />

      {/* Geotechnical Engineering Reference Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-sentinel-900 text-xs">
        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900/50 border border-slate-200 dark:border-sentinel-800/80 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold">
            <Activity className="h-4 w-4" />
            <span>Factor of Safety (Fs) Thresholds</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="text-rose-700 dark:text-rose-400">Fs &lt; 1.0</strong>: Active slope failure in progress.<br />
            <strong className="text-amber-700 dark:text-amber-300">1.0 ≤ Fs ≤ 1.3</strong>: Limit equilibrium / Watch zone.<br />
            <strong className="text-emerald-700 dark:text-emerald-400">Fs &gt; 1.3</strong>: Geotechnically stable slope state.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900/50 border border-slate-200 dark:border-sentinel-800/80 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-gov-blue dark:text-sky-300 font-bold">
            <Cpu className="h-4 w-4" />
            <span>Multi-Depth Piezometer Array</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Pore water pressure is sampled at 3.0m (shallow colluvium), 6.0m (weathered boundary), and 9.0m (bedrock slip plane). Sudden spikes at 9.0m signal deep water infiltration prior to daylight failure.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900/50 border border-slate-200 dark:border-sentinel-800/80 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-purple-800 dark:text-purple-300 font-bold">
            <Wifi className="h-4 w-4" />
            <span>LoRa Mesh Resiliency</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Sensors communicate via 868 MHz multi-hop LoRa mesh with solar-battery backup. Subsurface nodes continue buffering telemetry during commercial cellular outages and monsoon downpours.
          </p>
        </div>
      </div>
    </div>
  );
}
