"""
Sentinel NER — Villages API Endpoint (Stage 3)
Manages habitations, communities, census population references, and spatial locations.
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
    VillageCreate,
    VillageResponse,
    VillageUpdate,
)

router = APIRouter(prefix="/villages", tags=["Villages"])


@router.get("", response_model=APIResponse[PaginatedResult[VillageResponse]])
async def list_villages(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    state_code: Optional[str] = Query(None, description="Filter by state code e.g. 'MZ'"),
    status: Optional[str] = Query(None, description="Filter by status ('ACTIVE', 'EVACUATED', etc.)"),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Center longitude for nearby query"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Center latitude for nearby query"),
    radius_m: float = Query(5000.0, ge=1.0, le=50000.0, description="Search radius in meters"),
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Lists villages with nearby proximity queries and district scope evaluation."""
    nearby_point = [lng, lat] if lng is not None and lat is not None else None

    skip = (page - 1) * limit
    items, total = await repository.list_villages(
        skip=skip,
        limit=limit,
        district_id=district_id,
        state_code=state_code,
        status=status,
        nearby_point=nearby_point,
        max_radius_m=radius_m,
    )

    user_role = user.get("role")
    user_org = user.get("organization_id")
    filtered_items = []
    for v in items:
        if evaluate_domain_scope_access(
            actor_role=user_role,
            actor_org_id=user_org,
            target_state_code=v.get("state_code"),
            target_district_id=v.get("district_id"),
        ):
            filtered_items.append(VillageResponse.model_validate(v))

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


@router.get("/{village_id}", response_model=APIResponse[VillageResponse])
async def get_village_by_id(
    village_id: str,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Retrieves a village with object-level scope validation."""
    village = await repository.get_village(village_id)
    if not village:
        raise ResourceNotFoundException("Village", village_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=village.get("state_code"),
        target_district_id=village.get("district_id"),
    ):
        raise ForbiddenException("Access forbidden: target village is outside authorized geographic scope.")

    cid = correlation_id_ctx.get()
    return APIResponse(data=VillageResponse.model_validate(village), correlation_id=cid)


@router.post("", response_model=APIResponse[VillageResponse], status_code=201)
async def create_village(
    payload: VillageCreate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Creates a village entity. Enforces district authorization scope."""
    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=payload.state_code,
        target_district_id=payload.district_id,
    ):
        raise ForbiddenException("Access forbidden: creating villages in this district is outside authorized scope.")

    data = payload.model_dump()
    if isinstance(data.get("geometry"), dict) is False and hasattr(data.get("geometry"), "model_dump"):
        data["geometry"] = data["geometry"].model_dump()

    created = await repository.create_village(data=data, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_CREATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"village:{created['id']}",
        action="CREATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"name": created.get("name"), "district_id": created.get("district_id")},
    )

    return APIResponse(data=VillageResponse.model_validate(created), correlation_id=cid)


@router.patch("/{village_id}", response_model=APIResponse[VillageResponse])
async def update_village(
    village_id: str,
    payload: VillageUpdate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Updates village status or location."""
    vil = await repository.get_village(village_id)
    if not vil:
        raise ResourceNotFoundException("Village", village_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        target_state_code=vil.get("state_code"),
        target_district_id=vil.get("district_id"),
    ):
        raise ForbiddenException("Access forbidden: modifying this village is outside authorized scope.")

    updates = payload.model_dump(exclude_unset=True)
    if "geometry" in updates and hasattr(updates["geometry"], "model_dump"):
        updates["geometry"] = updates["geometry"].model_dump()

    updated = await repository.update_village(village_id=village_id, updates=updates, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_UPDATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"village:{village_id}",
        action="UPDATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"fields": list(updates.keys())},
    )

    return APIResponse(data=VillageResponse.model_validate(updated), correlation_id=cid)
