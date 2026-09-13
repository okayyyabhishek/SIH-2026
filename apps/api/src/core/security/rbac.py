"""
Sentinel NER — Role-Based Access Control (RBAC) & Scope Matrix
Defines authoritative roles, fine-grained capability permissions, and multi-tenant scoping.
"""

from enum import Enum
from typing import Dict, List, Optional, Set, Union


class Role(str, Enum):
    PLATFORM_ADMIN = "PLATFORM_ADMIN"
    DDMA_INCIDENT_COMMANDER = "DDMA_INCIDENT_COMMANDER"
    DDMA = "DDMA"  # Backward-compatible alias for DDMA_INCIDENT_COMMANDER
    STATE_AUTHORITY = "STATE_AUTHORITY"
    PWD = "PWD"
    BRO = "BRO"
    NHIDCL = "NHIDCL"
    RAILWAY_AUTHORITY = "RAILWAY_AUTHORITY"
    INFRASTRUCTURE_AUTHORITY = "INFRASTRUCTURE_AUTHORITY"
    FIELD_OFFICER = "FIELD_OFFICER"
    OBSERVER_AUDITOR = "OBSERVER_AUDITOR"
    USER = "USER"
    CITIZEN_REPORTER = "CITIZEN_REPORTER"  # Backward-compatible alias for USER


class Scope(str, Enum):
    GLOBAL = "GLOBAL"
    STATE = "STATE"
    DISTRICT = "DISTRICT"
    ORGANIZATION = "ORGANIZATION"


class Permission(str, Enum):
    # Canonical Module Permissions (Phase 3 Matrix)
    VIEW_COMMAND_CENTER = "view:command_center"
    VIEW_SPATIAL_MAP = "view:spatial_map"
    VIEW_CREEP_WATCH = "view:creep_watch"
    VIEW_LIVE_WEATHER = "view:live_weather"
    VIEW_EARLY_WARNING = "view:early_warning"
    VIEW_SATELLITE_HYDROLOGY = "view:satellite_hydrology"
    VIEW_SUBSURFACE_GEOTECH = "view:subsurface_geotech"
    VIEW_RISK_ENGINE = "view:risk_engine"
    VIEW_RISK_ENGINE_OPERATIONAL = "view:risk_engine_operational"
    VIEW_SENTINEL_AI = "view:sentinel_ai"
    VIEW_SENTINEL_AI_OPERATIONAL = "view:sentinel_ai_operational"
    VIEW_HIGHWAY_CORRIDORS = "view:highway_corridors"
    VIEW_CONSEQUENCE_INTEL = "view:consequence_intel"
    VIEW_OPERATIONS = "view:operations"
    VIEW_WARNING_LEDGER = "view:warning_ledger"
    VIEW_ALERTS = "view:alerts"
    VIEW_FIELD_SENSORS = "view:field_sensors"
    VIEW_FIELD_COMMUNITY = "view:field_community"

    # Canonical Administrative Permissions
    MANAGE_USERS = "manage:users"
    MANAGE_ROLES = "manage:roles"
    MANAGE_SYSTEM = "manage:system"
    VIEW_AUDIT_LOGS = "view:audit_logs"

    # User Management (Stage 2)
    USERS_READ = "users:read"
    USERS_CREATE = "users:create"
    USERS_UPDATE = "users:update"
    USERS_DISABLE = "users:disable"

    # Organization / Tenancy (Stage 2)
    ORGANIZATIONS_READ = "organizations:read"
    ORGANIZATIONS_CREATE = "organizations:create"
    ORGANIZATIONS_UPDATE = "organizations:update"
    ORGANIZATIONS_MANAGE_MEMBERS = "organizations:manage_members"

    # Security Audit (Stage 2)
    AUDIT_READ = "audit:read"

    # System & Operations (Stage 2)
    SYSTEM_MANAGE = "system:manage"

    # Domain Data & Geospatial Persistence (Stage 3)
    DOMAIN_READ = "domain:read"
    DOMAIN_WRITE = "domain:write"

    # Transparent Risk Engine (Stage 5)
    RISK_READ = "risk:read"
    RISK_RUN = "risk:run"
    RISK_MODEL_MANAGE = "risk:model_manage"

    # Satellite & InSAR Change Intelligence (Stage 6)
    SATELLITE_READ = "satellite:read"
    SATELLITE_INGEST = "satellite:ingest"
    SATELLITE_PROCESS = "satellite:process"

    # Consequence Intelligence (Stage 7)
    CONSEQUENCE_READ = "consequence:read"
    CONSEQUENCE_RUN = "consequence:run"

    # Human-Authorized Action, Warning & Intervention Control (Stage 8)
    ACTION_READ = "action:read"
    ACTION_CREATE = "action:create"
    ACTION_REVIEW = "action:review"
    ACTION_AUTHORIZE = "action:authorize"
    ACTION_EXECUTE = "action:execute"
    WARNING_READ = "warning:read"
    WARNING_CREATE = "warning:create"
    WARNING_AUTHORIZE = "warning:authorize"
    WARNING_DISPATCH = "warning:dispatch"
    WARNING_ACKNOWLEDGE = "warning:acknowledge"
    PLAYBOOK_READ = "playbook:read"
    PLAYBOOK_MANAGE = "playbook:manage"
    WARNING_LEDGER_READ = "warning_ledger:read"

    # Minimal Interface Capabilities
    EVENTS_READ = "events:read"
    EVENTS_CREATE = "events:create"
    EVENTS_UPDATE = "events:update"
    REPORTS_READ = "reports:read"
    REPORTS_CREATE = "reports:create"
    ALERTS_READ = "alerts:read"
    ALERTS_APPROVE = "alerts:approve"


# Role Normalization Helper
def normalize_role(role: Union[Role, str]) -> Role:
    """Normalizes role strings and backward-compatible aliases to canonical Enum values."""
    if isinstance(role, Role):
        r_str = role.value
    else:
        r_str = str(role).strip().upper()

    if r_str in ("DDMA", "DDMA_INCIDENT_COMMANDER"):
        return Role.DDMA_INCIDENT_COMMANDER
    if r_str in ("CITIZEN_REPORTER", "USER"):
        return Role.USER

    try:
        return Role(r_str)
    except ValueError:
        return Role.USER


# Base permissions for DDMA Incident Commander
DDMA_PERMISSIONS: Set[Permission] = {
    # All surveillance and disaster modules
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

    # Domain, intelligence, and action capabilities
    Permission.USERS_READ,
    Permission.ORGANIZATIONS_READ,
    Permission.ORGANIZATIONS_MANAGE_MEMBERS,
    Permission.DOMAIN_READ,
    Permission.DOMAIN_WRITE,
    Permission.RISK_READ,
    Permission.RISK_RUN,
    Permission.SATELLITE_READ,
    Permission.SATELLITE_PROCESS,
    Permission.CONSEQUENCE_READ,
    Permission.CONSEQUENCE_RUN,
    Permission.ACTION_READ,
    Permission.ACTION_CREATE,
    Permission.ACTION_REVIEW,
    Permission.ACTION_AUTHORIZE,
    Permission.ACTION_EXECUTE,
    Permission.WARNING_READ,
    Permission.WARNING_CREATE,
    Permission.WARNING_AUTHORIZE,
    Permission.WARNING_DISPATCH,
    Permission.WARNING_ACKNOWLEDGE,
    Permission.PLAYBOOK_READ,
    Permission.WARNING_LEDGER_READ,
    Permission.EVENTS_READ,
    Permission.EVENTS_CREATE,
    Permission.EVENTS_UPDATE,
    Permission.ALERTS_READ,
    Permission.ALERTS_APPROVE,
    Permission.REPORTS_READ,
}

# Base permissions for Field Officer
FIELD_OFFICER_PERMISSIONS: Set[Permission] = {
    # Operational field modules
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

    # Operational execution capabilities
    Permission.ORGANIZATIONS_READ,
    Permission.DOMAIN_READ,
    Permission.RISK_READ,
    Permission.CONSEQUENCE_READ,
    Permission.ACTION_READ,
    Permission.ACTION_REVIEW,
    Permission.ACTION_EXECUTE,
    Permission.WARNING_READ,
    Permission.WARNING_ACKNOWLEDGE,
    Permission.PLAYBOOK_READ,
    Permission.EVENTS_READ,
    Permission.EVENTS_CREATE,
    Permission.REPORTS_READ,
    Permission.REPORTS_CREATE,
    Permission.ALERTS_READ,
}

# Base permissions for General Public / User
USER_PERMISSIONS: Set[Permission] = {
    Permission.VIEW_SPATIAL_MAP,
    Permission.VIEW_ALERTS,
    Permission.VIEW_FIELD_COMMUNITY,
    Permission.VIEW_LIVE_WEATHER,
    Permission.REPORTS_READ,
    Permission.REPORTS_CREATE,
    Permission.ALERTS_READ,
}

# Authoritative Role-to-Permissions Mapping
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    # Platform Admin: Unrestricted access to every capability
    Role.PLATFORM_ADMIN: {p for p in Permission},

    # DDMA Incident Commander (Disaster Command)
    Role.DDMA_INCIDENT_COMMANDER: DDMA_PERMISSIONS,
    Role.DDMA: DDMA_PERMISSIONS,

    # Field Officer (Patrol & Ground Response)
    Role.FIELD_OFFICER: FIELD_OFFICER_PERMISSIONS,

    # General User / Citizen
    Role.USER: USER_PERMISSIONS,
    Role.CITIZEN_REPORTER: USER_PERMISSIONS,

    # State Authority (State Level Supervision)
    Role.STATE_AUTHORITY: {
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
        Permission.VIEW_AUDIT_LOGS,
        Permission.USERS_READ,
        Permission.USERS_CREATE,
        Permission.ORGANIZATIONS_READ,
        Permission.ORGANIZATIONS_UPDATE,
        Permission.ORGANIZATIONS_MANAGE_MEMBERS,
        Permission.AUDIT_READ,
        Permission.DOMAIN_READ,
        Permission.DOMAIN_WRITE,
        Permission.RISK_READ,
        Permission.RISK_RUN,
        Permission.SATELLITE_READ,
        Permission.SATELLITE_INGEST,
        Permission.SATELLITE_PROCESS,
        Permission.CONSEQUENCE_READ,
        Permission.CONSEQUENCE_RUN,
        Permission.ACTION_READ,
        Permission.ACTION_CREATE,
        Permission.ACTION_REVIEW,
        Permission.ACTION_AUTHORIZE,
        Permission.ACTION_EXECUTE,
        Permission.WARNING_READ,
        Permission.WARNING_CREATE,
        Permission.WARNING_AUTHORIZE,
        Permission.WARNING_DISPATCH,
        Permission.WARNING_ACKNOWLEDGE,
        Permission.PLAYBOOK_READ,
        Permission.PLAYBOOK_MANAGE,
        Permission.WARNING_LEDGER_READ,
        Permission.EVENTS_READ,
        Permission.EVENTS_CREATE,
        Permission.EVENTS_UPDATE,
        Permission.ALERTS_READ,
        Permission.ALERTS_APPROVE,
        Permission.REPORTS_READ,
    },

    # Infrastructure Line Departments
    Role.PWD: {
        Permission.VIEW_SPATIAL_MAP,
        Permission.VIEW_LIVE_WEATHER,
        Permission.VIEW_HIGHWAY_CORRIDORS,
        Permission.VIEW_CONSEQUENCE_INTEL,
        Permission.VIEW_OPERATIONS,
        Permission.VIEW_WARNING_LEDGER,
        Permission.VIEW_ALERTS,
        Permission.VIEW_FIELD_SENSORS,
        Permission.ORGANIZATIONS_READ,
        Permission.USERS_READ,
        Permission.DOMAIN_READ,
        Permission.DOMAIN_WRITE,
        Permission.RISK_READ,
        Permission.RISK_RUN,
        Permission.SATELLITE_READ,
        Permission.SATELLITE_PROCESS,
        Permission.CONSEQUENCE_READ,
        Permission.CONSEQUENCE_RUN,
        Permission.ACTION_READ,
        Permission.ACTION_REVIEW,
        Permission.ACTION_EXECUTE,
        Permission.WARNING_READ,
        Permission.WARNING_ACKNOWLEDGE,
        Permission.PLAYBOOK_READ,
        Permission.WARNING_LEDGER_READ,
        Permission.EVENTS_READ,
        Permission.REPORTS_READ,
        Permission.ALERTS_READ,
    },
    Role.BRO: {
        Permission.VIEW_SPATIAL_MAP,
        Permission.VIEW_LIVE_WEATHER,
        Permission.VIEW_HIGHWAY_CORRIDORS,
        Permission.VIEW_CONSEQUENCE_INTEL,
        Permission.VIEW_OPERATIONS,
        Permission.VIEW_WARNING_LEDGER,
        Permission.VIEW_ALERTS,
        Permission.VIEW_FIELD_SENSORS,
        Permission.ORGANIZATIONS_READ,
        Permission.USERS_READ,
        Permission.DOMAIN_READ,
        Permission.DOMAIN_WRITE,
        Permission.RISK_READ,
        Permission.RISK_RUN,
        Permission.SATELLITE_READ,
        Permission.SATELLITE_PROCESS,
        Permission.CONSEQUENCE_READ,
        Permission.CONSEQUENCE_RUN,
        Permission.ACTION_READ,
        Permission.ACTION_REVIEW,
        Permission.ACTION_EXECUTE,
        Permission.WARNING_READ,
        Permission.WARNING_ACKNOWLEDGE,
        Permission.PLAYBOOK_READ,
        Permission.WARNING_LEDGER_READ,
        Permission.EVENTS_READ,
        Permission.REPORTS_READ,
        Permission.ALERTS_READ,
    },
    Role.NHIDCL: {
        Permission.VIEW_SPATIAL_MAP,
        Permission.VIEW_LIVE_WEATHER,
        Permission.VIEW_HIGHWAY_CORRIDORS,
        Permission.VIEW_CONSEQUENCE_INTEL,
        Permission.VIEW_OPERATIONS,
        Permission.VIEW_WARNING_LEDGER,
        Permission.VIEW_ALERTS,
        Permission.VIEW_FIELD_SENSORS,
        Permission.ORGANIZATIONS_READ,
        Permission.USERS_READ,
        Permission.DOMAIN_READ,
        Permission.DOMAIN_WRITE,
        Permission.RISK_READ,
        Permission.RISK_RUN,
        Permission.SATELLITE_READ,
        Permission.SATELLITE_PROCESS,
        Permission.CONSEQUENCE_READ,
        Permission.CONSEQUENCE_RUN,
        Permission.ACTION_READ,
        Permission.ACTION_REVIEW,
        Permission.ACTION_EXECUTE,
        Permission.WARNING_READ,
        Permission.WARNING_ACKNOWLEDGE,
        Permission.PLAYBOOK_READ,
        Permission.WARNING_LEDGER_READ,
        Permission.EVENTS_READ,
        Permission.REPORTS_READ,
        Permission.ALERTS_READ,
    },
    Role.RAILWAY_AUTHORITY: {
        Permission.VIEW_SPATIAL_MAP,
        Permission.VIEW_LIVE_WEATHER,
        Permission.VIEW_HIGHWAY_CORRIDORS,
        Permission.VIEW_CONSEQUENCE_INTEL,
        Permission.VIEW_OPERATIONS,
        Permission.VIEW_WARNING_LEDGER,
        Permission.VIEW_ALERTS,
        Permission.VIEW_FIELD_SENSORS,
        Permission.ORGANIZATIONS_READ,
        Permission.USERS_READ,
        Permission.DOMAIN_READ,
        Permission.DOMAIN_WRITE,
        Permission.RISK_READ,
        Permission.RISK_RUN,
        Permission.SATELLITE_READ,
        Permission.SATELLITE_PROCESS,
        Permission.CONSEQUENCE_READ,
        Permission.CONSEQUENCE_RUN,
        Permission.ACTION_READ,
        Permission.ACTION_REVIEW,
        Permission.ACTION_EXECUTE,
        Permission.WARNING_READ,
        Permission.WARNING_ACKNOWLEDGE,
        Permission.PLAYBOOK_READ,
        Permission.WARNING_LEDGER_READ,
        Permission.EVENTS_READ,
        Permission.REPORTS_READ,
        Permission.ALERTS_READ,
    },
    Role.INFRASTRUCTURE_AUTHORITY: {
        Permission.VIEW_SPATIAL_MAP,
        Permission.VIEW_LIVE_WEATHER,
        Permission.VIEW_HIGHWAY_CORRIDORS,
        Permission.VIEW_CONSEQUENCE_INTEL,
        Permission.VIEW_OPERATIONS,
        Permission.VIEW_WARNING_LEDGER,
        Permission.VIEW_ALERTS,
        Permission.VIEW_FIELD_SENSORS,
        Permission.ORGANIZATIONS_READ,
        Permission.USERS_READ,
        Permission.DOMAIN_READ,
        Permission.DOMAIN_WRITE,
        Permission.RISK_READ,
        Permission.RISK_RUN,
        Permission.SATELLITE_READ,
        Permission.SATELLITE_PROCESS,
        Permission.CONSEQUENCE_READ,
        Permission.CONSEQUENCE_RUN,
        Permission.ACTION_READ,
        Permission.ACTION_REVIEW,
        Permission.ACTION_EXECUTE,
        Permission.WARNING_READ,
        Permission.WARNING_ACKNOWLEDGE,
        Permission.PLAYBOOK_READ,
        Permission.WARNING_LEDGER_READ,
        Permission.EVENTS_READ,
        Permission.REPORTS_READ,
        Permission.ALERTS_READ,
    },

    # Safety Auditor
    Role.OBSERVER_AUDITOR: {
        Permission.VIEW_AUDIT_LOGS,
        Permission.AUDIT_READ,
        Permission.ORGANIZATIONS_READ,
        Permission.USERS_READ,
        Permission.DOMAIN_READ,
        Permission.RISK_READ,
        Permission.SATELLITE_READ,
        Permission.CONSEQUENCE_READ,
        Permission.ACTION_READ,
        Permission.WARNING_READ,
        Permission.PLAYBOOK_READ,
        Permission.WARNING_LEDGER_READ,
        Permission.EVENTS_READ,
        Permission.REPORTS_READ,
        Permission.ALERTS_READ,
    },
}


def get_role_permissions(role: Union[Role, str]) -> Set[str]:
    """Resolves all granted permission strings for a given role (with alias normalization)."""
    norm_role = normalize_role(role)
    perms = ROLE_PERMISSIONS.get(norm_role, set())
    return {p.value for p in perms}


def has_permission(role: Union[Role, str], permission: Union[Permission, str]) -> bool:
    """Evaluates whether an actor role has capability to perform an action."""
    target_perm = permission.value if isinstance(permission, Permission) else str(permission)
    granted = get_role_permissions(role)
    return target_perm in granted


def has_any_permission(role: Union[Role, str], permissions: List[Union[Permission, str]]) -> bool:
    """Evaluates whether an actor role has at least one of the specified permissions."""
    granted = get_role_permissions(role)
    for p in permissions:
        val = p.value if isinstance(p, Permission) else str(p)
        if val in granted:
            return True
    return False


def has_all_permissions(role: Union[Role, str], permissions: List[Union[Permission, str]]) -> bool:
    """Evaluates whether an actor role has all of the specified permissions."""
    granted = get_role_permissions(role)
    for p in permissions:
        val = p.value if isinstance(p, Permission) else str(p)
        if val not in granted:
            return False
    return True


def has_role(user_role: Union[Role, str], expected_role: Union[Role, str]) -> bool:
    """Checks role equality with canonical normalization."""
    return normalize_role(user_role) == normalize_role(expected_role)


ROLE_DEFAULT_SCOPE: Dict[Role, Scope] = {
    Role.PLATFORM_ADMIN: Scope.GLOBAL,
    Role.DDMA_INCIDENT_COMMANDER: Scope.DISTRICT,
    Role.DDMA: Scope.DISTRICT,
    Role.STATE_AUTHORITY: Scope.STATE,
    Role.PWD: Scope.DISTRICT,
    Role.BRO: Scope.ORGANIZATION,
    Role.NHIDCL: Scope.ORGANIZATION,
    Role.RAILWAY_AUTHORITY: Scope.ORGANIZATION,
    Role.INFRASTRUCTURE_AUTHORITY: Scope.ORGANIZATION,
    Role.FIELD_OFFICER: Scope.ORGANIZATION,
    Role.OBSERVER_AUDITOR: Scope.GLOBAL,
    Role.USER: Scope.ORGANIZATION,
    Role.CITIZEN_REPORTER: Scope.ORGANIZATION,
}


def evaluate_scope_access(
    actor_role: Union[Role, str],
    actor_org_id: Optional[str],
    target_org_id: Optional[str],
    actor_scope: Optional[Scope] = None,
) -> bool:
    """
    Evaluates multi-tenant and geographic hierarchy.
    PLATFORM_ADMIN and OBSERVER_AUDITOR have GLOBAL scope.
    STATE_AUTHORITY can access child district organizations within their state.
    District and Organization users cannot cross tenant boundaries.
    """
    role = normalize_role(actor_role)

    if role in (Role.PLATFORM_ADMIN, Role.OBSERVER_AUDITOR):
        return True

    if not target_org_id:
        return True

    # Same organization is always permissible
    if actor_org_id and actor_org_id == target_org_id:
        return True

    effective_scope = actor_scope or ROLE_DEFAULT_SCOPE.get(role, Scope.DISTRICT)

    # State Authority can supervise child district organizations
    if role == Role.STATE_AUTHORITY and effective_scope in (Scope.STATE, Scope.GLOBAL):
        return True

    return False


STATE_CODE_MAP: Dict[str, str] = {
    "MIZORAM": "MZ",
    "ASSAM": "AS",
    "MEGHALAYA": "ML",
    "TRIPURA": "TR",
    "MANIPUR": "MN",
    "NAGALAND": "NL",
    "ARUNACHAL PRADESH": "AR",
    "SIKKIM": "SK",
    "MZ": "MZ",
    "AS": "AS",
    "ML": "ML",
    "TR": "TR",
    "MN": "MN",
    "NL": "NL",
    "AR": "AR",
    "SK": "SK",
}


def _norm_state(val: Optional[str]) -> Optional[str]:
    """Normalizes state name or state code to canonical uppercase 2-letter code."""
    if not val:
        return None
    cleaned = str(val).strip().upper()
    return STATE_CODE_MAP.get(cleaned, cleaned)


def evaluate_domain_scope_access(
    actor_role: Union[Role, str],
    actor_org_id: Optional[str] = None,
    actor_state_code: Optional[str] = None,
    actor_district_id: Optional[str] = None,
    target_state_code: Optional[str] = None,
    target_district_id: Optional[str] = None,
    target_org_id: Optional[str] = None,
) -> bool:
    """
    Evaluates object-level geographic and jurisdictional scope for domain entities.
    - PLATFORM_ADMIN and OBSERVER_AUDITOR have GLOBAL scope across all states and districts.
    - STATE_AUTHORITY can access entities within their assigned state.
    - DDMA_INCIDENT_COMMANDER and FIELD_OFFICER can access entities within their assigned district.
    - Infrastructure agencies can access entities matching their organization_id or within their district.
    - USER / CITIZEN_REPORTER is denied administrative domain access.
    """
    role = normalize_role(actor_role)

    if role == Role.USER:
        return False

    if role in (Role.PLATFORM_ADMIN, Role.OBSERVER_AUDITOR):
        return True

    norm_actor_state = _norm_state(actor_state_code)
    norm_target_state = _norm_state(target_state_code)

    # State Authority: must match state_code if specified
    if role == Role.STATE_AUTHORITY:
        if norm_actor_state and norm_target_state and norm_actor_state != norm_target_state:
            return False
        return True

    # DDMA / Incident Commanders
    if role == Role.DDMA_INCIDENT_COMMANDER:
        if norm_actor_state and norm_target_state and norm_actor_state != norm_target_state:
            return False
        if actor_district_id and target_district_id and actor_district_id != target_district_id:
            return False
        return True

    # Field Officers
    if role == Role.FIELD_OFFICER:
        if actor_district_id and target_district_id and actor_district_id != target_district_id:
            return False
        return True

    # Infrastructure Line Departments
    if role in (
        Role.PWD,
        Role.BRO,
        Role.NHIDCL,
        Role.RAILWAY_AUTHORITY,
        Role.INFRASTRUCTURE_AUTHORITY,
    ):
        if target_org_id and actor_org_id and target_org_id == actor_org_id:
            return True
        if target_org_id and actor_org_id and target_org_id != actor_org_id:
            return False
        if actor_district_id and target_district_id and actor_district_id != target_district_id:
            return False
        return True

    return False
