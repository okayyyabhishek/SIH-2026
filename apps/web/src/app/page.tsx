import React from "react";
import { AmritaHeroSection } from "@/components/home/AmritaHeroSection";
import { DomainTelemetryHub } from "@/components/home/DomainTelemetryHub";

import { ActionQueuePreview } from "@/components/dashboard/ActionQueuePreview";
import { OperationalMetrics, ExternalFeeds } from "@/components/dashboard/SituationOverview";
import { ShieldCheck, AlertTriangle, ArrowRight, Radio, BellRing, Sparkles } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* 1. Government Welcome Banner & Live Tactical Radar */}
      <AmritaHeroSection />

      {/* 2. Official National Emergency / PIB Disaster Bulletin Ticker */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-l-4 border-l-amber-500 border border-amber-200 dark:border-amber-600/50 text-sm shadow-xs">
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-200/70 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-mono font-bold tracking-wider uppercase">
            LIVE BULLETIN
          </span>
        </div>

        <div className="flex-1 text-slate-800 dark:text-amber-200 text-xs leading-relaxed">
          <strong className="text-amber-800 dark:text-amber-300 mr-1 uppercase">Advisory:</strong>
          Elevated landslide risk along NH-54 corridor (Aizawl-Lunglei). 
          24h cumulative rainfall: 114.5mm. Pre-monsoon preparedness protocols activated.
        </div>

        <Link
          href="/early-warning"
          className="text-xs font-bold text-gov-blue dark:text-amber-300 hover:underline whitespace-nowrap flex items-center gap-1 self-end sm:self-center px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:bg-slate-50 transition-all"
        >
          <span>View Details</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 3. Domain Intelligence Hub */}
      <DomainTelemetryHub />


      {/* 5. Operational Situation & Action Center */}
      <section
        id="action-center"
        aria-labelledby="action-center-heading"
        className="space-y-6 pt-6 scroll-mt-6"
      >
        <div className="gov-section-header flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-gov-blue dark:text-cyan-400 uppercase tracking-wider mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gov-blue dark:bg-cyan-400 animate-pulse" />
              <span>Real-Time Incident Dispatch</span>
            </div>
            <h2
              id="action-center-heading"
              className="text-xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white"
            >
              Operational Situation & Action Center
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
              Real-time geotechnical and road infrastructure decision queue for Northeast India.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto">
            <div className="gov-badge gov-badge-green dark:bg-emerald-950/70 dark:border-emerald-500/50 dark:text-emerald-300 shadow-xs flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-mono">Operational Integrity: Nominal</span>
            </div>
          </div>
        </div>

        <OperationalMetrics />

        {/* Action Queue & Situation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <ActionQueuePreview />
          </div>
          <div className="lg:col-span-4 space-y-6">
            <ExternalFeeds />
          </div>
        </div>
      </section>


    </div>
  );
}
