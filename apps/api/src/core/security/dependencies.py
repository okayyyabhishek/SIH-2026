"""
Sentinel NER — FastAPI Authorization Dependencies
Authoritative server-side identity, permission evaluation, and multi-tenant scoping.
"""

from typing import Any, Callable, Dict, Optional

from fastapi import Depends, Path, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.errors import (
    AccountDisabledException,
    ForbiddenException,
    MembershipSuspendedException,
    UnauthorizedException,
)
from src.core.logging import correlation_id_ctx
from src.core.security.jwt import decode_and_validate_token
from src.core.security.rbac import (
    Permission,
    evaluate_scope_access,
    has_permission,
)
from src.db.repository import repository
from src.schemas.identity import MembershipStatus, UserStatus

# HTTPBearer scheme for OpenAPI documentation
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    """
    Authoritative authentication dependency.
    Validates JWT token, verifies authoritative server-side user status,
    and ensures the account is ACTIVE.
    """
    if not credentials or not credentials.credentials:
        raise UnauthorizedException("Authorization header with Bearer token is required.")

    payload = decode_and_validate_token(credentials.credentials, expected_type="access")
    jti = payload.get("jti")
    if jti and await repository.is_token_revoked(jti):
        raise UnauthorizedException("Token has been revoked.")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Token subject is missing.")

    user = await repository.get_user_by_id(user_id)
    if not user:
        raise UnauthorizedException("Authenticated user identity no longer exists.")

    # Check Account Status
    status = user.get("status")
    if status != UserStatus.ACTIVE.value:
        raise AccountDisabledException(f"Account state is '{status}'. Privileged access is denied.")

    # Check Active Organization Membership (if bound to an org)
    org_id = user.get("organization_id")
    if org_id:
        membership = await repository.get_membership(user_id, org_id)
        if membership:
            m_status = membership.get("status")
            if m_status in (MembershipStatus.SUSPENDED.value, MembershipStatus.REVOKED.value):
                raise MembershipSuspendedException(
                    f"Organization membership is '{m_status}'. Operational actions are blocked."
                )
        org = await repository.get_organization(org_id)
        if org:
            user["district_id"] = org.get("district_id") or org.get("district")
            user["state_code"] = org.get("state_code") or org.get("state")

    return user


class AuthenticatedUser:
    """Wrapper supporting both attribute and dict-like access for type-safe dependencies."""

    def __init__(self, data: Dict[str, Any]):
        self._data = data
        self.id = data.get("id", "")
        self.email = data.get("email", "")
        self.role = data.get("role", "")
        self.district_id = data.get("district_id")
        self.organization_id = data.get("organization_id")
        self.state_code = data.get("state_code")

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def __getitem__(self, key: str) -> Any:
        return self._data[key]

    def __contains__(self, key: str) -> bool:
        return key in self._data


async def get_current_active_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> AuthenticatedUser:
    user_dict = await get_current_user(request, credentials)
    return AuthenticatedUser(user_dict)


async def get_optional_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[AuthenticatedUser]:
    if not credentials or not credentials.credentials:
        return None
    try:
        user_dict = await get_current_user(request, credentials)
        return AuthenticatedUser(user_dict)
    except Exception:
        return None


def require_permission(permission: Permission | str) -> Callable:
    """
    Dependency factory verifying that the authenticated user possesses a specific capability.
    Rejects unauthorized requests server-side with 403 Forbidden and emits an audit event.
    """
    perm_val = permission.value if isinstance(permission, Permission) else permission

    async def _permission_dependency(
        request: Request,
        user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        user_role = user.get("role")
        if not has_permission(user_role, perm_val):
            # Record audit denial
            cid = correlation_id_ctx.get()
            client_ip = request.client.host if request.client else "unknown"
            await repository.record_security_event(
                event_type="PERMISSION_DENIED",
                actor_user_id=user.get("id"),
                actor_role=user_role,
                organization_id=user.get("organization_id"),
                resource=str(request.url.path),
                action=str(request.method),
                result="DENIED",
                correlation_id=cid,
                client_ip=client_ip,
                details={"required_permission": perm_val},
            )
            raise ForbiddenException(
                f"Actor role '{user_role}' lacks required capability '{perm_val}'."
            )
        return user

    return _permission_dependency


def require_scope_access(org_id_param: str = "id") -> Callable:
    """
    Dependency factory enforcing cross-tenant and geographic boundaries.
    Prevents district/organization actors from accessing another organization's resources.
    """
    async def _scope_dependency(
        request: Request,
        target_org_id: str = Path(..., alias=org_id_param),
        user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        user_role = user.get("role")
        user_org_id = user.get("organization_id")

        if not evaluate_scope_access(user_role, user_org_id, target_org_id):
            cid = correlation_id_ctx.get()
            client_ip = request.client.host if request.client else "unknown"
            await repository.record_security_event(
                event_type="CROSS_TENANT_ACCESS_BLOCKED",
                actor_user_id=user.get("id"),
                actor_role=user_role,
                organization_id=user_org_id,
                resource=f"org:{target_org_id}",
                action=str(request.method),
                result="DENIED",
                correlation_id=cid,
                client_ip=client_ip,
                details={"target_organization_id": target_org_id},
            )
            raise ForbiddenException(
                "Access forbidden: target organization is outside authorized organizational scope."
            )
        return user

    return _scope_dependency
