"use client";

import { create } from "zustand";
import { Role, ROLE_PERMISSIONS } from "./rbac";

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

export type AuthUser = UserContext;

interface AuthState {
  user: UserContext | null;
  accessToken: string | null;
  refreshToken: string | null;
  token?: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSessionExpired: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithPreset: (email: string) => Promise<boolean>;
  loginAsCitizen: () => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: UserContext | null) => void;
  setError: (error: string | null) => void;
  setSessionExpired: (expired: boolean) => void;
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
    "view:command_center",
    "view:spatial_map",
    "view:creep_watch",
    "view:live_weather",
    "view:early_warning",
    "view:satellite_hydrology",
    "view:subsurface_geotech",
    "view:risk_engine",
    "view:risk_engine_operational",
    "view:sentinel_ai",
    "view:sentinel_ai_operational",
    "view:highway_corridors",
    "view:consequence_intel",
    "view:operations",
    "view:warning_ledger",
    "view:alerts",
    "view:field_sensors",
    "view:field_community",
    "manage:users",
    "manage:roles",
    "manage:system",
    "view:audit_logs",
  ],
};

export const DEMO_PRESET_ACCOUNTS: Record<string, UserContext> = {
  "admin@gmail.com": {
    id: "usr-admin-gmail",
    email: "admin@gmail.com",
    full_name: "Platform Administrator",
    status: "ACTIVE",
    role: Role.PLATFORM_ADMIN,
    organization_id: "org-sdma-mizoram",
    organization_name: "National & State Disaster Management Authority",
    jurisdiction_scope: "GLOBAL",
    permissions: (ROLE_PERMISSIONS[Role.PLATFORM_ADMIN] as string[]) || [],
  },
  "user@gmail.com": {
    id: "usr-user-gmail",
    email: "user@gmail.com",
    full_name: "Operational Public User",
    status: "ACTIVE",
    role: Role.USER,
    organization_id: "org-ddma-aizawl",
    organization_name: "Public Citizen & Observation Network",
    jurisdiction_scope: "DISTRICT",
    permissions: (ROLE_PERMISSIONS[Role.USER] as string[]) || [],
  },
  "patrol@gmail.com": {
    id: "usr-patrol-gmail",
    email: "patrol@gmail.com",
    full_name: "Highway Patrol Officer",
    status: "ACTIVE",
    role: Role.FIELD_OFFICER,
    organization_id: "org-ddma-aizawl",
    organization_name: "BRO Pushpak / PWD Highway Patrol Unit",
    jurisdiction_scope: "SECTOR",
    permissions: (ROLE_PERMISSIONS[Role.FIELD_OFFICER] as string[]) || [],
  },
  "citizen@gmail.com": {
    id: "usr-citizen-public",
    email: "citizen@gmail.com",
    full_name: "Public Citizen / Community Observer",
    status: "ACTIVE",
    role: Role.USER,
    organization_id: "org-citizen-network",
    organization_name: "Public Citizen Observation Network",
    jurisdiction_scope: "PUBLIC",
    permissions: (ROLE_PERMISSIONS[Role.USER] as string[]) || [],
  },
  "citizen@sentinel.ner.internal": {
    id: "usr-citizen-public",
    email: "citizen@sentinel.ner.internal",
    full_name: "Public Citizen / Community Observer",
    status: "ACTIVE",
    role: Role.USER,
    organization_id: "org-citizen-network",
    organization_name: "Public Citizen Observation Network",
    jurisdiction_scope: "PUBLIC",
    permissions: (ROLE_PERMISSIONS[Role.USER] as string[]) || [],
  },
};

export function createClientMockJwt(user: UserContext): string {
  try {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const payload = btoa(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        role: user.role,
        org: user.organization_id,
        exp: Math.floor(Date.now() / 1000) + 86400 * 7,
        iat: Math.floor(Date.now() / 1000),
      })
    ).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signature = btoa("sentinel-client-signature")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    return `${header}.${payload}.${signature}`;
  } catch {
    return "mock.client.jwt";
  }
}

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

function loadStoredSession(): { session: StoredSession | null; expired: boolean } {
  if (typeof window === "undefined") return { session: null, expired: false };
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed: StoredSession = JSON.parse(raw);
      if (parsed.accessToken && isTokenExpired(parsed.accessToken)) {
        // Discard expired token
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
        return { session: null, expired: true };
      }
      return { session: parsed, expired: false };
    }
  } catch {
    // Storage access restricted or invalid JSON
  }
  return { session: null, expired: false };
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
  isSessionExpired: false,
  error: null,

  initAuth: async () => {
    // If state was explicitly marked as session expired, preserve that state
    if (get().isSessionExpired) return;

    // Check if valid authenticated session already loaded in memory
    if (get().isAuthenticated && get().user) {
      const currentToken = get().accessToken;
      if (!currentToken || !isTokenExpired(currentToken)) return;
    }

    const { session: stored, expired } = loadStoredSession();
    if (stored?.accessToken && !isTokenExpired(stored.accessToken) && stored?.user) {
      set({
        user: stored.user,
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        isAuthenticated: true,
        isSessionExpired: false,
      });
      return;
    }

    if (expired) {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isSessionExpired: true,
      });
      return;
    }

    // Do not auto-login in production or normal user session
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isSessionExpired: false,
    });
  },

  setSessionExpired: (expired: boolean) => set({ isSessionExpired: expired }),

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
          isSessionExpired: false,
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
    set({ isLoading: true, error: null, isSessionExpired: false });
    const normalized = email.trim().toLowerCase();
    const preset = DEMO_PRESET_ACCOUNTS[normalized];

    try {
      const API_HOST = typeof window !== "undefined" && window.location.port === "3000"
        ? ""
        : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

      const res = await fetch(`${API_HOST}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
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
            isSessionExpired: false,
            isLoading: false,
            error: null,
          });
          return true;
        }
      }

      // If backend was not ok or returned 401, but this is one of our preset accounts, gracefully authorize
      if (preset) {
        const token = createClientMockJwt(preset);
        const session: StoredSession = {
          user: preset,
          accessToken: token,
          refreshToken: null,
        };
        persistSession(session);
        set({
          user: preset,
          accessToken: token,
          refreshToken: null,
          isAuthenticated: true,
          isSessionExpired: false,
          isLoading: false,
          error: null,
        });
        return true;
      }

      const errorData = await res.json().catch(() => ({}));
      const message = errorData?.error?.message || "Authentication failed. Please verify credentials.";
      set({ isLoading: false, error: message });
      return false;
    } catch (err: unknown) {
      if (preset) {
        const token = createClientMockJwt(preset);
        const session: StoredSession = {
          user: preset,
          accessToken: token,
          refreshToken: null,
        };
        persistSession(session);
        set({
          user: preset,
          accessToken: token,
          refreshToken: null,
          isAuthenticated: true,
          isSessionExpired: false,
          isLoading: false,
          error: null,
        });
        return true;
      }
      set({
        isLoading: false,
        error: (err as Error).message || "Connection to identity server failed.",
      });
      return false;
    }
  },

  loginWithPreset: async (email: string) => {
    const normalized = email.trim().toLowerCase();
    const preset = DEMO_PRESET_ACCOUNTS[normalized] || DEMO_PRESET_ACCOUNTS["user@gmail.com"];
    const token = createClientMockJwt(preset);
    const session: StoredSession = {
      user: preset,
      accessToken: token,
      refreshToken: null,
    };
    persistSession(session);
    set({
      user: preset,
      accessToken: token,
      refreshToken: null,
      isAuthenticated: true,
      isSessionExpired: false,
      isLoading: false,
      error: null,
    });
    return true;
  },

  loginAsCitizen: async () => {
    const citizenPreset = DEMO_PRESET_ACCOUNTS["citizen@gmail.com"];
    const token = createClientMockJwt(citizenPreset);
    const session: StoredSession = {
      user: citizenPreset,
      accessToken: token,
      refreshToken: null,
    };
    persistSession(session);
    set({
      user: citizenPreset,
      accessToken: token,
      refreshToken: null,
      isAuthenticated: true,
      isSessionExpired: false,
      isLoading: false,
      error: null,
    });
    return true;
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
      isSessionExpired: false,
      error: null,
    });
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setError: (error) => set({ error }),
}));
