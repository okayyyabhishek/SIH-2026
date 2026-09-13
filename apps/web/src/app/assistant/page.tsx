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

export default function DisasterAssistantPage() {
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

  // Initialize stored key and topics on load
  useEffect(() => {
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
        content: `### 🛡️ Sentinel Disaster AI Copilot Online\n\nI am your specialized Geological & Hydro-Meteorological Disaster Intelligence Assistant grounded in **NDMA**, **GSI**, and **IMD** incident command protocols across Northeast India.\n\nAsk me about:\n- **Landslide Early Warning & Slope Stabilization** (Mohr-Coulomb failure, tension cracks, pore water pressure)\n- **Flash Flood & Cloudburst Survival** (river surges, evacuation paths, high-ground shelters)\n- **Emergency Incident Command** (NDRF/SDRF mobilization, BRO highway corridors, helplines)\n\nSelect a recommended topic below or type your emergency query directly.`,
        category: "System Briefing",
        modelUsed: key ? "Google Gemini 2.5 Flash" : "Sentinel Disaster Knowledge Engine",
        isLiveGemini: Boolean(key),
        checklist: [
          "Check local IMD rainfall & GSI landslide early warning alerts.",
          "Keep national emergency 112 or state helpline 1070 on speed dial.",
          "Inspect hillside drainage channels for blockages before heavy rainfall.",
        ],
        citations: [
          "NDMA Guidelines for Landslide & Flood Management",
          "Geological Survey of India (GSI) 4-Tier Warning Protocol",
        ],
      },
    ]);
  }, []);

  // Update contacts when state changes
  useEffect(() => {
    fetchEmergencyContacts(selectedState).then((data) => {
      if (data && data.length > 0) setContacts(data);
    });
  }, [selectedState]);

  // Auto scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setLoading(true);

    try {
      const response = await sendDisasterMessage(query, messages, selectedState, selectedDistrict);
      const assistantMsg: ChatMessage = {
        role: "model",
        content: response.reply,
        timestamp: new Date().toISOString(),
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
        setKeyStatusMsg({ valid: true, text: "Google Gemini 2.5 Flash activated successfully!" });
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-gov-blue dark:hover:text-sky-300 transition-colors">
          Command Center
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-slate-700 dark:text-slate-300">Intelligence</span>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-gov-blue dark:text-sky-400 font-medium">SENTINEL AI</span>
      </nav>

      {/* Main Header Banner */}
      <div className="relative p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-sentinel-900 to-slate-950 border border-slate-800 text-white shadow-xl overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    SENTINEL AI
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE ASSISTANT
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Google Gemini &amp; NDMA/GSI Geological Disaster Intelligence for the North Eastern Region
                </p>
              </div>
            </div>
          </div>

          {/* Engine Status & Regional Control */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Regional Selector */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-sky-400 mr-1.5 shrink-0" />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none cursor-pointer pr-1"
              >
                {NER_STATES.map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Engine Status Pill */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                geminiKey
                  ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60"
                  : "bg-sky-950/60 border-sky-500/50 text-sky-300 hover:bg-sky-900/60"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-current" />
              <span>{geminiKey ? "Gemini 2.5 Flash Active" : "Built-in Knowledge Engine"}</span>
              <Key className="w-3 h-3 ml-1 opacity-70" />
            </button>

            {/* Clear Chat Button */}
            {messages.length > 1 && (
              <button
                type="button"
                onClick={() => setMessages(messages.slice(0, 1))}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                title="Reset Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Chat Panel (8 cols) + Tactical Reference Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chat Stream & Composer (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-[650px] rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-sm overflow-hidden">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isUser
                        ? "bg-gov-blue text-white"
                        : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                    }`}
                  >
                    {isUser ? <Compass className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble Card */}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-3 shadow-xs ${
                      isUser
                        ? "bg-gov-blue text-white rounded-tr-none"
                        : "bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                    }`}
                  >
                    {/* Header info for assistant */}
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-sentinel-800 pb-2 text-[11px]">
                        <div className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {msg.category || "Disaster Copilot"}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">{msg.modelUsed || "Sentinel Engine"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, idx)}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-sentinel-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          title="Copy text"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Markdown / Text Body */}
                    <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>

                    {/* Actionable Checklist (if present) */}
                    {!isUser && msg.checklist && msg.checklist.length > 0 && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Immediate Action Checklist</span>
                        </div>
                        <div className="space-y-1.5">
                          {msg.checklist.map((item, cIdx) => {
                            const itemKey = `${idx}-${cIdx}`;
                            const isChecked = checkedItems[itemKey];
                            return (
                              <label
                                key={cIdx}
                                className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none group"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked || false}
                                  onChange={() => toggleChecklist(itemKey)}
                                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className={isChecked ? "line-through text-slate-400 dark:text-slate-500" : ""}>
                                  {item}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Citations (if present) */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-sentinel-800/80 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-semibold uppercase tracking-wider">Grounding:</span>
                        {msg.citations.map((cite, citeIdx) => (
                          <span
                            key={citeIdx}
                            className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-sentinel-800 text-slate-600 dark:text-slate-300"
                          >
                            {cite}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>Synthesizing geological &amp; hydrological intelligence...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Prompt Chips Bar */}
          <div className="p-3 bg-slate-50/80 dark:bg-sentinel-950/80 border-t border-slate-200 dark:border-sentinel-800/80 overflow-x-auto flex items-center gap-2 no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Recommended:</span>
            </span>
            {topicGroups.flatMap((g) => g.topics).slice(0, 4).map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSendMessage(topic.prompt)}
                disabled={loading}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all whitespace-nowrap shrink-0 shadow-2xs"
              >
                {topic.title}
              </button>
            ))}
          </div>

          {/* Composer Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3.5 bg-white dark:bg-sentinel-900 border-t border-slate-200 dark:border-sentinel-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ask about landslides, cloudbursts, Fs equations, or NDMA SOPs in ${selectedState}...`}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="px-4 py-2.5 rounded-xl bg-gov-blue hover:bg-gov-blue-dark dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right Tactical Reference Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Emergency Helplines Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-sentinel-800 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                <div className="p-1 rounded bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <span>{selectedState} Emergency Helplines</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold">
                24x7 TOLL-FREE
              </span>
            </div>

            <div className="space-y-2">
              {contacts.map((contact, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      {contact.service}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block line-clamp-1">
                      {contact.description}
                    </span>
                  </div>
                  <a
                    href={`tel:${contact.number.replace(/[^0-9]/g, "")}`}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 font-mono font-bold text-xs border border-rose-200 dark:border-rose-900/60 shrink-0 transition-colors flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{contact.number}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Disaster Topics by Category */}
          <div className="p-4 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs border-b border-slate-200 dark:border-sentinel-800 pb-2.5">
              <Layers className="w-3.5 h-3.5 text-gov-blue dark:text-sky-400" />
              <span>Standard Operational Knowledge Topics</span>
            </div>

            <div className="space-y-3 text-xs">
              {topicGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {group.category}
                  </span>
                  <div className="space-y-1">
                    {group.topics.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSendMessage(t.prompt)}
                        className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-sentinel-950 dark:hover:bg-sentinel-800/80 border border-slate-200 dark:border-sentinel-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-between group"
                      >
                        <span className="font-medium line-clamp-1">{t.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gemini API Key Configuration Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-sky-500/5 to-transparent border border-emerald-500/20 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Google Gemini Engine</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                geminiKey
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}>
                {geminiKey ? "CONNECTED" : "OFFLINE ENGINE"}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Powered by Google Gemini 2.5 Flash. If you have your own API key, configure it to unlock custom multi-turn generative capabilities.
            </p>
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{geminiKey ? "Update Gemini Key" : "Configure Gemini Key"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gemini Key Configuration Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-sentinel-900 border border-slate-200 dark:border-sentinel-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-sentinel-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Google Gemini API Key
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Enter your Google AI Studio API key to enable direct live inference with <code>gemini-2.5-flash</code>. Your key is securely stored in your browser session.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                API Key
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-sentinel-950 border border-slate-200 dark:border-sentinel-800 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            {keyStatusMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
                  keyStatusMsg.valid
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                {keyStatusMsg.valid ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{keyStatusMsg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>Get API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-sentinel-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-sentinel-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyAndSaveKey}
                  disabled={keyVerifying}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {keyVerifying && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Save &amp; Verify</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
