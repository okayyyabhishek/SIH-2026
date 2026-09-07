"use client";

import React from "react";
import { Lock, ShieldAlert, AlertCircle } from "lucide-react";

export type SentinelRole =
  | "PLATFORM_ADMIN"
  | "STATE_AUTHORITY"
  | "DDMA"
  | "PWD"
  | "BRO"
  | "NHIDCL"
  | "RAILWAY_AUTHORITY"
  | "INFRASTRUCTURE_AUTHORITY"
  | "FIELD_OFFICER"
  | "OBSERVER_AUDITOR"
  | "CITIZEN_REPORTER";

interface RequireRolePlaceholderProps {
  allowedRoles: SentinelRole[];
  featureTitle: string;
  targetStage: number;
  children?: React.ReactNode;
}

export function RequireRolePlaceholder({
  allowedRoles,
  featureTitle,
  targetStage,
  children,
}: RequireRolePlaceholderProps) {
  return (
    <div
      role="region"
      aria-label={`RBAC Protected Boundary: ${featureTitle}`}
      className="liquid-panel p-6 rounded-lg border border-sentinel-800 text-center space-y-4 max-w-xl mx-auto my-8"
    >
      <div className="h-12 w-12 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-400 mx-auto flex items-center justify-center">
        <Lock className="h-6 w-6" aria-hidden="true" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-white">{featureTitle}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          This operational workflow is governed by strict Role-Based Access Control (RBAC). Architecture placeholder active. Full identity integration is scheduled for Stage {targetStage}.
        </p>
      </div>

      <div className="p-3 rounded bg-sentinel-950/80 border border-sentinel-800 text-left space-y-2">
        <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center space-x-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          <span>Configured Authorized Roles:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allowedRoles.map((role) => (
            <span
              key={role}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-sentinel-900 border border-sentinel-700 text-slate-300"
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-sentinel-900 flex items-center justify-center space-x-1">
        <AlertCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
        <span>Stage 1 Architecture Contract • Enforced Server-Side</span>
      </div>
    </div>
  );
}
