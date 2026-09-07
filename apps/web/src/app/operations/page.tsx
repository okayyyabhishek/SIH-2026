"use client";

import React, { useEffect, useState, useCallback, useId } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth";
import { formatDateSafe, formatTimeSafe, formatDateTimeSafe } from "@/lib/formatters";
import {
  Action,
  ActionSummary,
  ActionType,
  ActionStatus,
  ActionPriority,
  AuthorizationDecision,
  ActionOutcomeType,
  Warning,
  WarningSummary,
  WarningType,
  WarningStatus,
  DeliveryChannel,
  Playbook,
  WarningLedgerEntry,
  NON_AUTONOMOUS_ACTION_DISCLAIMER,
  NON_AUTONOMOUS_WARNING_DISCLAIMER,
  checkLanguageSafety,
  getActions,
  getActionSummary,
  reviewAction,
  authorizeAction,
  executeAction,
  recordActionOutcome,
  getWarnings,
  getWarningSummary,
  createWarning,
  reviewWarning,
  authorizeWarning,
  dispatchWarning,
  acknowledgeWarning,
  cancelWarning,
  getPlaybooks,
  getLedgerEntries,
  verifyLedgerChain,
} from "@/lib/operations";
import { NER_STATE_GROUPS } from "@/lib/domain";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Flame,
  Info,
  Layers,
  Lock,
  Milestone,
  Play,
  Radio,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

export default function OperationsPage() {
  const { user } = useAuthStore();
  const [selectedDistrict, setSelectedDistrict] = useState<string>("dst-aizawl");
  const [activeTab, setActiveTab] = useState<
    "queue" | "authorization" | "warnings" | "deliveries" | "playbooks" | "ledger"
  >("queue");

  // Data States
  const [actions, setActions] = useState<Action[]>([]);
  const [actionSummary, setActionSummary] = useState<ActionSummary | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [warningSummary, setWarningSummary] = useState<WarningSummary | null>(null);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<WarningLedgerEntry[]>([]);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [chainMessage, setChainMessage] = useState<string>("");

  // Loading & Filter States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [selectedActionForAuth, setSelectedActionForAuth] = useState<Action | null>(null);
  const [authDecision, setAuthDecision] = useState<AuthorizationDecision>("APPROVE");
  const [authJustification, setAuthJustification] = useState<string>("");

  const [selectedActionForReview, setSelectedActionForReview] = useState<Action | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");

  const [selectedActionForExec, setSelectedActionForExec] = useState<Action | null>(null);
  const [assignedAgency, setAssignedAgency] = useState<string>("PWD");
  const [assignedPersonnel, setAssignedPersonnel] = useState<string>("");
  const [executionNotes, setExecutionNotes] = useState<string>("");

  const [selectedActionForOutcome, setSelectedActionForOutcome] = useState<Action | null>(null);
  const [outcomeType, setOutcomeType] = useState<ActionOutcomeType>("HAZARD_CONFIRMED_MITIGATED");
  const [groundObservations, setGroundObservations] = useState<string>("");
  const [mitigationApplied, setMitigationApplied] = useState<string>("");
  const [followUpRecommended, setFollowUpRecommended] = useState<boolean>(false);

  // Warning Modals
  const [showWarningComposer, setShowWarningComposer] = useState<boolean>(false);
  const [warningHeadline, setWarningHeadline] = useState<string>("");
  const [warningBody, setWarningBody] = useState<string>("");
  const [warningMizo, setWarningMizo] = useState<string>("");
  const [warningType, setWarningType] = useState<WarningType>("ROAD_HAZARD_ADVISORY");
  const [warningTargetType, setWarningTargetType] = useState<string>("ROAD");
  const [warningTargetId, setWarningTargetId] = useState<string>("road-nh54-aizawl");
  const [warningTargetName, setWarningTargetName] = useState<string>("NH-54 Silchar Highway");
  const [warningLanguageIssue, setWarningLanguageIssue] = useState<string | null>(null);

  const [selectedWarningForDispatch, setSelectedWarningForDispatch] = useState<Warning | null>(null);
  const [selectedWarningForAck, setSelectedWarningForAck] = useState<Warning | null>(null);
  const [ackRecipientId, setAckRecipientId] = useState<string>("");
  const [ackChannel, setAckChannel] = useState<DeliveryChannel>("WEB_NOTIFICATION");
  const [ackNotes, setAckNotes] = useState<string>("");

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const [actRes, actSum, wrnRes, wrnSum, pbList, ledRes, verifyRes] = await Promise.all([
        getActions({ district_id: selectedDistrict, limit: 100 }),
        getActionSummary(selectedDistrict).catch(() => null),
        getWarnings({ district_id: selectedDistrict, limit: 50 }),
        getWarningSummary(selectedDistrict).catch(() => null),
        getPlaybooks().catch(() => []),
        getLedgerEntries({ district_id: selectedDistrict, limit: 20 }).catch(() => ({ items: [] })),
        verifyLedgerChain(selectedDistrict).catch(() => null),
      ]);

      setActions(actRes.items || []);
      setActionSummary(actSum);
      setWarnings(wrnRes.items || []);
      setWarningSummary(wrnSum);
      setPlaybooks(pbList || []);
      setLedgerEntries(ledRes.items || []);
      if (verifyRes) {
        setChainValid(verifyRes.is_valid);
        setChainMessage(verifyRes.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load operational data";
      setErrorBanner(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDistrict]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time language check in warning composer
  useEffect(() => {
    const check1 = checkLanguageSafety(warningHeadline);
    if (!check1.isSafe) {
      setWarningLanguageIssue(`Headline contains prohibited alarmist phrase: "${check1.flaggedPhrase}"`);
      return;
    }
    const check2 = checkLanguageSafety(warningBody);
    if (!check2.isSafe) {
      setWarningLanguageIssue(`Body contains prohibited alarmist phrase: "${check2.flaggedPhrase}"`);
      return;
    }
    setWarningLanguageIssue(null);
  }, [warningHeadline, warningBody]);

  // Handle Action Review
  const handleReviewSubmit = async () => {
    if (!selectedActionForReview || !reviewNotes) return;
    try {
      await reviewAction(selectedActionForReview.id, reviewNotes);
      setSuccessBanner(`Action ${selectedActionForReview.id} successfully reviewed and moved to PENDING_REVIEW.`);
      setSelectedActionForReview(null);
      setReviewNotes("");
      loadData();
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Review submission failed.");
    }
  };

  // Handle Action Authorization
  const handleAuthSubmit = async () => {
    if (!selectedActionForAuth || !authJustification) return;
    try {
      await authorizeAction(selectedActionForAuth.id, authDecision, authJustification);
      setSuccessBanner(`Action ${selectedActionForAuth.id} decision ${authDecision} recorded by certified authority.`);
      setSelectedActionForAuth(null);
      setAuthJustification("");
      loadData();
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Authorization failed.");
    }
  };

  // Handle Action Execution
  const handleExecSubmit = async () => {
    if (!selectedActionForExec) return;
    try {
      const personnel = assignedPersonnel.split(",").map((s) => s.trim()).filter(Boolean);
      await executeAction(selectedActionForExec.id, assignedAgency, personnel, executionNotes);
      setSuccessBanner(`Action ${selectedActionForExec.id} dispatched to ${assignedAgency} personnel.`);
      setSelectedActionForExec(null);
      setExecutionNotes("");
      loadData();
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Execution start failed.");
    }
  };

  // Handle Action Outcome
  const handleOutcomeSubmit = async () => {
    if (!selectedActionForOutcome || !groundObservations) return;
    try {
      await recordActionOutcome(
        selectedActionForOutcome.id,
        outcomeType,
        groundObservations,
        mitigationApplied || undefined,
        followUpRecommended
      );
      setSuccessBanner(`Ground outcome recorded for Action ${selectedActionForOutcome.id}. Lifecycle COMPLETED.`);
      setSelectedActionForOutcome(null);
      setGroundObservations("");
      setMitigationApplied("");
      loadData();
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Recording outcome failed.");
    }
  };

  // Handle Warning Creation
  const handleCreateWarning = async () => {
    if (warningLanguageIssue) return;
    if (!warningHeadline || !warningBody) {
      setErrorBanner("Headline and body are required.");
      return;
    }
    if (warningHeadline.trim().length < 10) {
      setErrorBanner("Warning headline must have at least 10 characters.");
      return;
    }
    if (warningBody.trim().length < 20) {
      setErrorBanner("Warning advisory body must have at least 20 characters.");
      return;
    }
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 36 * 3600 * 1000).toISOString();
      await createWarning({
        warning_type: warningType,
        headline: warningHeadline,
        body: warningBody,
        mizo_translation: warningMizo || undefined,
        district_id: selectedDistrict,
        affected_entity_type: warningTargetType,
        affected_entity_id: warningTargetId,
        affected_entity_name: warningTargetName,
        issuing_authority_id: `DDMA-${selectedDistrict.replace("dst-", "").toUpperCase()}`,
        expires_at: expiresAt,
        recipients: [
          {
            recipient_id: `rcp-${Date.now()}-1`,
            recipient_name: "PWD Highway Maintenance Division",
            agency_or_community: "PWD",
            contact_channel: "WEB_NOTIFICATION",
            contact_target: "pwd.division@sentinel.ner.internal",
            district_id: selectedDistrict,
          },
          {
            recipient_id: `rcp-${Date.now()}-2`,
            recipient_name: "District Traffic & Police Control",
            agency_or_community: "POLICE",
            contact_channel: "SMS",
            contact_target: "+91-94361-00000",
            district_id: selectedDistrict,
          },
        ],
      });
      setSuccessBanner("Warning created in DRAFT status. Ready for human review and multi-tier authorization.");
      setShowWarningComposer(false);
      setWarningHeadline("");
      setWarningBody("");
      setWarningMizo("");
      loadData();
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Warning creation failed.");
    }
  };

  // Handle Warning Dispatch
  const handleDispatchWarning = async () => {
    if (!selectedWarningForDispatch) return;
    try {
      await dispatchWarning(selectedWarningForDispatch.id, `idemp-disp-${Date.now()}`);
      setSuccessBanner(
        `Warning ${selectedWarningForDispatch.id} successfully dispatched. Truthful provider status recorded (SIMULATED in dev environment).`
      );
      setSelectedWarningForDispatch(null);
      loadData();
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Dispatch failed.");
    }
  };

  // Handle Warning Acknowledge
  const handleAcknowledgeWarning = async () => {
    if (!selectedWarningForAck || !ackRecipientId) return;
    try {
      await acknowledgeWarning(selectedWarningForAck.id, ackRecipientId, ackChannel, ackNotes || undefined);
      setSuccessBanner(`Recipient acknowledgement recorded for warning ${selectedWarningForAck.id}.`);
      setSelectedWarningForAck(null);
      setAckNotes("");
      loadData();
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : "Acknowledgement recording failed.");
    }
  };

  // Filter actions
  const filteredActions = actions.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (priorityFilter !== "ALL" && a.priority !== priorityFilter) return false;
    return true;
  });

  const pendingAuthActions = actions.filter(
    (a) => a.status === "PENDING_REVIEW" || a.status === "RECOMMENDED"
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded">
              NON-AUTONOMOUS CONTROL ACTIVE
            </span>
            {chainValid !== null && (
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${
                  chainValid
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                }`}
              >
                {chainValid ? "LEDGER TAMPER-PROOF" : "CHAIN CORRUPTED"}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1 flex items-center gap-2 whitespace-nowrap">
            <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Operational Intervention &amp; Action Control</span>
          </h1>
        </div>

        {/* District Selector & Refresh */}
        <div className="flex items-center gap-3">
          <label htmlFor="district-select" className="text-xs text-slate-600 dark:text-slate-400 font-medium">Jurisdiction:</label>
          <select
            id="district-select"
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
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded text-xs border border-slate-300 dark:border-slate-700 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Sync
          </button>
        </div>
      </div>

      {/* NON-AUTONOMOUS SAFETY PRINCIPLE BANNER: RIGOROUS VISUAL SEPARATION */}
      <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shadow-sm">
        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          Rigorous Operational Categorization (Non-Autonomous Principle)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-[10px] font-semibold">
          <div className="p-2 rounded bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-cyan-800 dark:text-cyan-300">
            <span className="block font-bold">OBSERVED FACT</span>
            <span className="text-[9px] text-cyan-600 dark:text-cyan-400/80 font-normal">Rainfall, InSAR, Sensors</span>
          </div>
          <div className="p-2 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-indigo-800 dark:text-indigo-300">
            <span className="block font-bold">MODEL ESTIMATE</span>
            <span className="text-[9px] text-indigo-600 dark:text-indigo-400/80 font-normal">Hazard Index, Uncertainty</span>
          </div>
          <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
            <span className="block font-bold">CONSEQUENCE</span>
            <span className="text-[9px] text-amber-600 dark:text-amber-400/80 font-normal">Corridor/Asset Exposure</span>
          </div>
          <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-purple-800 dark:text-purple-300">
            <span className="block font-bold">RECOMMENDATION</span>
            <span className="text-[9px] text-purple-600 dark:text-purple-400/80 font-normal">Decision Support Only</span>
          </div>
          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300">
            <span className="block font-bold">HUMAN DECISION</span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400/80 font-normal">Explicit Authorization</span>
          </div>
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300">
            <span className="block font-bold">EXECUTED ACTION</span>
            <span className="text-[9px] text-blue-600 dark:text-blue-400/80 font-normal">Field Outcome Verified</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic text-center">
          {NON_AUTONOMOUS_ACTION_DISCLAIMER}
        </p>
      </div>

      {/* Notifications / Error / Success */}
      {errorBanner && (
        <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successBanner && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Actions</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{actionSummary?.total_actions ?? actions.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center shadow-sm">
          <span className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-semibold">Recommended</span>
          <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-0.5">
            {actionSummary?.recommended_count ?? actions.filter((a) => a.status === "RECOMMENDED").length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center shadow-sm">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Pending Review</span>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5">
            {actionSummary?.pending_review_count ?? actions.filter((a) => a.status === "PENDING_REVIEW").length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center shadow-sm">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Approved / Queued</span>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
            {actionSummary?.approved_count ?? actions.filter((a) => a.status === "APPROVED").length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center shadow-sm">
          <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-semibold">Completed</span>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">
            {actionSummary?.completed_count ?? actions.filter((a) => a.status === "COMPLETED").length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-center shadow-sm">
          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 uppercase font-semibold">Warnings Dispatched</span>
          <p className="text-xl font-bold text-cyan-700 dark:text-cyan-300 mt-0.5">
            {warningSummary?.dispatched_count ?? warnings.filter((w) => w.status === "DISPATCHED").length}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("queue")}
          className={`px-4 py-2.5 rounded-t transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "queue"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-slate-900/60"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Action Queue ({actions.length})
        </button>

        <button
          onClick={() => setActiveTab("authorization")}
          className={`px-4 py-2.5 rounded-t transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "authorization"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-slate-900/60"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Authorization Queue ({pendingAuthActions.length})
        </button>

        <button
          onClick={() => setActiveTab("warnings")}
          className={`px-4 py-2.5 rounded-t transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "warnings"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-slate-900/60"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Controlled Warnings ({warnings.length})
        </button>

        <button
          onClick={() => setActiveTab("deliveries")}
          className={`px-4 py-2.5 rounded-t transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "deliveries"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-slate-900/60"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Deliveries & Acknowledgements
        </button>

        <button
          onClick={() => setActiveTab("playbooks")}
          className={`px-4 py-2.5 rounded-t transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "playbooks"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-slate-900/60"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          SOP Playbooks ({playbooks.length})
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2.5 rounded-t transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "ledger"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-slate-900/60"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          Cryptographic Warning Ledger
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: ACTION QUEUE */}
      {/* ============================================================ */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold shrink-0">Filter:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-2.5 py-1 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="RECOMMENDED">RECOMMENDED</option>
                <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                <option value="APPROVED">APPROVED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="REJECTED">REJECTED</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full sm:w-auto bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-2.5 py-1 text-xs"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="URGENT">URGENT</option>
                <option value="ELEVATED">ELEVATED</option>
                <option value="ROUTINE">ROUTINE</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing {filteredActions.length} of {actions.length} action recommendations
            </span>
          </div>

          {/* Action List */}
          {filteredActions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800/80">
              <Layers className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">No operational actions found matching filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActions.map((action) => (
                <div
                  key={action.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg p-4 transition shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                            action.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : action.status === "PENDING_REVIEW"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                              : action.status === "RECOMMENDED"
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                              : action.status === "COMPLETED"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                              : action.status === "REJECTED"
                              ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {action.status}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                            action.priority === "CRITICAL"
                              ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                              : action.priority === "URGENT"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                              : action.priority === "ELEVATED"
                              ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {action.priority}
                        </span>

                        {/* Action Type */}
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {action.action_type.replace(/_/g, " ")}
                        </span>

                        <span className="text-[10px] text-slate-400 font-mono">ID: {action.id}</span>
                      </div>

                      <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{action.title}</h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {action.recommendation_rationale}
                      </p>
                    </div>

                    {/* Interactive Action Triggers */}
                    <div className="flex items-center gap-1.5 sm:self-start shrink-0 pt-2 sm:pt-0">
                      {action.status === "RECOMMENDED" && (
                        <button
                          onClick={() => {
                            setSelectedActionForReview(action);
                            setReviewNotes("");
                          }}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded text-xs font-semibold transition"
                        >
                          Technical Review
                        </button>
                      )}

                      {action.status === "PENDING_REVIEW" && (
                        <button
                          onClick={() => {
                            setSelectedActionForAuth(action);
                            setAuthJustification("");
                            setAuthDecision("APPROVE");
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Authorize
                        </button>
                      )}

                      {action.status === "APPROVED" && (
                        <button
                          onClick={() => {
                            setSelectedActionForExec(action);
                            setAssignedAgency(action.recommended_agency_id);
                            setAssignedPersonnel("");
                            setExecutionNotes("");
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Execute / Dispatch
                        </button>
                      )}

                      {action.status === "IN_PROGRESS" && (
                        <button
                          onClick={() => {
                            setSelectedActionForOutcome(action);
                            setGroundObservations("");
                            setMitigationApplied("");
                            setFollowUpRecommended(false);
                          }}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Record Outcome
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-Stage Evidence Chips */}
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] text-slate-500 block uppercase">Target Entity</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {action.target_entity_type}: {action.target_entity_name || action.target_entity_id}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] text-slate-500 block uppercase">Assigned Agency</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">{action.recommended_agency_id}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] text-slate-500 block uppercase">Telemetry / InSAR</span>
                      <span className="font-mono text-cyan-700 dark:text-cyan-300 font-semibold">
                        {action.evidence?.insar_los_displacement_mm !== undefined
                          ? `${action.evidence.insar_los_displacement_mm} mm/yr LOS`
                          : "No Active Creep"}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/70 p-2 rounded border border-slate-200 dark:border-slate-800">
                      <span className="text-[9px] text-slate-500 block uppercase">Expires At</span>
                      <span className="text-slate-700 dark:text-slate-300" suppressHydrationWarning>
                        {formatDateTimeSafe(action.expires_at)}
                      </span>
                    </div>
                  </div>

                  {/* Authorization Stamp if present */}
                  {action.authorization && (
                    <div className="mt-2.5 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span suppressHydrationWarning>
                          <strong>Authorized by:</strong> {action.authorization.authorizer_user_id} (
                          {action.authorization.authorizer_role || action.authorization.role || "AUTHORITY"}) on{" "}
                          {formatDateTimeSafe(action.authorization.decision_timestamp)}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400">
                        {action.authorization.evidence_snapshot_hash
                          ? `Hash: ${action.authorization.evidence_snapshot_hash.slice(0, 16)}...`
                          : `Policy: ${action.authorization.policy_version || action.authorization.authorization_policy_version || "v1.0"}`}
                      </span>
                    </div>
                  )}

                  {/* Outcome Stamp if present */}
                  {action.outcome && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded text-[11px] text-blue-800 dark:text-blue-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>
                          <strong>Ground Result:</strong> {action.outcome.outcome_type} — {action.outcome.ground_observations}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Inspector: {action.outcome.recorded_by || action.outcome.inspector_user_id || "Field Officer"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: DELIBERATE HUMAN AUTHORIZATION QUEUE */}
      {/* ============================================================ */}
      {activeTab === "authorization" && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Authoritative Human Review Protocol</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                Every action recommendation requires certified human sign-off before physical intervention.
                Authorizations are cryptographically hashed and appended to the immutable warning ledger.
              </p>
            </div>
          </div>

          {pendingAuthActions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800/80">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">All recommendations authorized or clear.</p>
              <p className="text-xs text-slate-500 mt-1">No actions currently pending human review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAuthActions.map((act) => (
                <div key={act.id} className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded border border-amber-500/30">
                          {act.status}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{act.title}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">{act.recommendation_rationale}</p>
                      {act.review_notes && (
                        <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                          <span className="text-slate-500 font-bold text-[10px] block uppercase">Reviewer Notes</span>
                          {act.review_notes}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedActionForAuth(act);
                        setAuthJustification("");
                        setAuthDecision("APPROVE");
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow"
                    >
                      <UserCheck className="w-4 h-4" />
                      Open Authorization Dossier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: CONTROLLED WARNINGS & WARNING COMPOSER */}
      {/* ============================================================ */}
      {activeTab === "warnings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Multi-Channel Controlled Warnings</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Warnings require human authorization before dispatch. No model output is ever published directly.
              </p>
            </div>

            <button
              onClick={() => {
                setShowWarningComposer(true);
                setWarningHeadline("");
                setWarningBody("");
                setWarningMizo("");
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Flame className="w-3.5 h-3.5" />
              Compose Controlled Warning
            </button>
          </div>

          {/* Warnings List */}
          {warnings.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800/80">
              <ShieldAlert className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">No active warnings in {selectedDistrict}.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warnings.map((wrn) => (
                <div key={wrn.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                            wrn.status === "DISPATCHED"
                              ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                              : wrn.status === "ACKNOWLEDGED"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : wrn.status === "AUTHORIZED"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {wrn.status}
                        </span>

                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {wrn.warning_type.replace(/_/g, " ")}
                        </span>

                        <span className="text-[10px] text-slate-400 font-mono">ID: {wrn.id}</span>
                      </div>

                      <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">{wrn.headline}</h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{wrn.body}</p>
                      {wrn.mizo_translation && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                          <strong>Mizo:</strong> {wrn.mizo_translation}
                        </p>
                      )}
                    </div>

                    {/* Warning Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {wrn.status === "DRAFT" && (
                        <button
                          onClick={async () => {
                            await reviewWarning(wrn.id, "Operational review completed. Content is verified.");
                            loadData();
                          }}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded text-xs font-semibold"
                        >
                          Review Draft
                        </button>
                      )}

                      {wrn.status === "REVIEW" && (
                        <button
                          onClick={async () => {
                            await authorizeWarning(wrn.id, "APPROVE", "Certified under Section 30 Disaster Management Act.");
                            loadData();
                          }}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded text-xs font-bold"
                        >
                          Authorize Warning
                        </button>
                      )}

                      {wrn.status === "AUTHORIZED" && (
                        <button
                          onClick={() => setSelectedWarningForDispatch(wrn)}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold flex items-center gap-1 shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Dispatch
                        </button>
                      )}

                      {(wrn.status === "DISPATCHED" || wrn.status === "PARTIALLY_ACKNOWLEDGED") && (
                        <button
                          onClick={() => {
                            setSelectedWarningForAck(wrn);
                            setAckRecipientId(wrn.recipients?.[0]?.recipient_id || "");
                            setAckNotes("");
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Record Ack
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Warning Details Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Target: {wrn.affected_entity_type} {wrn.affected_entity_name || wrn.affected_entity_id}
                    </span>
                    <span>Recipients: {wrn.recipients?.length || 0}</span>
                    <span suppressHydrationWarning>Expires: {formatDateSafe(wrn.expires_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: DELIVERIES & ACKNOWLEDGEMENTS */}
      {/* ============================================================ */}
      {activeTab === "deliveries" && (
        <div className="space-y-4">
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 rounded-lg text-xs text-cyan-900 dark:text-cyan-200 flex items-start gap-2">
            <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Truthful Multi-Channel Notification Status</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                The notification adapter never fabricates delivery. Deliveries in development report <strong>SIMULATED</strong> or <strong>NOT_CONFIGURED</strong>.
                Crucially, <strong>DELIVERED ≠ ACKNOWLEDGED</strong>. Formal recipient receipts are separately tracked.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Recent Warning Deliveries & Acknowledgements</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="p-2.5">Warning ID</th>
                    <th className="p-2.5">Recipient</th>
                    <th className="p-2.5">Channel</th>
                    <th className="p-2.5">Provider Status</th>
                    <th className="p-2.5">Acknowledgement</th>
                    <th className="p-2.5">Sent Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {warnings.flatMap((w) =>
                    (w.deliveries || []).map((d) => {
                      const recipient = w.recipients?.find((r) => r.recipient_id === d.recipient_id);
                      const ack = w.acknowledgements?.find((a) => a.recipient_id === d.recipient_id);
                      return (
                        <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="p-2.5 font-mono text-[10px] text-slate-400">{w.id}</td>
                          <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                            {recipient?.recipient_name || d.recipient_id} ({recipient?.agency_or_community || "AGENCY"})
                          </td>
                          <td className="p-2.5 font-mono text-cyan-700 dark:text-cyan-300">{d.channel}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                d.status === "SIMULATED"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  : d.status === "DELIVERED"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="p-2.5">
                            {ack ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ACKNOWLEDGED ({ack.state})
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending Field Receipt</span>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-500 dark:text-slate-400 text-[10px]" suppressHydrationWarning>
                            {d.sent_at ? formatTimeSafe(d.sent_at) : "N/A"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: SOP PLAYBOOKS */}
      {/* ============================================================ */}
      {activeTab === "playbooks" && (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-lg text-xs text-purple-900 dark:text-purple-200">
            <p className="font-bold">Standard Operating Procedure (SOP) Operational Playbooks</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              Playbooks define authoritative procedural guidance for responding to verified consequence intelligence.
              Playbooks <strong>MUST NOT</strong> bypass human authorization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {playbooks.map((pb) => (
              <div key={pb.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 rounded">
                      {pb.playbook_code || pb.code} v{pb.version}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">
                      {pb.applicable_entity_type || (pb.applicable_consequence_types && pb.applicable_consequence_types.join(", ")) || pb.trigger_criteria}
                    </span>
                  </div>

                  <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{pb.name}</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{pb.description}</p>

                  <div className="mt-3">
                    <span className="text-[10px] text-slate-500 font-semibold block uppercase mb-1">Response Steps</span>
                    <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {(pb.steps || []).map((s) => (
                        <li key={s.step_number} className="text-[11px]">
                          <strong>{s.title}:</strong> {s.description}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {(() => {
                    const prohibited = Array.from(
                      new Set([
                        ...(pb.prohibited_actions || []),
                        ...((pb.steps || []).flatMap((s) => s.prohibited_actions || [])),
                      ])
                    );
                    if (prohibited.length === 0) return null;
                    return (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded text-[10px] text-red-800 dark:text-red-300">
                        <span className="font-bold block uppercase">Strictly Prohibited:</span>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                          {prohibited.map((pa, idx) => (
                            <li key={idx}>{pa}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Required Role: {pb.required_authority_role}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active SOP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 6: CRYPTOGRAPHIC WARNING LEDGER PREVIEW */}
      {/* ============================================================ */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Append-Only Cryptographic Warning Ledger</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Each event links SHA-256 header and canonical payload to the previous block.
              </p>
            </div>
            <Link
              href="/ledger"
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              Full Ledger Explorer <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {ledgerEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="p-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">#{entry.sequence_number}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{entry.event_type}</span>
                    <span className="text-[10px] text-slate-500">Actor: {entry.actor_user_id} ({entry.actor_role})</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400" suppressHydrationWarning>{formatDateTimeSafe(entry.recorded_at)}</span>
                </div>
                <div className="mt-1 font-mono text-[9px] text-cyan-700 dark:text-cyan-400 truncate">
                  Hash: {entry.current_event_hash} | Prev: {entry.prev_event_hash}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: DELIBERATE HUMAN AUTHORIZATION DOSSIER */}
      {/* ============================================================ */}
      {selectedActionForAuth && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-amber-500/50 rounded-xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded">
                  MANDATORY HUMAN AUTHORIZATION DOSSIER
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Authorize Operational Intervention
                </h2>
              </div>
              <button
                onClick={() => setSelectedActionForAuth(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Structured Breakdown */}
            <div className="mt-4 space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-2">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">1. Recommended Action & Entity</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{selectedActionForAuth.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{selectedActionForAuth.recommendation_rationale}</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mt-1">
                  Target: {selectedActionForAuth.target_entity_type} {selectedActionForAuth.target_entity_name || selectedActionForAuth.target_entity_id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">2. Where & Jurisdiction</span>
                  <p className="text-slate-900 dark:text-white font-medium mt-0.5">{selectedActionForAuth.district_id} (Mizoram)</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">3. Urgency Priority</span>
                  <p className="text-amber-700 dark:text-amber-400 font-bold mt-0.5">{selectedActionForAuth.priority}</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">4. Multi-Stage Evidence Grounding</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Hazard Index:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">{selectedActionForAuth.evidence?.hazard_index ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">InSAR Deformation:</span>
                    <span className="text-cyan-700 dark:text-cyan-300 font-mono font-semibold">
                      {selectedActionForAuth.evidence?.insar_los_displacement_mm !== undefined
                        ? `${selectedActionForAuth.evidence.insar_los_displacement_mm} mm`
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Uncertainty:</span>
                    <span className="text-amber-700 dark:text-amber-300 font-semibold">{selectedActionForAuth.evidence?.uncertainty_level || "MEDIUM"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">5. What happens if Approved?</span>
                <p className="text-slate-600 dark:text-slate-300 mt-1">
                  Status transitions to <strong>APPROVED</strong>. A cryptographically signed block is recorded to the Warning Ledger.
                  The action is queued for operational dispatch to <strong>{selectedActionForAuth.recommended_agency_id}</strong>.
                </p>
              </div>

              {/* Form Input: Decision & Justification */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Authorization Decision (Select One):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["APPROVE", "REJECT", "REQUEST_MORE_INFORMATION"] as AuthorizationDecision[]).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setAuthDecision(dec)}
                      className={`py-2 px-3 rounded text-xs font-bold border transition text-center ${
                        authDecision === dec
                          ? dec === "APPROVE"
                            ? "bg-emerald-600 text-white border-emerald-500 shadow"
                            : dec === "REJECT"
                            ? "bg-red-600 text-white border-red-500 shadow"
                            : "bg-amber-600 text-white border-amber-500 shadow"
                          : "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {dec.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <label htmlFor="auth-justification" className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Mandatory Audit Justification Comment:
                  </label>
                  <textarea
                    id="auth-justification"
                    rows={3}
                    value={authJustification}
                    onChange={(e) => setAuthJustification(e.target.value)}
                    placeholder="Enter formal justification under Disaster Management Act or administrative SOP..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons: Equal Weighting to Prevent Dark Patterns */}
            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedActionForAuth(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!authJustification || authJustification.length < 5}
                onClick={handleAuthSubmit}
                className={`px-5 py-2 rounded text-xs font-bold transition shadow ${
                  authDecision === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : authDecision === "REJECT"
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-amber-600 hover:bg-amber-500 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Submit Authorization Decision ({authDecision})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: TECHNICAL REVIEW MODAL */}
      {/* ============================================================ */}
      {selectedActionForReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-amber-500/40 rounded-xl max-w-lg w-full p-4 sm:p-5 max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Technical Review: {selectedActionForReview.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Transition action from RECOMMENDED to PENDING_REVIEW and record reviewer observations.
            </p>

            <div className="mt-3">
              <label htmlFor="review-notes-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Review Notes & Engineering Observations:</label>
              <textarea
                id="review-notes-input"
                rows={4}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Observed steep slope cut and saturated soil; verified culvert drainage state..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedActionForReview(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={!reviewNotes || reviewNotes.length < 5}
                onClick={handleReviewSubmit}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold disabled:opacity-50 shadow-sm"
              >
                Confirm Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: EXECUTE / DISPATCH ACTION MODAL */}
      {/* ============================================================ */}
      {selectedActionForExec && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-blue-500/40 rounded-xl max-w-lg w-full p-4 sm:p-5 max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Dispatch Action: {selectedActionForExec.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Assign agency and personnel for on-site physical execution.</p>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <label htmlFor="assigned-agency-input" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Assigned Agency:</label>
                <select
                  id="assigned-agency-input"
                  value={assignedAgency}
                  onChange={(e) => setAssignedAgency(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="PWD">Public Works Department (PWD)</option>
                  <option value="BRO">Border Roads Organisation (BRO)</option>
                  <option value="NHIDCL">NHIDCL Highway Division</option>
                  <option value="DDMA">DDMA Disaster Field Crew</option>
                </select>
              </div>

              <div>
                <label htmlFor="assigned-personnel-input" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Personnel / Team Leads (comma-separated):</label>
                <input
                  id="assigned-personnel-input"
                  type="text"
                  value={assignedPersonnel}
                  onChange={(e) => setAssignedPersonnel(e.target.value)}
                  placeholder="Er. Lalremruata, Inspector Zoramthanga"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="exec-notes-input" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Execution Briefing Notes:</label>
                <textarea
                  id="exec-notes-input"
                  rows={2}
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                  placeholder="Deploy crawler excavator to culvert intake km 18.2..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedActionForExec(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecSubmit}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-sm"
              >
                Start Execution (IN_PROGRESS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: RECORD OUTCOME MODAL */}
      {/* ============================================================ */}
      {selectedActionForOutcome && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-cyan-500/40 rounded-xl max-w-lg w-full p-4 sm:p-5 max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Record Ground Outcome: {selectedActionForOutcome.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Record physical inspection results from field verification.</p>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <label htmlFor="outcome-type-select" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Outcome Type:</label>
                <select
                  id="outcome-type-select"
                  value={outcomeType}
                  onChange={(e) => setOutcomeType(e.target.value as ActionOutcomeType)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="HAZARD_CONFIRMED_MITIGATED">HAZARD_CONFIRMED_MITIGATED</option>
                  <option value="FALSE_ALARM">FALSE_ALARM</option>
                  <option value="STABILIZED">STABILIZED</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="MONITORING_CONTINUED">MONITORING_CONTINUED</option>
                </select>
              </div>

              <div>
                <label htmlFor="ground-obs-input" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Ground Observations:</label>
                <textarea
                  id="ground-obs-input"
                  rows={3}
                  value={groundObservations}
                  onChange={(e) => setGroundObservations(e.target.value)}
                  placeholder="Inspected slope cut at KM 18.2; culvert intake cleared by backhoe crew..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="mitigation-input" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mitigation Applied (Optional):</label>
                <input
                  id="mitigation-input"
                  type="text"
                  value={mitigationApplied}
                  onChange={(e) => setMitigationApplied(e.target.value)}
                  placeholder="Installed geotextile silt fence and diversion berm"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="followUpCheck"
                  checked={followUpRecommended}
                  onChange={(e) => setFollowUpRecommended(e.target.checked)}
                  className="rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-amber-500"
                />
                <label htmlFor="followUpCheck" className="text-slate-700 dark:text-slate-300 text-xs">
                  Follow-up geotechnical inspection recommended within 48h
                </label>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedActionForOutcome(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={!groundObservations || groundObservations.length < 10}
                onClick={handleOutcomeSubmit}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold disabled:opacity-50 shadow-sm"
              >
                Save Outcome & Complete Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: COMPOSE CONTROLLED WARNING */}
      {/* ============================================================ */}
      {showWarningComposer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-amber-500/40 rounded-xl max-w-xl w-full p-4 sm:p-5 max-h-[90vh] overflow-y-auto shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Compose Controlled Warning Advisory</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pre-validated against alarmist language. Created in DRAFT status.
                </p>
              </div>
              <button onClick={() => setShowWarningComposer(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language safety warning if flagged */}
            {warningLanguageIssue && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-xs rounded-lg flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{warningLanguageIssue}</span>
              </div>
            )}

            <div className="mt-3 space-y-3 text-xs">
              <div>
                <label htmlFor="warning-type-select" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Warning Type:</label>
                <select
                  id="warning-type-select"
                  value={warningType}
                  onChange={(e) => setWarningType(e.target.value as WarningType)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="ROAD_HAZARD_ADVISORY">ROAD_HAZARD_ADVISORY</option>
                  <option value="SLOPE_WATCH_BULLETIN">SLOPE_WATCH_BULLETIN</option>
                  <option value="INFRASTRUCTURE_PROXIMITY_NOTICE">INFRASTRUCTURE_PROXIMITY_NOTICE</option>
                  <option value="CIVIL_PROTECTION_ALERT">CIVIL_PROTECTION_ALERT</option>
                  <option value="AGENCY_COORDINATION_ORDER">AGENCY_COORDINATION_ORDER</option>
                </select>
              </div>

              <div>
                <label htmlFor="warning-headline-input" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Headline (English):</label>
                <input
                  id="warning-headline-input"
                  type="text"
                  value={warningHeadline}
                  onChange={(e) => setWarningHeadline(e.target.value)}
                  placeholder="e.g., Road Hazard Advisory: Potential Rockfall Watch on NH-54 km 14-16"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="warning-body-input" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Warning Body & Safe Advisory Microcopy:</label>
                <textarea
                  id="warning-body-input"
                  rows={3}
                  value={warningBody}
                  onChange={(e) => setWarningBody(e.target.value)}
                  placeholder="Continuous rainfall has elevated slope saturation index. Drivers advised to exercise caution and avoid non-essential night travel."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="warning-mizo-input" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mizo Translation (Official Vernacular):</label>
                <input
                  id="warning-mizo-input"
                  type="text"
                  value={warningMizo}
                  onChange={(e) => setWarningMizo(e.target.value)}
                  placeholder="Ruah tui tlak nasat avangin kawng pual ah fimkhur a ngai e."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowWarningComposer(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={Boolean(warningLanguageIssue) || !warningHeadline || !warningBody}
                onClick={handleCreateWarning}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold disabled:opacity-50 shadow-sm"
              >
                Save Warning Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 6: DISPATCH WARNING CONFIRMATION */}
      {/* ============================================================ */}
      {selectedWarningForDispatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-cyan-500/40 rounded-xl max-w-lg w-full p-4 sm:p-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Confirm Multi-Channel Warning Dispatch
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verify the exact message and recipient channels before initiating transmission.
            </p>

            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Exact Headline:</span>
                <p className="text-slate-900 dark:text-white font-bold">{selectedWarningForDispatch.headline}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Exact Body:</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedWarningForDispatch.body}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Channels & Targets:</span>
                <ul className="list-disc list-inside text-cyan-700 dark:text-cyan-300 font-mono text-[11px] mt-0.5">
                  {selectedWarningForDispatch.recipients?.map((r) => (
                    <li key={r.recipient_id}>
                      {r.recipient_name} ({r.contact_channel}: {r.contact_target})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-[11px] text-amber-900 dark:text-amber-300">
              Note: In development and test environments, delivery status will truthfully report <strong>SIMULATED</strong>.
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedWarningForDispatch(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchWarning}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold shadow"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 7: RECORD RECIPIENT ACKNOWLEDGEMENT */}
      {/* ============================================================ */}
      {selectedWarningForAck && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-emerald-500/40 rounded-xl max-w-lg w-full p-4 sm:p-5 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Record Warning Acknowledgement
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Record formal field receipt from emergency response group or patrol.
            </p>

            <div className="mt-3 space-y-2.5 text-xs">
              <div>
                <label htmlFor="ack-recipient-select" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Acknowledging Recipient:</label>
                <select
                  id="ack-recipient-select"
                  value={ackRecipientId}
                  onChange={(e) => setAckRecipientId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                >
                  {selectedWarningForAck.recipients?.map((r) => (
                    <option key={r.recipient_id} value={r.recipient_id}>
                      {r.recipient_name} ({r.agency_or_community})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ack-channel-select" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Confirmation Channel:</label>
                <select
                  id="ack-channel-select"
                  value={ackChannel}
                  onChange={(e) => setAckChannel(e.target.value as DeliveryChannel)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="WEB_NOTIFICATION">WEB_NOTIFICATION</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">EMAIL</option>
                  <option value="VHF_RADIO_RELAY">VHF_RADIO_RELAY</option>
                </select>
              </div>

              <div>
                <label htmlFor="ack-notes-input" className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Operational Receipt Notes:</label>
                <textarea
                  id="ack-notes-input"
                  rows={2}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  placeholder="Officer on duty confirmed advisory and dispatched patrol..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedWarningForAck(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={!ackRecipientId}
                onClick={handleAcknowledgeWarning}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow-sm"
              >
                Record Acknowledgement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
