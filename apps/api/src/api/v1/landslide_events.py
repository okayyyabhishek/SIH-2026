"""
Sentinel NER — Landslide Events API Endpoint (Stage 3)
Manages historical landslide records, field observations, provenance tracking, and spatial queries.
"""

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, ResourceNotFoundException
from src.core.logging import correlation_id_ctx
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission, evaluate_domain_scope_access
from src.db.repository import repository
from src.schemas.common import APIResponse
from src.schemas.domain import (
    LandslideEventCreate,
    LandslideEventResponse,
    LandslideEventUpdate,
    PaginatedResult,
)

router = APIRouter(prefix="/landslide-events", tags=["Landslide Events"])


@router.get("", response_model=APIResponse[PaginatedResult[LandslideEventResponse]])
async def list_landslide_events(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    state_code: Optional[str] = Query(None, description="Filter by state code e.g. 'MZ'"),
    source: Optional[str] = Query(None, description="Filter by source e.g. 'FIELD_OBSERVATION'"),
    status: Optional[str] = Query(None, description="Filter by status ('REPORTED', 'VERIFIED', etc.)"),
    from_date: Optional[datetime] = Query(None, description="ISO timestamp start filter"),
    to_date: Optional[datetime] = Query(None, description="ISO timestamp end filter"),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Center longitude for nearby query"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Center latitude for nearby query"),
    radius_m: float = Query(5000.0, ge=1.0, le=50000.0, description="Search radius in meters"),
    user: Dict[str, Any] = Depends(require_permission(Permission.EVENTS_READ)),
):
    """Lists landslide events with temporal, provenance, and spatial proximity filtering."""
    nearby_point = [lng, lat] if lng is not None and lat is not None else None

    skip = (page - 1) * limit
    items, total = await repository.list_landslide_events(
        skip=skip,
        limit=limit,
        district_id=district_id,
        state_code=state_code,
        source=source,
        status=status,
        from_date=from_date,
        to_date=to_date,
        nearby_point=nearby_point,
        max_radius_m=radius_m,
    )

    user_role = user.get("role")
    user_org = user.get("organization_id")
    user_dist = user.get("district_id")
    user_state = user.get("state_code")
    filtered_items = []
    for evt in items:
        if evaluate_domain_scope_access(
            actor_role=user_role,
            actor_org_id=user_org,
            actor_district_id=user_dist,
            actor_state_code=user_state,
            target_state_code=evt.get("state_code"),
            target_district_id=evt.get("district_id"),
        ):
            filtered_items.append(LandslideEventResponse.model_validate(evt))

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


@router.get("/{event_id}", response_model=APIResponse[LandslideEventResponse])
async def get_landslide_event_by_id(
    event_id: str,
    user: Dict[str, Any] = Depends(require_permission(Permission.EVENTS_READ)),
):
    """Retrieves a historical landslide record with object-level scope validation."""
    event = await repository.get_landslide_event(event_id)
    if not event:
        raise ResourceNotFoundException("LandslideEvent", event_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=event.get("state_code"),
        target_district_id=event.get("district_id"),
    ):
        raise ForbiddenException("Access forbidden: target event record is outside authorized operational scope.")

    cid = correlation_id_ctx.get()
    return APIResponse(data=LandslideEventResponse.model_validate(event), correlation_id=cid)


@router.post("", response_model=APIResponse[LandslideEventResponse], status_code=201)
async def create_landslide_event(
    payload: LandslideEventCreate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.EVENTS_CREATE)),
):
    """Records an observed or official landslide occurrence with provenance metadata."""
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
        raise ForbiddenException("Access forbidden: logging events in this district is outside authorized scope.")

    data = payload.model_dump()
    if isinstance(data.get("geometry"), dict) is False and hasattr(data.get("geometry"), "model_dump"):
        data["geometry"] = data["geometry"].model_dump()

    created = await repository.create_landslide_event(data=data, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_CREATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"landslide_event:{created['id']}",
        action="CREATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"event_ref": created.get("event_reference"), "source": created.get("source")},
    )

    return APIResponse(data=LandslideEventResponse.model_validate(created), correlation_id=cid)


@router.patch("/{event_id}", response_model=APIResponse[LandslideEventResponse])
async def update_landslide_event(
    event_id: str,
    payload: LandslideEventUpdate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.EVENTS_UPDATE)),
):
    """Updates landslide event status or verification details while preserving provenance."""
    event = await repository.get_landslide_event(event_id)
    if not event:
        raise ResourceNotFoundException("LandslideEvent", event_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=event.get("state_code"),
        target_district_id=event.get("district_id"),
    ):
        raise ForbiddenException("Access forbidden: modifying this event is outside authorized operational scope.")

    updates = payload.model_dump(exclude_unset=True)
    updated = await repository.update_landslide_event(event_id=event_id, updates=updates, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_UPDATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"landslide_event:{event_id}",
        action="UPDATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"fields": list(updates.keys())},
    )

    return APIResponse(data=LandslideEventResponse.model_validate(updated), correlation_id=cid)


@router.delete("/{event_id}", response_model=APIResponse[LandslideEventResponse])
async def delete_landslide_event(
    event_id: str,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.EVENTS_UPDATE)),
):
    """
    Retires a historical landslide event record by transitioning status to ARCHIVED.
    Historical events are never hard-purged to protect operational history and audit trail.
    """
    event = await repository.get_landslide_event(event_id)
    if not event:
        raise ResourceNotFoundException("LandslideEvent", event_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=event.get("state_code"),
        target_district_id=event.get("district_id"),
    ):
        raise ForbiddenException("Access forbidden: archiving this event is outside authorized operational scope.")

    updated = await repository.update_landslide_event(
        event_id=event_id,
        updates={"status": "ARCHIVED"},
        actor_id=user.get("id"),
    )
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_LIFECYCLE_CHANGED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"landslide_event:{event_id}",
        action="DELETE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"lifecycle_status": "ARCHIVED", "reason": "Administrative soft-delete"},
    )

    return APIResponse(data=LandslideEventResponse.model_validate(updated), correlation_id=cid)

