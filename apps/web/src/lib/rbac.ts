/**
 * Sentinel NER — Canonical Role-Based Access Control (RBAC) Architecture
 * Authoritative client-side permission definitions, role-to-permission mappings,
 * route guard associations, and reusable authorization helpers.
 */

export enum Role {
  PLATFORM_ADMIN = "PLATFORM_ADMIN",
  DDMA_INCIDENT_COMMANDER = "DDMA_INCIDENT_COMMANDER",
  FIELD_OFFICER = "FIELD_OFFICER",
  USER = "USER",
}

export enum Permission {
  // Surveillance & GIS
  VIEW_COMMAND_CENTER = "view:command_center",
  VIEW_SPATIAL_MAP = "view:spatial_map",
  VIEW_CREEP_WATCH = "view:creep_watch",
  VIEW_LIVE_WEATHER = "view:live_weather",

  // Early Warning & Hazard Intelligence
  VIEW_EARLY_WARNING = "view:early_warning",
  VIEW_SATELLITE_HYDROLOGY = "view:satellite_hydrology",
  VIEW_SUBSURFACE_GEOTECH = "view:subsurface_geotech",
  VIEW_RISK_ENGINE = "view:risk_engine",
  VIEW_RISK_ENGINE_OPERATIONAL = "view:risk_engine_operational",
  VIEW_SENTINEL_AI = "view:sentinel_ai",
  VIEW_SENTINEL_AI_OPERATIONAL = "view:sentinel_ai_operational",

  // Corridors & Lifelines
  VIEW_HIGHWAY_CORRIDORS = "view:highway_corridors",
  VIEW_CONSEQUENCE_INTEL = "view:consequence_intel",

  // Operations & Response
  VIEW_OPERATIONS = "view:operations",
  VIEW_WARNING_LEDGER = "view:warning_ledger",
  VIEW_ALERTS = "view:alerts",
  VIEW_FIELD_SENSORS = "view:field_sensors",
  VIEW_FIELD_COMMUNITY = "view:field_community",

  // Administrative & Governance
  MANAGE_USERS = "manage:users",
  MANAGE_ROLES = "manage:roles",
  MANAGE_SYSTEM = "manage:system",
  VIEW_AUDIT_LOGS = "view:audit_logs",
}

/** Canonical Role to Granted Permissions Mapping */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  [Role.PLATFORM_ADMIN]: [
    Permission.VIEW_COMMAND_CENTER,
    Permission.VIEW_SPATIAL_MAP,
    Permission.VIEW_CREEP_WATCH,
    Permission.VIEW_LIVE_WEATHER,
    Permission.VIEW_EARLY_WARNING,
    Permission.VIEW_SATELLITE_HYDROLOGY,
    Permission.VIEW_SUBSURFACE_GEOTECH,
    Permission.VIEW_RISK_ENGINE,
    Permission.VIEW_RISK_ENGINE_OPERATIONAL,
    Permission.VIEW_SENTINEL_AI,
    Permission.VIEW_SENTINEL_AI_OPERATIONAL,
    Permission.VIEW_HIGHWAY_CORRIDORS,
    Permission.VIEW_CONSEQUENCE_INTEL,
    Permission.VIEW_OPERATIONS,
    Permission.VIEW_WARNING_LEDGER,
    Permission.VIEW_ALERTS,
    Permission.VIEW_FIELD_SENSORS,
    Permission.VIEW_FIELD_COMMUNITY,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [Role.DDMA_INCIDENT_COMMANDER]: [
    Permission.VIEW_COMMAND_CENTER,
    Permission.VIEW_SPATIAL_MAP,
    Permission.VIEW_CREEP_WATCH,
    Permission.VIEW_LIVE_WEATHER,
    Permission.VIEW_EARLY_WARNING,
    Permission.VIEW_SATELLITE_HYDROLOGY,
    Permission.VIEW_SUBSURFACE_GEOTECH,
    Permission.VIEW_RISK_ENGINE,
    Permission.VIEW_RISK_ENGINE_OPERATIONAL,
    Permission.VIEW_SENTINEL_AI,
    Permission.VIEW_SENTINEL_AI_OPERATIONAL,
    Permission.VIEW_CONSEQUENCE_INTEL,
    Permission.VIEW_OPERATIONS,
    Permission.VIEW_WARNING_LEDGER,
    Permission.VIEW_ALERTS,
    Permission.VIEW_FIELD_SENSORS,
    Permission.VIEW_FIELD_COMMUNITY,
  ],
  [Role.FIELD_OFFICER]: [
    Permission.VIEW_SPATIAL_MAP,
    Permission.VIEW_LIVE_WEATHER,
    Permission.VIEW_RISK_ENGINE_OPERATIONAL,
    Permission.VIEW_SENTINEL_AI_OPERATIONAL,
    Permission.VIEW_HIGHWAY_CORRIDORS,
    Permission.VIEW_CONSEQUENCE_INTEL,
    Permission.VIEW_OPERATIONS,
    Permission.VIEW_WARNING_LEDGER,
    Permission.VIEW_ALERTS,
    Permission.VIEW_FIELD_SENSORS,
    Permission.VIEW_FIELD_COMMUNITY,
  ],
  [Role.USER]: [
    Permission.VIEW_SPATIAL_MAP,
    Permission.VIEW_LIVE_WEATHER,
    Permission.VIEW_ALERTS,
    Permission.VIEW_FIELD_COMMUNITY,
  ],
  // Backwards compatibility aliases for existing seed users and agency roles
  DDMA: [
    Permission.VIEW_COMMAND_CENTER,
    Permission.VIEW_SPATIAL_MAP,
    Permission.VIEW_CREEP_WATCH,
    Permission.VIEW_LIVE_WEATHER,
    Permission.VIEW_EARLY_WARNING,
    Permission.VIEW_SATELLITE_HYDROLOGY,
    Permission.VIEW_SUBSURFACE_GEOTECH,
    Permission.VIEW_RISK_ENGINE,
    Permission.VIEW_RISK_ENGINE_OPERATIONAL,
    Permission.VIEW_SENTINEL_AI,
    Permission.VIEW_SENTINEL_AI_OPERATIONAL,
    Permission.VIEW_CONSEQUENCE_INTEL,
    Permission.VIEW_OPERATIONS,
    Permission.VIEW_WARNING_LEDGER,
    Permission.VIEW_ALERTS,
    Permission.VIEW_FIELD_SENSORS,
    Permission.VIEW_FIELD_COMMUNITY,
  ],
  CITIZEN_REPORTER: [
    Permission.VIEW_SPATIAL_MAP,
    Permission.VIEW_LIVE_WEATHER,
    Permission.VIEW_ALERTS,
    Permission.VIEW_FIELD_COMMUNITY,
  ],
  PUBLIC_USER: [
    Permission.VIEW_SPATIAL_MAP,
    Permission.VIEW_LIVE_WEATHER,
    Permission.VIEW_ALERTS,
    Permission.VIEW_FIELD_COMMUNITY,
  ],
  STATE_AUTHORITY: [
    Permission.VIEW_COMMAND_CENTER,
    Permission.VIEW_SPATIAL_MAP,
    Permission.VIEW_CREEP_WATCH,
    Permission.VIEW_LIVE_WEATHER,
    Permission.VIEW_EARLY_WARNING,
    Permission.VIEW_SATELLITE_HYDROLOGY,
    Permission.VIEW_SUBSURFACE_GEOTECH,
    Permission.VIEW_RISK_ENGINE,
    Permission.VIEW_RISK_ENGINE_OPERATIONAL,
    Permission.VIEW_SENTINEL_AI,
    Permission.VIEW_SENTINEL_AI_OPERATIONAL,
    Permission.VIEW_HIGHWAY_CORRIDORS,
    Permission.VIEW_CONSEQUENCE_INTEL,
    Permission.VIEW_OPERATIONS,
    Permission.VIEW_WARNING_LEDGER,
    Permission.VIEW_ALERTS,
    Permission.VIEW_FIELD_SENSORS,
    Permission.VIEW_FIELD_COMMUNITY,
  ],
};

/** Human-readable Display Names for Application Shell & Badges */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  [Role.PLATFORM_ADMIN]: "Platform Admin",
  [Role.DDMA_INCIDENT_COMMANDER]: "DDMA Incident Commander",
  [Role.FIELD_OFFICER]: "Highway Patrol Officer",
  [Role.USER]: "Public User",
  DDMA: "DDMA Incident Commander",
  CITIZEN_REPORTER: "Public User",
  PUBLIC_USER: "Public User",
  STATE_AUTHORITY: "State Disaster Authority",
};

/** Post-Authentication Default Landing Routes by Role */
export const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  [Role.PLATFORM_ADMIN]: "/command-center",
  [Role.DDMA_INCIDENT_COMMANDER]: "/command-center",
  [Role.FIELD_OFFICER]: "/map",
  [Role.USER]: "/map",
  DDMA: "/command-center",
  CITIZEN_REPORTER: "/map",
  PUBLIC_USER: "/map",
  STATE_AUTHORITY: "/command-center",
};

/** Route-to-Required-Permission Mapping */
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/command-center": Permission.VIEW_COMMAND_CENTER,
  "/map": Permission.VIEW_SPATIAL_MAP,
  "/creep-watch": Permission.VIEW_CREEP_WATCH,
  "/weather": Permission.VIEW_LIVE_WEATHER,
  "/early-warning": Permission.VIEW_EARLY_WARNING,
  "/hydrology": Permission.VIEW_SATELLITE_HYDROLOGY,
  "/satellite-hydrology": Permission.VIEW_SATELLITE_HYDROLOGY,
  "/geotech": Permission.VIEW_SUBSURFACE_GEOTECH,
  "/subsurface-geotech": Permission.VIEW_SUBSURFACE_GEOTECH,
  "/risk": Permission.VIEW_RISK_ENGINE_OPERATIONAL,
  "/sentinel-ai": Permission.VIEW_SENTINEL_AI_OPERATIONAL,
  "/assistant": Permission.VIEW_SENTINEL_AI_OPERATIONAL,
  "/highways": Permission.VIEW_HIGHWAY_CORRIDORS,
  "/consequences": Permission.VIEW_CONSEQUENCE_INTEL,
  "/lifelines": Permission.VIEW_CONSEQUENCE_INTEL,
  "/operations": Permission.VIEW_OPERATIONS,
  "/#action-center": Permission.VIEW_OPERATIONS,
  "/ledger": Permission.VIEW_WARNING_LEDGER,
  "/warning-ledger": Permission.VIEW_WARNING_LEDGER,
  "/alerts": Permission.VIEW_ALERTS,
  "/sensors": Permission.VIEW_FIELD_SENSORS,
  "/community": Permission.VIEW_FIELD_COMMUNITY,
};

/**
 * Normalizes an arbitrary role string into its canonical or aliased representation.
 */
export function normalizeRole(role?: string | null): string {
  if (!role) return Role.USER;
  const upper = role.trim().toUpperCase();
  if (upper === "DDMA") return Role.DDMA_INCIDENT_COMMANDER;
  if (upper === "CITIZEN_REPORTER" || upper === "PUBLIC_USER") return Role.USER;
  if (Object.values(Role).includes(upper as Role)) return upper;
  return Role.USER;
}

/**
 * Resolves all permissions granted to an actor based on their assigned role.
 */
export function getPermissionsForRole(role?: string | null): Permission[] {
  if (!role) return [];
  const direct = ROLE_PERMISSIONS[role];
  if (direct) return direct;
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized] || [];
}

/**
 * Checks whether an authenticated user possesses a given capability permission.
 */
export function hasPermission(
  user: { role?: string; permissions?: string[] } | null | undefined,
  permission: Permission | string
): boolean {
  if (!user || !user.role) return false;
  const target = String(permission);

  // 1. Role is source of truth
  const grantedByRole = getPermissionsForRole(user.role);
  if (grantedByRole.some((p) => p === target)) {
    return true;
  }

  // 2. Fallback to explicit permissions on user if provided by server
  if (Array.isArray(user.permissions)) {
    return user.permissions.includes(target);
  }

  return false;
}

/**
 * Checks whether an authenticated user possesses any of the specified permissions.
 */
export function hasAnyPermission(
  user: { role?: string; permissions?: string[] } | null | undefined,
  permissions: (Permission | string)[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/**
 * Checks whether an authenticated user possesses all specified permissions.
 */
export function hasAllPermissions(
  user: { role?: string; permissions?: string[] } | null | undefined,
  permissions: (Permission | string)[]
): boolean {
  return permissions.every((p) => hasPermission(user, p));
}

/**
 * Checks whether an authenticated user has a specific role or role alias.
 */
export function hasRole(
  user: { role?: string } | null | undefined,
  role: Role | string
): boolean {
  if (!user || !user.role) return false;
  return normalizeRole(user.role) === normalizeRole(role);
}

/**
 * Returns the human-readable list of roles that possess the given permission.
 * Used for unauthorized error states to inform users what role is required.
 */
export function getRequiredRolesForPermission(permission: Permission | string): string[] {
  const target = String(permission);
  const qualifyingRoles: string[] = [];

  const mainRoles = [
    Role.PLATFORM_ADMIN,
    Role.DDMA_INCIDENT_COMMANDER,
    Role.FIELD_OFFICER,
    Role.USER,
  ];

  for (const r of mainRoles) {
    const perms = ROLE_PERMISSIONS[r] || [];
    if (perms.some((p) => p === target)) {
      qualifyingRoles.push(ROLE_DISPLAY_NAMES[r] || r);
    }
  }

  return qualifyingRoles;
}
