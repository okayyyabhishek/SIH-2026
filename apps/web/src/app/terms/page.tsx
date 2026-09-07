import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { FileText, ShieldAlert, CheckCircle2, ChevronRight, Phone, Mail, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service & Operational Governance (DM Act 2005)",
  description:
    "Official Terms of Service, Standard Operating Procedures (SOP), and Multi-Agency Governance protocols for the Sentinel NER Landslide Early Warning Platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-gov-blue dark:text-cyan-400 uppercase tracking-wider">
          <Scale className="h-4 w-4" />
          <span>Disaster Management Act 2005 • Multi-Agency SOP</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
          Terms of Service &amp; Operational Governance
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
          सेवा की शर्तें एवं आपदा प्रबंधन परिचालन प्रोटोकॉल
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Effective: January 2026 • Revised for Northeast India Sector • Version 3.1
        </p>
      </div>

      {/* Governance Banner */}
      <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>Statutory Authority &amp; Operational Jurisdiction</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          The Sentinel NER platform is deployed under the mandate of the Disaster Management Act, 2005
          by the Geological Survey of India (GSI), National Disaster Management Authority (NDMA),
          Mizoram State Disaster Management Authority (MSDMA), and participating academic consortia.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-gov-blue dark:text-cyan-400 font-mono">1.</span>
            <span>Zero-Autonomous Action &amp; Dual-Custody Protocol</span>
          </h2>
          <p>
            Sentinel NER provides machine-learning predictive intelligence, slope unit Factor of
            Safety (Fs) metrics, and precipitation threshold alerts. To prevent false alarms or
            disruptive road blockages:
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Human-In-The-Loop Sign-Off Strictly Mandatory</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              No arterial highway closure (NH-54, NH-27, NH-6) or public siren activation occurs
              autonomously. All life-critical dispatches strictly require two-person verification
              (Duty Officer + Incident Commander) through authenticated cryptographic signatures.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-gov-blue dark:text-cyan-400 font-mono">2.</span>
            <span>Citizen Hazard Reporting Code of Conduct</span>
          </h2>
          <p>Citizens utilizing the crowdsourced hazard reporting tool agree to:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <li>Submit authentic, real-time photographic and location evidence of active slope hazards.</li>
            <li>Refrain from submitting frivolous, prank, or maliciously altered images. Misuse of disaster emergency channels is punishable under Section 54 of the Disaster Management Act, 2005.</li>
            <li>Maintain safe physical distance from active landslides, debris chutes, and cracking rock faces while recording observations.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-gov-blue dark:text-cyan-400 font-mono">3.</span>
            <span>Geospatial Data &amp; Open Science Attribution</span>
          </h2>
          <p>
            Geospatial maps, GIS shapefiles, and satellite displacement vectors displayed on Sentinel
            NER incorporate data from Survey of India, ISRO NRSC Bhuvan, Copernicus Sentinel-1, and
            NASA Earth Science. Academic and research citations must credit:
          </p>
          <blockquote className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-300 border-l-4 border-gov-blue">
            Sentinel NER: National Landslide Early Warning &amp; Risk Management System, Ministry of Earth Sciences &amp; NDMA, Govt. of India (2026).
          </blockquote>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-gov-blue dark:text-cyan-400 font-mono">4.</span>
            <span>Limitation of Liability in Extreme Natural Events</span>
          </h2>
          <p>
            While Sentinel NER integrates state-of-the-art telemetry, calibrated limit-equilibrium
            models, and real-time precipitation radars, geotechnical slope failures remain dynamic
            natural events influenced by unobserved subterranean fissures and sudden cloudbursts.
            Advisories are decision-support aids provided in good faith for public resilience.
          </p>
        </section>
      </div>

      {/* Back Button & Helpline */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-gov-blue dark:text-cyan-400 hover:underline"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          <span>Return to Command Center</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Phone className="h-3.5 w-3.5 text-amber-500" />
          <span>Emergency Coordination: <strong className="text-slate-800 dark:text-slate-200">1078 (NDMA)</strong></span>
        </div>
      </div>
    </div>
  );
}
