"""
Sentinel NER — Stage 8 Warning System Endpoints
Enforces the Non-Autonomous Warning Principle: All warnings are created in draft,
require explicit human civil defense authorization, and enforce truthful delivery tracking.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, NotFoundException, ValidationException
from src.core.operations.delivery_engine import DeliveryEngine
from src.core.operations.engine import OperationalControlEngine
from src.core.operations.ledger import WarningLedgerService
from src.core.operations.notifications import NotificationAdapter
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission
from src.db.repository import repository
from src.schemas.common import APIEnvelope
from src.schemas.domain import PaginatedResult
from src.schemas.warning import (
    NON_AUTONOMOUS_WARNING_DISCLAIMER,
    Warning,
    WarningAcknowledgement,
    WarningAcknowledgeRequest,
    WarningAuthorizeRequest,
    WarningCancelRequest,
    WarningCreateRequest,
    WarningDispatchRequest,
    WarningReviewRequest,
    WarningStatus,
    WarningSummary,
    WarningType,
)
from src.schemas.warning_ledger import LedgerEventType

router = APIRouter(prefix="/warnings", tags=["Stage 8 — Human-Authorized Warning System"])


def _check_district_jurisdiction(actor_role: str, actor_district: Optional[str], target_district: str) -> None:
    """Enforces district authorization boundaries for civil protection warnings."""
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if actor_district and target_district != actor_district:
            raise ForbiddenException(
                f"Jurisdiction violation: {actor_role} assigned to district '{actor_district}' "
                f"cannot inspect or issue warnings in district '{target_district}'."
            )


@router.get("", response_model=APIEnvelope[PaginatedResult[Warning]])
async def list_warnings(
    request: Request,
    district_id: Optional[str] = Query(None, description="Filter by district jurisdiction"),
    status: Optional[WarningStatus] = Query(None, description="Filter by warning status"),
    warning_type: Optional[WarningType] = Query(None, description="Filter by warning advisory type"),
    affected_entity_type: Optional[str] = Query(None, description="Filter by affected entity type"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.WARNING_READ)),
):
    """Lists operational warnings filtered by jurisdiction and lifecycle status."""
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")

    effective_district = district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if district_id and actor_district and district_id != actor_district:
            raise ForbiddenException("Actor is not authorized to inspect warnings for other districts.")
        effective_district = actor_district or district_id

    skip = (page - 1) * limit
    raw_warnings = await repository.list_warnings(
        district_id=effective_district,
        status=status.value if status else None,
        warning_type=warning_type.value if warning_type else None,
        affected_entity_type=affected_entity_type,
        skip=skip,
        limit=limit,
    )

    items = [Warning(**w) for w in raw_warnings]
    all_matching = await repository.list_warnings(
        district_id=effective_district,
        status=status.value if status else None,
        warning_type=warning_type.value if warning_type else None,
        affected_entity_type=affected_entity_type,
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


@router.post("", response_model=APIEnvelope[Warning], status_code=201)
async def create_warning(
    request: Request,
    payload: WarningCreateRequest,
    current_user: dict = Depends(require_permission(Permission.WARNING_CREATE)),
):
    """
    Creates a new controlled advisory warning in DRAFT status.
    Requires Language Safety verification to ensure no alarmist or unverified claims are present.
    """
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "system")

    _check_district_jurisdiction(actor_role, actor_district, payload.district_id)

    # Language Safety Verification
    OperationalControlEngine.sanitize_and_verify_warning_content(payload.headline, payload.body)

    # Idempotency check
    if payload.idempotency_key:
        existing = await repository.list_warnings(district_id=payload.district_id, limit=100)
        for wrn in existing:
            if wrn.get("idempotency_key") == payload.idempotency_key:
                return APIEnvelope(
                    data=Warning(**wrn),
                    correlation_id=getattr(request.state, "correlation_id", "system") or "system",
                )

    now = datetime.now(timezone.utc)
    eff = payload.effective_from or now
    if payload.expires_at <= eff:
        raise ValidationException("expires_at must be strictly greater than effective_from")

    evidence_ids = []
    if payload.consequence_relationship_id:
        evidence_ids.append(payload.consequence_relationship_id)
    if payload.risk_prediction_id:
        evidence_ids.append(payload.risk_prediction_id)

    warning_id = f"wrn-{uuid4().hex[:12]}"
    warning_doc = {
        "id": warning_id,
        "warning_type": payload.warning_type.value,
        "status": WarningStatus.DRAFT.value,
        "headline": payload.headline,
        "body": payload.body,
        "mizo_translation": payload.mizo_translation,
        "hindi_translation": payload.hindi_translation,
        "district_id": payload.district_id,
        "state_id": "IN-MZ",
        "affected_entity_type": payload.affected_entity_type,
        "affected_entity_id": payload.affected_entity_id,
        "affected_entity_name": payload.affected_entity_name,
        "evidence_ids": evidence_ids,
        "risk_prediction_id": payload.risk_prediction_id,
        "consequence_relationship_id": payload.consequence_relationship_id,
        "uncertainty_level": "MEDIUM",
        "issuing_authority_id": payload.issuing_authority_id,
        "authorized_by": None,
        "authorized_at": None,
        "authorization_comment": None,
        "recipients": [r.model_dump() for r in payload.recipients],
        "deliveries": [],
        "acknowledgements": [],
        "escalations": [],
        "idempotency_key": payload.idempotency_key,
        "created_by": actor_id,
        "created_at": now,
        "updated_at": now,
        "effective_from": eff,
        "expires_at": payload.expires_at,
        "disclaimer": NON_AUTONOMOUS_WARNING_DISCLAIMER,
    }

    saved = await repository.create_warning(warning_doc)

    # Append to Warning Ledger
    await WarningLedgerService.record_event(
        repo=repository,
        district_id=payload.district_id,
        event_type=LedgerEventType.WARNING_CREATED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "warning_id": warning_id,
            "warning_type": payload.warning_type.value,
            "headline": payload.headline,
            "affected_entity": payload.affected_entity_name or payload.affected_entity_id,
        },
        warning_id=warning_id,
    )

    return APIEnvelope(
        data=Warning(**saved),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.get("/summary/{district_id}", response_model=APIEnvelope[WarningSummary])
async def get_warning_summary(
    request: Request,
    district_id: str,
    current_user: dict = Depends(require_permission(Permission.WARNING_READ)),
):
    """Returns warning counts across lifecycle states for a district."""
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    _check_district_jurisdiction(actor_role, actor_district, district_id)

    raw_summary = await repository.get_warning_summary(district_id)
    return APIEnvelope(
        data=WarningSummary(**raw_summary),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.get("/{warning_id}", response_model=APIEnvelope[Warning])
async def get_warning(
    request: Request,
    warning_id: str,
    current_user: dict = Depends(require_permission(Permission.WARNING_READ)),
):
    """Retrieves single warning by identifier with all recipients, deliveries, and acknowledgements."""
    raw = await repository.get_warning_by_id(warning_id)
    if not raw:
        raise NotFoundException(f"Warning '{warning_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    return APIEnvelope(
        data=Warning(**raw),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{warning_id}/review", response_model=APIEnvelope[Warning])
async def review_warning(
    request: Request,
    warning_id: str,
    payload: WarningReviewRequest,
    current_user: dict = Depends(require_permission(Permission.WARNING_CREATE)),
):
    """Moves a DRAFT warning to REVIEW status with auditor/reviewer comments."""
    raw = await repository.get_warning_by_id(warning_id)
    if not raw:
        raise NotFoundException(f"Warning '{warning_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    now = datetime.now(timezone.utc)
    is_expired = now > raw["expires_at"]

    current_status = WarningStatus(raw["status"])
    OperationalControlEngine.validate_warning_transition(
        current_status=current_status,
        target_status=WarningStatus.REVIEW,
        is_expired=is_expired,
    )

    updated = await repository.update_warning(
        warning_id,
        {
            "status": WarningStatus.REVIEW.value,
            "review_comment": payload.review_comment,
            "reviewed_by": actor_id,
            "reviewed_at": now,
        },
    )

    await WarningLedgerService.record_event(
        repo=repository,
        district_id=raw["district_id"],
        event_type=LedgerEventType.WARNING_REVIEWED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "warning_id": warning_id,
            "review_comment": payload.review_comment,
        },
        warning_id=warning_id,
    )

    return APIEnvelope(
        data=Warning(**updated),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{warning_id}/authorize", response_model=APIEnvelope[Warning])
async def authorize_warning(
    request: Request,
    warning_id: str,
    payload: WarningAuthorizeRequest,
    current_user: dict = Depends(require_permission(Permission.WARNING_AUTHORIZE)),
):
    """
    Formally authorizes or rejects a civil protection warning.
    Warnings MUST NOT be dispatched without this human authorization step.
    """
    raw = await repository.get_warning_by_id(warning_id)
    if not raw:
        raise NotFoundException(f"Warning '{warning_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    now = datetime.now(timezone.utc)
    is_expired = now > raw["expires_at"]

    current_status = WarningStatus(raw["status"])

    if payload.decision == "APPROVE":
        target_status = WarningStatus.AUTHORIZED
        ledger_event = LedgerEventType.WARNING_AUTHORIZED
    else:
        target_status = WarningStatus.DRAFT
        ledger_event = LedgerEventType.WARNING_REJECTED

    OperationalControlEngine.validate_warning_transition(
        current_status=current_status,
        target_status=target_status,
        is_expired=is_expired,
    )

    updated = await repository.update_warning(
        warning_id,
        {
            "status": target_status.value,
            "authorized_by": actor_id if payload.decision == "APPROVE" else None,
            "authorized_at": now if payload.decision == "APPROVE" else None,
            "authorization_comment": payload.justification,
        },
    )

    await WarningLedgerService.record_event(
        repo=repository,
        district_id=raw["district_id"],
        event_type=ledger_event,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "warning_id": warning_id,
            "decision": payload.decision,
            "justification": payload.justification,
            "previous_status": current_status.value,
            "new_status": target_status.value,
        },
        warning_id=warning_id,
    )

    return APIEnvelope(
        data=Warning(**updated),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{warning_id}/dispatch", response_model=APIEnvelope[Warning])
async def dispatch_warning(
    request: Request,
    warning_id: str,
    payload: WarningDispatchRequest,
    current_user: dict = Depends(require_permission(Permission.WARNING_DISPATCH)),
):
    """
    Dispatches an AUTHORIZED warning to recipient channels.
    Strictly enforces idempotency to prevent duplicate SMS/Email transmissions.
    Never fakes delivery success (truthful adapter status).
    """
    raw = await repository.get_warning_by_id(warning_id)
    if not raw:
        raise NotFoundException(f"Warning '{warning_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    # Idempotency check: if already dispatched with this key, return current state safely
    if raw.get("dispatch_idempotency_key") == payload.idempotency_key:
        return APIEnvelope(
            data=Warning(**raw),
            correlation_id=getattr(request.state, "correlation_id", "system") or "system",
        )

    now = datetime.now(timezone.utc)
    is_expired = now > raw["expires_at"]

    current_status = WarningStatus(raw["status"])
    OperationalControlEngine.validate_warning_transition(
        current_status=current_status,
        target_status=WarningStatus.DISPATCHING,
        is_expired=is_expired,
    )

    warning_obj = Warning(**raw)
    deliveries = NotificationAdapter.dispatch_warning(
        warning=warning_obj,
        channels=payload.channels,
        idempotency_key=payload.idempotency_key,
    )

    # Stage 9: Queue concrete Alert entities and background delivery jobs
    try:
        await DeliveryEngine.queue_alerts_for_warning(
            repo=repository,
            warning=warning_obj,
            channels=payload.channels,
            base_idempotency_key=payload.idempotency_key,
            actor_id=actor_id,
            actor_role=actor_role,
        )
    except Exception:
        pass

    updated = await repository.update_warning(
        warning_id,
        {
            "status": WarningStatus.DISPATCHED.value,
            "deliveries": [d.model_dump() for d in deliveries],
            "dispatch_idempotency_key": payload.idempotency_key,
            "dispatched_at": now,
        },
    )

    await WarningLedgerService.record_event(
        repo=repository,
        district_id=raw["district_id"],
        event_type=LedgerEventType.WARNING_DISPATCHED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "warning_id": warning_id,
            "deliveries_count": len(deliveries),
            "idempotency_key": payload.idempotency_key,
            "statuses": [d.status.value for d in deliveries],
        },
        warning_id=warning_id,
    )

    return APIEnvelope(
        data=Warning(**updated),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{warning_id}/acknowledge", response_model=APIEnvelope[Warning])
async def acknowledge_warning(
    request: Request,
    warning_id: str,
    payload: WarningAcknowledgeRequest,
    current_user: dict = Depends(require_permission(Permission.WARNING_ACKNOWLEDGE)),
):
    """Records an explicit recipient acknowledgement for a dispatched warning."""
    raw = await repository.get_warning_by_id(warning_id)
    if not raw:
        raise NotFoundException(f"Warning '{warning_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    current_status = WarningStatus(raw["status"])
    if current_status not in (WarningStatus.DISPATCHED, WarningStatus.PARTIALLY_ACKNOWLEDGED):
        raise ValidationException(
            f"Cannot acknowledge warning in '{current_status.value}' state. Must be DISPATCHED or PARTIALLY_ACKNOWLEDGED.",
            error_code="STG_INVALID_STATE_TRANSITION",
        )

    # Find recipient name
    recipients = raw.get("recipients", [])
    rcp_name = "Acknowledged Recipient"
    for r in recipients:
        if r.get("recipient_id") == payload.recipient_id:
            rcp_name = r.get("recipient_name", rcp_name)
            break

    now = datetime.now(timezone.utc)
    ack = WarningAcknowledgement(
        recipient_id=payload.recipient_id,
        recipient_name=rcp_name,
        acknowledged_at=now,
        channel=payload.channel,
        notes=payload.notes,
    )

    existing_acks = raw.get("acknowledgements", [])
    existing_acks.append(ack.model_dump())

    # Check if all recipients have acknowledged
    total_rcps = len(recipients)
    new_status = (
        WarningStatus.ACKNOWLEDGED.value
        if len(existing_acks) >= total_rcps
        else WarningStatus.PARTIALLY_ACKNOWLEDGED.value
    )

    updated = await repository.update_warning(
        warning_id,
        {
            "status": new_status,
            "acknowledgements": existing_acks,
        },
    )

    await WarningLedgerService.record_event(
        repo=repository,
        district_id=raw["district_id"],
        event_type=LedgerEventType.WARNING_ACKNOWLEDGED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "warning_id": warning_id,
            "recipient_id": payload.recipient_id,
            "recipient_name": rcp_name,
            "channel": payload.channel.value,
        },
        warning_id=warning_id,
    )

    return APIEnvelope(
        data=Warning(**updated),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{warning_id}/cancel", response_model=APIEnvelope[Warning])
async def cancel_warning(
    request: Request,
    warning_id: str,
    payload: WarningCancelRequest,
    current_user: dict = Depends(require_permission(Permission.WARNING_AUTHORIZE)),
):
    """Cancels an active or draft warning with mandatory audit explanation."""
    raw = await repository.get_warning_by_id(warning_id)
    if not raw:
        raise NotFoundException(f"Warning '{warning_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    current_status = WarningStatus(raw["status"])
    now = datetime.now(timezone.utc)
    is_expired = now > raw["expires_at"]

    OperationalControlEngine.validate_warning_transition(
        current_status=current_status,
        target_status=WarningStatus.CANCELLED,
        is_expired=is_expired,
    )

    updated = await repository.update_warning(
        warning_id,
        {
            "status": WarningStatus.CANCELLED.value,
            "cancellation_reason": payload.cancellation_reason,
            "cancelled_by": actor_id,
            "cancelled_at": now,
        },
    )

    await WarningLedgerService.record_event(
        repo=repository,
        district_id=raw["district_id"],
        event_type=LedgerEventType.WARNING_CANCELLED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "warning_id": warning_id,
            "cancellation_reason": payload.cancellation_reason,
            "previous_status": current_status.value,
        },
        warning_id=warning_id,
    )

    return APIEnvelope(
        data=Warning(**updated),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )
