"""
Sentinel NER — Slope Units API Endpoint (Stage 3)
Replaces former Stage 3 architectural placeholder with authoritative operational terrain units.
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
    SlopeUnitCreate,
    SlopeUnitResponse,
    SlopeUnitUpdate,
)

router = APIRouter(prefix="/slope-units", tags=["Slope Units"])


@router.get("", response_model=APIResponse[PaginatedResult[SlopeUnitResponse]])
async def list_slope_units(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    state_code: Optional[str] = Query(None, description="Filter by state code e.g. 'MZ'"),
    status: Optional[str] = Query(None, description="Filter by status ('ACTIVE', 'MONITORED', 'INACTIVE')"),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Point-in-polygon longitude"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Point-in-polygon latitude"),
    min_lng: Optional[float] = Query(None, ge=-180.0, le=180.0),
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    max_lng: Optional[float] = Query(None, ge=-180.0, le=180.0),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Lists slope units with point-in-geometry/bbox spatial querying and tenant scope enforcement."""
    containing_point = [lng, lat] if lng is not None and lat is not None else None
    bbox = (min_lng, min_lat, max_lng, max_lat) if None not in (min_lng, min_lat, max_lng, max_lat) else None

    skip = (page - 1) * limit
    items, total = await repository.list_slope_units(
        skip=skip,
        limit=limit,
        district_id=district_id,
        state_code=state_code,
        status=status,
        containing_point=containing_point,
        bbox=bbox,
    )

    user_role = user.get("role")
    user_org = user.get("organization_id")
    user_dist = user.get("district_id")
    user_state = user.get("state_code")
    filtered_items = []
    for su in items:
        if evaluate_domain_scope_access(
            actor_role=user_role,
            actor_org_id=user_org,
            actor_district_id=user_dist,
            actor_state_code=user_state,
            target_state_code=su.get("state_code"),
            target_district_id=su.get("district_id"),
        ):
            filtered_items.append(SlopeUnitResponse.model_validate(su))

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


@router.get("/{slope_unit_id}", response_model=APIResponse[SlopeUnitResponse])
async def get_slope_unit_by_id(
    slope_unit_id: str,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Retrieves a slope unit with object-level scope validation."""
    su = await repository.get_slope_unit(slope_unit_id)
    if not su:
        raise ResourceNotFoundException("SlopeUnit", slope_unit_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=su.get("state_code"),
        target_district_id=su.get("district_id"),
    ):
        raise ForbiddenException("Access forbidden: target slope unit is outside authorized geographic scope.")

    cid = correlation_id_ctx.get()
    return APIResponse(data=SlopeUnitResponse.model_validate(su), correlation_id=cid)


@router.post("", response_model=APIResponse[SlopeUnitResponse], status_code=201)
async def create_slope_unit(
    payload: SlopeUnitCreate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Creates a slope management unit. Enforces district/state authorization boundaries."""
    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=payload.state_code,
        target_district_id=payload.district_id,
    ):
        raise ForbiddenException("Access forbidden: creating slope units in this district is outside authorized scope.")

    data = payload.model_dump()
    if isinstance(data.get("geometry"), dict) is False and hasattr(data.get("geometry"), "model_dump"):
        data["geometry"] = data["geometry"].model_dump()

    created = await repository.create_slope_unit(data=data, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_CREATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"slope_unit:{created['id']}",
        action="CREATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"code": created.get("code"), "district_id": created.get("district_id")},
    )

    return APIResponse(data=SlopeUnitResponse.model_validate(created), correlation_id=cid)


@router.patch("/{slope_unit_id}", response_model=APIResponse[SlopeUnitResponse])
async def update_slope_unit(
    slope_unit_id: str,
    payload: SlopeUnitUpdate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Updates slope unit metadata or monitoring status."""
    su = await repository.get_slope_unit(slope_unit_id)
    if not su:
        raise ResourceNotFoundException("SlopeUnit", slope_unit_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=su.get("state_code"),
        target_district_id=su.get("district_id"),
    ):
        raise ForbiddenException("Access forbidden: modifying this slope unit is outside authorized scope.")

    updates = payload.model_dump(exclude_unset=True)
    if "geometry" in updates and hasattr(updates["geometry"], "model_dump"):
        updates["geometry"] = updates["geometry"].model_dump()

    updated = await repository.update_slope_unit(slope_unit_id=slope_unit_id, updates=updates, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_UPDATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"slope_unit:{slope_unit_id}",
        action="UPDATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"fields": list(updates.keys())},
    )

    return APIResponse(data=SlopeUnitResponse.model_validate(updated), correlation_id=cid)
