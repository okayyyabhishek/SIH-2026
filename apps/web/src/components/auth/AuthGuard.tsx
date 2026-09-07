"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, initAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Initialize auth state on mount
    initAuth().finally(() => setIsInitializing(false));
  }, [initAuth]);

  useEffect(() => {
    if (!isInitializing && !isLoading) {
      if (!isAuthenticated && pathname !== "/login") {
        router.push("/login");
      }
    }
  }, [isAuthenticated, isInitializing, isLoading, pathname, router]);

  // Show nothing while verifying to prevent layout flash
  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gov-blue"></div>
      </div>
    );
  }

  // If not authenticated and not on login page, render nothing (will redirect)
  if (!isAuthenticated && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
