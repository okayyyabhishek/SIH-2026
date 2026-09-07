import React from "react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-6"
    >
      {/* Tactical Radar Spinner */}
      <div className="relative flex items-center justify-center w-20 h-20">
        <div className="absolute w-full h-full rounded-full border-2 border-gov-blue/20 dark:border-cyan-500/20 animate-ping" />
        <div className="absolute w-16 h-16 rounded-full border-2 border-t-gov-blue dark:border-t-cyan-400 border-r-transparent border-b-gov-blue/40 dark:border-b-cyan-500/40 border-l-transparent animate-spin" />
        <div className="w-8 h-8 rounded-full bg-gov-blue/10 dark:bg-cyan-950/60 border border-gov-blue dark:border-cyan-400 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-gov-blue dark:bg-cyan-400 animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-2 max-w-sm">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-widest text-gov-blue dark:text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Synchronizing Telemetry</span>
        </div>
        <h2 className="text-base font-heading font-extrabold text-slate-900 dark:text-white">
          Fetching Geotechnical Intelligence
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Aggregating real-time slope-unit models, InSAR surface deformation, and satellite precipitation feeds...
        </p>
      </div>

      <span className="sr-only">Loading landslide operational intelligence data...</span>
    </div>
  );
}
