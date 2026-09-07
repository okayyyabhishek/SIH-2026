"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  WarningLedgerEntry,
  LedgerVerificationResult,
  LedgerEventType,
  getLedgerEntries,
  verifyLedgerChain,
} from "@/lib/operations";
import { NER_STATE_GROUPS } from "@/lib/domain";
import { formatDateTimeSafe } from "@/lib/formatters";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  FileCheck2,
  Filter,
  Hash,
  Info,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";

export default function WarningLedgerPage() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("dst-aizawl");
  const [entries, setEntries] = useState<WarningLedgerEntry[]>([]);
  const [verificationResult, setVerificationResult] = useState<LedgerVerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const res = await getLedgerEntries({
        district_id: selectedDistrict,
        limit: 100,
      });
      setEntries(res.items || []);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Failed to load ledger entries.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDistrict]);

  const runChainVerification = useCallback(async () => {
    setIsVerifying(true);
    try {
      const res = await verifyLedgerChain(selectedDistrict);
      setVerificationResult(res);
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Ledger chain verification failed.");
    } finally {
      setIsVerifying(false);
    }
  }, [selectedDistrict]);

  useEffect(() => {
    loadEntries();
    runChainVerification();
  }, [loadEntries, runChainVerification]);

  const filteredEntries = entries.filter((e) => {
    if (eventTypeFilter !== "ALL" && e.event_type !== eventTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchHash = e.current_event_hash.toLowerCase().includes(q);
      const matchActor = e.actor_user_id.toLowerCase().includes(q);
      const matchType = e.event_type.toLowerCase().includes(q);
      const matchId = (e.warning_id || e.action_id || "").toLowerCase().includes(q);
      if (!matchHash && !matchActor && !matchType && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded uppercase tracking-wider">
              STAGE 8
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded">
              CRYPTOGRAPHIC CHAINING
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2 whitespace-nowrap">
            <FileCheck2 className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Tamper-Evident Warning Ledger</span>
          </h1>
        </div>

        {/* District Selector & Verify Button */}
        <div className="flex items-center gap-3">
          <label htmlFor="ledger-district-select" className="text-xs text-slate-600 dark:text-slate-400 font-medium">Jurisdiction:</label>
          <select
            id="ledger-district-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm transition-colors"
          >
            {NER_STATE_GROUPS.map((group) => (
              <optgroup key={group.stateCode} label={group.stateName}>
                {group.districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id === "dst-aizawl" ? `${d.name} (Authoritative)` : d.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <button
            onClick={runChainVerification}
            disabled={isVerifying}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded text-xs transition shadow"
          >
            <ShieldCheck className={`w-4 h-4 ${isVerifying ? "animate-spin" : ""}`} />
            {isVerifying ? "Verifying Chain..." : "Verify Cryptographic Integrity"}
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorBanner && (
        <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs rounded flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Cryptographic Verification Card */}
      {verificationResult && (
        <div
          className={`p-4 rounded-lg border shadow-sm ${
            verificationResult.is_valid
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-100"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-500/50 text-red-900 dark:text-red-100"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {verificationResult.is_valid ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {verificationResult.is_valid
                    ? "SHA-256 CRYPTOGRAPHIC INTEGRITY CONFIRMED"
                    : "TAMPER DETECTED IN AUDIT LEDGER"}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{verificationResult.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-white dark:bg-slate-950/70 px-3 py-2 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-sans">Total Validated Blocks</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{verificationResult.total_entries}</span>
              </div>
              <div className="bg-white dark:bg-slate-950/70 px-3 py-2 rounded border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-sans">Verification Status</span>
                <span
                  className={`font-bold ${
                    verificationResult.is_valid ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {verificationResult.is_valid ? "100% UNBROKEN" : "CORRUPTED"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <div>
              <span className="text-slate-500 font-sans block uppercase text-[9px]">Genesis Block Hash:</span>
              <span className="truncate block text-slate-800 dark:text-slate-300">{verificationResult.genesis_hash}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block uppercase text-[9px]">Latest Chained Head:</span>
              <span className="truncate block text-cyan-700 dark:text-cyan-300">
                {verificationResult.latest_hash || "GENESIS_ROOT"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold shrink-0">Event Type:</span>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full sm:w-auto bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-2.5 py-1 text-xs"
            >
              <option value="ALL">All Ledger Events</option>
              <option value="ACTION_CREATED">ACTION_CREATED</option>
              <option value="ACTION_REVIEWED">ACTION_REVIEWED</option>
              <option value="ACTION_APPROVED">ACTION_APPROVED</option>
              <option value="ACTION_REJECTED">ACTION_REJECTED</option>
              <option value="ACTION_STARTED">ACTION_STARTED</option>
              <option value="ACTION_COMPLETED">ACTION_COMPLETED</option>
              <option value="WARNING_CREATED">WARNING_CREATED</option>
              <option value="WARNING_REVIEWED">WARNING_REVIEWED</option>
              <option value="WARNING_AUTHORIZED">WARNING_AUTHORIZED</option>
              <option value="WARNING_DISPATCHED">WARNING_DISPATCHED</option>
              <option value="WARNING_ACKNOWLEDGED">WARNING_ACKNOWLEDGED</option>
              <option value="WARNING_ESCALATED">WARNING_ESCALATED</option>
            </select>
          </div>

          <div className="relative w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hash, actor, or ID..."
              className="w-full sm:w-auto bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 pl-8 pr-3 py-1 rounded text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Displaying {filteredEntries.length} immutable records
        </span>
      </div>

      {/* Ledger Block List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800/80">
          <Database className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">No ledger entries match query.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedEntryId === entry.id;
            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 transition shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded">
                        BLOCK #{entry.sequence_number}
                      </span>

                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                          entry.event_type.includes("APPROVED") || entry.event_type.includes("AUTHORIZED")
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : entry.event_type.includes("DISPATCHED")
                            ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                            : entry.event_type.includes("REJECTED")
                            ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                            : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                        }`}
                      >
                        {entry.event_type}
                      </span>

                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Actor: {entry.actor_user_id} ({entry.actor_role})
                      </span>

                      <span className="text-[10px] text-slate-500 font-mono" suppressHydrationWarning>
                        {formatDateTimeSafe(entry.recorded_at)}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-mono space-y-1">
                      <div className="text-slate-600 dark:text-slate-400 truncate">
                        <span className="text-slate-500 font-sans">Current Block SHA-256:</span>{" "}
                        <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{entry.current_event_hash}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 truncate">
                        <span className="text-slate-500 font-sans">Previous Block SHA-256:</span>{" "}
                        <span className="text-slate-700 dark:text-slate-300">{entry.prev_event_hash}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 transition shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {isExpanded ? "Hide Payload" : "Inspect Canonical Payload"}
                  </button>
                </div>

                {/* Expanded Canonical JSON Payload */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block mb-1 font-sans">
                      Deterministic Canonical JSON Representation:
                    </span>
                    <pre className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
