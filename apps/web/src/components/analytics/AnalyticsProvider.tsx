"use client";

import React, { createContext, useContext, useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface AnalyticsContextType {
  trackEvent: (category: string, action: string, label?: string, value?: number) => void;
  trackOperationalMetric: (metricName: string, value: number, tags?: Record<string, string>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
  trackOperationalMetric: () => {},
});

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page navigation events anonymously
  useEffect(() => {
    try {
      const consent = localStorage.getItem("sentinel_cookie_consent");
      if (consent === "all" || consent === "essential") {
        const fullUrl = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
        // In local development or production, log structured operational telemetry
        if (process.env.NODE_ENV === "development") {
          console.debug(`[Sentinel Telemetry] Route Navigated: ${fullUrl}`);
        }
      }
    } catch {
      // Ignore
    }
  }, [pathname, searchParams]);

  const trackEvent = useCallback((category: string, action: string, label?: string, value?: number) => {
    try {
      const consent = localStorage.getItem("sentinel_cookie_consent");
      if (consent === "all") {
        if (process.env.NODE_ENV === "development") {
          console.debug(`[Sentinel Event] [${category}] ${action} ${label ? `(${label})` : ""} ${value !== undefined ? `value=${value}` : ""}`);
        }
      }
    } catch {}
  }, []);

  const trackOperationalMetric = useCallback((metricName: string, value: number, tags?: Record<string, string>) => {
    try {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[Sentinel Metric] ${metricName} = ${value}`, tags || {});
      }
    } catch {}
  }, []);

  return (
    <AnalyticsContext.Provider value={{ trackEvent, trackOperationalMetric }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
