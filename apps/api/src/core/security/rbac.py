"""
Sentinel NER — Role-Based Access Control (RBAC) & Scope Matrix
Defines authoritative roles, fine-grained capability permissions, and multi-tenant scoping.
"""

from enum import Enum
from typing import Dict, Optional, Set


class Role(str, Enum):
    PLATFORM_ADMIN = "PLATFORM_ADMIN"
    STATE_AUTHORITY = "STATE_AUTHORITY"
    DDMA = "DDMA"
    PWD = "PWD"
    BRO = "BRO"
    NHIDCL = "NHIDCL"
    RAILWAY_AUTHORITY = "RAILWAY_AUTHORITY"
    INFRASTRUCTURE_AUTHORITY = "INFRASTRUCTURE_AUTHORITY"
    FIELD_OFFICER = "FIELD_OFFICER"
    OBSERVER_AUDITOR = "OBSERVER_AUDITOR"
    CITIZEN_REPORTER = "CITIZEN_REPORTER"


class Scope(str, Enum):
    GLOBAL = "GLOBAL"
    STATE = "STATE"
    DISTRICT = "DISTRICT"
    ORGANIZATION = "ORGANIZATION"


class Permission(str, Enum):
    # User Management
    USERS_READ = "users:read"
    USERS_CREATE = "users:create"
    USERS_UPDATE = "users:update"
    USERS_DISABLE = "users:disable"

    # Organization / Tenancy
    ORGANIZATIONS_READ = "organizations:read"
    ORGANIZATIONS_CREATE = "organizations:create"
    ORGANIZATIONS_UPDATE = "organizations:update"
    ORGANIZATIONS_MANAGE_MEMBERS = "organizations:manage_members"

    # Security Audit
    AUDIT_READ = "audit:read"

    # System & Operations
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

    # Minimal Interface Capabilities for Future Stages (Contracts Only)
    EVENTS_READ = "events:read"
    EVENTS_CREATE = "events:create"
    EVENTS_UPDATE = "events:update"
    REPORTS_READ = "reports:read"
    REPORTS_CREATE = "reports:create"
    ALERTS_READ = "alerts:read"
    ALERTS_APPROVE = "alerts:approve"


# Authoritative Role-to-Permissions Mapping
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.PLATFORM_ADMIN: {p for p in Permission},  # Full administrative capabilities
    Role.STATE_AUTHORITY: {
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
    Role.DDMA: {
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
    },
    Role.PWD: {
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
    },
    Role.BRO: {
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
    },
    Role.NHIDCL: {
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
    },
    Role.RAILWAY_AUTHORITY: {
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
    },
    Role.INFRASTRUCTURE_AUTHORITY: {
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
    },
    Role.FIELD_OFFICER: {
        Permission.ORGANIZATIONS_READ,
        Permission.DOMAIN_READ,
        Permission.RISK_READ,
        Permission.SATELLITE_READ,
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
    },
    Role.OBSERVER_AUDITOR: {
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
    },
    Role.CITIZEN_REPORTER: {
        Permission.REPORTS_CREATE,
        Permission.REPORTS_READ,
    },
}


def get_role_permissions(role: Role | str) -> Set[str]:
    """Resolves all granted permission strings for a given role."""
    try:
        r = Role(role) if isinstance(role, str) else role
        return {p.value for p in ROLE_PERMISSIONS.get(r, set())}
    except ValueError:
        return set()


def has_permission(role: Role | str, permission: Permission | str) -> bool:
    """Evaluates whether an actor role has capability to perform an action."""
    target_perm = permission.value if isinstance(permission, Permission) else permission
    granted = get_role_permissions(role)
    return target_perm in granted


ROLE_DEFAULT_SCOPE: Dict[Role, Scope] = {
    Role.PLATFORM_ADMIN: Scope.GLOBAL,
    Role.STATE_AUTHORITY: Scope.STATE,
    Role.DDMA: Scope.DISTRICT,
    Role.PWD: Scope.DISTRICT,
    Role.BRO: Scope.ORGANIZATION,
    Role.NHIDCL: Scope.ORGANIZATION,
    Role.RAILWAY_AUTHORITY: Scope.ORGANIZATION,
    Role.INFRASTRUCTURE_AUTHORITY: Scope.ORGANIZATION,
    Role.FIELD_OFFICER: Scope.ORGANIZATION,
    Role.OBSERVER_AUDITOR: Scope.GLOBAL,
    Role.CITIZEN_REPORTER: Scope.ORGANIZATION,
}


def evaluate_scope_access(
    actor_role: Role | str,
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
    role = Role(actor_role) if isinstance(actor_role, str) else actor_role

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
    actor_role: Role | str,
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
    - DDMA and FIELD_OFFICER can access entities within their assigned district (or statewide if no district specified).
    - Infrastructure agencies (PWD, BRO, NHIDCL, RAILWAY_AUTHORITY, INFRASTRUCTURE_AUTHORITY)
      can access entities matching their organization_id or within their district.
    - CITIZEN_REPORTER is denied administrative domain access.
    """
    role = Role(actor_role) if isinstance(actor_role, str) else actor_role

    if role == Role.CITIZEN_REPORTER:
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

    # DDMA / District Authorities
    if role == Role.DDMA:
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

    # Infrastructure Line Departments (PWD, BRO, NHIDCL, RAILWAYS, INFRASTRUCTURE)
    if role in (
        Role.PWD,
        Role.BRO,
        Role.NHIDCL,
        Role.RAILWAY_AUTHORITY,
        Role.INFRASTRUCTURE_AUTHORITY,
    ):
        # Direct organizational ownership always permits
        if target_org_id and actor_org_id and target_org_id == actor_org_id:
            return True
        # If target belongs to an unrelated organization, block cross-tenant modification
        if target_org_id and actor_org_id and target_org_id != actor_org_id:
            return False
        # If district-restricted, enforce district boundary
        if actor_district_id and target_district_id and actor_district_id != target_district_id:
            return False
        return True

    return False


