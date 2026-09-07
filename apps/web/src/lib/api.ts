/**
 * Sentinel NER — Typed HTTP Client
 * Enforces structured error extraction, correlation tracing, and fail-safe fetching.
 */

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    correlation_id: string;
    timestamp: string;
    details?: Record<string, unknown>;
  };
}

export interface HealthCheckData {
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  version: string;
  environment: string;
  uptime_seconds: number;
  timestamp: string;
  subsystems: Array<{
    name: string;
    status: "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "STANDBY" | "NOT_CONFIGURED";
    latency_ms?: number;
    message?: string;
    is_external: boolean;
  }>;
}

import { useAuthStore, isTokenExpired } from "./auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchFromAPI<T>(
  endpoint: string,
  options: RequestInit & { _retried?: boolean } = {}
): Promise<T> {
  const correlationId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-Correlation-ID", correlationId);

  if (typeof window !== "undefined") {
    let token = useAuthStore.getState().accessToken;
    if ((!token || isTokenExpired(token)) && !endpoint.includes("/auth/")) {
      token = await useAuthStore.getState().ensureDevToken();
    }
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const baseUrl = typeof window !== "undefined" && window.location.port === "3000" ? "" : API_BASE_URL;
  const url = `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && typeof window !== "undefined" && !options._retried && !endpoint.includes("/auth/")) {
      const freshToken = await useAuthStore.getState().ensureDevToken(true);
      if (freshToken) {
        headers.set("Authorization", `Bearer ${freshToken}`);
        return fetchFromAPI<T>(endpoint, {
          ...options,
          headers,
          _retried: true,
        });
      }
    }

    if (!response.ok) {
      const errorJson = (await response.json().catch(() => null)) as APIErrorResponse | null;
      let errorMsg = errorJson?.error?.message;
      if (!errorMsg) {
        if (response.status === 401 || response.status === 403) {
          errorMsg = "Authorization required or permission denied.";
        } else if (response.status === 404) {
          errorMsg = "Endpoint or configuration problem (Not Found).";
        } else if (response.status >= 500) {
          errorMsg = "Backend service error.";
        } else {
          errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
      const err = new Error(errorMsg);
      (err as unknown as { code?: string; correlationId?: string }).code = errorJson?.error?.code || `HTTP_${response.status}`;
      (err as unknown as { correlationId?: string }).correlationId = correlationId;
      throw err;
    }

    try {
      return (await response.json()) as T;
    } catch (parseError) {
      throw new Error("Invalid response format (Data contract error).");
    }
  } catch (error) {
    if (error instanceof TypeError && (error.message === "Failed to fetch" || error.message.includes("NetworkError"))) {
      throw new Error("Unable to reach the Sentinel NER API.");
    }
    // Fail safely without throwing uncaught exceptions to UI if offline
    throw error;
  }
}

export async function checkSystemHealth(): Promise<HealthCheckData> {
  return fetchFromAPI<HealthCheckData>("/api/v1/health");
}
