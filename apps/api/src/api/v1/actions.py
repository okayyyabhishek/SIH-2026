"""
Sentinel NER — Stage 8 Action Queue & Human Authorization Endpoints
Provides strictly human-authorized operational control endpoints for action recommendations,
jurisdiction-scoped reviews, high-impact approvals, and field execution tracking.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, NotFoundException, ValidationException
from src.core.operations.engine import OperationalControlEngine
from src.core.operations.ledger import WarningLedgerService
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission
from src.db.repository import repository
from src.schemas.action import (
    NON_AUTONOMOUS_ACTION_DISCLAIMER,
    Action,
    ActionAuthorization,
    ActionAuthorizeRequest,
    ActionCreateRequest,
    ActionEvidence,
    ActionExecuteRequest,
    ActionExecution,
    ActionOutcome,
    ActionOutcomeRequest,
    ActionPriority,
    ActionReviewRequest,
    ActionStatus,
    ActionSummary,
    ActionType,
    AuthorizationDecision,
)
from src.schemas.common import APIEnvelope
from src.schemas.domain import PaginatedResult
from src.schemas.warning_ledger import LedgerEventType

router = APIRouter(prefix="/actions", tags=["Stage 8 — Human-Authorized Action Queue"])


def _check_district_jurisdiction(actor_role: str, actor_district: Optional[str], target_district: str) -> None:
    """Enforces that district-level authorities cannot operate outside their assigned jurisdiction."""
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if actor_district and target_district != actor_district:
            raise ForbiddenException(
                f"Jurisdiction violation: {actor_role} assigned to district '{actor_district}' "
                f"cannot inspect or operate on resources in district '{target_district}'."
            )


@router.get("", response_model=APIEnvelope[PaginatedResult[Action]])
async def list_actions(
    request: Request,
    district_id: Optional[str] = Query(None, description="Filter by district jurisdiction"),
    status: Optional[ActionStatus] = Query(None, description="Filter by lifecycle status"),
    priority: Optional[ActionPriority] = Query(None, description="Filter by urgency priority"),
    action_type: Optional[ActionType] = Query(None, description="Filter by operational action type"),
    target_entity_type: Optional[str] = Query(None, description="Filter by target entity type (ROAD, ASSET, VILLAGE)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.ACTION_READ)),
):
    """Lists operational action recommendations filtered by jurisdiction, status, and priority."""
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")

    effective_district = district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if district_id and actor_district and district_id != actor_district:
            raise ForbiddenException("Actor is not authorized to inspect operational actions for other districts.")
        effective_district = actor_district or district_id

    skip = (page - 1) * limit
    actions_raw = await repository.list_actions(
        district_id=effective_district,
        status=status.value if status else None,
        priority=priority.value if priority else None,
        action_type=action_type.value if action_type else None,
        target_entity_type=target_entity_type,
        skip=skip,
        limit=limit,
    )

    items = [Action(**a) for a in actions_raw]
    all_matching = await repository.list_actions(
        district_id=effective_district,
        status=status.value if status else None,
        priority=priority.value if priority else None,
        action_type=action_type.value if action_type else None,
        target_entity_type=target_entity_type,
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


@router.post("", response_model=APIEnvelope[Action], status_code=201)
async def create_action(
    request: Request,
    payload: ActionCreateRequest,
    current_user: dict = Depends(require_permission(Permission.ACTION_CREATE)),
):
    """Creates a new operational action recommendation for human review and authorization."""
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "system")

    _check_district_jurisdiction(actor_role, actor_district, payload.district_id)

    # Idempotency check
    if payload.idempotency_key:
        existing = await repository.list_actions(district_id=payload.district_id, limit=100)
        for act in existing:
            if act.get("idempotency_key") == payload.idempotency_key:
                return APIEnvelope(
                    data=Action(**act),
                    correlation_id=getattr(request.state, "correlation_id", "system") or "system",
                )

    now = datetime.now(timezone.utc)
    eff = payload.effective_from or now
    if payload.expires_at <= eff:
        raise ValidationException("expires_at must be strictly greater than effective_from")

    # Build evidence bundle
    evidence_timestamps = [now]
    csq_id = payload.consequence_relationship_id
    uncertainty = "MEDIUM"
    risk_lvl = "MODERATE"
    summary_text = f"Recommendation created for {payload.target_entity_type} '{payload.target_entity_name or payload.target_entity_id}'."

    if csq_id:
        csq = await repository.get_consequence_relationship_by_id(csq_id)
        if csq:
            uncertainty = csq.get("uncertainty_level", "MEDIUM")
            summary_text = (
                f"Multi-stage evidence: Consequence rel {csq_id}, Criticality={csq.get('criticality')}, "
                f"SpatialRelation={csq.get('spatial_relation')}."
            )
            if csq.get("generated_at"):
                evidence_timestamps.append(csq["generated_at"])

    evidence = ActionEvidence(
        consequence_relationship_id=csq_id,
        target_entity_type=payload.target_entity_type,
        target_entity_id=payload.target_entity_id,
        evidence_timestamps=evidence_timestamps,
        uncertainty_level=uncertainty,
        risk_level=risk_lvl,
        evidence_summary=summary_text,
    )

    action_id = f"act-{uuid4().hex[:12]}"
    action_doc = {
        "id": action_id,
        "title": payload.title,
        "action_type": payload.action_type.value,
        "priority": payload.priority.value,
        "status": ActionStatus.RECOMMENDED.value,
        "district_id": payload.district_id,
        "state_id": "IN-MZ",
        "target_entity_type": payload.target_entity_type,
        "target_entity_id": payload.target_entity_id,
        "target_entity_name": payload.target_entity_name,
        "recommended_agency_id": payload.recommended_agency_id,
        "recommendation_rationale": payload.recommendation_rationale,
        "evidence": evidence.model_dump(),
        "authorization": None,
        "execution": None,
        "outcome": None,
        "playbook_id": payload.playbook_id,
        "idempotency_key": payload.idempotency_key,
        "created_by": actor_id,
        "created_at": now,
        "updated_at": now,
        "effective_from": eff,
        "expires_at": payload.expires_at,
        "disclaimer": NON_AUTONOMOUS_ACTION_DISCLAIMER,
    }

    saved = await repository.create_action(action_doc)

    # Append to Warning Ledger
    await WarningLedgerService.record_event(
        repo=repository,
        district_id=payload.district_id,
        event_type=LedgerEventType.ACTION_CREATED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "action_id": action_id,
            "title": payload.title,
            "action_type": payload.action_type.value,
            "priority": payload.priority.value,
            "target_entity_id": payload.target_entity_id,
        },
        action_id=action_id,
    )

    return APIEnvelope(
        data=Action(**saved),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.get("/summary/{district_id}", response_model=APIEnvelope[ActionSummary])
async def get_action_summary(
    request: Request,
    district_id: str,
    current_user: dict = Depends(require_permission(Permission.ACTION_READ)),
):
    """Returns aggregated action counts across lifecycle states for a district."""
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    _check_district_jurisdiction(actor_role, actor_district, district_id)

    raw_summary = await repository.get_action_summary(district_id)
    return APIEnvelope(
        data=ActionSummary(**raw_summary),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.get("/{action_id}", response_model=APIEnvelope[Action])
async def get_action(
    request: Request,
    action_id: str,
    current_user: dict = Depends(require_permission(Permission.ACTION_READ)),
):
    """Retrieves single operational action by identifier with complete evidence and authorization state."""
    raw = await repository.get_action_by_id(action_id)
    if not raw:
        raise NotFoundException(f"Action '{action_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    return APIEnvelope(
        data=Action(**raw),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{action_id}/review", response_model=APIEnvelope[Action])
async def review_action(
    request: Request,
    action_id: str,
    payload: ActionReviewRequest,
    current_user: dict = Depends(require_permission(Permission.ACTION_REVIEW)),
):
    """Transitions an action to PENDING_REVIEW and records reviewer notes."""
    raw = await repository.get_action_by_id(action_id)
    if not raw:
        raise NotFoundException(f"Action '{action_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    now = datetime.now(timezone.utc)
    is_expired = now > raw["expires_at"]

    current_status = ActionStatus(raw["status"])
    OperationalControlEngine.validate_action_transition(
        current_status=current_status,
        target_status=ActionStatus.PENDING_REVIEW,
        is_expired=is_expired,
    )

    updated = await repository.update_action(
        action_id,
        {
            "status": ActionStatus.PENDING_REVIEW.value,
            "review_notes": payload.review_notes,
            "reviewed_by": actor_id,
            "reviewed_at": now,
        },
    )

    await WarningLedgerService.record_event(
        repo=repository,
        district_id=raw["district_id"],
        event_type=LedgerEventType.ACTION_REVIEWED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "action_id": action_id,
            "previous_status": current_status.value,
            "new_status": ActionStatus.PENDING_REVIEW.value,
            "review_notes": payload.review_notes,
        },
        action_id=action_id,
    )

    return APIEnvelope(
        data=Action(**updated),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{action_id}/authorize", response_model=APIEnvelope[Action])
async def authorize_action(
    request: Request,
    action_id: str,
    payload: ActionAuthorizeRequest,
    current_user: dict = Depends(require_permission(Permission.ACTION_AUTHORIZE)),
):
    """
    Submits an authoritative human decision (APPROVE, REJECT, or REQUEST_MORE_INFORMATION).
    High-impact decisions require explicit jurisdiction and are permanently etched in the Warning Ledger.
    """
    raw = await repository.get_action_by_id(action_id)
    if not raw:
        raise NotFoundException(f"Action '{action_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "")
    actor_name = current_user.get("full_name") or current_user.get("email")
    org_id = current_user.get("organization_id", "org-unknown")

    # Authorizer must strictly have statutory jurisdiction over action district
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    now = datetime.now(timezone.utc)
    is_expired = now > raw["expires_at"]

    current_status = ActionStatus(raw["status"])

    if payload.decision == AuthorizationDecision.APPROVE:
        target_status = ActionStatus.APPROVED
        ledger_event = LedgerEventType.ACTION_APPROVED
    elif payload.decision == AuthorizationDecision.REJECT:
        target_status = ActionStatus.REJECTED
        ledger_event = LedgerEventType.ACTION_REJECTED
    else:  # REQUEST_MORE_INFORMATION
        target_status = ActionStatus.PENDING_REVIEW
        ledger_event = LedgerEventType.ACTION_REVIEWED

    OperationalControlEngine.validate_action_transition(
        current_status=current_status,
        target_status=target_status,
        is_expired=is_expired,
    )

    authorization = ActionAuthorization(
        authorizer_user_id=actor_id,
        authorizer_name=actor_name,
        organization_id=org_id,
        role=actor_role,
        jurisdiction_district_id=raw["district_id"],
        decision=payload.decision,
        decision_timestamp=now,
        justification=payload.justification,
        evidence_snapshot_version="v1.0",
        policy_version="sentinel-auth-policy-v1.0",
    )

    updated = await repository.update_action(
        action_id,
        {
            "status": target_status.value,
            "authorization": authorization.model_dump(),
        },
    )

    await WarningLedgerService.record_event(
        repo=repository,
        district_id=raw["district_id"],
        event_type=ledger_event,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "action_id": action_id,
            "decision": payload.decision.value,
            "justification": payload.justification,
            "previous_status": current_status.value,
            "new_status": target_status.value,
        },
        action_id=action_id,
    )

    return APIEnvelope(
        data=Action(**updated),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{action_id}/execute", response_model=APIEnvelope[Action])
async def execute_action(
    request: Request,
    action_id: str,
    payload: ActionExecuteRequest,
    current_user: dict = Depends(require_permission(Permission.ACTION_EXECUTE)),
):
    """Begins operational field execution of an APPROVED action."""
    raw = await repository.get_action_by_id(action_id)
    if not raw:
        raise NotFoundException(f"Action '{action_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    current_status = ActionStatus(raw["status"])
    now = datetime.now(timezone.utc)
    is_expired = now > raw["expires_at"]

    OperationalControlEngine.validate_action_transition(
        current_status=current_status,
        target_status=ActionStatus.IN_PROGRESS,
        is_expired=is_expired,
    )

    execution = ActionExecution(
        assigned_agency_id=payload.assigned_agency_id,
        assigned_personnel=payload.assigned_personnel or [],
        started_at=now,
        execution_notes=payload.execution_notes,
    )

    updated = await repository.update_action(
        action_id,
        {
            "status": ActionStatus.IN_PROGRESS.value,
            "execution": execution.model_dump(),
        },
    )

    await WarningLedgerService.record_event(
        repo=repository,
        district_id=raw["district_id"],
        event_type=LedgerEventType.ACTION_STARTED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "action_id": action_id,
            "assigned_agency_id": payload.assigned_agency_id,
            "personnel_count": len(payload.assigned_personnel or []),
        },
        action_id=action_id,
    )

    return APIEnvelope(
        data=Action(**updated),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/{action_id}/outcome", response_model=APIEnvelope[Action])
async def record_action_outcome(
    request: Request,
    action_id: str,
    payload: ActionOutcomeRequest,
    current_user: dict = Depends(require_permission(Permission.ACTION_EXECUTE)),
):
    """Records the ground verification outcome of an executed action and marks it COMPLETED."""
    raw = await repository.get_action_by_id(action_id)
    if not raw:
        raise NotFoundException(f"Action '{action_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    actor_id = current_user.get("user_id", "")
    _check_district_jurisdiction(actor_role, actor_district, raw["district_id"])

    current_status = ActionStatus(raw["status"])
    now = datetime.now(timezone.utc)
    is_expired = now > raw["expires_at"]

    OperationalControlEngine.validate_action_transition(
        current_status=current_status,
        target_status=ActionStatus.COMPLETED,
        is_expired=is_expired,
    )

    outcome = ActionOutcome(
        outcome_type=payload.outcome_type,
        ground_observations=payload.ground_observations,
        mitigation_applied=payload.mitigation_applied,
        follow_up_recommended=payload.follow_up_recommended,
        recorded_by=actor_id,
        recorded_at=now,
    )

    # Complete execution timestamp if execution tracking exists
    exec_dict = raw.get("execution") or {}
    exec_dict["completed_at"] = now

    updated = await repository.update_action(
        action_id,
        {
            "status": ActionStatus.COMPLETED.value,
            "execution": exec_dict,
            "outcome": outcome.model_dump(),
        },
    )

    await WarningLedgerService.record_event(
        repo=repository,
        district_id=raw["district_id"],
        event_type=LedgerEventType.ACTION_COMPLETED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "action_id": action_id,
            "outcome_type": payload.outcome_type.value,
            "follow_up_recommended": payload.follow_up_recommended,
        },
        action_id=action_id,
    )

    return APIEnvelope(
        data=Action(**updated),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )
