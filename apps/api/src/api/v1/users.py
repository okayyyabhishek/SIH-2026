"""
Sentinel NER — User Management Endpoints
Administrative provisioning, profile updates, account state transitions, and directory search.
Protected strictly by capability-based permissions (users:read, users:create, users:update, users:disable).
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status

from src.core.errors import ForbiddenException, ResourceNotFoundException, ValidationException
from src.core.logging import correlation_id_ctx
from src.core.security.dependencies import get_current_user, require_permission
from src.core.security.rbac import Permission
from src.db.repository import repository
from src.schemas.identity import UserCreate, UserListResponse, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get(
    "",
    response_model=UserListResponse,
    summary="List users with pagination and filtering",
    description="Returns paginated users. Requires users:read capability.",
)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    organization_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(require_permission(Permission.USERS_READ)),
):
    # Cross-tenant scoping: non-platform-admins cannot query arbitrary organizations
    if current_user["role"] != "PLATFORM_ADMIN" and organization_id and organization_id != current_user.get("organization_id"):
        raise ForbiddenException("Access to users outside your organization is forbidden.")

    # Default to actor's organization for non-platform admins if not specified
    scoped_org = organization_id if current_user["role"] == "PLATFORM_ADMIN" else current_user.get("organization_id")
    users, total = await repository.list_users(skip=skip, limit=limit, organization_id=scoped_org, status=status)

    return UserListResponse(
        items=[UserResponse(**u) for u in users],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provision a new operational user",
    description="Creates user and initial organization membership. Requires users:create capability.",
)
async def create_user(
    req: UserCreate,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.USERS_CREATE)),
):
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    # Cross-tenant boundary check
    if current_user["role"] != "PLATFORM_ADMIN" and req.organization_id != current_user.get("organization_id"):
        raise ForbiddenException("Cannot provision users in another organization.")

    try:
        user_doc = await repository.create_user(
            email=req.email,
            password=req.password,
            full_name=req.full_name,
            role=req.role,
            organization_id=req.organization_id,
            status=req.status.value,
        )
        await repository.record_security_event(
            event_type="USER_CREATED",
            actor_user_id=current_user["id"],
            actor_role=current_user["role"],
            organization_id=req.organization_id,
            resource=f"/api/v1/users/{user_doc['id']}",
            action="POST",
            result="SUCCESS",
            correlation_id=cid,
            client_ip=client_ip,
            details={"created_user_id": user_doc["id"], "role": req.role, "email": req.email},
        )
        return UserResponse(**user_doc)
    except ValueError as e:
        raise ValidationException(str(e))


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user details by ID",
    description="Returns user details for self or actors with users:read capability.",
)
async def get_user_by_id(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    # Self-access is always allowed; other lookups require users:read capability
    if user_id != current_user["id"] and current_user["role"] not in ("PLATFORM_ADMIN", "STATE_AUTHORITY", "DDMA", "OBSERVER_AUDITOR"):
        raise ForbiddenException("Insufficient permissions to view other user profiles.")

    user = await repository.get_user_by_id(user_id)
    if not user:
        raise ResourceNotFoundException("User", user_id)

    # Scoping check
    if current_user["role"] != "PLATFORM_ADMIN" and user.get("organization_id") != current_user.get("organization_id"):
        raise ForbiddenException("Access to users outside your organization is forbidden.")

    return UserResponse(**user)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user details",
    description="Updates user role, name, or status. Requires users:update capability.",
)
async def update_user(
    user_id: str,
    req: UserUpdate,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.USERS_UPDATE)),
):
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    target = await repository.get_user_by_id(user_id)
    if not target:
        raise ResourceNotFoundException("User", user_id)

    if current_user["role"] != "PLATFORM_ADMIN" and target.get("organization_id") != current_user.get("organization_id"):
        raise ForbiddenException("Cannot modify users outside your organization.")

    updates = req.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"]:
        updates["status"] = updates["status"].value

    updated = await repository.update_user(user_id, updates)

    # Record Role Change or User Update event
    if "role" in updates and updates["role"] != target.get("role"):
        await repository.record_security_event(
            event_type="ROLE_CHANGED",
            actor_user_id=current_user["id"],
            actor_role=current_user["role"],
            organization_id=target.get("organization_id"),
            resource=f"/api/v1/users/{user_id}",
            action="PATCH",
            result="SUCCESS",
            correlation_id=cid,
            client_ip=client_ip,
            details={"target_user_id": user_id, "old_role": target.get("role"), "new_role": updates["role"]},
        )
    else:
        await repository.record_security_event(
            event_type="USER_UPDATED",
            actor_user_id=current_user["id"],
            actor_role=current_user["role"],
            organization_id=target.get("organization_id"),
            resource=f"/api/v1/users/{user_id}",
            action="PATCH",
            result="SUCCESS",
            correlation_id=cid,
            client_ip=client_ip,
            details={"target_user_id": user_id, "fields_updated": list(updates.keys())},
        )

    return UserResponse(**updated)


@router.post(
    "/{user_id}/disable",
    response_model=UserResponse,
    summary="Disable an operational user account",
    description="Transitions user account status to DISABLED. Requires users:disable capability.",
)
async def disable_user(
    user_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.USERS_DISABLE)),
):
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    target = await repository.get_user_by_id(user_id)
    if not target:
        raise ResourceNotFoundException("User", user_id)

    if current_user["role"] != "PLATFORM_ADMIN" and target.get("organization_id") != current_user.get("organization_id"):
        raise ForbiddenException("Cannot disable users outside your organization.")

    disabled = await repository.disable_user(user_id)

    await repository.record_security_event(
        event_type="ACCOUNT_DISABLED",
        actor_user_id=current_user["id"],
        actor_role=current_user["role"],
        organization_id=target.get("organization_id"),
        resource=f"/api/v1/users/{user_id}/disable",
        action="POST",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"disabled_user_id": user_id},
    )

    return UserResponse(**disabled)

