/**
 * Sentinel NER — Disaster Chatbot & Gemini Copilot Client Library
 */

import { fetchFromAPI } from "./api";

export interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
  timestamp?: string;
  category?: string;
  modelUsed?: string;
  isLiveGemini?: boolean;
  checklist?: string[];
  contacts?: EmergencyContact[];
  citations?: string[];
}

export interface EmergencyContact {
  service: string;
  number: string;
  description: string;
}

export interface DisasterTopic {
  id: string;
  category: string;
  title: string;
  prompt: string;
  icon_name: string;
}

export interface DisasterTopicGroup {
  category: string;
  topics: DisasterTopic[];
}

export interface DisasterChatResponsePayload {
  reply: string;
  model_used: string;
  is_live_gemini: boolean;
  disaster_category: string;
  severity_level: "ADVISORY" | "WATCH" | "WARNING" | "EMERGENCY";
  actionable_checklist: string[];
  emergency_contacts: EmergencyContact[];
  source_citations: string[];
}

const GEMINI_STORAGE_KEY = "sentinel_gemini_api_key";

export const DEFAULT_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export function getStoredGeminiKey(): string {
  const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || DEFAULT_GEMINI_API_KEY;
  if (typeof window === "undefined") return envKey;
  try {
    const stored = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
    return envKey;
  } catch {
    return envKey;
  }
}

export function setStoredGeminiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  } catch {}
}

export async function sendDisasterMessage(
  message: string,
  history: ChatMessage[] = [],
  state = "Mizoram",
  district?: string
): Promise<DisasterChatResponsePayload> {
  const geminiKey = getStoredGeminiKey();

  const formattedHistory = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return await fetchFromAPI<DisasterChatResponsePayload>("/api/v1/disaster-chat/message", {
    method: "POST",
    body: JSON.stringify({
      message,
      conversation_history: formattedHistory,
      state,
      district,
      gemini_api_key: geminiKey || undefined,
    }),
  });
}

export async function fetchDisasterTopics(): Promise<DisasterTopicGroup[]> {
  try {
    return await fetchFromAPI<DisasterTopicGroup[]>("/api/v1/disaster-chat/topics");
  } catch {
    return [];
  }
}

export async function fetchEmergencyContacts(state = "Mizoram"): Promise<EmergencyContact[]> {
  try {
    return await fetchFromAPI<EmergencyContact[]>(`/api/v1/disaster-chat/contacts?state=${encodeURIComponent(state)}`);
  } catch {
    return [];
  }
}

export async function verifyGeminiKey(key: string): Promise<{ valid: boolean; message: string; model?: string }> {
  return await fetchFromAPI<{ valid: boolean; message: string; model?: string }>("/api/v1/disaster-chat/verify-key", {
    method: "POST",
    body: JSON.stringify({ gemini_api_key: key }),
  });
}
