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
  Phone,
  Layers,
  Compass,
  CheckCircle2,
  Copy,
  Check,
  Key,
  X,
  Zap,
  CloudRain,
  ChevronRight,
  ExternalLink,
  Info,
  SlidersHorizontal,
  MapPin,
  Trash2,
  Radio,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  ChatMessage,
  DisasterTopicGroup,
  EmergencyContact,
  fetchDisasterTopics,
  fetchEmergencyContacts,
  getStoredGeminiKey,
  sendDisasterMessage,
  setStoredGeminiKey,
  verifyGeminiKey,
} from "@/lib/disasterChat";
import { MarkdownContent } from "@/components/chat/MarkdownContent";

const NER_STATES = [
  "Mizoram",
  "Assam",
  "Sikkim",
  "Meghalaya",
  "Nagaland",
  "Arunachal Pradesh",
  "Manipur",
  "Tripura",
];

export default function SentinelAIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState("Mizoram");
  const [selectedDistrict, setSelectedDistrict] = useState("Aizawl");
  const [topicGroups, setTopicGroups] = useState<DisasterTopicGroup[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [geminiKey, setGeminiKey] = useState("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyVerifying, setKeyVerifying] = useState(false);
  const [keyStatusMsg, setKeyStatusMsg] = useState<{ valid?: boolean; text: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "SENTINEL AI — Autonomous Disaster Intelligence & Neural Copilot";
    const key = getStoredGeminiKey();
    setGeminiKey(key);
    setKeyInput(key);

    fetchDisasterTopics().then((data) => {
      if (data && data.length > 0) setTopicGroups(data);
    });

    fetchEmergencyContacts(selectedState).then((data) => {
      if (data && data.length > 0) setContacts(data);
    });

    // Default welcome message
    setMessages([
      {
        role: "model",
        content: `### 🛡️ Welcome to SENTINEL AI\n\nI am your autonomous Geological & Hydro-Meteorological Intelligence Assistant, compiling operational data from **NDMA**, **GSI**, **IMD**, and **Sentinel-1 InSAR** satellite observations across Northeast India.\n\n### Compiled Telemetry Status:\n- **24h Rainfall**: 114.5 mm (Threshold Alert Active in Aizawl)\n- **Surface Creep**: -28.4 to -42.8 mm/yr LOS subsidence along NH-54\n- **Slope Stability**: Fs = 1.04 (Subcritical)\n- **Corridor Advisory**: Single-lane convoy active on NH-54 KM 42+350\n\nAsk any question or select a topic prompt below to begin.`,
        category: "System Briefing",
        modelUsed: key ? "Google Gemini 3.6 Flash" : "Sentinel Disaster Knowledge Engine",
        isLiveGemini: Boolean(key),
        checklist: [
          "Verify local IMD rainfall & GSI 4-tier warning alerts.",
          "Keep National Emergency 112 or State Helpline 1070 on speed dial.",
          "Inspect hillside drainage channels for blockages before heavy downpours.",
        ],
        citations: [
          "NDMA Guidelines for Landslide & Flood Disaster Management",
          "Geological Survey of India (GSI) 4-Tier Operational Warning Matrix",
        ],
      },
    ]);
  }, []);

  useEffect(() => {
    fetchEmergencyContacts(selectedState).then((data) => {
      if (data && data.length > 0) setContacts(data);
    });
  }, [selectedState]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
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
      const response = await sendDisasterMessage(query, messages, selectedState, selectedDistrict);
      const assistantMsg: ChatMessage = {
        role: "model",
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        category: response.disaster_category,
        modelUsed: response.model_used,
        isLiveGemini: response.is_live_gemini,
        checklist: response.actionable_checklist,
        contacts: response.emergency_contacts,
        citations: response.source_citations,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: `⚠️ **Unable to fetch disaster intelligence**: ${err?.message || "Connection timed out"}. Please call National Emergency at **112** or State Helpline at **1070** if in immediate danger.`,
          category: "Error Fallback",
          modelUsed: "Emergency Safe Mode",
          isLiveGemini: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSaveKey = async () => {
    if (!keyInput.trim()) {
      setStoredGeminiKey("");
      setGeminiKey("");
      setKeyStatusMsg({ valid: true, text: "Key cleared. Using Sentinel Knowledge Engine." });
      setTimeout(() => setIsKeyModalOpen(false), 1200);
      return;
    }

    setKeyVerifying(true);
    setKeyStatusMsg(null);
    try {
      const res = await verifyGeminiKey(keyInput.trim());
      if (res.valid) {
        setStoredGeminiKey(keyInput.trim());
        setGeminiKey(keyInput.trim());
        setKeyStatusMsg({ valid: true, text: "Google Gemini 3.6 Flash activated successfully!" });
        setTimeout(() => setIsKeyModalOpen(false), 1500);
      } else {
        setKeyStatusMsg({ valid: false, text: res.message || "Failed to authenticate key." });
      }
    } catch (err: any) {
      setKeyStatusMsg({ valid: false, text: "Network error validating key with API." });
    } finally {
      setKeyVerifying(false);
    }
  };

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleChecklist = (itemKey: string) => {
    setCheckedItems((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: "model",
        content: `**SENTINEL AI** conversation reset. Ask any question regarding slope stability, rainfall, or emergency incident command.`,
        category: "System",
      },
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-gov-blue dark:hover:text-sky-300 transition-colors font-bold text-gov-blue dark:text-sky-400">
          SENTINEL AI
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <Link href="/command-center" className="hover:text-gov-blue dark:hover:text-sky-300 transition-colors flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Command Center</span>
        </Link>
      </nav>

      {/* Main Header Banner */}
      <div className="relative p-6 rounded-3xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xs overflow-hidden transition-colors">
        <div className="absolute -right-12 -top-12 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-16 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 shadow-xs">
                <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
                    SENTINEL AI
                  </h1>
                  <span
                    className="px-3 py-1 rounded-full text-[11px] font-sans font-extrabold uppercase tracking-widest bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/80 shadow-xs flex items-center gap-2 shrink-0"
                  >
                    <span className="relative flex h-2 w-2 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 dark:bg-purple-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-600 dark:bg-purple-300" />
                    </span>
                    <span>NEURAL COPILOT</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Autonomously compiles multi-modal geological, hydrological, and satellite intelligence for Northeast India.
                </p>
              </div>
            </div>
          </div>

          {/* Engine Status & Regional Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Regional Selector */}
            <div className="flex items-center bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 shadow-2xs transition-colors">
              <MapPin className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400 mr-1.5 shrink-0" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-transparent border-none text-slate-900 dark:text-white font-semibold focus:outline-none cursor-pointer pr-1"
              >
                {NER_STATES.map((s) => (
                  <option key={s} value={s} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Engine Status Pill */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
              title="Configure AI Engine"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              <span>{geminiKey ? "Gemini 3.6 Flash" : "Knowledge Engine"}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${geminiKey ? "bg-emerald-500 animate-pulse" : "bg-cyan-500"}`} />
            </button>

            {/* Clear Chat Button */}
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Telemetry & Quick Prompts Sidebar + Right Chat Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Compiled Telemetry & Quick Prompts */}
        <div className="lg:col-span-4 space-y-5">
          {/* Autonomous Telemetry Digest */}
          <div className="p-4 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sentinel-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Live Multi-Modal Digest</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-sentinel-950/70 border border-slate-200/80 dark:border-sentinel-800">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 min-w-0 font-medium">
                  <CloudRain className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">24h Rainfall:</span>
                </span>
                <span className="font-bold text-slate-900 dark:text-white shrink-0 whitespace-nowrap tabular-nums">
                  114.5 mm
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-sentinel-950/70 border border-slate-200/80 dark:border-sentinel-800">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 min-w-0 font-medium">
                  <Activity className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span className="truncate">InSAR Velocity:</span>
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400 shrink-0 whitespace-nowrap tabular-nums">
                  -35.6 mm/yr
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-sentinel-950/70 border border-slate-200/80 dark:border-sentinel-800">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 min-w-0 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">Safety Factor:</span>
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 whitespace-nowrap tabular-nums">
                  Fs 1.04
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-sentinel-950/70 border border-slate-200/80 dark:border-sentinel-800">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 min-w-0 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Alert Tier:</span>
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0 whitespace-nowrap">
                  Level 3 (Red)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Topic Prompts */}
          <div className="p-4 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-sentinel-800 pb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Recommended Inquiries
              </span>
            </div>
            <div className="space-y-1.5">
              {[
                { title: "Slope Stability & Tension Cracks", prompt: "Explain how pore-water pressure and tension cracks cause slope failure along NH-54." },
                { title: "Cloudburst & Flash Flood Protocol", prompt: "What are the immediate survival actions during a cloudburst in hilly terrain?" },
                { title: "Highway Corridor Status", prompt: "What is the operational status of NH-54 (Mizoram) and NH-27 (Assam)?" },
                { title: "SDRF Incident Command", prompt: "What are the SDRF and NDRF standard mobilization protocols for red alert landslides?" },
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(p.prompt)}
                  className="w-full text-left p-2.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-emerald-50/70 dark:bg-sentinel-950 dark:hover:bg-sentinel-800 border border-slate-200/80 hover:border-emerald-300 dark:border-sentinel-800 dark:hover:border-emerald-700/60 text-slate-800 dark:text-slate-200 transition-all flex items-center justify-between group shadow-2xs"
                >
                  <span className="line-clamp-1">{p.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-transform group-hover:translate-x-0.5 shrink-0 ml-1.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Emergency Helplines Widget */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
              <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Emergency Contacts ({selectedState})</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-sentinel-900 border border-amber-200 dark:border-amber-800/40">
                <span className="text-slate-600 dark:text-slate-300">National Emergency:</span>
                <a href="tel:112" className="font-mono font-bold text-gov-blue dark:text-amber-400 hover:underline">112</a>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-sentinel-900 border border-amber-200 dark:border-amber-800/40">
                <span className="text-slate-600 dark:text-slate-300">State Disaster Management:</span>
                <a href="tel:1070" className="font-mono font-bold text-gov-blue dark:text-amber-400 hover:underline">1070</a>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-sentinel-900 border border-amber-200 dark:border-amber-800/40">
                <span className="text-slate-600 dark:text-slate-300">NDRF Control Room:</span>
                <a href="tel:1078" className="font-mono font-bold text-gov-blue dark:text-amber-400 hover:underline">1078</a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: ChatGPT / Gemini Full Conversational Stream */}
        <div className="lg:col-span-8 flex flex-col h-[700px] rounded-3xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xl overflow-hidden">
          {/* Chat Stream Header */}
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-sentinel-950 border-b border-slate-200 dark:border-sentinel-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                SENTINEL AI Interactive Workspace
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {messages.length} messages
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs bg-slate-50/40 dark:bg-sentinel-950/40">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                      isUser
                        ? "bg-gov-blue text-white"
                        : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40"
                    }`}
                  >
                    {isUser ? "U" : <Bot className="w-4 h-4 text-emerald-500" />}
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] p-4 rounded-2xl leading-relaxed space-y-3 shadow-xs ${
                      isUser
                        ? "bg-gradient-to-r from-gov-blue to-blue-700 text-white rounded-tr-xs"
                        : "bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 text-slate-800 dark:text-slate-100 rounded-tl-xs"
                    }`}
                  >
                    <MarkdownContent content={m.content} isUser={isUser} />

                    {m.checklist && m.checklist.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-200 dark:border-sentinel-800 space-y-2">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                          Key Safety &amp; Evacuation Protocol:
                        </span>
                        {m.checklist.map((item, cIdx) => {
                          const checkKey = `${idx}-${cIdx}`;
                          const isChecked = Boolean(checkedItems[checkKey]);
                          return (
                            <div
                              key={cIdx}
                              onClick={() => toggleChecklist(checkKey)}
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
                            className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-sentinel-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-sentinel-700/60"
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
                              <span>Copy Response</span>
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
                <span>SENTINEL AI is compiling intelligence...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* ChatGPT / Gemini Input Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 bg-white dark:bg-sentinel-900 border-t border-slate-200 dark:border-sentinel-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask SENTINEL AI about landslides, rainfall thresholds, or road conditions..."
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-sentinel-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-gov-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-xs sm:text-sm flex items-center gap-2 disabled:opacity-40 transition-all shadow-md shrink-0"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Configure Gemini API Key
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Enter your Google AI Studio Gemini API key to activate live <strong>Gemini 2.5 Flash</strong> reasoning. If omitted, the platform uses its built-in offline NDMA/GSI Knowledge Engine.
            </p>

            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            {keyStatusMsg && (
              <div className={`p-2.5 rounded-xl text-xs ${keyStatusMsg.valid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"}`}>
                {keyStatusMsg.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyAndSaveKey}
                disabled={keyVerifying}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
              >
                {keyVerifying ? "Verifying..." : "Save Key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
