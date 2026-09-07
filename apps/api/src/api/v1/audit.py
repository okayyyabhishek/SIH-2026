"""
Sentinel NER — Security Audit Trail Endpoints
Provides an auditable log of authentication, authorization, role modifications, and denial events.
Protected strictly by audit:read capability.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission
from src.db.repository import repository
from src.schemas.identity import SecurityEventListResponse, SecurityEventResponse

router = APIRouter(prefix="/audit", tags=["Security Audit Trail"])


@router.get(
    "/events",
    response_model=SecurityEventListResponse,
    summary="List security audit events",
    description="Returns chronological audit records of logins, token refreshes, account changes, and authorization denials. Requires audit:read capability.",
)
async def list_security_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    actor_user_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    current_user: dict = Depends(require_permission(Permission.AUDIT_READ)),
):
    events, total = await repository.list_security_events(
        skip=skip,
        limit=limit,
        actor_user_id=actor_user_id,
        event_type=event_type,
    )
    return SecurityEventListResponse(
        items=[SecurityEventResponse(**e) for e in events],
        total=total,
        skip=skip,
        limit=limit,
    )
