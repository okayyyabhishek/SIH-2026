"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  Send,
  X,
  RefreshCw,
  Maximize2,
  ChevronDown,
  AlertTriangle,
  Phone,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  ChatMessage,
  sendDisasterMessage,
  getStoredGeminiKey,
} from "@/lib/disasterChat";
import { MarkdownContent } from "@/components/chat/MarkdownContent";

export function DisasterCopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLiveGemini, setIsLiveGemini] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLiveGemini(Boolean(getStoredGeminiKey()));
    setMessages([
      {
        role: "model",
        content: "👋 **Sentinel Mini** is operational.\n\nI compile real-time landslide risk, rainfall thresholds, and transport lifelines across Northeast India.\n\nAsk me about current hazard alerts, slope stability, or evacuation protocols.",
        category: "Disaster Advisory",
      },
    ]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setLoading(true);

    try {
      const resp = await sendDisasterMessage(query, messages, "Mizoram");
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: resp.reply,
          category: resp.disaster_category,
          checklist: resp.actionable_checklist,
          citations: resp.source_citations,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "⚠️ Unable to connect to disaster network. Dial **112** for immediate emergencies or **1070** for State Disaster Management.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside aria-label="Sentinel Mini Copilot" className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div className="mb-3 w-[360px] sm:w-[410px] h-[530px] rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Drawer Header with Explicit High-Contrast Text */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-sentinel-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-bold tracking-wide select-none"
                    style={{ color: "#ffffff" }}
                  >
                    Sentinel Mini
                  </span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono block select-none"
                  style={{ color: "#94a3b8" }}
                >
                  {isLiveGemini ? "Gemini 3.6 Flash • Active" : "Knowledge Engine • Ready"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/sentinel-ai"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                title="Open full SENTINEL AI Console"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-300 hover:text-white" style={{ color: "#cbd5e1" }} />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                title="Close Sentinel Mini"
              >
                <X className="w-4 h-4 text-slate-300 hover:text-white" style={{ color: "#cbd5e1" }} />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs bg-slate-50/50 dark:bg-sentinel-950/40">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      isUser
                        ? "bg-gov-blue text-white shadow-xs"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {isUser ? "U" : <Sparkles className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[85%] p-3 rounded-2xl leading-relaxed space-y-2 shadow-xs ${
                      isUser
                        ? "bg-gradient-to-r from-gov-blue to-blue-700 text-white rounded-tr-xs"
                        : "bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-slate-800 dark:text-slate-100 rounded-tl-xs"
                    }`}
                  >
                    <MarkdownContent content={m.content} isUser={isUser} />

                    {m.checklist && m.checklist.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-sentinel-800 space-y-1.5">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                          Key Safety Protocol:
                        </span>
                        {m.checklist.slice(0, 3).map((c, cIdx) => (
                          <div key={cIdx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {m.citations && m.citations.length > 0 && (
                      <div className="pt-1.5 text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1 border-t border-slate-100 dark:border-sentinel-800/60">
                        <span className="font-semibold">Source:</span>
                        <span>{m.citations[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 p-2.5 bg-white dark:bg-sentinel-900 rounded-xl border border-slate-200 dark:border-sentinel-800">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>Sentinel Mini compiling disaster intelligence...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Topic Prompts */}
          <div className="px-3 py-2 bg-slate-100/80 dark:bg-sentinel-950 border-t border-slate-200 dark:border-sentinel-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleSend("What are the warning signs of a slope failure?")}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-700/60 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap shrink-0 transition-colors shadow-2xs"
            >
              ⚠️ Slope Signs
            </button>
            <button
              type="button"
              onClick={() => handleSend("What is the cloudburst and flash flood protocol?")}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-700/60 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap shrink-0 transition-colors shadow-2xs"
            >
              🌧️ Cloudburst
            </button>
            <button
              type="button"
              onClick={() => handleSend("What is the current landslide status on NH-54 corridor?")}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-700/60 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap shrink-0 transition-colors shadow-2xs"
            >
              🛣️ NH-54 Status
            </button>
            <button
              type="button"
              onClick={() => handleSend("Give me emergency helpline numbers for Mizoram")}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-700/60 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 whitespace-nowrap shrink-0 transition-colors shadow-2xs"
            >
              📞 Helplines
            </button>
          </div>

          {/* Mini Composer (ChatGPT / Gemini Style) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white dark:bg-sentinel-900 border-t border-slate-200 dark:border-sentinel-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Sentinel Mini anything..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-emerald-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-2 rounded-xl bg-gov-blue hover:bg-gov-blue-dark dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white disabled:opacity-40 transition-all shrink-0 shadow-xs"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Trigger Floating Button: Renamed to Sentinel Mini */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 rounded-full bg-gradient-to-r from-gov-blue to-gov-blue-dark dark:from-emerald-600 dark:to-teal-600 text-white font-semibold text-xs shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-white/20 group"
      >
        <div className="relative">
          <Bot className="w-4 h-4 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
        </div>
        <span className="tracking-wide" style={{ color: "#ffffff" }}>Sentinel Mini</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
      </button>
    </aside>
  );
}
