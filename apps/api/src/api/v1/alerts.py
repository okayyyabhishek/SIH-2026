"""
Sentinel NER — Stage 9 Operational Alerts Endpoints
Provides secure, tenant-isolated, jurisdiction-bounded alert querying,
truthful field acknowledgement tracking, and manual/bounded retry coordination.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, NotFoundException, ValidationException
from src.core.operations.delivery_engine import DeliveryEngine
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission
from src.db.repository import repository
from src.schemas.alert import (
    Alert,
    AlertAcknowledgeRequest,
    AlertRetryRequest,
    AlertStatus,
    AlertSummary,
    DeliveryJob,
    JobStatus,
)
from src.schemas.common import APIEnvelope
from src.schemas.domain import PaginatedResult
from src.schemas.warning import DeliveryChannel

router = APIRouter(prefix="/alerts", tags=["Stage 9 — Alerting & Notification Delivery"])


def _check_district_jurisdiction(actor_role: str, actor_district: Optional[str], target_district: str) -> None:
    """Enforces district authorization boundaries for operational alerts."""
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if actor_district and target_district != actor_district:
            raise ForbiddenException(
                f"Jurisdiction violation: {actor_role} assigned to district '{actor_district}' "
                f"cannot inspect or acknowledge alerts in district '{target_district}'."
            )


@router.get("", response_model=APIEnvelope[PaginatedResult[Alert]])
async def list_alerts(
    request: Request,
    district_id: Optional[str] = Query(None, description="Filter by district jurisdiction"),
    warning_id: Optional[str] = Query(None, description="Filter by source warning ID"),
    status: Optional[AlertStatus] = Query(None, description="Filter by alert status"),
    recipient_id: Optional[str] = Query(None, description="Filter by recipient ID"),
    channel: Optional[DeliveryChannel] = Query(None, description="Filter by channel"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.WARNING_READ)),
):
    """Lists operational alerts filtered by jurisdiction and lifecycle status."""
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")

    effective_district = district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if district_id and actor_district and district_id != actor_district:
            raise ForbiddenException("Actor is not authorized to inspect alerts for other districts.")
        effective_district = actor_district or district_id

    skip = (page - 1) * limit
    raw_alerts = await repository.list_alerts(
        district_id=effective_district,
        warning_id=warning_id,
        status=status.value if status else None,
        recipient_id=recipient_id,
        channel=channel.value if channel else None,
        skip=skip,
        limit=limit,
    )

    items = [Alert(**a) for a in raw_alerts]

    all_matching = await repository.list_alerts(
        district_id=effective_district,
        warning_id=warning_id,
        status=status.value if status else None,
        recipient_id=recipient_id,
        channel=channel.value if channel else None,
        skip=0,
        limit=10000,
    )
    total = len(all_matching)
    total_pages = max(1, (total + limit - 1) // limit) if total > 0 else 0

    return APIEnvelope(
        data=PaginatedResult(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
        ),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.get("/summary", response_model=APIEnvelope[AlertSummary])
async def get_alerts_summary(
    request: Request,
    district_id: Optional[str] = Query(None, description="Filter by district jurisdiction"),
    current_user: dict = Depends(require_permission(Permission.WARNING_READ)),
):
    """Provides summary metrics for alerts across active and terminal statuses."""
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")

    effective_district = district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        effective_district = actor_district or district_id

    summary_data = await repository.get_alerts_summary(effective_district)
    return APIEnvelope(
        data=AlertSummary(**summary_data),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.get("/{alert_id}", response_model=APIEnvelope[Alert])
async def get_alert(
    request: Request,
    alert_id: str,
    current_user: dict = Depends(require_permission(Permission.WARNING_READ)),
):
    """Retrieves a single alert with strict BOLA and district boundary enforcement."""
    raw = await repository.get_alert_by_id(alert_id)
    if not raw:
        raise NotFoundException(f"Alert '{alert_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    return APIEnvelope(
        data=Alert(**raw),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{alert_id}/acknowledge", response_model=APIEnvelope[Alert])
async def acknowledge_alert(
    request: Request,
    alert_id: str,
    payload: AlertAcknowledgeRequest,
    current_user: dict = Depends(require_permission(Permission.WARNING_ACKNOWLEDGE)),
):
    """
    Records an authentic field acknowledgement from an authorized recipient.
    Transitions alert status to ACKNOWLEDGED and appends an entry to the cryptographic Warning Ledger.
    """
    raw = await repository.get_alert_by_id(alert_id)
    if not raw:
        raise NotFoundException(f"Alert '{alert_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "system")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    updated_alert, ack = await DeliveryEngine.acknowledge_alert(
        repo=repository,
        alert_id=alert_id,
        recipient_id=payload.recipient_id,
        method=payload.method.value,
        notes=payload.notes,
        actor_id=actor_id,
        actor_role=actor_role,
    )

    return APIEnvelope(
        data=updated_alert,
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{alert_id}/retry", response_model=APIEnvelope[Alert])
async def retry_alert(
    request: Request,
    alert_id: str,
    payload: AlertRetryRequest,
    current_user: dict = Depends(require_permission(Permission.WARNING_DISPATCH)),
):
    """
    Manually retries a failed alert if the maximum allowed retry limit has not been exhausted.
    Creates a new delivery job and preserves complete audit traceability.
    """
    raw = await repository.get_alert_by_id(alert_id)
    if not raw:
        raise NotFoundException(f"Alert '{alert_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "system")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    alert = Alert(**raw)
    if alert.status not in (AlertStatus.FAILED, AlertStatus.DELIVERY_FAILED):
        raise ValidationException(
            message=f"Only alerts in FAILED or DELIVERY_FAILED state may be retried. Current status is '{alert.status.value}'.",
            error_code="STG_ALERT_RETRY_INVALID_STATUS",
        )

    if alert.attempt_count >= alert.max_retries:
        raise ValidationException(
            message=f"Retry limit exhausted ({alert.attempt_count}/{alert.max_retries}). Manual administrative intervention required.",
            error_code="STG_ALERT_MAX_RETRIES_EXCEEDED",
        )

    now = datetime.now(timezone.utc)
    if now > alert.expires_at:
        raise ValidationException(
            message="Alert has expired and cannot be retried.",
            error_code="STG_ALERT_EXPIRED",
        )

    # Queue new delivery job
    job = DeliveryJob(
        job_id=f"job-{uuid4().hex[:12]}",
        alert_id=alert.id,
        correlation_id=getattr(request.state, "correlation_id", f"corr-{uuid4().hex[:10]}"),
        status=JobStatus.QUEUED,
        attempt_count=alert.attempt_count,
        max_attempts=alert.max_retries,
        backoff_seconds=2.0,
        created_at=now,
    )
    await repository.create_delivery_job(job.model_dump())

    # Update alert to QUEUED
    updated_raw = await repository.update_alert(
        alert.id,
        {
            "status": AlertStatus.QUEUED.value,
            "failure_reason": f"Manual retry scheduled: {payload.reason}",
        },
    )

    # Immediately attempt processing asynchronously
    try:
        await DeliveryEngine.process_delivery_job(
            repo=repository,
            job_id=job.job_id,
            actor_id=actor_id,
            actor_role=actor_role,
        )
    except Exception:
        pass

    latest_raw = await repository.get_alert_by_id(alert.id)
    return APIEnvelope(
        data=Alert(**(latest_raw or updated_raw)),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )
