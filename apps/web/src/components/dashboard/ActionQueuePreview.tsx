"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Filter,
  Info,
} from "lucide-react";
import { OPERATIONAL_PRIORITIES, OperationalPriority } from "@/lib/tokens";

interface OperationalActionItem {
  id: string;
  priority: OperationalPriority;
  hazardType: string;
  location: string;
  slopeUnitId: string;
  affectedInfrastructure: string;
  consequenceSummary: string;
  recommendedAction: string;
  responsibleAgency: string;
  deadlineHours: number;
  status: "PENDING_REVIEW" | "IN_PROGRESS" | "DISMISSED" | "COMPLETED";
  dataFreshnessState: string;
}

// Representative architectural sample tasks demonstrating card layout and contract compliance
const INITIAL_ACTIONS: OperationalActionItem[] = [
  {
    id: "ACT-2026-0891",
    priority: "CRITICAL",
    hazardType: "Debris Slide / Slope Instability",
    location: "NH-54 Corridor, Chainage KM 42+350 (Aizawl to Lunglei)",
    slopeUnitId: "SLP-MZ-00412",
    affectedInfrastructure: "National Highway 54 Arterial & Water Main",
    consequenceSummary: "Potential cutoff of secondary freight transit to Lunglei District; 67km detour via Serchhip.",
    recommendedAction: "Pre-position earth-moving machinery at KM 40 depot; issue controlled one-lane traffic advisory.",
    responsibleAgency: "PWD National Highways Division / DDMA Aizawl",
    deadlineHours: 4,
    status: "PENDING_REVIEW",
    dataFreshnessState: "Awaiting Stage 5 Model Validation",
  },
  {
    id: "ACT-2026-0892",
    priority: "URGENT",
    hazardType: "Toe Erosion & Retaining Wall Tension",
    location: "Tuirial Sector, Slope Cluster 18, Near Chite Veng Settlement",
    slopeUnitId: "SLP-MZ-00109",
    affectedInfrastructure: "Local Link Road & Settlement Approach Culvert",
    consequenceSummary: "Risk to 14 residential structures along western shoulder if toe scours further.",
    recommendedAction: "Dispatch Field Engineering Officer for crack monitoring gauge inspection and drone imagery.",
    responsibleAgency: "Disaster Management & Rehabilitation Department",
    deadlineHours: 8,
    status: "PENDING_REVIEW",
    dataFreshnessState: "Field Survey Requested",
  },
  {
    id: "ACT-2026-0893",
    priority: "ELEVATED",
    hazardType: "Antecedent Moisture Saturation",
    location: "Sairang Railway Approach Cut, Sector 4",
    slopeUnitId: "SLP-MZ-00874",
    affectedInfrastructure: "Broad Gauge Railway Track Formation",
    consequenceSummary: "Track ballast stability monitoring threshold reached under prolonged rainfall.",
    recommendedAction: "Execute geotechnical piezometer check; verify drainage culvert clearance.",
    responsibleAgency: "Northeast Frontier Railway (NFR) Engineering",
    deadlineHours: 12,
    status: "PENDING_REVIEW",
    dataFreshnessState: "Sensor Baseline Standby",
  },
];

export function ActionQueuePreview() {
  const [isQueueExpanded, setIsQueueExpanded] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [actions, setActions] = useState<OperationalActionItem[]>(INITIAL_ACTIONS);
  const [activeDismissModal, setActiveDismissModal] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState<string>("");

  const filteredActions = actions.filter((item) => {
    if (filter === "ALL") return true;
    return item.priority === filter;
  });

  const handleAct = (id: string) => {
    setActions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "IN_PROGRESS" } : item
      )
    );
  };

  const handleConfirmDismiss = (id: string) => {
    if (!dismissReason.trim()) return;
    setActions((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "DISMISSED" } : item
      )
    );
    setActiveDismissModal(null);
    setDismissReason("");
  };

  return (
    <section aria-labelledby="action-queue-title" className="space-y-4">
      {/* Header & Filter Controls */}
      <div 
        className="flex flex-row flex-nowrap items-center justify-start gap-4 pb-2 border-b border-slate-200 dark:border-sentinel-800 cursor-pointer overflow-hidden min-h-[44px]"
        onClick={() => setIsQueueExpanded(!isQueueExpanded)}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            aria-expanded={isQueueExpanded}
            aria-controls="action-queue-items"
            className="mt-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            {isQueueExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div>
            <div className="flex items-center space-x-2 overflow-hidden">
              <h2 id="action-queue-title" className="text-base font-bold text-slate-900 dark:text-white tracking-wide truncate whitespace-nowrap">
                OPERATIONAL ACTION QUEUE
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-sans font-bold bg-blue-50 dark:bg-cyan-950 border border-blue-200 dark:border-cyan-800 text-gov-blue dark:text-cyan-300">
                {filteredActions.length} PENDING
              </span>
            </div>
          </div>
        </div>

        <div 
          className="flex items-center space-x-1.5 text-xs bg-slate-100 dark:bg-sentinel-900 p-1 rounded-md border border-slate-200 dark:border-sentinel-800"
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className="h-3.5 w-3.5 text-slate-500 ml-1.5 mr-1" aria-hidden="true" />
          {["ALL", "CRITICAL", "URGENT", "ELEVATED"].map((priorityKey) => (
            <button
              key={priorityKey}
              type="button"
              aria-pressed={filter === priorityKey}
              onClick={() => setFilter(priorityKey)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filter === priorityKey
                  ? "bg-gov-blue text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {priorityKey}
            </button>
          ))}
        </div>
      </div>

      {isQueueExpanded && (
      <div className="space-y-3">
        {filteredActions.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-slate-200 dark:border-sentinel-800/80 bg-white dark:bg-sentinel-950/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">No actions pending review</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All slope units within acceptable threshold limits or resolved.
            </p>
          </div>
        ) : (
          filteredActions.map((action) => {
            const priorityMeta = OPERATIONAL_PRIORITIES[action.priority];
            const isDismissed = action.status === "DISMISSED";
            const isInProgress = action.status === "IN_PROGRESS";

            return (
              <article
                key={action.id}
                aria-label={`Action ${action.id}: ${action.hazardType} at ${action.location}`}
                className={`liquid-panel p-4 sm:p-5 rounded-lg border transition-all bg-white dark:bg-sentinel-900/60 ${
                  action.priority === "CRITICAL"
                    ? "border-l-4 !border-l-red-500 border-slate-200 dark:border-sentinel-800/80"
                    : action.priority === "URGENT"
                    ? "border-l-4 !border-l-orange-500 border-slate-200 dark:border-sentinel-800/80"
                    : "border-l-4 !border-l-amber-500 border-slate-200 dark:border-sentinel-800/80"
                } ${isDismissed ? "opacity-50" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-sentinel-800/60 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-sans font-bold text-[11px] border ${priorityMeta.badgeClass}`}
                    >
                      {priorityMeta.label}
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">{action.id}</span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">{action.slopeUnitId}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px]">
                    <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                      <span>Deadline:</span>
                      <strong className="text-slate-900 dark:text-slate-200">{action.deadlineHours}h Remaining</strong>
                    </div>

                    <div className="px-2 py-0.5 rounded bg-slate-100 dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-[10px] text-slate-600 dark:text-slate-400 font-sans font-medium">
                      {action.dataFreshnessState}
                    </div>
                  </div>
                </div>

                <div className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-7 space-y-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <span>{action.hazardType}</span>
                      </h3>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-gov-blue dark:text-cyan-400 shrink-0" aria-hidden="true" />
                        <span className="font-medium">{action.location}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-slate-50 dark:bg-sentinel-900/60 border border-slate-200 dark:border-sentinel-800/80 text-xs">
                      <div className="text-[10px] font-sans uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-0.5">
                        Consequence / Lifeline Impact
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{action.consequenceSummary}</p>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex flex-col justify-between space-y-3">
                    <div className="p-2.5 rounded bg-blue-50/60 dark:bg-cyan-950/30 border border-blue-200 dark:border-cyan-900/40 text-xs">
                      <div className="text-[10px] font-sans uppercase tracking-wider text-gov-blue dark:text-cyan-400 font-bold mb-0.5">
                        Operational Recommendation
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{action.recommendedAction}</p>
                      <div className="mt-2 pt-2 border-t border-blue-100 dark:border-cyan-900/30 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Assigned Agency:</span>
                        <strong className="text-slate-800 dark:text-slate-200">{action.responsibleAgency}</strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      {isInProgress ? (
                        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Action In Progress</span>
                        </div>
                      ) : isDismissed ? (
                        <div className="text-xs text-slate-500 italic">Dismissed with logged operational reason.</div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAct(action.id)}
                            className="flex-1 px-3.5 py-2 rounded-lg bg-gov-blue hover:bg-gov-blue-dark text-white dark:bg-cyan-600 dark:hover:bg-cyan-500 dark:text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                            aria-label={`Execute action ${action.id}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>ACT</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveDismissModal(action.id)}
                            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-sentinel-900 dark:hover:bg-sentinel-800 dark:text-slate-300 dark:hover:text-white border border-slate-300 dark:border-sentinel-700 text-xs flex items-center space-x-1.5 transition-colors"
                            aria-label={`Dismiss action ${action.id} with reason`}
                          >
                            <XCircle className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            <span>DISMISS WITH REASON</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dismissal Modal (Accessible In-card or Overlay) */}
                {activeDismissModal === action.id && (
                  <div
                    className="mt-3 p-3.5 rounded-lg bg-amber-50 dark:bg-sentinel-900 border border-amber-300 dark:border-amber-500/40 text-xs space-y-2.5 shadow-sm"
                    role="dialog"
                    aria-label="Action Dismissal Reason Dialog"
                  >
                    <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-400 font-semibold text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Log Operational Reason for Dismissal (Mandatory for Audit Trail)</span>
                    </div>
                    <textarea
                      value={dismissReason}
                      onChange={(e) => setDismissReason(e.target.value)}
                      placeholder="e.g., On-site PWD patrol confirmed false positive; retaining wall reinforced yesterday..."
                      className="w-full p-2.5 rounded-lg bg-white dark:bg-sentinel-950 border border-amber-200 dark:border-sentinel-700 text-slate-900 dark:text-slate-200 text-xs focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 focus:outline-none placeholder:text-slate-400"
                      rows={2}
                      aria-required="true"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDismissModal(null);
                          setDismissReason("");
                        }}
                        className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDismiss(action.id)}
                        disabled={!dismissReason.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shadow-xs"
                      >
                        Confirm Dismissal
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
      )}
    </section>
  );
}
