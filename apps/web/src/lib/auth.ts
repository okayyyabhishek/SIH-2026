"use client";

import { create } from "zustand";

export interface UserContext {
  id: string;
  email: string;
  full_name: string;
  status: string;
  role: string;
  organization_id: string | null;
  organization_name: string | null;
  jurisdiction_scope: string;
  permissions: string[];
}

interface AuthState {
  user: UserContext | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: UserContext | null) => void;
  setError: (error: string | null) => void;
  initAuth: () => Promise<void>;
  ensureDevToken: (force?: boolean) => Promise<string | null>;
}

// Default development fallback for offline or pre-auth demo inspection
const DEV_DEFAULT_USER: UserContext = {
  id: "usr-admin-1",
  email: "admin@sentinel.ner.internal",
  full_name: "Platform Administrator (Global SDMA)",
  status: "ACTIVE",
  role: "PLATFORM_ADMIN",
  organization_id: "org-sdma-mizoram",
  organization_name: "Mizoram State Disaster Management Authority",
  jurisdiction_scope: "GLOBAL",
  permissions: [
    "users:read",
    "organizations:read",
    "organizations:manage_members",
    "events:read",
    "events:create",
    "alerts:read",
    "alerts:approve",
    "reports:read",
    "reports:moderate",
    "sensors:read",
    "sensors:manage",
  ],
};

const SESSION_KEY = "sentinel_auth_session_v1";

interface StoredSession {
  user: UserContext;
  accessToken: string;
  refreshToken: string | null;
}

export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Buffer with 30s so we refresh before expiry
    return payload.exp * 1000 <= Date.now() + 30000;
  } catch {
    return true;
  }
}

let devTokenInFlight: Promise<string | null> | null = null;

function loadStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed: StoredSession = JSON.parse(raw);
      if (parsed.accessToken && isTokenExpired(parsed.accessToken)) {
        // Discard expired token so caller acquires a fresh session without firing 401
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    }
  } catch {
    // Storage access restricted or invalid JSON
  }
  return null;
}

function persistSession(session: StoredSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      const data = JSON.stringify(session);
      sessionStorage.setItem(SESSION_KEY, data);
      localStorage.setItem(SESSION_KEY, data);
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Storage write failed
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initAuth: async () => {
    // Check if session already loaded
    const currentToken = get().accessToken;
    if (currentToken && !isTokenExpired(currentToken) && get().user) return;
    const stored = loadStoredSession();
    if (stored?.accessToken && !isTokenExpired(stored.accessToken) && stored?.user) {
      set({
        user: stored.user,
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        isAuthenticated: true,
      });
      return;
    }
    // Auto-login in development to avoid 401s across the dashboard
    await get().ensureDevToken();
  },

  ensureDevToken: async (force = false) => {
    const current = get().accessToken;
    if (current && !isTokenExpired(current) && !force) return current;

    if (devTokenInFlight && !force) {
      return devTokenInFlight;
    }

    devTokenInFlight = (async () => {
      try {
        const API_HOST = typeof window !== "undefined" && window.location.port === "3000"
          ? "" // use Next.js rewrite
          : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

        const res = await fetch(`${API_HOST}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "admin@sentinel.ner.internal",
            password: "SentinelAdmin@2026!",
          }),
        });

        if (!res.ok) return null;

        const tokenData = await res.json();
        const token = tokenData.access_token;
        const refToken = tokenData.refresh_token || null;

        // Fetch user profile
        const meRes = await fetch(`${API_HOST}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userProfile: UserContext = meRes.ok
          ? await meRes.json()
          : {
              ...DEV_DEFAULT_USER,
              id: tokenData.user_id || DEV_DEFAULT_USER.id,
              role: tokenData.role || DEV_DEFAULT_USER.role,
              organization_id: tokenData.organization_id || DEV_DEFAULT_USER.organization_id,
            };

        const session: StoredSession = {
          user: userProfile,
          accessToken: token,
          refreshToken: refToken,
        };

        set({
          user: userProfile,
          accessToken: token,
          refreshToken: refToken,
          isAuthenticated: true,
          error: null,
        });

        persistSession(session);
        return token;
      } catch (e) {
        console.warn("Sentinel NER: Auto-authentication dev fallback warning:", e);
        return null;
      } finally {
        devTokenInFlight = null;
      }
    })();

    return devTokenInFlight;
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const API_HOST = typeof window !== "undefined" && window.location.port === "3000"
        ? ""
        : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

      const res = await fetch(`${API_HOST}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || "Authentication failed. Please verify credentials.";
        set({ isLoading: false, error: message });
        return false;
      }

      const tokenData = await res.json();
      const token = tokenData.access_token;
      const refToken = tokenData.refresh_token || null;

      // Fetch verified user context
      const meRes = await fetch(`${API_HOST}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (meRes.ok) {
        const meData: UserContext = await meRes.json();
        const session: StoredSession = {
          user: meData,
          accessToken: token,
          refreshToken: refToken,
        };
        persistSession(session);
        set({
          user: meData,
          accessToken: token,
          refreshToken: refToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({ isLoading: false, error: "Failed to establish operational context." });
        return false;
      }
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: (err as Error).message || "Connection to identity server failed.",
      });
      return false;
    }
  },

  logout: async () => {
    const token = get().accessToken;
    if (token) {
      try {
        const API_HOST = typeof window !== "undefined" && window.location.port === "3000"
          ? ""
          : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");
        await fetch(`${API_HOST}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Fail-safe cleanup
      }
    }
    persistSession(null);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setError: (error) => set({ error }),
}));
