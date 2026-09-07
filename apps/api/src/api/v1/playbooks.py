"""
Sentinel NER — Stage 8 Operational Playbooks API Endpoints
Provides versioned Standard Operating Procedures (SOPs) for responding to geomorphic hazards,
road exposures, and critical facility risks under strict human authorization.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import NotFoundException
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission
from src.db.repository import repository
from src.schemas.common import APIEnvelope
from src.schemas.playbook import Playbook

router = APIRouter(prefix="/playbooks", tags=["Stage 8 — Operational Playbooks"])


@router.get("", response_model=APIEnvelope[List[Playbook]])
async def list_playbooks(
    request: Request,
    is_active: Optional[bool] = Query(None, description="Filter active status"),
    current_user: dict = Depends(require_permission(Permission.PLAYBOOK_READ)),
):
    """Lists operational standard response playbooks for hazard response guidance."""
    raw = await repository.list_playbooks(is_active=is_active)
    items = [Playbook(**p) for p in raw]
    return APIEnvelope(
        data=items,
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.get("/{id_or_code}", response_model=APIEnvelope[Playbook])
async def get_playbook(
    request: Request,
    id_or_code: str,
    current_user: dict = Depends(require_permission(Permission.PLAYBOOK_READ)),
):
    """Retrieves operational playbook details by playbook code or internal ID."""
    raw = await repository.get_playbook_by_id(id_or_code)
    if not raw:
        raw = await repository.get_playbook_by_code(id_or_code)
    if not raw:
        raise NotFoundException(f"Playbook '{id_or_code}' not found.")

    return APIEnvelope(
        data=Playbook(**raw),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )
