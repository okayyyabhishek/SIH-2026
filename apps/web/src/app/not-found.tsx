import React from "react";
import Link from "next/link";
import { Compass, ShieldAlert, AlertTriangle, ArrowLeft, Phone, Home, Radio } from "lucide-react";

export default function NotFound() {
  return (
    <main
      id="main-content"
      role="main"
      className="min-h-[80vh] flex items-center justify-center px-4 py-12"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden text-center relative">
        {/* National Tricolor Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-gov-saffron via-white dark:via-slate-800 to-gov-green" />

        <div className="p-8 sm:p-12 space-y-6">
          {/* Badge & Official Symbol */}
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 text-amber-600 dark:text-amber-400 mx-auto shadow-xs">
            <AlertTriangle className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold tracking-widest text-gov-blue dark:text-cyan-400 uppercase bg-blue-50 dark:bg-cyan-950/60 px-3 py-1 rounded-full border border-blue-200 dark:border-cyan-800/60">
              ERROR CODE 404 • REGISTRY NOT LOCATED
            </span>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 dark:text-white pt-2">
              Resource or Slope Corridor Not Found
            </h1>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              पृष्ठ या निर्दिष्ट भूस्खलन गलियारा राष्ट्रीय डेटाबेस में उपलब्ध नहीं है
            </p>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            The requested highway corridor, slope unit, or administrative ledger record could not be
            located in the National Landslide Early Warning registry. The URL may be outdated or the
            asset may have been re-indexed.
          </p>

          {/* Quick Directional Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gov-blue hover:bg-gov-blue-dark text-white font-bold text-xs shadow-sm transition-all dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950"
            >
              <Home className="h-4 w-4" />
              <span>Command Center</span>
            </Link>

            <Link
              href="/map"
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs transition-all"
            >
              <Compass className="h-4 w-4 text-gov-blue dark:text-cyan-400" />
              <span>Launch GIS Map</span>
            </Link>

            <Link
              href="/early-warning"
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs transition-all"
            >
              <Radio className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Early Warning</span>
            </Link>
          </div>

          {/* Emergency Helpline Strip */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Disaster Emergency Helpline:
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                1078 (NDMA)
              </span>
            </div>
            <span className="text-[11px] font-mono">
              Sentinel NER • GSI &amp; NDMA Consortium
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
