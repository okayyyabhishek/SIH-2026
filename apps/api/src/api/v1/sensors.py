"""
Sentinel NER — Stage 10 Field Sensor Network API
Endpoints:
- GET /sensors: Bounded paginated list of physical sensors with evaluated freshness
- GET /sensors/summary: Operational sensor status and freshness breakdown
- GET /sensors/{sensor_id}: Detail view with location, calibration metadata, and latest telemetry
- POST /sensors: Register a new physical sensor station (Admin / Operator)
- POST /sensors/ingest: Ingest observation telemetry batch (validates quality and updates freshness)
- GET /sensors/{sensor_id}/observations: Bounded historical observations with quality states
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from src.core.errors import AuthorizationException, NotFoundException, ValidationException
from src.core.security.dependencies import (
    AuthenticatedUser,
    get_current_active_user,
    get_optional_current_user,
)
from src.core.security.rate_limiter import rate_limit
from src.core.sensors.ingestion_engine import SensorIngestionEngine
from src.core.sensors.validator import SensorTelemetryValidator
from src.db.repository import repository
from src.schemas.sensor import (
    ObservationQuality,
    Sensor,
    SensorFreshness,
    SensorIngestionBatch,
    SensorRegistrationRequest,
    SensorStatus,
    SensorSummary,
    SensorType,
)

router = APIRouter(prefix="/sensors", tags=["Field Sensor Network"])


@router.get(
    "",
    response_model=Dict[str, Any],
    summary="List registered physical sensors with live evaluated freshness",
)
async def list_sensors(
    district_id: Optional[str] = Query(None),
    sensor_type: Optional[SensorType] = Query(None),
    status_filter: Optional[SensorStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
):
    effective_district = district_id
    if user and user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        if district_id and district_id != user.district_id:
            raise AuthorizationException(
                message=f"Access denied: You are only authorized to view sensors in '{user.district_id}'.",
                error_code="STG_DISTRICT_SCOPE_VIOLATION",
            )
        effective_district = user.district_id

    sensors_data = await repository.list_sensors(
        district_id=effective_district,
        sensor_type=sensor_type.value if sensor_type else None,
        status=status_filter.value if status_filter else None,
        skip=skip,
        limit=limit,
    )

    now = datetime.now(timezone.utc)
    # Augment sensors with evaluated freshness and latest observation
    augmented = []
    for s in sensors_data:
        freshness = SensorTelemetryValidator.evaluate_freshness(s.get("last_seen_at"), now=now)
        latest_obs = await repository.get_latest_observation_for_sensor(s["id"])
        augmented.append({
            **s,
            "freshness": freshness.value,
            "latest_observation": latest_obs,
        })

    return {
        "success": True,
        "data": {
            "items": augmented,
            "skip": skip,
            "limit": limit,
        },
    }


@router.get(
    "/summary",
    response_model=Dict[str, Any],
    summary="Aggregate field sensor network health and freshness metrics",
)
async def get_sensors_summary(
    district_id: Optional[str] = Query(None),
    user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
):
    effective_district = district_id
    if user and user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        effective_district = user.district_id

    summary = await repository.get_sensors_summary(district_id=effective_district)
    return {
        "success": True,
        "data": summary,
    }


@router.get(
    "/{sensor_id}",
    response_model=Dict[str, Any],
    summary="Retrieve single sensor station details, freshness, and recent telemetry",
)
async def get_sensor_details(
    sensor_id: str,
    user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
):
    doc = await repository.get_sensor_by_id(sensor_id)
    if not doc:
        raise NotFoundException(message=f"Sensor '{sensor_id}' not found.", error_code="STG_SENSOR_NOT_FOUND")

    if user and user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        if doc.get("district_id") != user.district_id:
            raise AuthorizationException(
                message="Access denied: Cannot inspect sensors outside assigned district.",
                error_code="STG_DISTRICT_SCOPE_VIOLATION",
            )

    now = datetime.now(timezone.utc)
    freshness = SensorTelemetryValidator.evaluate_freshness(doc.get("last_seen_at"), now=now)
    latest_obs = await repository.get_latest_observation_for_sensor(sensor_id)
    recent_observations = await repository.list_sensor_observations(sensor_id=sensor_id, limit=10)

    return {
        "success": True,
        "data": {
            **doc,
            "freshness": freshness.value,
            "latest_observation": latest_obs,
            "recent_observations": recent_observations,
        },
    }


@router.post(
    "",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new physical sensor station",
)
async def register_sensor(
    payload: SensorRegistrationRequest,
    user: AuthenticatedUser = Depends(get_current_active_user),
):
    """
    Registers physical equipment into the authoritative inventory.
    Requires ADMIN, OPERATOR, or PLATFORM_ADMIN role.
    """
    if user.role not in ("PLATFORM_ADMIN", "ADMIN", "OPERATOR", "DDMA"):
        raise AuthorizationException(
            message="Only authorized administrators or operations staff can register sensor equipment.",
            error_code="STG_INSUFFICIENT_ROLE",
        )

    # Check unique sensor code
    existing = await repository.get_sensor_by_code(payload.sensor_code)
    if existing:
        raise ValidationException(
            message=f"Sensor with code '{payload.sensor_code}' already exists.",
            error_code="STG_DUPLICATE_SENSOR_CODE",
        )

    # Validate district
    district = await repository.get_district_by_id(payload.district_id) or await repository.get_district_by_code(payload.district_id)
    if not district:
        raise ValidationException(
            message=f"Referenced district '{payload.district_id}' does not exist.",
            error_code="STG_INVALID_DISTRICT",
        )

    now = datetime.now(timezone.utc)
    sensor = Sensor(
        id=f"sns-{uuid4().hex[:12]}",
        sensor_code=payload.sensor_code,
        sensor_type=payload.sensor_type,
        manufacturer=payload.manufacturer,
        model=payload.model,
        serial_reference=payload.serial_reference,
        location=payload.location,
        elevation_m=payload.elevation_m,
        organization_id=user.organization_id or "DDMA",
        district_id=payload.district_id,
        installation_site=payload.installation_site,
        status=SensorStatus.ACTIVE,
        sampling_interval_seconds=payload.sampling_interval_seconds,
        measurement_units=payload.measurement_units,
        calibration_metadata=payload.calibration_metadata or {},
        last_seen_at=None,
        last_observation_at=None,
        created_at=now,
        updated_at=now,
        provenance={
            "registered_by": user.email,
            "registration_time": now.isoformat(),
        },
    )

    saved = await repository.create_sensor(sensor.model_dump())
    return {
        "success": True,
        "data": saved,
        "message": f"Sensor '{payload.sensor_code}' registered successfully.",
    }


@router.post(
    "/ingest",
    response_model=Dict[str, Any],
    summary="Ingest observation telemetry packet from sensor station or gateway",
)
async def ingest_sensor_telemetry(
    batch: SensorIngestionBatch,
    request: Request,
    user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
):
    """
    Ingestion boundary for physical telemetry.
    Validates physical bounds, clock skew, and device authentication.
    NON-AUTONOMOUS RULE: Telemetry is stored as evidence; never triggers public warnings automatically.
    """
    # Rate limit: up to 60 telemetry packets per minute per sensor
    rate_limit(key=f"sensor-ingest:{batch.sensor_id}", max_requests=60, window_seconds=60)

    observations, metadata = await SensorIngestionEngine.process_batch(
        repo=repository,
        batch=batch,
        source="HTTP_API" if user else "HTTP_GATEWAY",
    )

    return {
        "success": True,
        "data": {
            "ingestion_metadata": metadata,
            "observations_count": len(observations),
            "observations": [o.model_dump() for o in observations],
        },
        "message": f"Ingested {len(observations)} observations ({metadata['valid_count']} valid, {metadata['flagged_count']} flagged).",
    }


@router.get(
    "/{sensor_id}/observations",
    response_model=Dict[str, Any],
    summary="Retrieve historical observations for a sensor with quality annotations",
)
async def list_sensor_observations(
    sensor_id: str,
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    quality: Optional[ObservationQuality] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: AuthenticatedUser = Depends(get_current_active_user),
):
    doc = await repository.get_sensor_by_id(sensor_id)
    if not doc:
        raise NotFoundException(message=f"Sensor '{sensor_id}' not found.", error_code="STG_SENSOR_NOT_FOUND")

    if user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        if doc.get("district_id") != user.district_id:
            raise AuthorizationException(
                message="Access denied: Cannot query telemetry outside assigned district.",
                error_code="STG_DISTRICT_SCOPE_VIOLATION",
            )

    observations = await repository.list_sensor_observations(
        sensor_id=sensor_id,
        start_time=start_time,
        end_time=end_time,
        quality=quality.value if quality else None,
        skip=skip,
        limit=limit,
    )

    return {
        "success": True,
        "data": {
            "sensor_id": sensor_id,
            "items": observations,
            "skip": skip,
            "limit": limit,
        },
    }
