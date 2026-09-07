"""
Sentinel NER — InSAR Ground Deformation Intelligence API Endpoints (Stage 6)
Provides versioned endpoints for InSAR Observations, Line-of-Sight (LOS) Displacement
Statistics, Coherence Metrics, and Interferometric Provenance.
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, NotFoundException, ValidationException
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission, evaluate_domain_scope_access
from src.db.repository import repository
from src.schemas.common import APIEnvelope
from src.schemas.domain import PaginatedResult
from src.schemas.satellite import (
    InSARObservation,
    QualityState,
)

router = APIRouter(prefix="/insar", tags=["Stage 6 — InSAR Deformation Intelligence"])


@router.get("/observations", response_model=APIEnvelope[PaginatedResult[InSARObservation]])
async def list_insar_observations(
    request: Request,
    min_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Bounding box min longitude"),
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Bounding box min latitude"),
    max_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Bounding box max longitude"),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Bounding box max latitude"),
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    quality_state: Optional[QualityState] = Query(None, description="Filter by quality state"),
    min_coherence: Optional[float] = Query(None, ge=0.0, le=1.0, description="Filter by minimum coherence threshold"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Lists InSAR observations and LOS deformation footprints scoped by jurisdiction."""
    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    actor_state = current_user.get("state_code")
    actor_org = current_user.get("organization_id")

    # Authoritative Tenancy Scoping
    effective_district = district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if district_id and actor_district and district_id != actor_district:
            raise ForbiddenException("Actor is not authorized to inspect InSAR observations for other districts.")
        effective_district = actor_district or district_id

    bbox = None
    if any(c is not None for c in (min_lon, min_lat, max_lon, max_lat)):
        if any(c is None for c in (min_lon, min_lat, max_lon, max_lat)):
            raise ValidationException("All 4 bounding box coordinates (min_lon, min_lat, max_lon, max_lat) are required.")
        if min_lon > max_lon or min_lat > max_lat:
            raise ValidationException("Invalid bounding box: Min coordinates exceed max coordinates.")
        bbox = [min_lon, min_lat, max_lon, max_lat]

    items, total = await repository.list_insar_observations(
        bbox=bbox,
        district_id=effective_district,
        quality_state=quality_state.value if quality_state else None,
        min_coherence=min_coherence,
        page=page,
        limit=limit,
    )

    scoped_items = []
    for it in items:
        allowed = evaluate_domain_scope_access(
            actor_role=actor_role,
            actor_org_id=actor_org,
            actor_state_code=actor_state,
            actor_district_id=actor_district,
            target_state_code=it.get("state"),
            target_district_id=it.get("district_id"),
        )
        if allowed:
            scoped_items.append(InSARObservation(**it))

    pages = (total + limit - 1) // limit if total > 0 else 1

    return APIEnvelope(
        data=PaginatedResult(
            items=scoped_items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1,
        ),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/observations/{observation_id}", response_model=APIEnvelope[InSARObservation])
async def get_insar_observation(
    observation_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Retrieves single InSAR observation with LOS displacement statistics and intersected slope units."""
    raw = await repository.get_insar_observation_by_id(observation_id)
    if not raw:
        raise NotFoundException(f"InSAR observation not found: {observation_id}")

    allowed = evaluate_domain_scope_access(
        actor_role=current_user.get("role"),
        actor_org_id=current_user.get("organization_id"),
        actor_state_code=current_user.get("state_code"),
        actor_district_id=current_user.get("district_id"),
        target_state_code=raw.get("state"),
        target_district_id=raw.get("district_id"),
    )
    if not allowed:
        raise ForbiddenException("Actor is not authorized to inspect InSAR observation in this jurisdiction.")

    return APIEnvelope(
        data=InSARObservation(**raw),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/observations/{observation_id}/provenance", response_model=APIEnvelope[Dict[str, Any]])
async def get_insar_observation_provenance(
    observation_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Retrieves full interferometric baseline geometry, unwrapping and processing parameters."""
    raw = await repository.get_insar_observation_by_id(observation_id)
    if not raw:
        raise NotFoundException(f"InSAR observation not found: {observation_id}")

    allowed = evaluate_domain_scope_access(
        actor_role=current_user.get("role"),
        actor_org_id=current_user.get("organization_id"),
        actor_state_code=current_user.get("state_code"),
        actor_district_id=current_user.get("district_id"),
        target_state_code=raw.get("state"),
        target_district_id=raw.get("district_id"),
    )
    if not allowed:
        raise ForbiddenException("Actor is not authorized to inspect InSAR observation provenance.")

    provenance_data = {
        "observation_id": raw["id"],
        "primary_scene_id": raw["primary_scene_id"],
        "secondary_scene_id": raw["secondary_scene_id"],
        "acquisition_start": raw["acquisition_start"],
        "acquisition_end": raw["acquisition_end"],
        "temporal_baseline_days": raw["temporal_baseline_days"],
        "perpendicular_baseline_meters": raw["perpendicular_baseline_meters"],
        "orbit_direction": raw["orbit_direction"],
        "relative_orbit": raw.get("relative_orbit"),
        "processing_chain_version": raw["processing_chain_version"],
        "displacement_product_reference": raw.get("displacement_product_reference"),
        "coherence_product_reference": raw.get("coherence_product_reference"),
        "coherence_mean": raw.get("coherence_mean"),
        "coherence_threshold": raw.get("coherence_threshold"),
        "valid_pixel_ratio": raw.get("valid_pixel_ratio"),
        "uncertainty": raw.get("uncertainty"),
        "uncertainty_value_mm_yr": raw.get("uncertainty_value_mm_yr"),
        "quality_state": raw.get("quality_state"),
        "los_semantics": raw.get("los_semantics"),
        "spatial_intersection_disclaimer": raw.get("spatial_intersection_disclaimer"),
        "intersected_slope_units": raw.get("intersected_slope_units", []),
        "intersected_roads": raw.get("intersected_roads", []),
    }

    return APIEnvelope(
        data=provenance_data,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )
