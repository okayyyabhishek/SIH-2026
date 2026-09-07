"""
Sentinel NER — Consequence Intelligence API Endpoints (Stage 7)
Provides auditable endpoints for Consequence Relationships, Entity Exposure,
Road Corridors, Asset Criticality, Habitation Proximity, and Analysis Runs.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.consequence.engine import consequence_engine
from src.core.errors import ForbiddenException, NotFoundException
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission
from src.db.repository import repository
from src.schemas.common import APIEnvelope
from src.schemas.consequence import (
    AssetCriticality,
    ConsequenceCategory,
    ConsequenceRelationship,
    ConsequenceRun,
    ConsequenceRunRequest,
    ConsequenceSourceType,
    ConsequenceSummary,
    ConsequenceTargetType,
    JobStatus,
    SpatialRelationType,
)
from src.schemas.domain import PaginatedResult

router = APIRouter(prefix="/consequences", tags=["Stage 7 — Road & Asset Consequence Intelligence"])


@router.get("/relationships", response_model=APIEnvelope[PaginatedResult[ConsequenceRelationship]])
async def list_consequence_relationships(
    request: Request,
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    source_type: Optional[ConsequenceSourceType] = Query(None, description="Filter by source entity type"),
    source_id: Optional[str] = Query(None, description="Filter by source entity ID"),
    target_type: Optional[ConsequenceTargetType] = Query(None, description="Filter by target entity type"),
    target_id: Optional[str] = Query(None, description="Filter by target entity ID"),
    relationship_type: Optional[ConsequenceCategory] = Query(None, description="Filter by consequence category"),
    spatial_relation: Optional[SpatialRelationType] = Query(None, description="Filter by spatial relation"),
    criticality: Optional[AssetCriticality] = Query(None, description="Filter by asset criticality"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.CONSEQUENCE_READ)),
):
    """Lists consequence relationships scoped by user jurisdiction and filters."""
    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")

    effective_district = district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if district_id and actor_district and district_id != actor_district:
            raise ForbiddenException("Actor is not authorized to inspect consequence intelligence for other districts.")
        effective_district = actor_district or district_id

    items_dict, total = await repository.list_consequence_relationships(
        district_id=effective_district,
        source_type=source_type.value if source_type else None,
        source_id=source_id,
        target_type=target_type.value if target_type else None,
        target_id=target_id,
        relationship_type=relationship_type.value if relationship_type else None,
        spatial_relation=spatial_relation.value if spatial_relation else None,
        criticality=criticality.value if criticality else None,
        page=page,
        limit=limit,
    )

    items = [ConsequenceRelationship(**d) for d in items_dict]
    pages = (total + limit - 1) // limit if total > 0 else 1

    return APIEnvelope(
        data=PaginatedResult[ConsequenceRelationship](
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1,
        )
    )


@router.get("/relationships/{id}", response_model=APIEnvelope[ConsequenceRelationship])
async def get_consequence_relationship(
    id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.CONSEQUENCE_READ)),
):
    """Retrieves a single consequence relationship by ID with tenancy verification."""
    rel = await repository.get_consequence_relationship_by_id(id)
    if not rel:
        raise NotFoundException(f"Consequence relationship '{id}' not found.")

    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if actor_district and rel.get("district_id") != actor_district:
            raise ForbiddenException("Actor is not authorized to access consequence relationships outside their assigned district.")

    return APIEnvelope(data=ConsequenceRelationship(**rel))


@router.get("/entities/{entity_type}/{entity_id}", response_model=APIEnvelope[List[ConsequenceRelationship]])
async def get_entity_consequences(
    entity_type: str,
    entity_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.CONSEQUENCE_READ)),
):
    """Retrieves all consequence relationships associated with a specific entity (as source or target)."""
    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")

    items_source, _ = await repository.list_consequence_relationships(source_id=entity_id, limit=100)
    items_target, _ = await repository.list_consequence_relationships(target_id=entity_id, limit=100)

    combined = {r["id"]: r for r in (items_source + items_target)}
    results = list(combined.values())

    if actor_role in ("DDMA", "FIELD_OFFICER") and actor_district:
        results = [r for r in results if r.get("district_id") == actor_district]

    return APIEnvelope(data=[ConsequenceRelationship(**r) for r in results])


@router.get("/roads/{road_id}", response_model=APIEnvelope[Dict[str, Any]])
async def get_road_consequences(
    road_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.CONSEQUENCE_READ)),
):
    """Retrieves consequence intelligence for a specific road corridor including linked chainages."""
    road = await repository.get_road_by_id(road_id)
    if not road:
        raise NotFoundException(f"Road '{road_id}' not found.")

    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    if actor_role in ("DDMA", "FIELD_OFFICER") and actor_district and road.get("district_id") != actor_district:
        raise ForbiddenException("Unauthorized to inspect road in another district.")

    rels_dict, _ = await repository.list_consequence_relationships(target_id=road_id, limit=100)
    chainages, _ = await repository.list_road_chainages(road_id=road_id, limit=100)

    return APIEnvelope(
        data={
            "road": road,
            "relationships": [ConsequenceRelationship(**r).model_dump() for r in rels_dict],
            "chainages": chainages,
            "exposure_summary": "POTENTIALLY AFFECTED" if len(rels_dict) > 0 else "NO_IDENTIFIED_EXPOSURE",
        }
    )


@router.get("/assets/{asset_id}", response_model=APIEnvelope[Dict[str, Any]])
async def get_asset_consequences(
    asset_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.CONSEQUENCE_READ)),
):
    """Retrieves consequence intelligence for a specific critical asset."""
    asset = await repository.get_asset_by_id(asset_id)
    if not asset:
        raise NotFoundException(f"Asset '{asset_id}' not found.")

    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    if actor_role in ("DDMA", "FIELD_OFFICER") and actor_district and asset.get("district_id") != actor_district:
        raise ForbiddenException("Unauthorized to inspect asset in another district.")

    rels_dict, _ = await repository.list_consequence_relationships(target_id=asset_id, limit=100)

    return APIEnvelope(
        data={
            "asset": asset,
            "relationships": [ConsequenceRelationship(**r).model_dump() for r in rels_dict],
            "exposure_summary": "POTENTIALLY EXPOSED" if len(rels_dict) > 0 else "NO_IDENTIFIED_EXPOSURE",
        }
    )


@router.get("/villages/{village_id}", response_model=APIEnvelope[Dict[str, Any]])
async def get_village_consequences(
    village_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.CONSEQUENCE_READ)),
):
    """Retrieves consequence intelligence for a specific habitation settlement (village)."""
    village = await repository.get_village_by_id(village_id)
    if not village:
        raise NotFoundException(f"Village '{village_id}' not found.")

    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    if actor_role in ("DDMA", "FIELD_OFFICER") and actor_district and village.get("district_id") != actor_district:
        raise ForbiddenException("Unauthorized to inspect village in another district.")

    rels_dict, _ = await repository.list_consequence_relationships(target_id=village_id, limit=100)

    return APIEnvelope(
        data={
            "village": village,
            "relationships": [ConsequenceRelationship(**r).model_dump() for r in rels_dict],
            "proximity_summary": "SPATIALLY EXPOSED / PROXIMITY IDENTIFIED" if len(rels_dict) > 0 else "NO_IDENTIFIED_PROXIMITY",
        }
    )


@router.get("/summary", response_model=APIEnvelope[ConsequenceSummary])
async def get_consequence_summary(
    district_id: str = Query(..., description="Target district ID"),
    current_user: dict = Depends(require_permission(Permission.CONSEQUENCE_READ)),
):
    """Provides high-level aggregated consequence metrics for a given district."""
    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    if actor_role in ("DDMA", "FIELD_OFFICER") and actor_district and district_id != actor_district:
        raise ForbiddenException("Unauthorized to query summary for another district.")

    summary_dict = await repository.get_consequence_summary(district_id)
    return APIEnvelope(data=ConsequenceSummary(**summary_dict))


@router.post("/runs", response_model=APIEnvelope[ConsequenceRun])
async def trigger_consequence_run(
    payload: ConsequenceRunRequest,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.CONSEQUENCE_RUN)),
):
    """
    Triggers an auditable consequence analysis run for a target district.
    Evaluates pairwise geometric proximity against Stage 3, Stage 5, and Stage 6 entities.
    """
    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    if actor_role in ("DDMA", "FIELD_OFFICER") and actor_district and payload.district_id != actor_district:
        raise ForbiddenException("Unauthorized to trigger consequence analysis for another district.")

    district = await repository.get_district(payload.district_id)
    if not district:
        raise NotFoundException(f"District '{payload.district_id}' not found.")

    now = datetime.now(timezone.utc)
    run_id = f"run-csq-{uuid.uuid4().hex[:12]}"
    correlation_id = getattr(request.state, "correlation_id", f"csq-run-{uuid.uuid4().hex[:8]}")

    # Fetch district entities
    slope_units, _ = await repository.list_slope_units(district_id=payload.district_id, limit=100)
    roads, _ = await repository.list_roads(district_id=payload.district_id, limit=100)
    chainages, _ = await repository.list_road_chainages(district_id=payload.district_id, limit=100)
    assets, _ = await repository.list_assets(district_id=payload.district_id, limit=100)
    villages, _ = await repository.list_villages(district_id=payload.district_id, limit=100)

    # Stage 5 predictions
    risk_preds: List[Dict[str, Any]] = []
    if payload.include_risk_predictions:
        preds, _ = await repository.list_risk_predictions(district_id=payload.district_id, limit=100)
        risk_preds = preds

    # Stage 6 observations
    insar_obs: List[Dict[str, Any]] = []
    if payload.include_satellite_evidence:
        insar_items, _ = await repository.list_insar_observations(district_id=payload.district_id, limit=100)
        insar_obs = insar_items

    # Execute analysis engine
    relationships = consequence_engine.execute_consequence_analysis(
        district_id=payload.district_id,
        slope_units=slope_units,
        roads=roads,
        chainages=chainages,
        assets=assets,
        villages=villages,
        risk_predictions=risk_preds,
        insar_observations=insar_obs,
        distance_threshold_m=payload.distance_threshold_m or 300.0,
    )

    # Persist relationships
    for rel in relationships:
        await repository.create_consequence_relationship(rel.model_dump())

    end_time = datetime.now(timezone.utc)
    duration = (end_time - now).total_seconds()
    candidate_count = len(slope_units) * (len(roads) + len(assets) + len(villages))

    run_doc = {
        "id": run_id,
        "district_id": payload.district_id,
        "algorithm_version": consequence_engine.ALGORITHM_VERSION,
        "status": JobStatus.COMPLETE.value,
        "candidate_count": candidate_count,
        "relationship_count": len(relationships),
        "start_time": now,
        "end_time": end_time,
        "duration_seconds": round(duration, 3),
        "failure_reason": None,
        "retry_count": 0,
        "correlation_id": correlation_id,
        "created_by": current_user.get("user_id", "system"),
        "created_at": now,
    }

    created_run = await repository.create_consequence_run(run_doc)

    # Audit logging
    await repository.record_security_event(
        event_type="CONSEQUENCE_RUN_CREATED",
        actor_user_id=current_user.get("user_id"),
        actor_role=actor_role,
        organization_id=current_user.get("organization_id"),
        resource=f"/api/v1/consequences/runs/{run_id}",
        action="TRIGGER_CONSEQUENCE_ANALYSIS",
        result="SUCCESS",
        correlation_id=correlation_id,
        details={
            "district_id": payload.district_id,
            "candidate_count": candidate_count,
            "relationship_count": len(relationships),
        },
    )

    return APIEnvelope(data=ConsequenceRun(**created_run))


@router.get("/runs/{id}", response_model=APIEnvelope[ConsequenceRun])
async def get_consequence_run(
    id: str,
    current_user: dict = Depends(require_permission(Permission.CONSEQUENCE_READ)),
):
    """Retrieves status and metrics for a consequence analysis run."""
    run = await repository.get_consequence_run_by_id(id)
    if not run:
        raise NotFoundException(f"Consequence run '{id}' not found.")

    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    if actor_role in ("DDMA", "FIELD_OFFICER") and actor_district and run.get("district_id") != actor_district:
        raise ForbiddenException("Unauthorized to inspect consequence run for another district.")

    return APIEnvelope(data=ConsequenceRun(**run))
