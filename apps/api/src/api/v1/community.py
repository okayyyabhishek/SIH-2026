"""
Sentinel NER — Stage 10 Community Hazard Intelligence API
Endpoints:
- POST /community/reports: Submit a ground-truth hazard observation
- GET /community/reports: Bounded paginated list of reports with district scoping
- GET /community/reports/summary: Real-time community metrics
- GET /community/reports/{report_id}: Detail view with media references & audit history
- POST /community/reports/{report_id}/moderate: Human-authorized moderation (VERIFIED, PROBABLE, REJECTED)
- GET /community/clusters: Retrieve explainable spatial/temporal observation clusters
- POST /community/clusters/recalculate: Trigger explainable clustering run
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel

from src.core.community.clustering import CommunityClusteringEngine
from src.core.community.state_machine import CitizenReportStateMachine
from src.core.errors import AuthorizationException, NotFoundException, ValidationException
from src.core.security.dependencies import (
    AuthenticatedUser,
    get_current_active_user,
    get_optional_current_user,
)
from src.core.security.rate_limiter import rate_limit
from src.db.repository import repository
from src.schemas.community import (
    CitizenReport,
    CitizenReportCreate,
    CommunityEventCluster,
    CommunityModerationEvent,
    CommunitySummary,
    ModerationState,
    ReportCategory,
    ReportModerationRequest,
    ReportStatus,
)

router = APIRouter(prefix="/community", tags=["Community Hazard Intelligence"])


@router.post(
    "/reports",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Submit a citizen or field hazard observation report",
)
async def submit_citizen_report(
    payload: CitizenReportCreate,
    request: Request,
    user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
):
    """
    Submits an unverified ground-truth observation.
    Enforces payload bounds, duplicate rate limiting, and GeoJSON validity.
    NON-AUTONOMOUS RULE: Report starts as SUBMITTED; never auto-verified.
    """
    reporter_id = user.id if user else f"anon-{uuid4().hex[:8]}"
    org_id = user.organization_id if user else None

    # Rate limiting: 10 reports per minute
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_limit(key=f"community-submit:{reporter_id}:{client_ip}", max_requests=15, window_seconds=60)

    # Validate District existence
    district = await repository.get_district_by_id(payload.district_id)
    if not district:
        # Check by code
        district = await repository.get_district_by_code(payload.district_id)
    if not district:
        raise ValidationException(
            message=f"Referenced district '{payload.district_id}' is invalid.",
            error_code="STG_INVALID_DISTRICT",
        )

    # Check for duplicate submission within past 60 seconds (same reporter, category, district)
    existing_reports = await repository.list_citizen_reports(
        district_id=payload.district_id,
        category=payload.category.value,
        reporter_id=reporter_id,
        limit=5,
    )
    now = datetime.now(timezone.utc)
    for r in existing_reports:
        rep_time = r.get("reported_at")
        if rep_time:
            if rep_time.tzinfo is None:
                rep_time = rep_time.replace(tzinfo=timezone.utc)
            if abs((now - rep_time).total_seconds()) < 60:
                raise ValidationException(
                    message="Duplicate report detected within 60 seconds. Please avoid re-submitting.",
                    error_code="STG_DUPLICATE_COMMUNITY_REPORT",
                )

    report = CitizenReport(
        id=f"cr-{uuid4().hex[:12]}",
        reporter_id=reporter_id,
        organization_id=org_id,
        district_id=payload.district_id,
        location=payload.location,
        location_accuracy_m=payload.location_accuracy_m,
        location_source=payload.location_source,
        reported_at=now,
        received_at=now,
        category=payload.category,
        description=payload.description,
        media_references=payload.media_references,
        source=payload.source,
        status=ReportStatus.SUBMITTED,
        confidence=0.5,
        moderation_state=ModerationState.UNMODERATED,
        linked_entities=payload.linked_entities or {},
        provenance={
            "submitted_by_authenticated_user": user is not None,
            "client_ip": client_ip,
            "submission_timestamp": now.isoformat(),
        },
        correlation_id=f"corr-{uuid4().hex[:10]}",
    )

    saved = await repository.create_citizen_report(report.model_dump())
    return {
        "success": True,
        "data": saved,
        "message": "Citizen observation report submitted successfully. Awaiting operational review.",
    }


@router.get(
    "/reports",
    response_model=Dict[str, Any],
    summary="List citizen hazard reports with district scoping and filters",
)
async def list_citizen_reports(
    district_id: Optional[str] = Query(None),
    category: Optional[ReportCategory] = Query(None),
    status_filter: Optional[ReportStatus] = Query(None, alias="status"),
    moderation_state: Optional[ModerationState] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
):
    """
    Returns bounded paginated list of reports.
    Enforces district tenancy: users restricted to their assigned district unless platform admin.
    """
    effective_district = district_id
    if user and user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        if district_id and district_id != user.district_id:
            raise AuthorizationException(
                message=f"Access denied. You are only authorized to query reports for district '{user.district_id}'.",
                error_code="STG_DISTRICT_SCOPE_VIOLATION",
            )
        effective_district = user.district_id

    reports = await repository.list_citizen_reports(
        district_id=effective_district,
        category=category.value if category else None,
        status=status_filter.value if status_filter else None,
        moderation_state=moderation_state.value if moderation_state else None,
        skip=skip,
        limit=limit,
    )
    total = await repository.count_citizen_reports(
        district_id=effective_district,
        category=category.value if category else None,
        status=status_filter.value if status_filter else None,
        moderation_state=moderation_state.value if moderation_state else None,
    )

    return {
        "success": True,
        "data": {
            "items": reports,
            "total": total,
            "skip": skip,
            "limit": limit,
        },
    }


@router.get(
    "/reports/summary",
    response_model=Dict[str, Any],
    summary="Aggregate community hazard reporting metrics",
)
async def get_community_summary(
    district_id: Optional[str] = Query(None),
    user: AuthenticatedUser = Depends(get_current_active_user),
):
    effective_district = district_id
    if user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        effective_district = user.district_id

    summary = await repository.get_community_summary(district_id=effective_district)
    return {
        "success": True,
        "data": summary,
    }


@router.get(
    "/reports/{report_id}",
    response_model=Dict[str, Any],
    summary="Retrieve detail view of citizen report and moderation history",
)
async def get_citizen_report_details(
    report_id: str,
    user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
):
    doc = await repository.get_citizen_report_by_id(report_id)
    if not doc:
        raise NotFoundException(message=f"Report '{report_id}' not found.", error_code="STG_REPORT_NOT_FOUND")

    # Tenancy check
    if user and user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        if doc.get("district_id") != user.district_id:
            raise AuthorizationException(
                message="Access denied: Cross-district report inspection is forbidden.",
                error_code="STG_DISTRICT_SCOPE_VIOLATION",
            )

    moderation_history = await repository.list_moderation_events_by_report(report_id)
    return {
        "success": True,
        "data": {
            **doc,
            "moderation_history": moderation_history,
        },
    }


@router.post(
    "/reports/{report_id}/moderate",
    response_model=Dict[str, Any],
    summary="Human-authorized moderation of a citizen hazard report",
)
async def moderate_citizen_report(
    report_id: str,
    payload: ReportModerationRequest,
    user: AuthenticatedUser = Depends(get_current_active_user),
):
    """
    Human verification/moderation gate.
    Citizens cannot verify reports. Transition to VERIFIED strictly requires authorized roles.
    """
    doc = await repository.get_citizen_report_by_id(report_id)
    if not doc:
        raise NotFoundException(message=f"Report '{report_id}' not found.", error_code="STG_REPORT_NOT_FOUND")

    # District jurisdiction check
    if user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        if doc.get("district_id") != user.district_id:
            raise AuthorizationException(
                message="Access denied: Cannot moderate reports outside assigned district.",
                error_code="STG_DISTRICT_SCOPE_VIOLATION",
            )

    current_status = ReportStatus(doc.get("status", "SUBMITTED"))

    # Server-side state machine check
    CitizenReportStateMachine.validate_transition(
        current_status=current_status,
        target_status=payload.new_status,
        reviewer_id=user.id,
        reviewer_role=user.role,
    )

    now = datetime.now(timezone.utc)
    correlation_id = f"corr-{uuid4().hex[:10]}"

    # Record immutable moderation event
    mod_event = CommunityModerationEvent(
        id=f"mod-{uuid4().hex[:12]}",
        report_id=report_id,
        moderator_id=user.id,
        moderator_name=user.email,
        old_status=current_status,
        new_status=payload.new_status,
        reason=payload.reason,
        timestamp=now,
        evidence_references=payload.evidence_references,
        correlation_id=correlation_id,
    )
    await repository.create_moderation_event(mod_event.model_dump())

    updates: Dict[str, Any] = {
        "status": payload.new_status.value,
        "moderation_state": ModerationState.MODERATED.value,
        "reviewer_id": user.id,
        "reviewed_at": now,
        "updated_at": now,
    }
    if payload.new_status == ReportStatus.REJECTED:
        updates["rejection_reason"] = payload.reason
    if payload.new_status == ReportStatus.VERIFIED:
        # Increase confidence upon formal human verification
        updates["confidence"] = 1.0

    updated_doc = await repository.update_citizen_report(report_id, updates)
    mod_events = await repository.list_moderation_events_by_report(report_id)

    return {
        "success": True,
        "data": {
            **updated_doc,
            "moderation_history": mod_events,
        },
        "message": f"Report '{report_id}' successfully updated to '{payload.new_status.value}'.",
    }


@router.get(
    "/clusters",
    response_model=Dict[str, Any],
    summary="Retrieve explainable community event clusters",
)
async def list_community_clusters(
    district_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
):
    effective_district = district_id
    if user and user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        effective_district = user.district_id

    clusters = await repository.list_community_clusters(
        district_id=effective_district,
        status=status_filter,
    )
    return {
        "success": True,
        "data": clusters,
    }


@router.post(
    "/clusters/recalculate",
    response_model=Dict[str, Any],
    summary="Recalculate explainable community clusters for a district",
)
async def recalculate_community_clusters(
    district_id: str = Query(...),
    user: AuthenticatedUser = Depends(get_current_active_user),
):
    """
    Groups open reports into explainable clusters using spatial/temporal proximity.
    CLUSTERING !== VERIFICATION.
    """
    if user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        if district_id != user.district_id:
            raise AuthorizationException(
                message="Access denied: Cannot recalculate clusters outside assigned district.",
                error_code="STG_DISTRICT_SCOPE_VIOLATION",
            )

    reports_data = await repository.list_citizen_reports(district_id=district_id, limit=200)
    reports = [CitizenReport(**r) for r in reports_data]

    generated = CommunityClusteringEngine.generate_clusters(reports)

    # Clear old and store newly calculated clusters
    await repository.clear_community_clusters(district_id=district_id)
    saved_clusters = []
    for c in generated:
        s = await repository.create_community_cluster(c.model_dump())
        saved_clusters.append(s)

    return {
        "success": True,
        "data": {
            "district_id": district_id,
            "clusters_generated": len(saved_clusters),
            "clusters": saved_clusters,
        },
        "message": f"Successfully calculated {len(saved_clusters)} explainable clusters for district '{district_id}'.",
    }


@router.get(
    "/summary",
    response_model=Dict[str, Any],
    summary="Retrieve community hazard reports and clusters summary KPIs",
)
async def get_community_summary_endpoint(
    district_id: Optional[str] = Query(None),
    user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
):
    effective_district = district_id
    if user and user.role not in ("PLATFORM_ADMIN", "ADMIN") and user.district_id:
        if district_id and district_id != user.district_id:
            raise AuthorizationException(
                message=f"Access denied: You are only authorized for district '{user.district_id}'.",
                error_code="STG_DISTRICT_SCOPE_VIOLATION",
            )
        effective_district = user.district_id

    summary = await repository.get_community_summary(effective_district)
    return {
        "success": True,
        "data": summary,
        "message": "Community summary retrieved successfully.",
    }

