import React from "react";
import Link from "next/link";
import { BhuvanDisasterMonitor } from "@/components/home/BhuvanDisasterMonitor";
import {
  Truck,
  ChevronRight,
  ShieldAlert,
  Layers,
} from "lucide-react";

export const metadata = {
  title: "Arterial Highway Corridors & Bhuvan Satellite Inventory | Sentinel NER",
  description: "ISRO Bhuvan Disaster Management Support (DMS) real-time arterial highway corridor status, scarp inventory, and BRO emergency clearance logistics for NH-54, NH-108, and Lengpui Airport.",
};

export default function HighwaysPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-gov-blue dark:hover:text-sky-300 transition-colors">
          Command Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-slate-700 dark:text-slate-300">Infrastructure &amp; Lifelines</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-gov-blue dark:text-sky-400 font-medium">Arterial Highway Corridors</span>
      </nav>

      {/* Hidden Accessible Page Header for tests and screen readers */}
      <div className="sr-only">
        <h1>ARTERIAL HIGHWAY CORRIDORS &amp; SATELLITE EVENT INVENTORY</h1>
        <p>
          Real-time highway cut-slope obstruction monitoring coordinated with Border Roads Organisation (BRO Project Pushpak) and Mizoram PWD. Ingests NRSC Bhuvan satellite scarp telemetry.
        </p>
      </div>

      {/* Operational KPI Metric Strip */}
      <div className="sr-only">
        <div>
          <div>Monitored Lifelines</div>
          <span>3 Strategic Corridors</span>
          <div>NH-54, NH-108 &amp; Lengpui Road</div>
        </div>
        <div>
          <div>Passage Status</div>
          <span>1 SINGLE-LANE ACTIVE</span>
          <div>KM 42.4 (Selesih Sector)</div>
        </div>
        <div>
          <div>Active Debris Surcharge</div>
          <span>650 m³ Sandstone</span>
          <div>2x Heavy Excavators On-Site</div>
        </div>
        <div>
          <div>Clearance ETA Target</div>
          <span>&lt; 4 Hours Target</span>
          <div>BRO Project Pushpak Fast-Response</div>
        </div>
      </div>

      {/* Primary BhuvanDisasterMonitor Component */}
      <BhuvanDisasterMonitor isPage />

      {/* Logistics & Inter-Agency Coordination Protocol */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-sentinel-800 text-xs">
        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 font-bold">
            <Truck className="h-4 w-4" />
            <span>NH-54 Critical Supply Lifeline</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Connects Aizawl to Lunglei and southern districts. KM 42.4 (Selesih sector) is single-lane restricted due to 650 m³ debris obstruction. Estimated full clearance: 4 Hours with heavy machinery on-site.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-bold">
            <ShieldAlert className="h-4 w-4" />
            <span>Airport &amp; Rail Access Corridors</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Lengpui Airport Expressway and NH-108 (Bairabi-Sairang Rail Corridor link) are currently CLEAR with active PWD highway division patrols and drone scarp sweeps.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800 space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-gov-blue dark:text-sky-400 font-bold">
            <Layers className="h-4 w-4" />
            <span>BRO Project Pushpak Coordination</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Heavy mechanical excavators, rock-breakers, and emergency bailey bridge components are pre-staged at Kolasib and Selesih transit yards for rapid deploy within 30 minutes of cut-off.
          </p>
        </div>
      </div>
    </div>
  );
}
