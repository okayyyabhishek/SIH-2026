"use client";

import React, { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { SentinelShell } from "@/components/layout/SentinelShell";
import { useAuthStore } from "@/lib/auth";
import { useI18nStore } from "@/lib/i18n";
import { useThemeStore } from "@/lib/theme";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    useAuthStore.getState().initAuth();
    useI18nStore.getState().initI18n();
    useThemeStore.getState().initTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsProvider>
        <AuthGuard>
          <SentinelShell>{children}</SentinelShell>
        </AuthGuard>
      </AnalyticsProvider>
    </QueryClientProvider>
  );
}
