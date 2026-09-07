"""
Sentinel NER — Organization & Tenancy Endpoints
Manages disaster authorities, infrastructure agencies, operational field units, and membership assignments.
Enforces multi-tenant organizational boundaries server-side.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status

from src.core.errors import ForbiddenException, ResourceNotFoundException, ValidationException
from src.core.logging import correlation_id_ctx
from src.core.security.dependencies import (
    require_permission,
    require_scope_access,
)
from src.core.security.rbac import Permission
from src.db.repository import repository
from src.schemas.identity import (
    MembershipCreate,
    MembershipListResponse,
    MembershipResponse,
    MembershipUpdate,
    OrganizationCreate,
    OrganizationListResponse,
    OrganizationResponse,
)

router = APIRouter(prefix="/organizations", tags=["Organization & Tenancy"])


@router.get(
    "",
    response_model=OrganizationListResponse,
    summary="List registered organizations",
    description="Returns paginated organizations. Requires organizations:read capability.",
)
async def list_organizations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    type: Optional[str] = Query(None),
    current_user: dict = Depends(require_permission(Permission.ORGANIZATIONS_READ)),
):
    orgs, total = await repository.list_organizations(skip=skip, limit=limit, org_type=type)
    return OrganizationListResponse(
        items=[OrganizationResponse(**o) for o in orgs],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new organization unit",
    description="Creates an emergency management, infrastructure, or field organization. Requires organizations:create capability.",
)
async def create_organization(
    req: OrganizationCreate,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.ORGANIZATIONS_CREATE)),
):
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    try:
        org_doc = await repository.create_organization(
            code=req.code,
            name=req.name,
            org_type=req.type.value,
            state=req.state,
            district=req.district,
            jurisdiction_scope=req.jurisdiction_scope,
        )
        await repository.record_security_event(
            event_type="ORGANIZATION_CREATED",
            actor_user_id=current_user["id"],
            actor_role=current_user["role"],
            organization_id=org_doc["id"],
            resource=f"/api/v1/organizations/{org_doc['id']}",
            action="POST",
            result="SUCCESS",
            correlation_id=cid,
            client_ip=client_ip,
            details={"code": req.code, "org_type": req.type.value},
        )
        return OrganizationResponse(**org_doc)
    except ValueError as e:
        raise ValidationException(str(e))


@router.get(
    "/{org_id}",
    response_model=OrganizationResponse,
    summary="Get organization details",
    description="Returns organization details. Scope enforced.",
)
async def get_organization(
    org_id: str,
    current_user: dict = Depends(require_scope_access("org_id")),
):
    org = await repository.get_organization(org_id)
    if not org:
        raise ResourceNotFoundException("Organization", org_id)
    return OrganizationResponse(**org)


@router.get(
    "/{org_id}/members",
    response_model=MembershipListResponse,
    summary="List members belonging to an organization",
    description="Returns paginated membership roster. Requires organizations:read and scope authorization.",
)
async def list_members(
    org_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_scope_access("org_id")),
):
    # Verify capability
    if current_user["role"] not in ("PLATFORM_ADMIN", "STATE_AUTHORITY", "DDMA", "OBSERVER_AUDITOR"):
        raise ForbiddenException("Insufficient capability to view organization membership roster.")

    members, total = await repository.list_organization_members(organization_id=org_id, skip=skip, limit=limit)
    return MembershipListResponse(
        items=[MembershipResponse(**m) for m in members],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/{org_id}/members",
    response_model=MembershipResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign user membership to organization",
    description="Creates or updates membership binding. Requires organizations:manage_members capability.",
)
async def add_member(
    org_id: str,
    req: MembershipCreate,
    request: Request,
    current_user: dict = Depends(require_scope_access("org_id")),
):
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    # Ensure permission
    if current_user["role"] not in ("PLATFORM_ADMIN", "STATE_AUTHORITY", "DDMA"):
        raise ForbiddenException("Actor lacks capability to manage organization members.")

    target_user = await repository.get_user_by_id(req.user_id)
    if not target_user:
        raise ResourceNotFoundException("User", req.user_id)

    mem = await repository.create_or_update_membership(
        user_id=req.user_id,
        organization_id=org_id,
        role=req.role,
        status=req.status.value,
    )

    await repository.record_security_event(
        event_type="MEMBERSHIP_CREATED",
        actor_user_id=current_user["id"],
        actor_role=current_user["role"],
        organization_id=org_id,
        resource=f"/api/v1/organizations/{org_id}/members/{req.user_id}",
        action="POST",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"assigned_user_id": req.user_id, "role": req.role, "status": req.status.value},
    )

    return MembershipResponse(**mem)


@router.patch(
    "/{org_id}/members/{user_id}",
    response_model=MembershipResponse,
    summary="Update member role or status (ACTIVE/SUSPENDED/REVOKED)",
    description="Modifies membership state. Requires organizations:manage_members capability.",
)
async def update_member_status(
    org_id: str,
    user_id: str,
    req: MembershipUpdate,
    request: Request,
    current_user: dict = Depends(require_scope_access("org_id")),
):
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    if current_user["role"] not in ("PLATFORM_ADMIN", "STATE_AUTHORITY", "DDMA"):
        raise ForbiddenException("Actor lacks capability to modify organization members.")

    existing = await repository.get_membership(user_id=user_id, organization_id=org_id)
    if not existing:
        raise ResourceNotFoundException("Membership", f"{user_id} in {org_id}")

    new_role = req.role if req.role is not None else existing["role"]
    new_status = req.status.value if req.status is not None else existing["status"]

    mem = await repository.create_or_update_membership(
        user_id=user_id,
        organization_id=org_id,
        role=new_role,
        status=new_status,
    )

    await repository.record_security_event(
        event_type="MEMBERSHIP_STATUS_CHANGED",
        actor_user_id=current_user["id"],
        actor_role=current_user["role"],
        organization_id=org_id,
        resource=f"/api/v1/organizations/{org_id}/members/{user_id}",
        action="PATCH",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"target_user_id": user_id, "old_status": existing["status"], "new_status": new_status, "role": new_role},
    )

    return MembershipResponse(**mem)

