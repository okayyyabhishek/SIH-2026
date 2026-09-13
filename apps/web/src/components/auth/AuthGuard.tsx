"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import {
  ROUTE_PERMISSIONS,
  ROLE_DISPLAY_NAMES,
  ROLE_DEFAULT_ROUTES,
  hasPermission,
  getRequiredRolesForPermission,
  normalizeRole,
  Role,
} from "@/lib/rbac";
import { ShieldAlert, Lock, ArrowLeft, Clock, RefreshCw } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, isSessionExpired, setSessionExpired, initAuth } =
    useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initAuth().finally(() => setIsInitializing(false));
  }, [initAuth]);

  useEffect(() => {
    if (!isInitializing && !isLoading) {
      // If not authenticated and not on the login page and not in session expired state, redirect to /login
      if (!isAuthenticated && !isSessionExpired && pathname !== "/login") {
        router.push("/login");
      }
      // If user visits root '/' and does not have permission for the root view (e.g. Public User),
      // smoothly redirect them to their authorized home dashboard
      if (isAuthenticated && user && pathname === "/") {
        const rootRequiredPerm = ROUTE_PERMISSIONS["/sentinel-ai"];
        if (rootRequiredPerm && !hasPermission(user, rootRequiredPerm)) {
          const defaultRoute = ROLE_DEFAULT_ROUTES[user.role] || "/map";
          router.replace(defaultRoute);
        }
      }
    }
  }, [isAuthenticated, isInitializing, isLoading, isSessionExpired, pathname, router, user]);

  // 1. Loading State
  if (isInitializing || isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 text-slate-700 dark:text-slate-300"
        role="status"
        aria-label="Verifying operational credentials"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gov-blue/10 dark:bg-cyan-500/10 flex items-center justify-center text-gov-blue dark:text-cyan-400">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-sans">
              Sentinel NER Security
            </p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
              Verifying Operational Access...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Session Expired State
  if (isSessionExpired && pathname !== "/login") {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-[#F8FAFC] dark:bg-slate-950">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-red-500" />
          <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
            <Clock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              SESSION EXPIRED
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              Your operational session has expired due to identity token timeout. Please authenticate again to resume privileged operational duties.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSessionExpired(false);
              router.push("/login");
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-gov-blue hover:bg-gov-blue-dark dark:bg-cyan-700 dark:hover:bg-cyan-600 text-white text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-gov-blue/20"
          >
            Re-Authenticate Operational Session →
          </button>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated State (Render nothing while redirecting to /login)
  if (!isAuthenticated && pathname !== "/login") {
    return null;
  }

  // 4. Allowed on login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // 5. Route-Level Authorization Check
  const requiredPermission = ROUTE_PERMISSIONS[pathname];
  if (requiredPermission && user) {
    const isAllowed = hasPermission(user, requiredPermission);

    if (!isAllowed) {
      const currentRoleKey = normalizeRole(user.role);
      const currentRoleDisplay = ROLE_DISPLAY_NAMES[user.role] || user.role;
      const qualifyingRoles = getRequiredRolesForPermission(requiredPermission);
      const requiredRolesDisplay =
        qualifyingRoles.length > 0 ? qualifyingRoles.join(" or ") : "PLATFORM ADMIN";
      const fallbackRoute = ROLE_DEFAULT_ROUTES[user.role] || "/map";

      return (
        <main
          id="main-content"
          className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#F8FAFC] dark:bg-slate-950"
          role="alert"
          aria-labelledby="restricted-access-title"
        >
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-gov-lg space-y-6 relative overflow-hidden">
            {/* Top Security Border Accent */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-gov-blue" />

            {/* Lock / Security Shield Icon */}
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Lock className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                  HTTP 403 • FORBIDDEN
                </span>
                <h1
                  id="restricted-access-title"
                  className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white font-heading mt-1"
                >
                  ACCESS RESTRICTED
                </h1>
              </div>
            </div>

            {/* Explanatory Context Without Leaking Protected Data */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              Your current operational role does not have authorization to access this intelligence or response module under Sentinel NER national security protocol.
            </p>

            {/* Role Credentials Context Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Current Operational Role:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                  {currentRoleDisplay}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Required Operational Access:
                </span>
                <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-900/60">
                  {requiredRolesDisplay}
                </span>
              </div>
            </div>

            {/* Navigation Recovery Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push(fallbackRoute)}
                className="w-full py-2.5 px-4 rounded-xl bg-gov-blue hover:bg-gov-blue-dark dark:bg-cyan-700 dark:hover:bg-cyan-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-gov-blue/20"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Authorized Workspace</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center font-sans">
              To request role elevation or jurisdictional transfer, contact your District Disaster Management Officer or State Administrator.
            </p>
          </div>
        </main>
      );
    }
  }

  // 6. Authorized State
  return <>{children}</>;
}
