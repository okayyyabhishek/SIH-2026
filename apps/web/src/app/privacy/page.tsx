import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, FileText, Database, Phone, Mail, ChevronRight, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Governance (DPDP 2023)",
  description:
    "Official Privacy Policy and Data Protection Framework for the Sentinel NER Landslide Early Warning & Risk Management Platform under the Digital Personal Data Protection Act, 2023.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-gov-blue dark:text-cyan-400 uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4" />
          <span>DPDP Act 2023 • Official Government Framework</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
          Privacy Policy &amp; Telemetry Governance
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
          गोपनीयता नीति एवं डेटा सुरक्षा ढांचा — राष्ट्रीय भूस्खलन पूर्व चेतावनी मंच
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Effective Date: January 1, 2026 • Last Reviewed: September 2026 • Version 2.4
        </p>
      </div>

      {/* Summary Box */}
      <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-slate-900/80 border border-blue-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-gov-blue dark:text-cyan-400 uppercase tracking-wide">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Public Safety &amp; Emergency Telemetry Notice</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          Sentinel NER operates strictly as a sovereign public safety and disaster mitigation
          platform. All telemetry, satellite observations, and crowdsourced hazard tickets are
          processed solely to prevent loss of life, secure national highway arteries (NH-54, NH-27,
          NH-6), and enable coordinated multi-agency emergency response across Northeast India.
        </p>
      </div>

      {/* Structured Sections */}
      <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-gov-blue dark:text-cyan-400 font-mono">1.</span>
            <span>Data Categories &amp; Collection Scope</span>
          </h2>
          <p>Sentinel NER collects and processes the following minimum necessary categories of data:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <li>
              <strong>Physical Sensor Telemetry:</strong> Subsurface pore water pressure, tiltmeter
              inclination, rainfall gauge millimeter totals, and soil saturation readings from
              in-situ geotechnical stations. No personally identifiable information (PII) is
              attached to raw sensor nodes.
            </li>
            <li>
              <strong>Satellite &amp; Geospatial Data:</strong> Copernicus Sentinel-1 InSAR surface
              deformation rates, NASA GPM IMERG precipitation grids, and ISRO NRSC Bhuvan Digital
              Elevation Models.
            </li>
            <li>
              <strong>Crowdsourced Citizen Reports:</strong> Geolocation coordinates (latitude,
              longitude), user-uploaded photographic evidence of road blockages or tension cracks,
              and optional contact telephone numbers provided voluntarily for field verification.
            </li>
            <li>
              <strong>Duty Officer Audit Logs:</strong> Cryptographic signatures, operational role
              identifiers, and action timestamps for all road closures, evacuations, and public CAP
              alert dispatches.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-gov-blue dark:text-cyan-400 font-mono">2.</span>
            <span>Purpose of Processing &amp; Sovereign Mandate</span>
          </h2>
          <p>
            Under Section 7 of the Digital Personal Data Protection Act, 2023, data is processed
            under legitimate sovereign use for disaster mitigation and life safety:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Life Safety Alerts</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Disseminating real-time SMS, CAP, and Cell Broadcast warnings to vulnerable slope
                habitations.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Lifeline Route Protection</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Empowering Border Roads Organisation (BRO Pushpak) and NHIDCL with real-time clearance
                dispatch data.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-gov-blue dark:text-cyan-400 font-mono">3.</span>
            <span>Data Security, Encryption &amp; Audit Ledger</span>
          </h2>
          <p>
            All telemetry streams in transit are protected using TLS 1.3 with AES-256-GCM cipher
            suites. Warning dispatches and duty officer decisions are permanently recorded in the
            tamper-evident Warning Ledger sealed with cryptographic hashes (SHA-256) conforming to
            NIST SP 800-53 and CERT-In guidelines.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-gov-blue dark:text-cyan-400 font-mono">4.</span>
            <span>Citizen Rights &amp; Data Rectification</span>
          </h2>
          <p>
            Citizens submitting crowdsourced hazard reports retain the right to request review,
            anonymization, or deletion of personal contact details through the dedicated Nodal
            Privacy Officer.
          </p>
        </section>

        {/* Section 5 - Contact */}
        <section className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-gov-blue dark:text-cyan-400 font-mono">5.</span>
            <span>Nodal Data Protection Officer Contact</span>
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <p className="font-semibold text-slate-900 dark:text-white">
              Data Protection &amp; Grievance Redressal Cell:
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              National Landslide Early Warning Consortium • GSI &amp; NDMA Nodal Center, Aizawl, Mizoram — 796001
            </p>
            <div className="flex flex-wrap gap-4 pt-1 font-mono text-[11px] text-gov-blue dark:text-cyan-400">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> privacy.sentinel@gov.in
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> NDMA Helpline: 1078
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Back Button */}
      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-gov-blue dark:text-cyan-400 hover:underline"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          <span>Return to Command Center</span>
        </Link>
      </div>
    </div>
  );
}
