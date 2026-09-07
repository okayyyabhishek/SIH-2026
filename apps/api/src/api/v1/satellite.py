"""
Sentinel NER — Satellite Observation & Processing API Endpoints (Stage 6)
Provides versioned endpoints for Satellite Observations, STAC Metadata,
External Connector Health, and Asynchronous Processing Runs.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.config import settings
from src.core.errors import ForbiddenException, NotFoundException, ValidationException
from src.core.logging import logger
from src.core.satellite.acquisition import satellite_acquisition_service
from src.core.satellite.lineage import get_external_connectors_status
from src.core.satellite.pipeline import satellite_pipeline
from src.core.satellite.provider import satellite_provider
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission, evaluate_domain_scope_access
from src.db.repository import repository
from src.schemas.common import APIEnvelope
from src.schemas.domain import PaginatedResult
from src.schemas.satellite import (
    AcquireSceneRequest,
    AcquisitionStatus,
    ExternalConnectorStatus,
    JobStatus,
    ProcessingRunCreateRequest,
    ProductType,
    QualityState,
    SatelliteMission,
    SatelliteObservation,
    SatelliteProcessingRun,
    SatelliteScene,
)

router = APIRouter(prefix="/satellite", tags=["Stage 6 — Satellite Change Intelligence"])


@router.get("/observations", response_model=APIEnvelope[PaginatedResult[SatelliteObservation]])
async def list_satellite_observations(
    request: Request,
    min_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Bounding box min longitude"),
    min_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Bounding box min latitude"),
    max_lon: Optional[float] = Query(None, ge=-180.0, le=180.0, description="Bounding box max longitude"),
    max_lat: Optional[float] = Query(None, ge=-90.0, le=90.0, description="Bounding box max latitude"),
    mission: Optional[SatelliteMission] = Query(None, description="Filter by satellite mission"),
    product_type: Optional[ProductType] = Query(None, description="Filter by product type"),
    district_id: Optional[str] = Query(None, description="Filter by district ID"),
    quality_state: Optional[QualityState] = Query(None, description="Filter by quality state"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Lists satellite observations scoped by geographic jurisdiction and bounding box."""
    actor_role = current_user.get("role")
    actor_district = current_user.get("district_id")
    actor_state = current_user.get("state_code")
    actor_org = current_user.get("organization_id")

    # Authoritative Tenancy Scoping
    effective_district = district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if district_id and actor_district and district_id != actor_district:
            raise ForbiddenException("Actor is not authorized to inspect satellite evidence for other districts.")
        effective_district = actor_district or district_id

    bbox = None
    if any(c is not None for c in (min_lon, min_lat, max_lon, max_lat)):
        if any(c is None for c in (min_lon, min_lat, max_lon, max_lat)):
            raise ValidationException("All 4 bounding box coordinates (min_lon, min_lat, max_lon, max_lat) are required.")
        if min_lon > max_lon or min_lat > max_lat:
            raise ValidationException("Invalid bounding box: Min coordinates exceed max coordinates.")
        bbox = [min_lon, min_lat, max_lon, max_lat]

    items, total = await repository.list_satellite_observations(
        bbox=bbox,
        mission=mission.value if mission else None,
        product_type=product_type.value if product_type else None,
        district_id=effective_district,
        quality_state=quality_state.value if quality_state else None,
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
            scoped_items.append(SatelliteObservation(**it))

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


@router.get("/observations/{observation_id}", response_model=APIEnvelope[SatelliteObservation])
async def get_satellite_observation(
    observation_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Retrieves a single satellite observation with STAC attributes and quality flags."""
    raw = await repository.get_satellite_observation_by_id(observation_id)
    if not raw:
        raise NotFoundException(f"Satellite observation not found: {observation_id}")

    allowed = evaluate_domain_scope_access(
        actor_role=current_user.get("role"),
        actor_org_id=current_user.get("organization_id"),
        actor_state_code=current_user.get("state_code"),
        actor_district_id=current_user.get("district_id"),
        target_state_code=raw.get("state"),
        target_district_id=raw.get("district_id"),
    )
    if not allowed:
        raise ForbiddenException("Actor is not authorized to inspect satellite observation in this jurisdiction.")

    return APIEnvelope(
        data=SatelliteObservation(**raw),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/observations/{observation_id}/provenance", response_model=APIEnvelope[Dict[str, Any]])
async def get_satellite_observation_provenance(
    observation_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Retrieves immutable source lineage, SHA-256 checksums, and catalog provenance."""
    raw = await repository.get_satellite_observation_by_id(observation_id)
    if not raw:
        raise NotFoundException(f"Satellite observation not found: {observation_id}")

    allowed = evaluate_domain_scope_access(
        actor_role=current_user.get("role"),
        actor_org_id=current_user.get("organization_id"),
        actor_state_code=current_user.get("state_code"),
        actor_district_id=current_user.get("district_id"),
        target_state_code=raw.get("state"),
        target_district_id=raw.get("district_id"),
    )
    if not allowed:
        raise ForbiddenException("Actor is not authorized to inspect satellite observation provenance.")

    provenance_data = {
        "observation_id": raw["id"],
        "product_id": raw["product_id"],
        "mission": raw["mission"],
        "platform": raw["platform"],
        "instrument": raw["instrument"],
        "product_type": raw["product_type"],
        "source_catalog": raw["source_catalog"],
        "source_uri": raw["source_uri"],
        "source_checksum": raw["source_checksum"],
        "provenance_state": raw["provenance_state"],
        "spatial_reference": raw["spatial_reference"],
        "temporal_reference": raw["temporal_reference"],
        "acquisition_time": raw["acquisition_time"],
        "processing_time": raw["processing_time"],
        "metadata": raw.get("metadata", {}),
    }

    return APIEnvelope(
        data=provenance_data,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/search", response_model=APIEnvelope[List[SatelliteScene]])
async def search_satellite_catalog(
    request: Request,
    min_lon: float = Query(..., ge=-180.0, le=180.0, description="Bounding box min longitude"),
    min_lat: float = Query(..., ge=-90.0, le=90.0, description="Bounding box min latitude"),
    max_lon: float = Query(..., ge=-180.0, le=180.0, description="Bounding box max longitude"),
    max_lat: float = Query(..., ge=-90.0, le=90.0, description="Bounding box max latitude"),
    start_date: Optional[datetime] = Query(None, description="Start date filter (UTC)"),
    end_date: Optional[datetime] = Query(None, description="End date filter (UTC)"),
    max_cloud_cover: Optional[float] = Query(None, ge=0.0, le=100.0, description="Maximum cloud cover percentage"),
    collection: Optional[str] = Query(None, description="Satellite collection (e.g. sentinel-2-l2a, sentinel-1-slc)"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of items to return"),
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """
    Performs real STAC catalog discovery against the official Copernicus Data Space Ecosystem API.
    Discovers available Sentinel-2 (MSI optical) and Sentinel-1 (SAR) scenes matching spatiotemporal criteria.
    """
    if min_lon > max_lon or min_lat > max_lat:
        raise ValidationException("Invalid bounding box: Min coordinates exceed max coordinates.")

    bbox = [min_lon, min_lat, max_lon, max_lat]
    scenes = await satellite_provider.search_scenes(
        bbox=bbox,
        datetime_start=start_date,
        datetime_end=end_date,
        max_cloud_cover=max_cloud_cover,
        collection=collection,
        limit=limit,
    )

    return APIEnvelope(
        data=scenes,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.post("/acquire", response_model=APIEnvelope[SatelliteObservation], status_code=201)
async def acquire_satellite_asset(
    payload: AcquireSceneRequest,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.SATELLITE_PROCESS)),
):
    """
    Executes real satellite asset acquisition:
    Streams asset data from provider, stores in S3 object storage with SHA-256 integrity verification,
    and records verified metadata in MongoDB (never storing raster binaries).
    """
    correlation_id = getattr(request.state, "correlation_id", "default")
    obs = await satellite_acquisition_service.acquire_scene(
        scene_id=payload.scene_id,
        collection=payload.collection,
        asset_name=payload.asset_name,
        district_id=payload.district_id,
        state=payload.state,
        correlation_id=correlation_id,
    )

    # Record security audit event for acquired satellite asset
    await repository.record_security_event(
        event_type="SATELLITE_ASSET_ACQUIRED",
        actor_user_id=current_user.get("user_id", "system"),
        actor_role=current_user.get("role", "UNKNOWN"),
        resource=f"satellite_observation/{obs.id}",
        action="ACQUIRE",
        result="SUCCESS",
        correlation_id=correlation_id,
        organization_id=current_user.get("organization_id"),
        details={
            "scene_id": payload.scene_id,
            "collection": payload.collection,
            "asset_name": payload.asset_name,
            "storage_key": obs.storage_key,
            "checksum": obs.source_checksum,
        },
    )

    return APIEnvelope(
        data=obs,
        correlation_id=correlation_id,
    )


@router.get("/scenes/{scene_id}", response_model=APIEnvelope[SatelliteScene])
async def get_satellite_scene(
    scene_id: str,
    request: Request,
    collection: Optional[str] = Query(None, description="Optional collection name"),
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Retrieves full scene metadata and available asset catalogue from Copernicus STAC."""
    scene = await satellite_provider.get_scene(scene_id, collection=collection)
    if not scene:
        raise NotFoundException(f"Satellite scene not found in catalog: {scene_id}")

    return APIEnvelope(
        data=scene,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/scenes/{scene_id}/status", response_model=APIEnvelope[Dict[str, Any]])
async def get_satellite_scene_status(
    scene_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Retrieves the acquisition lifecycle state and S3 storage verification status for a scene."""
    obs_id = f"sat-obs-{scene_id}"
    obs = await repository.get_satellite_observation_by_id(obs_id)
    if not obs:
        # Check raw scene_id
        obs = await repository.get_satellite_observation_by_id(scene_id)

    if not obs:
        return APIEnvelope(
            data={
                "scene_id": scene_id,
                "acquisition_status": AcquisitionStatus.DISCOVERED,
                "is_acquired": False,
                "storage_verified": False,
                "processing_allowed": False,
                "message": "Scene discovered in STAC catalog but not yet acquired into S3 object storage.",
            },
            correlation_id=getattr(request.state, "correlation_id", "default"),
        )

    acq_status = obs.get("acquisition_status", AcquisitionStatus.SUCCESS)
    is_success = acq_status == AcquisitionStatus.SUCCESS
    return APIEnvelope(
        data={
            "scene_id": scene_id,
            "observation_id": obs.get("id"),
            "acquisition_status": acq_status,
            "is_acquired": is_success,
            "storage_verified": bool(obs.get("storage_key") and obs.get("source_checksum")),
            "storage_backend": obs.get("storage_backend", "s3"),
            "storage_bucket": obs.get("storage_bucket"),
            "storage_key": obs.get("storage_key"),
            "sha256": obs.get("source_checksum"),
            "processing_allowed": is_success,
        },
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/connectors", response_model=APIEnvelope[List[ExternalConnectorStatus]])
async def list_external_connectors(
    request: Request,
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Returns the operational status of upstream satellite data catalogs and ingestion connectors."""
    connectors = get_external_connectors_status()
    # Evaluate live status of Copernicus connector using provider
    try:
        copernicus_status = await satellite_provider.check_health()
        updated_connectors = []
        for c in connectors:
            if c.connector_id == "copernicus-cdse-v1":
                updated_connectors.append(copernicus_status)
            else:
                updated_connectors.append(c)
        connectors = updated_connectors
    except Exception as exc:
        logger.warning("Failed to evaluate live connector health", extra={"error": str(exc)})

    return APIEnvelope(
        data=connectors,
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/processing-runs", response_model=APIEnvelope[PaginatedResult[SatelliteProcessingRun]])
async def list_processing_runs(
    request: Request,
    status: Optional[JobStatus] = Query(None, description="Filter by run status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Lists asynchronous satellite processing runs and background job statuses."""
    items, total = await repository.list_satellite_processing_runs(
        status=status.value if status else None,
        page=page,
        limit=limit,
    )

    pages = (total + limit - 1) // limit if total > 0 else 1

    return APIEnvelope(
        data=PaginatedResult(
            items=[SatelliteProcessingRun(**it) for it in items],
            total=total,
            page=page,
            limit=limit,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1,
        ),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.get("/processing-runs/{run_id}", response_model=APIEnvelope[SatelliteProcessingRun])
async def get_processing_run(
    run_id: str,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.SATELLITE_READ)),
):
    """Retrieves single processing run details including retry count and output checksums."""
    run = await repository.get_satellite_processing_run_by_id(run_id)
    if not run:
        raise NotFoundException(f"Processing run not found: {run_id}")

    return APIEnvelope(
        data=SatelliteProcessingRun(**run),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )


@router.post("/processing-runs", response_model=APIEnvelope[SatelliteProcessingRun], status_code=202)
async def submit_processing_run(
    payload: ProcessingRunCreateRequest,
    request: Request,
    current_user: dict = Depends(require_permission(Permission.SATELLITE_PROCESS)),
):
    """Submits an asynchronous satellite or InSAR processing job."""
    primary = await repository.get_satellite_observation_by_id(payload.primary_input_id)
    if not primary:
        raise NotFoundException(f"Primary input observation not found: {payload.primary_input_id}")

    secondary = None
    if payload.secondary_input_id:
        secondary = await repository.get_satellite_observation_by_id(payload.secondary_input_id)
        if not secondary:
            raise NotFoundException(f"Secondary input observation not found: {payload.secondary_input_id}")

    # Processing Gate: Enforce synthetic isolation in production mode
    satellite_mode = getattr(settings, "SATELLITE_MODE", "production").lower()
    if satellite_mode == "production":
        for input_obs in (primary, secondary):
            if input_obs:
                obs_id = str(input_obs.get("id", "")).lower()
                prod_id = str(input_obs.get("product_id", "")).lower()
                if any(
                    obs_id.startswith(p) or prod_id.startswith(p)
                    for p in ("mock-", "fixture-", "synthetic-", "demo-", "test-")
                ):
                    logger.warning(
                        "PROCESSING_BLOCKED",
                        extra={"reason": "Synthetic input rejected in production mode", "scene_id": input_obs.get("id")},
                    )
                    raise ValidationException(
                        f"Processing blocked: Synthetic scene '{input_obs.get('id')}' is forbidden in production mode. "
                        f"Real Copernicus acquisition required."
                    )

    # Processing Gate: Verify acquisition status and checksum
    for input_obs in (primary, secondary):
        if input_obs:
            acq_status = input_obs.get("acquisition_status")
            if acq_status and acq_status != AcquisitionStatus.SUCCESS:
                logger.warning(
                    "PROCESSING_BLOCKED",
                    extra={"reason": "Acquisition not successful", "scene_id": input_obs.get("id"), "status": acq_status},
                )
                raise ValidationException(
                    f"Processing blocked: Input observation '{input_obs.get('id')}' has acquisition status '{acq_status}', must be SUCCESS."
                )
            if not input_obs.get("source_checksum"):
                logger.warning(
                    "PROCESSING_BLOCKED",
                    extra={"reason": "Missing integrity checksum", "scene_id": input_obs.get("id")},
                )
                raise ValidationException(
                    f"Processing blocked: Input observation '{input_obs.get('id')}' lacks verified integrity checksum."
                )

    now = datetime.now(timezone.utc)
    run_id = f"sat-run-{uuid.uuid4().hex[:12]}"
    job_id = f"job-insar-{uuid.uuid4().hex[:8]}"

    run_record = SatelliteProcessingRun(
        id=run_id,
        job_id=job_id,
        pipeline_type=payload.pipeline_type,
        pipeline_version="1.0.0",
        primary_input_id=payload.primary_input_id,
        secondary_input_id=payload.secondary_input_id,
        parameters=payload.parameters,
        input_hashes={
            payload.primary_input_id: primary.get("source_checksum", "hash-primary"),
            **(
                {payload.secondary_input_id: secondary.get("source_checksum", "hash-secondary")}
                if secondary
                else {}
            ),
        },
        output_references=[],
        output_checksums={},
        status=JobStatus.QUEUED,
        retry_count=0,
        max_retries=3,
        start_time=now,
        correlation_id=getattr(request.state, "correlation_id", "default"),
        created_by=current_user.get("user_id", "system"),
        created_at=now,
    )

    # If InSAR pipeline requested, execute synchronously for bounded test fixture or queue
    if payload.pipeline_type in ("INSAR_INTERFEROGRAM", "DEFORMATION_VELOCITY") and secondary:
        insar_obs = await satellite_pipeline.execute_insar_job(
            run_record=run_record,
            primary_scene=SatelliteObservation(**primary),
            secondary_scene=SatelliteObservation(**secondary),
            perpendicular_baseline=float(payload.parameters.get("perpendicular_baseline_meters", 45.0)),
        )
        await repository.create_insar_observation(insar_obs.model_dump())

    created_run = await repository.create_satellite_processing_run(run_record.model_dump())

    # Record security audit event
    await repository.record_security_event(
        event_type="SATELLITE_PROCESSING_DISPATCHED",
        actor_user_id=current_user.get("user_id", "system"),
        actor_role=current_user.get("role", "UNKNOWN"),
        resource=f"processing_run/{run_id}",
        action="DISPATCH",
        result="SUCCESS",
        correlation_id=getattr(request.state, "correlation_id", "default"),
        organization_id=current_user.get("organization_id"),
        details={"job_id": job_id, "pipeline_type": payload.pipeline_type},
    )

    return APIEnvelope(
        data=SatelliteProcessingRun(**created_run),
        correlation_id=getattr(request.state, "correlation_id", "default"),
    )
