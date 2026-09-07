"""
Sentinel NER — Foundational Spatial Query API Endpoints (Stage 3)
Provides point-in-geometry, proximity radius, and bounding-box queries across authoritative operational layers.
Enforces EPSG:4326 ranges, bounded radius caps, and server-side RBAC scoping.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query

from src.core.errors import ValidationException
from src.core.logging import correlation_id_ctx
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission, evaluate_domain_scope_access
from src.db.repository import repository
from src.schemas.common import APIResponse

router = APIRouter(prefix="/spatial", tags=["Spatial Queries"])


def _normalize_layer_name(name: str) -> str:
    n = name.strip().lower()
    mapping = {
        "district": "districts",
        "districts": "districts",
        "slope_unit": "slope_units",
        "slope-unit": "slope_units",
        "slopeunits": "slope_units",
        "slope_units": "slope_units",
        "road": "roads",
        "roads": "roads",
        "village": "villages",
        "villages": "villages",
        "asset": "assets",
        "assets": "assets",
        "landslide_event": "landslide_events",
        "landslide-event": "landslide_events",
        "landslideevents": "landslide_events",
        "landslide_events": "landslide_events",
    }
    return mapping.get(n, n)


@router.get("/point-in-geometry", response_model=APIResponse[Dict[str, Any]])
@router.get("/point-query", response_model=APIResponse[Dict[str, Any]])
async def point_in_geometry_query(
    longitude: Optional[float] = Query(None, description="Longitude in EPSG:4326"),
    latitude: Optional[float] = Query(None, description="Latitude in EPSG:4326"),
    lng: Optional[float] = Query(None, description="Longitude alias"),
    lat: Optional[float] = Query(None, description="Latitude alias"),
    entity_type: Optional[str] = Query(None, description="Specific entity layer"),
    layers: Optional[str] = Query("districts,slope_units", description="Comma-separated layers"),
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """
    Evaluates which administrative districts and terrain slope units contain the given coordinates.
    Applies authoritative user jurisdictional filtering.
    """
    lon_val = longitude if longitude is not None else lng
    lat_val = latitude if latitude is not None else lat

    if lon_val is None or lat_val is None:
        raise ValidationException("Both longitude and latitude are required.")
    if not (-180.0 <= lon_val <= 180.0):
        raise ValidationException(f"Longitude must be between -180.0 and 180.0, got {lon_val}")
    if not (-90.0 <= lat_val <= 90.0):
        raise ValidationException(f"Latitude must be between -90.0 and 90.0, got {lat_val}")

    if entity_type:
        requested_layers = [_normalize_layer_name(entity_type)]
    else:
        requested_layers = [_normalize_layer_name(lyr) for lyr in layers.split(",") if lyr.strip()]

    raw_results = await repository.find_spatial_entities(
        entity_types=requested_layers,
        containing_point=[lon_val, lat_val],
        limit=50,
    )

    user_role = user.get("role")
    user_org = user.get("organization_id")
    user_dist = user.get("district_id")
    user_state = user.get("state_code")
    filtered: Dict[str, List[Dict[str, Any]]] = {}
    flat_items: List[Dict[str, Any]] = []

    for layer, items in raw_results.items():
        matched = [
            item for item in items
            if evaluate_domain_scope_access(
                actor_role=user_role,
                actor_org_id=user_org,
                actor_district_id=user_dist,
                actor_state_code=user_state,
                target_state_code=item.get("state_code"),
                target_district_id=item.get("district_id") or item.get("id"),
            )
        ]
        filtered[layer] = matched
        flat_items.extend(matched)

    cid = correlation_id_ctx.get()
    return APIResponse(
        data={"items": flat_items, "count": len(flat_items), **filtered},
        correlation_id=cid,
    )


@router.get("/nearby", response_model=APIResponse[Dict[str, Any]])
async def nearby_spatial_query(
    longitude: Optional[float] = Query(None, description="Center longitude"),
    latitude: Optional[float] = Query(None, description="Center latitude"),
    lng: Optional[float] = Query(None, description="Longitude alias"),
    lat: Optional[float] = Query(None, description="Latitude alias"),
    radius_meters: Optional[float] = Query(None, description="Search radius in meters"),
    radius_m: Optional[float] = Query(None, description="Search radius alias"),
    entity_type: Optional[str] = Query(None, description="Specific entity layer"),
    layers: Optional[str] = Query("roads,villages,assets,landslide_events", description="Comma-separated layers"),
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """
    Searches for operational entities (roads, villages, assets, historical landslide events)
    within the specified radius. Returns only authoritatively authorized entities.
    """
    lon_val = longitude if longitude is not None else lng
    lat_val = latitude if latitude is not None else lat

    if lon_val is None or lat_val is None:
        raise ValidationException("Both longitude and latitude are required.")
    if not (-180.0 <= lon_val <= 180.0):
        raise ValidationException(f"Longitude must be between -180.0 and 180.0, got {lon_val}")
    if not (-90.0 <= lat_val <= 90.0):
        raise ValidationException(f"Latitude must be between -90.0 and 90.0, got {lat_val}")

    rad = radius_meters if radius_meters is not None else (radius_m if radius_m is not None else 5000.0)
    if rad <= 0:
        raise ValidationException("Search radius must be positive.")
    if rad > 50000.0:
        raise ValidationException(f"Search radius exceeds maximum allowed 50000 meters limit, got {rad}")

    if entity_type:
        requested_layers = [_normalize_layer_name(entity_type)]
    else:
        requested_layers = [_normalize_layer_name(lyr) for lyr in layers.split(",") if lyr.strip()]

    raw_results = await repository.find_spatial_entities(
        entity_types=requested_layers,
        nearby_point=[lon_val, lat_val],
        radius_m=rad,
        limit=100,
    )

    user_role = user.get("role")
    user_org = user.get("organization_id")
    user_dist = user.get("district_id")
    user_state = user.get("state_code")
    filtered: Dict[str, List[Dict[str, Any]]] = {}
    flat_items: List[Dict[str, Any]] = []

    for layer, items in raw_results.items():
        matched = [
            item for item in items
            if evaluate_domain_scope_access(
                actor_role=user_role,
                actor_org_id=user_org,
                actor_district_id=user_dist,
                actor_state_code=user_state,
                target_state_code=item.get("state_code"),
                target_district_id=item.get("district_id"),
                target_org_id=item.get("organization_id") or item.get("authority_organization_id"),
            )
        ]
        filtered[layer] = matched
        flat_items.extend(matched)

    cid = correlation_id_ctx.get()
    return APIResponse(
        data={"items": flat_items, "count": len(flat_items), **filtered},
        correlation_id=cid,
    )


@router.get("/bbox", response_model=APIResponse[Dict[str, Any]])
async def bbox_spatial_query(
    min_lng: float = Query(..., description="Minimum longitude"),
    min_lat: float = Query(..., description="Minimum latitude"),
    max_lng: float = Query(..., description="Maximum longitude"),
    max_lat: float = Query(..., description="Maximum latitude"),
    entity_type: Optional[str] = Query(None, description="Specific entity layer"),
    layers: Optional[str] = Query("districts,villages,assets,roads", description="Comma-separated layers"),
    user: Dict[str, Any] = Depends(require_permission(Permission.DOMAIN_READ)),
):
    """
    Searches for operational entities intersecting the given bounding box.
    Enforces WGS84 range bounds and RBAC scoping.
    """
    for val, name, lo, hi in [
        (min_lng, "min_lng", -180.0, 180.0),
        (max_lng, "max_lng", -180.0, 180.0),
        (min_lat, "min_lat", -90.0, 90.0),
        (max_lat, "max_lat", -90.0, 90.0),
    ]:
        if not (lo <= val <= hi):
            raise ValidationException(f"{name} must be between {lo} and {hi}, got {val}")

    if min_lng > max_lng or min_lat > max_lat:
        raise ValidationException("Invalid bounding box: minimum coordinates must be <= maximum coordinates.")

    if entity_type:
        requested_layers = [_normalize_layer_name(entity_type)]
    else:
        requested_layers = [_normalize_layer_name(lyr) for lyr in layers.split(",") if lyr.strip()]

    raw_results = await repository.find_spatial_entities(
        entity_types=requested_layers,
        bbox=(min_lng, min_lat, max_lng, max_lat),
        limit=100,
    )

    user_role = user.get("role")
    user_org = user.get("organization_id")
    user_dist = user.get("district_id")
    user_state = user.get("state_code")
    filtered: Dict[str, List[Dict[str, Any]]] = {}
    flat_items: List[Dict[str, Any]] = []

    for layer, items in raw_results.items():
        matched = [
            item for item in items
            if evaluate_domain_scope_access(
                actor_role=user_role,
                actor_org_id=user_org,
                actor_district_id=user_dist,
                actor_state_code=user_state,
                target_state_code=item.get("state_code"),
                target_district_id=item.get("district_id") or item.get("id"),
                target_org_id=item.get("organization_id") or item.get("authority_organization_id"),
            )
        ]
        filtered[layer] = matched
        flat_items.extend(matched)

    cid = correlation_id_ctx.get()
    return APIResponse(
        data={"items": flat_items, "count": len(flat_items), **filtered},
        correlation_id=cid,
    )
