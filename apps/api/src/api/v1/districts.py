"""
Sentinel NER — Districts API Endpoint (Stage 3)
Provides administrative district domain persistence, bounding-box/point filtering, and pagination.
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, ResourceNotFoundException
from src.core.logging import correlation_id_ctx
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission, evaluate_domain_scope_access
from src.db.repository import repository
from src.schemas.common import APIResponse
from src.schemas.domain import (
    DistrictCreate,
    DistrictResponse,
    DistrictUpdate,
    PaginatedResult,
)

router = APIRouter(prefix="/districts", tags=["Districts"])


@router.get("", response_model=APIResponse[PaginatedResult[DistrictResponse]])
async def list_districts(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page (capped at 100)"),
    state_code: Optional[str] = Query(None, description="Filter by state code e.g. 'MZ'"),
    status: Optional[str] = Query(None, description="Filter by status ('ACTIVE', 'INACTIVE')"),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Point-in-polygon longitude"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Point-in-polygon latitude"),
    min_lng: Optional[float] = Query(None, ge=-180.0, le=180.0),
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    max_lng: Optional[float] = Query(None, ge=-180.0, le=180.0),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Lists districts with optional spatial point/bbox filtering and server-side scope evaluation."""
    containing_point = [lng, lat] if lng is not None and lat is not None else None
    bbox = (min_lng, min_lat, max_lng, max_lat) if None not in (min_lng, min_lat, max_lng, max_lat) else None

    skip = (page - 1) * limit
    items, total = await repository.list_districts(
        skip=skip,
        limit=limit,
        state_code=state_code,
        status=status,
        containing_point=containing_point,
        bbox=bbox,
    )

    # Apply authoritative user jurisdictional filtering
    user_role = user.get("role")
    user_org = user.get("organization_id")
    filtered_items = []
    for d in items:
        if evaluate_domain_scope_access(
            actor_role=user_role,
            actor_org_id=user_org,
            target_state_code=d.get("state_code"),
            target_district_id=d.get("id"),
        ):
            filtered_items.append(DistrictResponse.model_validate(d))

    total_pages = max(1, (total + limit - 1) // limit)
    cid = correlation_id_ctx.get()

    return APIResponse(
        data=PaginatedResult(
            items=filtered_items,
            total=total,
            page=page,
            limit=limit,
            pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        ),
        correlation_id=cid,
    )


@router.get("/{district_id}", response_model=APIResponse[DistrictResponse])
async def get_district_by_id(
    district_id: str,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Retrieves a specific district with object-level scope validation."""
    district = await repository.get_district(district_id)
    if not district:
        raise ResourceNotFoundException("District", district_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=district.get("state_code"),
        target_district_id=district.get("id"),
    ):
        raise ForbiddenException("Access forbidden: target district is outside authorized geographic scope.")

    cid = correlation_id_ctx.get()
    return APIResponse(data=DistrictResponse.model_validate(district), correlation_id=cid)


@router.post("", response_model=APIResponse[DistrictResponse], status_code=201)
async def create_district(
    payload: DistrictCreate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Creates an administrative district. Enforces state/global authorization scope."""
    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=payload.state_code,
    ):
        raise ForbiddenException("Access forbidden: creating districts in this state is outside authorized scope.")

    data = payload.model_dump()
    # Serialize geometry to dict
    if isinstance(data.get("geometry"), dict) is False and hasattr(data.get("geometry"), "model_dump"):
        data["geometry"] = data["geometry"].model_dump()

    created = await repository.create_district(data=data, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_CREATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"district:{created['id']}",
        action="CREATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"code": created.get("code"), "state_code": created.get("state_code")},
    )

    return APIResponse(data=DistrictResponse.model_validate(created), correlation_id=cid)


@router.patch("/{district_id}", response_model=APIResponse[DistrictResponse])
async def update_district(
    district_id: str,
    payload: DistrictUpdate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Updates district metadata or boundary geometry."""
    district = await repository.get_district(district_id)
    if not district:
        raise ResourceNotFoundException("District", district_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=district.get("state_code"),
        target_district_id=district.get("id"),
    ):
        raise ForbiddenException("Access forbidden: modifying this district is outside authorized scope.")

    updates = payload.model_dump(exclude_unset=True)
    if "geometry" in updates and hasattr(updates["geometry"], "model_dump"):
        updates["geometry"] = updates["geometry"].model_dump()

    updated = await repository.update_district(district_id=district_id, updates=updates, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_UPDATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"district:{district_id}",
        action="UPDATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"fields": list(updates.keys())},
    )

    return APIResponse(data=DistrictResponse.model_validate(updated), correlation_id=cid)
