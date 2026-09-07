"""
Sentinel NER — Roads API Endpoint (Stage 3)
Manages transportation corridors, authority affiliations (BRO, PWD, NHIDCL), and proximity queries.
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
    PaginatedResult,
    RoadCreate,
    RoadResponse,
    RoadUpdate,
)

router = APIRouter(prefix="/roads", tags=["Roads"])


@router.get("", response_model=APIResponse[PaginatedResult[RoadResponse]])
async def list_roads(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    state_code: Optional[str] = Query(None, description="Filter by state code e.g. 'MZ'"),
    road_type: Optional[str] = Query(None, description="Filter by road type"),
    authority_organization_id: Optional[str] = Query(None, description="Filter by managing agency ID"),
    operational_status: Optional[str] = Query(None, description="Filter by operational status"),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Center longitude for nearby query"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Center latitude for nearby query"),
    radius_m: float = Query(5000.0, ge=1.0, le=50000.0, description="Search radius in meters (max 50km)"),
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Lists road corridors with nearby proximity queries and authoritative tenancy boundaries."""
    nearby_point = [lng, lat] if lng is not None and lat is not None else None

    skip = (page - 1) * limit
    items, total = await repository.list_roads(
        skip=skip,
        limit=limit,
        district_id=district_id,
        state_code=state_code,
        road_type=road_type,
        authority_organization_id=authority_organization_id,
        operational_status=operational_status,
        nearby_point=nearby_point,
        max_radius_m=radius_m,
    )

    user_role = user.get("role")
    user_org = user.get("organization_id")
    filtered_items = []
    for r in items:
        if evaluate_domain_scope_access(
            actor_role=user_role,
            actor_org_id=user_org,
            target_state_code=r.get("state_code"),
            target_district_id=r.get("district_id"),
            target_org_id=r.get("authority_organization_id"),
        ):
            filtered_items.append(RoadResponse.model_validate(r))

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


@router.get("/{road_id}", response_model=APIResponse[RoadResponse])
async def get_road_by_id(
    road_id: str,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Retrieves a specific road corridor with object-level scope validation."""
    road = await repository.get_road(road_id)
    if not road:
        raise ResourceNotFoundException("Road", road_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=road.get("state_code"),
        target_district_id=road.get("district_id"),
        target_org_id=road.get("authority_organization_id"),
    ):
        raise ForbiddenException("Access forbidden: target road is outside authorized operational scope.")

    cid = correlation_id_ctx.get()
    return APIResponse(data=RoadResponse.model_validate(road), correlation_id=cid)


@router.post("", response_model=APIResponse[RoadResponse], status_code=201)
async def create_road(
    payload: RoadCreate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Registers a road corridor. Validates authority organization and district scope."""
    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=payload.state_code,
        target_district_id=payload.district_id,
        target_org_id=payload.authority_organization_id,
    ):
        raise ForbiddenException("Access forbidden: registering roads for this agency/district is outside authorized scope.")

    data = payload.model_dump()
    if isinstance(data.get("geometry"), dict) is False and hasattr(data.get("geometry"), "model_dump"):
        data["geometry"] = data["geometry"].model_dump()

    created = await repository.create_road(data=data, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_CREATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"road:{created['id']}",
        action="CREATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"road_code": created.get("road_code"), "authority_org": created.get("authority_organization_id")},
    )

    return APIResponse(data=RoadResponse.model_validate(created), correlation_id=cid)


@router.patch("/{road_id}", response_model=APIResponse[RoadResponse])
async def update_road(
    road_id: str,
    payload: RoadUpdate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Updates road status, alignment geometry, or operational details."""
    road = await repository.get_road(road_id)
    if not road:
        raise ResourceNotFoundException("Road", road_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=road.get("state_code"),
        target_district_id=road.get("district_id"),
        target_org_id=road.get("authority_organization_id"),
    ):
        raise ForbiddenException("Access forbidden: modifying this road is outside authorized operational scope.")

    updates = payload.model_dump(exclude_unset=True)
    if "geometry" in updates and hasattr(updates["geometry"], "model_dump"):
        updates["geometry"] = updates["geometry"].model_dump()

    updated = await repository.update_road(road_id=road_id, updates=updates, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_UPDATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"road:{road_id}",
        action="UPDATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"fields": list(updates.keys())},
    )

    return APIResponse(data=RoadResponse.model_validate(updated), correlation_id=cid)
