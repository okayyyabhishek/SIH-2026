"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  Send,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  Radio,
  CloudRain,
  Activity,
  Layers,
  Phone,
  Maximize2,
  SlidersHorizontal,
  Compass,
  Cpu,
  Volume2,
} from "lucide-react";
import {
  ChatMessage,
  sendDisasterMessage,
  getStoredGeminiKey,
} from "@/lib/disasterChat";
import { MarkdownContent } from "@/components/chat/MarkdownContent";

export function SentinelAIBriefingSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLiveGemini, setIsLiveGemini] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedBriefing, setCopiedBriefing] = useState(false);
  const [briefingTimestamp, setBriefingTimestamp] = useState("Just now");
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLiveGemini(Boolean(getStoredGeminiKey()));
    // Initial autonomous welcome message
    setMessages([
      {
        role: "model",
        content: `### 🤖 SENTINEL AI Operational Assistant Ready\n\nI have compiled the multi-modal geotechnical and meteorological telemetry across the Northeast Region. You can ask any question regarding:\n- **Slope stability & Mohr-Coulomb failure risk**\n- **Rainfall triggers & flash flood inundation**\n- **Highway corridor transit status (NH-54, NH-27, NH-6)**\n- **NDMA/SDRF evacuation and incident command protocols**\n\nSelect a prompt below or type your emergency dispatch query.`,
        category: "Autonomous Intelligence",
        checklist: [
          "Continuous InSAR satellite monitoring of Durtlang scarp active.",
          "Precipitation alert broadcast to Aizawl & Lunglei district administration.",
          "BRO clearing equipment deployed along NH-54 KM 42+350.",
        ],
        citations: [
          "Geological Survey of India (GSI) 4-Tier Matrix",
          "National Disaster Management Authority (NDMA) Standard Operating Procedure",
          "IMD Regional Meteorological Centre, Guwahati",
        ],
      },
    ]);
  }, []);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setLoading(true);

    try {
      const resp = await sendDisasterMessage(query, messages, "Mizoram");
      const modelMsg: ChatMessage = {
        role: "model",
        content: resp.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        category: resp.disaster_category,
        modelUsed: resp.model_used,
        isLiveGemini: resp.is_live_gemini,
        checklist: resp.actionable_checklist,
        citations: resp.source_citations,
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "⚠️ **Disaster Network Alert**: Unable to connect to inference nodes. For immediate emergency support, call National Emergency at **112** or State Disaster Helpline at **1070**.",
          category: "Emergency Fallback",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyBriefing = () => {
    const text = `SENTINEL AI Autonomous Executive Briefing:\n- 24h Rainfall: 114.5 mm (Threshold Triggered)\n- Satellite InSAR Creep: -28.4 mm/yr to -42.8 mm/yr LOS\n- Geotech Fs: 1.04 (Subcritical)\n- Critical Corridor: NH-54 KM 42+350 (Mizoram) Single-lane Convoy\n- GSI Composite Alert: Level 3 (Red/Orange Urgent Response)`;
    navigator.clipboard.writeText(text);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2000);
  };

  const refreshTelemetry = () => {
    setIsRefreshingTelemetry(true);
    setTimeout(() => {
      setIsRefreshingTelemetry(false);
      setBriefingTimestamp("Refreshed just now");
    }, 800);
  };

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      aria-label="SENTINEL AI Autonomous Command Station"
      className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-sentinel-900 shadow-xl overflow-hidden"
    >
      {/* 1. Header Banner */}
      <div className="relative p-5 sm:p-7 bg-white dark:bg-sentinel-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white overflow-hidden transition-colors">
        {/* Glow Accents */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 left-1/3 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 shadow-xs">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading flex items-center gap-2">
                  <span>SENTINEL AI</span>
                </h2>
                <span className="px-3 py-1 rounded-full text-[10px] font-sans font-extrabold tracking-widest uppercase bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/80 shadow-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-ping" />
                  AUTONOMOUS MULTI-MODAL INTELLIGENCE
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Autonomously compiles real-time InSAR satellite deformation, hydro-meteorological rainfall thresholds, and geotechnical safety indices without manual setup.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={refreshTelemetry}
              disabled={isRefreshingTelemetry}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              title="Refresh Telemetry Stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingTelemetry ? "animate-spin text-emerald-600 dark:text-emerald-400" : ""}`} />
              <span className="hidden sm:inline">{briefingTimestamp}</span>
            </button>
            <Link
              href="/sentinel-ai"
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-gov-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
            >
              <span>Full SENTINEL AI Console</span>
              <Maximize2 className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Autonomous Multi-Modal Compiled Intelligence Cards */}
      <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-sentinel-950/60 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Autonomous Live Telemetry Synthesis (Compiled Across Platform)
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCopyBriefing}
            className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-gov-blue dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            {copiedBriefing ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-500">Briefing Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Hydro Rain Telemetry */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                24h IMD / GPM Rain
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                ACTIVE TRIGGER
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              114.5 mm
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
              Aizawl &amp; Southern Mizoram. Saturated regolith layer with 82% flash runoff potential.
            </p>
          </div>

          {/* InSAR Deformation */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-purple-500" />
                Sentinel-1 InSAR Creep
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                LOS SUBSIDENCE
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              -28.4 to -42.8 mm/yr
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
              Tension fissure acceleration detected along Durtlang scarp and NH-54 KM 42 slope face.
            </p>
          </div>

          {/* Geotech Factor of Safety */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                Slope Factor of Safety
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                SUBCRITICAL
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
              Fs = 1.04
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
              Pore pressure spike at 8.4 kPa. Mohr-Coulomb shear strength degraded by 31%.
            </p>
          </div>

          {/* Corridors & Early Warning Tier */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                GSI / NDMA Alert Tier
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white animate-pulse">
                LEVEL 3 RED
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              NH-54 (Mizoram)
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
              Single-lane restricted convoy. Preventive emergency SDRF response active.
            </p>
          </div>
        </div>

        {/* Autonomous Executive Synthesis Quote */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0 mt-0.5 shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            <strong className="text-emerald-700 dark:text-emerald-400 mr-1.5 font-bold uppercase tracking-wide">
              SENTINEL AI Autonomous Assessment:
            </strong>
            Multi-modal convergence confirms elevated shear stress along NH-54 (KM 42+350) and Durtlang North scarp. Sustained precipitation over the past 24 hours has driven pore pressures to critical thresholds (Fs: 1.04). Pre-monsoon disaster response protocol is automatically activated: commercial freight halted, drone hazard reconnaissance mobilized, and emergency staging shelters alerted.
          </div>
        </div>
      </div>

      {/* 3. Interactive ChatGPT / Gemini Style Query Console */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ask SENTINEL AI Anything
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              (Live conversational emergency copilot like ChatGPT &amp; Gemini)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {isLiveGemini ? "⚡ Google Gemini 3.6 Flash Connected" : "🛡️ Offline Knowledge Engine Active"}
          </span>
        </div>

        {/* Suggestion Prompts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => handleSend("What are the immediate evacuation protocols for Durtlang Scarp?")}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-sentinel-800 hover:bg-slate-200 dark:hover:bg-sentinel-700 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 border border-slate-200 dark:border-slate-700"
          >
            🚨 Durtlang Evacuation Protocols
          </button>
          <button
            type="button"
            onClick={() => handleSend("Analyze 24h rainfall vs critical landslide thresholds for Aizawl")}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-sentinel-800 hover:bg-slate-200 dark:hover:bg-sentinel-700 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 border border-slate-200 dark:border-slate-700"
          >
            🌧️ 24h Rainfall Threshold Analysis
          </button>
          <button
            type="button"
            onClick={() => handleSend("What is the current traffic and landslide status on NH-54 corridor?")}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-sentinel-800 hover:bg-slate-200 dark:hover:bg-sentinel-700 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 border border-slate-200 dark:border-slate-700"
          >
            🛣️ NH-54 Corridor Status
          </button>
          <button
            type="button"
            onClick={() => handleSend("List official emergency helpline numbers for Mizoram and Assam")}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-sentinel-800 hover:bg-slate-200 dark:hover:bg-sentinel-700 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 border border-slate-200 dark:border-slate-700"
          >
            📞 Emergency Helplines
          </button>
        </div>

        {/* Chat Feed */}
        <div className="h-[340px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-sentinel-950/70 p-4 space-y-4 text-xs">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                    isUser
                      ? "bg-gov-blue text-white"
                      : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40"
                  }`}
                >
                  {isUser ? "U" : <Bot className="w-4 h-4 text-emerald-500" />}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[78%] p-4 rounded-2xl leading-relaxed space-y-2.5 shadow-xs ${
                    isUser
                      ? "bg-gradient-to-r from-gov-blue to-blue-700 text-white rounded-tr-xs"
                      : "bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-slate-800 dark:text-slate-100 rounded-tl-xs"
                  }`}
                >
                  <MarkdownContent content={m.content} isUser={isUser} />

                  {m.checklist && m.checklist.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-sentinel-800 space-y-2">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                        Actionable Incident Checklist:
                      </span>
                      {m.checklist.map((item, cIdx) => {
                        const checkKey = `${idx}-${cIdx}`;
                        const isChecked = Boolean(checkedItems[checkKey]);
                        return (
                          <div
                            key={cIdx}
                            onClick={() => toggleCheck(checkKey)}
                            className="flex items-start gap-2 text-[11px] cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className={isChecked ? "line-through text-slate-400" : ""}>
                              {item}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {m.citations && m.citations.length > 0 && (
                    <div className="pt-2 text-[10px] text-slate-400 dark:text-slate-500 flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-sentinel-800/60">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Sources:</span>
                      {m.citations.map((cit, citIdx) => (
                        <span
                          key={citIdx}
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-sentinel-800 text-slate-600 dark:text-slate-300"
                        >
                          {cit}
                        </span>
                      ))}
                    </div>
                  )}

                  {!isUser && (
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopy(m.content, idx)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 p-3 bg-white dark:bg-sentinel-900 rounded-xl border border-slate-200 dark:border-sentinel-800 max-w-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
              <span>SENTINEL AI is formulating disaster response...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar (ChatGPT / Gemini style) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask SENTINEL AI about hazard risk, road conditions, or disaster protocols..."
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-sentinel-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-gov-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-xs sm:text-sm flex items-center gap-2 disabled:opacity-40 transition-all shadow-md shrink-0"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
