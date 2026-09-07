"""
Sentinel NER — Stage 8 Cryptographically Chained Warning Ledger Endpoints
Provides tamper-evident audit endpoints and live cryptographic chain verification
to ensure complete forecast-to-intervention accountability.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from src.core.errors import ForbiddenException, NotFoundException
from src.core.operations.ledger import WarningLedgerService
from src.core.security.dependencies import require_permission
from src.core.security.rbac import Permission
from src.db.repository import repository
from src.schemas.common import APIEnvelope
from src.schemas.domain import PaginatedResult
from src.schemas.warning_ledger import (
    LedgerVerificationResult,
    WarningLedgerEntry,
)

router = APIRouter(prefix="/warning-ledger", tags=["Stage 8 — Tamper-Evident Warning Ledger"])


@router.get("", response_model=APIEnvelope[PaginatedResult[WarningLedgerEntry]])
async def list_ledger_entries(
    request: Request,
    district_id: Optional[str] = Query(None, description="Filter by district jurisdiction"),
    warning_id: Optional[str] = Query(None, description="Filter by linked warning ID"),
    action_id: Optional[str] = Query(None, description="Filter by linked action ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(require_permission(Permission.WARNING_LEDGER_READ)),
):
    """Lists append-only Warning Ledger blocks with cryptographic SHA-256 digests."""
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")

    effective_district = district_id
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if district_id and actor_district and district_id != actor_district:
            raise ForbiddenException("Actor is not authorized to inspect ledger entries for other districts.")
        effective_district = actor_district or district_id

    skip = (page - 1) * limit
    raw_entries = await repository.list_ledger_entries(
        district_id=effective_district,
        warning_id=warning_id,
        action_id=action_id,
        skip=skip,
        limit=limit,
    )

    items = [WarningLedgerEntry(**e) for e in raw_entries]
    all_matching = await repository.list_ledger_entries(
        district_id=effective_district,
        warning_id=warning_id,
        action_id=action_id,
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


@router.get("/verify-chain/{district_id}", response_model=APIEnvelope[LedgerVerificationResult])
async def verify_ledger_chain(
    request: Request,
    district_id: str,
    current_user: dict = Depends(require_permission(Permission.WARNING_LEDGER_READ)),
):
    """
    Cryptographically verifies the district's append-only Warning Ledger block chain from genesis to tip.
    Validates sequential continuity, previous block hashes, and entry hash digests.
    """
    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if actor_district and district_id != actor_district:
            raise ForbiddenException("Actor cannot verify ledger chain for other districts.")

    result = await WarningLedgerService.verify_chain(repository, district_id)
    return APIEnvelope(
        data=result,
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.get("/{entry_id}", response_model=APIEnvelope[WarningLedgerEntry])
async def get_ledger_entry(
    request: Request,
    entry_id: str,
    current_user: dict = Depends(require_permission(Permission.WARNING_LEDGER_READ)),
):
    """Retrieves an individual ledger block by its immutable identifier."""
    raw = await repository.get_ledger_entry_by_id(entry_id)
    if not raw:
        raise NotFoundException(f"Ledger entry '{entry_id}' not found.")

    actor_role = current_user.get("role", "")
    actor_district = current_user.get("district_id")
    if actor_role in ("DDMA", "FIELD_OFFICER"):
        if actor_district and raw.get("district_id") != actor_district:
            raise ForbiddenException("Actor cannot inspect ledger entries from other districts.")

    return APIEnvelope(
        data=WarningLedgerEntry(**raw),
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )
