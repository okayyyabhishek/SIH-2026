"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Cookie, X, Check, Lock } from "lucide-react";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("sentinel_cookie_consent");
      if (!consent) {
        // Small timeout so it slides in smoothly after initial page paint
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem("sentinel_cookie_consent", "all");
    } catch {}
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    try {
      localStorage.setItem("sentinel_cookie_consent", "essential");
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Privacy and Telemetry Consent Banner"
      role="region"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="p-4 sm:p-5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5 text-slate-900 dark:text-white">
        {/* Header Strip */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-gov-blue dark:text-cyan-400 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 shrink-0 text-gov-blue dark:text-cyan-400" />
            <span>DPDP Act 2023 • Telemetry Consent</span>
          </div>
          <button
            type="button"
            onClick={handleAcceptEssential}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-lg transition-colors"
            title="Dismiss with Essential Only"
            aria-label="Dismiss consent banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Sentinel NER uses strictly essential operational cookies for secure authentication and
          emergency dispatch coordination. Anonymous telemetry assists in calibrating landslide
          alert delivery across vulnerable corridors.
        </p>

        {/* Links & Actions */}
        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <Link href="/privacy" className="hover:underline hover:text-gov-blue dark:hover:text-cyan-400 font-medium">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:underline hover:text-gov-blue dark:hover:text-cyan-400 font-medium">
              Terms of Service
            </Link>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={handleAcceptEssential}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-3.5 py-1.5 rounded-lg bg-gov-blue hover:bg-gov-blue-dark text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 text-xs font-bold shadow-xs hover:shadow-sm transition-all"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
