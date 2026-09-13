import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  Role,
  Permission,
  ROLE_PERMISSIONS,
  ROUTE_PERMISSIONS,
  ROLE_DEFAULT_ROUTES,
  ROLE_DISPLAY_NAMES,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  normalizeRole,
  getPermissionsForRole,
  getRequiredRolesForPermission,
} from "@/lib/rbac";
import { useAuthStore, AuthUser } from "@/lib/auth";
import { AuthGuard } from "@/components/auth/AuthGuard";

const mockPush = vi.fn();
let currentMockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => currentMockPathname,
}));

describe("Sentinel NER — Canonical RBAC Matrix & Logic", () => {
  it("normalizes roles and backward-compatible aliases", () => {
    expect(normalizeRole("PLATFORM_ADMIN")).toBe(Role.PLATFORM_ADMIN);
    expect(normalizeRole("DDMA")).toBe(Role.DDMA_INCIDENT_COMMANDER);
    expect(normalizeRole("DDMA_INCIDENT_COMMANDER")).toBe(Role.DDMA_INCIDENT_COMMANDER);
    expect(normalizeRole("FIELD_OFFICER")).toBe(Role.FIELD_OFFICER);
    expect(normalizeRole("USER")).toBe(Role.USER);
    expect(normalizeRole("CITIZEN_REPORTER")).toBe(Role.USER);
    expect(normalizeRole("UNKNOWN_ROLE")).toBe(Role.USER);
  });

  it("PLATFORM_ADMIN receives all 16 module permissions plus administration", () => {
    const adminPerms = getPermissionsForRole(Role.PLATFORM_ADMIN);
    expect(adminPerms).toContain(Permission.VIEW_COMMAND_CENTER);
    expect(adminPerms).toContain(Permission.VIEW_SPATIAL_MAP);
    expect(adminPerms).toContain(Permission.VIEW_CREEP_WATCH);
    expect(adminPerms).toContain(Permission.VIEW_LIVE_WEATHER);
    expect(adminPerms).toContain(Permission.VIEW_EARLY_WARNING);
    expect(adminPerms).toContain(Permission.VIEW_SATELLITE_HYDROLOGY);
    expect(adminPerms).toContain(Permission.VIEW_SUBSURFACE_GEOTECH);
    expect(adminPerms).toContain(Permission.VIEW_RISK_ENGINE);
    expect(adminPerms).toContain(Permission.VIEW_SENTINEL_AI);
    expect(adminPerms).toContain(Permission.VIEW_HIGHWAY_CORRIDORS);
    expect(adminPerms).toContain(Permission.VIEW_CONSEQUENCE_INTEL);
    expect(adminPerms).toContain(Permission.VIEW_OPERATIONS);
    expect(adminPerms).toContain(Permission.VIEW_WARNING_LEDGER);
    expect(adminPerms).toContain(Permission.VIEW_ALERTS);
    expect(adminPerms).toContain(Permission.VIEW_FIELD_SENSORS);
    expect(adminPerms).toContain(Permission.VIEW_FIELD_COMMUNITY);
    expect(adminPerms).toContain(Permission.MANAGE_USERS);
    expect(adminPerms).toContain(Permission.MANAGE_SYSTEM);
    expect(adminPerms).toContain(Permission.VIEW_AUDIT_LOGS);
  });

  it("DDMA_INCIDENT_COMMANDER receives disaster intelligence but NO administration", () => {
    const ddmaPerms = getPermissionsForRole(Role.DDMA_INCIDENT_COMMANDER);
    expect(ddmaPerms).toContain(Permission.VIEW_COMMAND_CENTER);
    expect(ddmaPerms).toContain(Permission.VIEW_EARLY_WARNING);
    expect(ddmaPerms).toContain(Permission.VIEW_SATELLITE_HYDROLOGY);
    expect(ddmaPerms).toContain(Permission.VIEW_SUBSURFACE_GEOTECH);
    expect(ddmaPerms).toContain(Permission.VIEW_RISK_ENGINE);
    expect(ddmaPerms).toContain(Permission.VIEW_SENTINEL_AI);

    expect(ddmaPerms).not.toContain(Permission.MANAGE_USERS);
    expect(ddmaPerms).not.toContain(Permission.MANAGE_ROLES);
    expect(ddmaPerms).not.toContain(Permission.MANAGE_SYSTEM);
  });

  it("FIELD_OFFICER receives highway/field operational subset only", () => {
    const fieldPerms = getPermissionsForRole(Role.FIELD_OFFICER);
    expect(fieldPerms).toContain(Permission.VIEW_SPATIAL_MAP);
    expect(fieldPerms).toContain(Permission.VIEW_LIVE_WEATHER);
    expect(fieldPerms).toContain(Permission.VIEW_HIGHWAY_CORRIDORS);
    expect(fieldPerms).toContain(Permission.VIEW_CONSEQUENCE_INTEL);
    expect(fieldPerms).toContain(Permission.VIEW_OPERATIONS);
    expect(fieldPerms).toContain(Permission.VIEW_WARNING_LEDGER);
    expect(fieldPerms).toContain(Permission.VIEW_ALERTS);
    expect(fieldPerms).toContain(Permission.VIEW_FIELD_SENSORS);
    expect(fieldPerms).toContain(Permission.VIEW_FIELD_COMMUNITY);
    expect(fieldPerms).toContain(Permission.VIEW_RISK_ENGINE_OPERATIONAL);
    expect(fieldPerms).toContain(Permission.VIEW_SENTINEL_AI_OPERATIONAL);

    expect(fieldPerms).not.toContain(Permission.VIEW_COMMAND_CENTER);
    expect(fieldPerms).not.toContain(Permission.VIEW_CREEP_WATCH);
    expect(fieldPerms).not.toContain(Permission.VIEW_EARLY_WARNING);
    expect(fieldPerms).not.toContain(Permission.VIEW_SATELLITE_HYDROLOGY);
    expect(fieldPerms).not.toContain(Permission.VIEW_SUBSURFACE_GEOTECH);
    expect(fieldPerms).not.toContain(Permission.VIEW_RISK_ENGINE);
    expect(fieldPerms).not.toContain(Permission.VIEW_SENTINEL_AI);
    expect(fieldPerms).not.toContain(Permission.MANAGE_USERS);
    expect(fieldPerms).not.toContain(Permission.MANAGE_SYSTEM);
  });

  it("USER receives strictly public-safe modules only", () => {
    const userPerms = getPermissionsForRole(Role.USER);
    expect(userPerms).toContain(Permission.VIEW_SPATIAL_MAP);
    expect(userPerms).toContain(Permission.VIEW_ALERTS);
    expect(userPerms).toContain(Permission.VIEW_FIELD_COMMUNITY);
    expect(userPerms).toContain(Permission.VIEW_LIVE_WEATHER);

    expect(userPerms).not.toContain(Permission.VIEW_COMMAND_CENTER);
    expect(userPerms).not.toContain(Permission.VIEW_CREEP_WATCH);
    expect(userPerms).not.toContain(Permission.VIEW_EARLY_WARNING);
    expect(userPerms).not.toContain(Permission.VIEW_SATELLITE_HYDROLOGY);
    expect(userPerms).not.toContain(Permission.VIEW_SUBSURFACE_GEOTECH);
    expect(userPerms).not.toContain(Permission.VIEW_RISK_ENGINE);
    expect(userPerms).not.toContain(Permission.VIEW_SENTINEL_AI);
    expect(userPerms).not.toContain(Permission.VIEW_HIGHWAY_CORRIDORS);
    expect(userPerms).not.toContain(Permission.VIEW_CONSEQUENCE_INTEL);
    expect(userPerms).not.toContain(Permission.VIEW_OPERATIONS);
    expect(userPerms).not.toContain(Permission.VIEW_WARNING_LEDGER);
    expect(userPerms).not.toContain(Permission.VIEW_FIELD_SENSORS);
    expect(userPerms).not.toContain(Permission.MANAGE_USERS);
    expect(userPerms).not.toContain(Permission.MANAGE_SYSTEM);
  });

  it("evaluates helper functions correctly", () => {
    const mockUser: AuthUser = {
      id: "usr-field-1",
      email: "field@sentinel.ner.internal",
      full_name: "Field Officer",
      role: Role.FIELD_OFFICER,
      organization_id: "org-ddma",
      permissions: [Permission.VIEW_SPATIAL_MAP, Permission.VIEW_HIGHWAY_CORRIDORS],
    };

    expect(hasPermission(mockUser, Permission.VIEW_SPATIAL_MAP)).toBe(true);
    expect(hasPermission(mockUser, Permission.VIEW_HIGHWAY_CORRIDORS)).toBe(true);
    expect(hasPermission(mockUser, Permission.VIEW_COMMAND_CENTER)).toBe(false);

    expect(hasAnyPermission(mockUser, [Permission.VIEW_COMMAND_CENTER, Permission.VIEW_SPATIAL_MAP])).toBe(true);
    expect(hasAnyPermission(mockUser, [Permission.VIEW_COMMAND_CENTER, Permission.MANAGE_USERS])).toBe(false);

    expect(hasAllPermissions(mockUser, [Permission.VIEW_SPATIAL_MAP, Permission.VIEW_HIGHWAY_CORRIDORS])).toBe(true);
    expect(hasAllPermissions(mockUser, [Permission.VIEW_SPATIAL_MAP, Permission.VIEW_COMMAND_CENTER])).toBe(false);

    expect(hasRole(mockUser, Role.FIELD_OFFICER)).toBe(true);
    expect(hasRole(mockUser, Role.PLATFORM_ADMIN)).toBe(false);
  });

  it("defines role-specific default landing routes", () => {
    expect(ROLE_DEFAULT_ROUTES[Role.PLATFORM_ADMIN]).toBe("/command-center");
    expect(ROLE_DEFAULT_ROUTES[Role.DDMA_INCIDENT_COMMANDER]).toBe("/command-center");
    expect(ROLE_DEFAULT_ROUTES[Role.FIELD_OFFICER]).toBe("/map");
    expect(ROLE_DEFAULT_ROUTES[Role.USER]).toBe("/map");
  });
});

describe("Sentinel NER — AuthGuard Route & Component Authorization", () => {
  beforeEach(() => {
    mockPush.mockClear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isSessionExpired: false,
      error: null,
    });
  });

  it("redirects unauthenticated user to /login for protected routes", async () => {
    currentMockPathname = "/command-center";
    render(
      <AuthGuard>
        <div data-testid="protected-content">Secret Dashboard</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByTestId("protected-content")).toBeNull();
  });

  it("displays SESSION EXPIRED screen when session is expired and does NOT render children", async () => {
    currentMockPathname = "/map";
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      isSessionExpired: true,
      user: {
        id: "usr-1",
        email: "officer@sentinel.ner.internal",
        full_name: "Officer",
        role: Role.FIELD_OFFICER,
        permissions: [],
      },
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Secret Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("SESSION EXPIRED")).toBeDefined();
    });
    expect(screen.getByText(/Your operational session has expired/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /re-authenticate/i })).toBeDefined();
    expect(screen.queryByTestId("protected-content")).toBeNull();
  });

  it("displays ACCESS RESTRICTED (403) when user role lacks required route permission", async () => {
    currentMockPathname = "/satellite-hydrology";
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      isSessionExpired: false,
      user: {
        id: "usr-field-1",
        email: "field.kolasib@sentinel.ner.internal",
        full_name: "Field Officer",
        role: Role.FIELD_OFFICER,
        permissions: getPermissionsForRole(Role.FIELD_OFFICER),
      },
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Satellite Hydrology Data</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("ACCESS RESTRICTED")).toBeDefined();
    });
    expect(screen.getByText(/Your current operational role does not have/i)).toBeDefined();
    expect(screen.getByText(/Highway Patrol Officer/i)).toBeDefined();
    expect(screen.getByText(/Platform Admin or DDMA Incident Commander/i)).toBeDefined();
    expect(screen.getByText(/Return to Authorized Workspace/i)).toBeDefined();
    expect(screen.queryByTestId("protected-content")).toBeNull();
  });

  it("renders children when authenticated user has permission for the route", async () => {
    currentMockPathname = "/map";
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      isSessionExpired: false,
      user: {
        id: "usr-user-1",
        email: "citizen@sentinel.ner.internal",
        full_name: "Public Citizen",
        role: Role.USER,
        permissions: getPermissionsForRole(Role.USER),
      },
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Public Spatial Map Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId("protected-content")).toBeDefined();
    });
    expect(screen.queryByText("ACCESS RESTRICTED")).toBeNull();
  });
});
