"""
Sentinel NER — Assets API Endpoint (Stage 3)
Manages critical infrastructure, bridges, culverts, facilities, and managing department ownership.
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, ResourceNotFoundException
from src.core.logging import correlation_id_ctx, logger
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission, evaluate_domain_scope_access
from src.db.repository import repository
from src.schemas.common import APIResponse
from src.schemas.domain import (
    AssetCreate,
    AssetResponse,
    AssetUpdate,
    PaginatedResult,
)

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("", response_model=APIResponse[PaginatedResult[AssetResponse]])
async def list_assets(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    organization_id: Optional[str] = Query(None, description="Filter by managing organization ID"),
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    state_code: Optional[str] = Query(None, description="Filter by state code e.g. 'MZ'"),
    asset_type: Optional[str] = Query(None, description="Filter by asset type"),
    operational_status: Optional[str] = Query(None, description="Filter by operational status"),
    lng: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Center longitude for nearby query"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Center latitude for nearby query"),
    radius_m: float = Query(5000.0, ge=1.0, le=50000.0, description="Search radius in meters"),
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Lists critical infrastructure assets with nearby spatial search and departmental scoping."""
    nearby_point = [lng, lat] if lng is not None and lat is not None else None

    skip = (page - 1) * limit
    items, total = await repository.list_assets(
        skip=skip,
        limit=limit,
        organization_id=organization_id,
        district_id=district_id,
        state_code=state_code,
        asset_type=asset_type,
        operational_status=operational_status,
        nearby_point=nearby_point,
        max_radius_m=radius_m,
    )

    user_role = user.get("role")
    user_org = user.get("organization_id")
    user_dist = user.get("district_id")
    user_state = user.get("state_code")
    filtered_items = []
    for a in items:
        if evaluate_domain_scope_access(
            actor_role=user_role,
            actor_org_id=user_org,
            actor_district_id=user_dist,
            actor_state_code=user_state,
            target_state_code=a.get("state_code"),
            target_district_id=a.get("district_id"),
            target_org_id=a.get("organization_id"),
        ):
            try:
                filtered_items.append(AssetResponse.model_validate(a))
            except Exception as val_err:
                logger.warning(f"Skipping malformed asset {a.get('id')}: {val_err}")

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


@router.get("/{asset_id}", response_model=APIResponse[AssetResponse])
async def get_asset_by_id(
    asset_id: str,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """Retrieves an asset with object-level departmental and district scope validation."""
    asset = await repository.get_asset(asset_id)
    if not asset:
        raise ResourceNotFoundException("Asset", asset_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=asset.get("state_code"),
        target_district_id=asset.get("district_id"),
        target_org_id=asset.get("organization_id"),
    ):
        raise ForbiddenException("Access forbidden: target asset is outside authorized organizational scope.")

    cid = correlation_id_ctx.get()
    return APIResponse(data=AssetResponse.model_validate(asset), correlation_id=cid)


@router.post("", response_model=APIResponse[AssetResponse], status_code=201)
async def create_asset(
    payload: AssetCreate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Registers an infrastructure asset. Enforces managing organization and district scope."""
    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=payload.state_code,
        target_district_id=payload.district_id,
        target_org_id=payload.organization_id,
    ):
        raise ForbiddenException("Access forbidden: registering assets for this organization is outside authorized scope.")

    data = payload.model_dump()
    if isinstance(data.get("geometry"), dict) is False and hasattr(data.get("geometry"), "model_dump"):
        data["geometry"] = data["geometry"].model_dump()

    created = await repository.create_asset(data=data, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_CREATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"asset:{created['id']}",
        action="CREATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"name": created.get("name"), "type": created.get("asset_type"), "org_id": created.get("organization_id")},
    )

    return APIResponse(data=AssetResponse.model_validate(created), correlation_id=cid)


@router.patch("/{asset_id}", response_model=APIResponse[AssetResponse])
async def update_asset(
    asset_id: str,
    payload: AssetUpdate,
    request: Request,
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_WRITE)),
):
    """Updates operational status, damage reports, or location of an asset."""
    asset = await repository.get_asset(asset_id)
    if not asset:
        raise ResourceNotFoundException("Asset", asset_id)

    user_role = user.get("role")
    user_org = user.get("organization_id")
    if not evaluate_domain_scope_access(
        actor_role=user_role,
        actor_org_id=user_org,
        actor_district_id=user.get("district_id"),
        actor_state_code=user.get("state_code"),
        target_state_code=asset.get("state_code"),
        target_district_id=asset.get("district_id"),
        target_org_id=asset.get("organization_id"),
    ):
        raise ForbiddenException("Access forbidden: modifying this asset is outside authorized organizational scope.")

    updates = payload.model_dump(exclude_unset=True)
    if "geometry" in updates and hasattr(updates["geometry"], "model_dump"):
        updates["geometry"] = updates["geometry"].model_dump()

    updated = await repository.update_asset(asset_id=asset_id, updates=updates, actor_id=user.get("id"))
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    await repository.record_security_event(
        event_type="DOMAIN_OBJECT_UPDATED",
        actor_user_id=user.get("id"),
        actor_role=user_role,
        organization_id=user_org,
        resource=f"asset:{asset_id}",
        action="UPDATE",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
        details={"fields": list(updates.keys())},
    )

    return APIResponse(data=AssetResponse.model_validate(updated), correlation_id=cid)
