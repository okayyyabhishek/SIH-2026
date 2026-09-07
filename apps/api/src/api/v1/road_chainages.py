"""
Sentinel NER — Road Chainages API Endpoint (Stage 3)
Manages discrete kilometer/meter chainage reference posts along road networks.
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, ResourceNotFoundException, ValidationException
from src.core.logging import correlation_id_ctx
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission, evaluate_domain_scope_access
from src.db.repository import repository
from src.schemas.common import APIResponse
from src.schemas.domain import (
    PaginatedResult,
    RoadChainageCreate,
    RoadChainageResponse,
    RoadChainageUpdate,
)

router = APIRouter(prefix="/road-chainages", tags=["Road Chainages"])


@router.get("", response_model=APIResponse[PaginatedResult[RoadChainageResponse]])
async def list_road_chainages(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    road_id: Optional[str] = Query(None, description="Filter by parent road ID"),
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Lists chainage markers with parent road and district filtering."""
    skip = (page - 1) * limit
    items, total = await repository.list_road_chainages(
        skip=skip,
        limit=limit,
        road_id=road_id,
        district_id=district_id,
    )

    user_role = user.get("role")
    user_org = user.get("organization_id")
    filtered_items = []
    for ch in items:
        if evaluate_domain_scope_access(
            actor_role=user_role,
            actor_org_id=user_org,
            target_state_code=ch.get("state_code"),
            target_district_id=ch.get("district_id"),
        ):
            filtered_items.append(RoadChainageResponse.model_validate(ch))

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


@router.get("/{chainage_id}", response_model=APIResponse[RoadChainageResponse])
async def get_road_chainage_by_id(
    chainage_id: str,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Retrieves a specific chainage marker with scope validation."""
    ch = await repository.get_road_chainage(chainage_id)
    if not ch:
        raise ResourceNotFoundException("RoadChainage", chainage_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=ch.get("state_code"),
        target_district_id=ch.get("district_id"),
    ):
        raise ForbiddenException("Access forbidden: chainage marker is outside authorized operational scope.")

    cid = correlation_id_ctx.get()
    return APIResponse(data=RoadChainageResponse.model_validate(ch), correlation_id=cid)


@router.post("", response_model=APIResponse[RoadChainageResponse], status_code=201)
async def create_road_chainage(
    payload: RoadChainageCreate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Creates a road chainage marker. Enforces parent road existence and agency scope."""
    # Verify parent road scope
    road = await repository.get_road(payload.road_id)
    if not road:
        raise ValidationException(f"Referenced road '{payload.road_id}' does not exist.")

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=payload.state_code,
        target_district_id=payload.district_id,
        target_org_id=road.get("authority_organization_id"),
    ):
        raise ForbiddenException("Access forbidden: creating chainage on this road is outside authorized scope.")

    data = payload.model_dump()
    if isinstance(data.get("geometry"), dict) is False and hasattr(data.get("geometry"), "model_dump"):
        data["geometry"] = data["geometry"].model_dump()

    created = await repository.create_road_chainage(data=data, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_CREATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"chainage:{created['id']}",
        action="CREATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"road_id": created.get("road_id"), "km": created.get("chainage_km")},
    )

    return APIResponse(data=RoadChainageResponse.model_validate(created), correlation_id=cid)


@router.patch("/{chainage_id}", response_model=APIResponse[RoadChainageResponse])
async def update_road_chainage(
    chainage_id: str,
    payload: RoadChainageUpdate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Updates chainage marker location or metadata."""
    ch = await repository.get_road_chainage(chainage_id)
    if not ch:
        raise ResourceNotFoundException("RoadChainage", chainage_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=ch.get("state_code"),
        target_district_id=ch.get("district_id"),
    ):
        raise ForbiddenException("Access forbidden: modifying this chainage marker is outside authorized scope.")

    updates = payload.model_dump(exclude_unset=True)
    if "geometry" in updates and hasattr(updates["geometry"], "model_dump"):
        updates["geometry"] = updates["geometry"].model_dump()

    updated = await repository.update_road_chainage(chainage_id=chainage_id, updates=updates, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_UPDATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"chainage:{chainage_id}",
        action="UPDATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"fields": list(updates.keys())},
    )

    return APIResponse(data=RoadChainageResponse.model_validate(updated), correlation_id=cid)
