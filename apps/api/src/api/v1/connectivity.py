"""
Sentinel NER — Stage 9 Degraded Connectivity & Field Offline Sync Endpoints
Provides explicit connectivity state reporting, freshness observability,
and server-authoritative offline operation queue reconciliation.
Enforces the Offline Safety Rules:
- Offline clients CANNOT authorize warnings, approve operational actions, or claim delivery.
- All reconciled operations are validated against authoritative MongoDB state.
- Conflict detection and cryptographic ledger audits are strictly enforced.
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, Request, Response

from src.db.mongodb import check_mongo_health
from src.core.errors import ValidationException
from src.core.operations.delivery_engine import DeliveryEngine
from src.core.operations.ledger import WarningLedgerService
from src.core.security.dependencies import get_current_user
from src.db.repository import repository
from src.schemas.alert import (
    ConnectivityState,
    ConnectivityStatus,
    FreshnessState,
    OfflineSyncBatch,
    OfflineSyncOperation,
    OfflineSyncResponse,
    OfflineSyncResult,
    OperationStatus,
    OperationType,
)
from src.schemas.common import APIEnvelope
from src.schemas.warning_ledger import LedgerEventType

router = APIRouter(prefix="", tags=["Stage 9 — Degraded Connectivity & Sync"])


@router.get("/connectivity/status", response_model=APIEnvelope[ConnectivityStatus])
async def get_connectivity_status(request: Request, response: Response):
    """
    Returns the authoritative real-time connectivity state of the Sentinel NER platform.
    Evaluates persistence availability, ping latency, and sets freshness headers.
    """
    now = datetime.now(timezone.utc)
    is_healthy, latency_ms, details = await check_mongo_health()

    if is_healthy:
        if latency_ms and latency_ms > 350.0:
            conn_state = ConnectivityState.DEGRADED
            freshness = FreshnessState.CURRENT
        else:
            conn_state = ConnectivityState.ONLINE
            freshness = FreshnessState.CURRENT
    else:
        conn_state = ConnectivityState.OFFLINE
        freshness = FreshnessState.STALE

    response.headers["X-Connectivity-State"] = conn_state.value
    response.headers["X-Freshness-State"] = freshness.value
    response.headers["X-Last-Synced-At"] = now.isoformat()

    status_obj = ConnectivityStatus(
        connectivity_state=conn_state,
        server_timestamp=now,
        authoritative_source="MongoDB Atlas",
        freshness_state=freshness,
        last_synced_at=now,
        database_healthy=is_healthy,
        database_latency_ms=latency_ms,
        details=details or "Authoritative persistence active",
    )

    return APIEnvelope(
        data=status_obj,
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )


@router.post("/sync/reconcile", response_model=APIEnvelope[OfflineSyncResponse])
async def reconcile_offline_batch(
    request: Request,
    batch: OfflineSyncBatch,
    current_user: dict = Depends(get_current_user),
):
    """
    Reconciles a client's bounded offline operations queue when field connectivity is restored.
    Enforces server-authoritative conflict detection and strict offline safety bounds.
    """
    actor_id = current_user.get("user_id", "unknown")
    actor_role = current_user.get("role", "FIELD_OFFICER")
    actor_district = current_user.get("district_id", "")

    now = datetime.now(timezone.utc)
    results: List[OfflineSyncResult] = []

    synced_count = 0
    conflict_count = 0
    failed_count = 0

    for op in batch.operations:
        # Strict Offline Safety Boundary: Reject forbidden operations
        if op.operation_type not in (OperationType.ALERT_ACKNOWLEDGE, OperationType.OFFLINE_PING):
            failed_count += 1
            results.append(
                OfflineSyncResult(
                    operation_id=op.operation_id,
                    status=OperationStatus.FAILED,
                    reconciled_at=now,
                    message=f"Operation '{op.operation_type.value}' is strictly forbidden in offline queues. Warnings and actions require dual-custody online authorization.",
                )
            )
            continue

        if op.operation_type == OperationType.ALERT_ACKNOWLEDGE:
            payload = op.payload
            alert_id = payload.get("alert_id")
            recipient_id = payload.get("recipient_id")
            method = payload.get("method", "FIELD_TERMINAL")
            notes = payload.get("notes", "Reconciled from offline queue")

            if not alert_id or not recipient_id:
                failed_count += 1
                results.append(
                    OfflineSyncResult(
                        operation_id=op.operation_id,
                        status=OperationStatus.FAILED,
                        reconciled_at=now,
                        message="Missing alert_id or recipient_id in offline payload.",
                    )
                )
                continue

            raw_alert = await repository.get_alert_by_id(alert_id)
            if not raw_alert:
                failed_count += 1
                results.append(
                    OfflineSyncResult(
                        operation_id=op.operation_id,
                        status=OperationStatus.FAILED,
                        reconciled_at=now,
                        message=f"Target alert '{alert_id}' does not exist on authoritative server.",
                    )
                )
                continue

            # Check if alert already acknowledged or expired on server
            curr_status = raw_alert.get("status")
            if curr_status == "ACKNOWLEDGED":
                conflict_count += 1
                results.append(
                    OfflineSyncResult(
                        operation_id=op.operation_id,
                        status=OperationStatus.CONFLICT,
                        reconciled_at=now,
                        message=f"Alert '{alert_id}' is already acknowledged on server. Duplicate client operation ignored.",
                        conflict_details={"server_status": curr_status, "client_status": "ACKNOWLEDGE_ATTEMPT"},
                    )
                )
                continue
            elif curr_status == "EXPIRED":
                conflict_count += 1
                results.append(
                    OfflineSyncResult(
                        operation_id=op.operation_id,
                        status=OperationStatus.CONFLICT,
                        reconciled_at=now,
                        message=f"Alert '{alert_id}' has already expired on server. Offline acknowledgement rejected.",
                        conflict_details={"server_status": curr_status},
                    )
                )
                continue

            # Reconcile acknowledgement truthfully
            try:
                await DeliveryEngine.acknowledge_alert(
                    repo=repository,
                    alert_id=alert_id,
                    recipient_id=recipient_id,
                    method=method,
                    notes=f"{notes} (client_timestamp: {op.client_timestamp.isoformat()})",
                    actor_id=actor_id,
                    actor_role=actor_role,
                )
                synced_count += 1
                results.append(
                    OfflineSyncResult(
                        operation_id=op.operation_id,
                        status=OperationStatus.SYNCED,
                        reconciled_at=now,
                        message=f"Successfully reconciled acknowledgement for alert '{alert_id}'.",
                    )
                )
            except Exception as exc:
                failed_count += 1
                results.append(
                    OfflineSyncResult(
                        operation_id=op.operation_id,
                        status=OperationStatus.FAILED,
                        reconciled_at=now,
                        message=f"Reconciliation error: {str(exc)}",
                    )
                )

        elif op.operation_type == OperationType.OFFLINE_PING:
            synced_count += 1
            results.append(
                OfflineSyncResult(
                    operation_id=op.operation_id,
                    status=OperationStatus.SYNCED,
                    reconciled_at=now,
                    message="Field terminal ping synchronized.",
                )
            )

    # Record overall batch reconciliation in audit ledger
    await WarningLedgerService.record_event(
        repo=repository,
        district_id=actor_district or "REGIONAL_HQ",
        event_type=LedgerEventType.OFFLINE_SYNC_RECONCILED,
        actor_user_id=actor_id,
        actor_role=actor_role,
        payload={
            "batch_id": batch.batch_id,
            "client_id": batch.client_id,
            "processed_count": len(batch.operations),
            "synced_count": synced_count,
            "conflict_count": conflict_count,
            "failed_count": failed_count,
        },
    )

    response_data = OfflineSyncResponse(
        batch_id=batch.batch_id,
        processed_count=len(batch.operations),
        synced_count=synced_count,
        conflict_count=conflict_count,
        failed_count=failed_count,
        results=results,
        server_timestamp=now,
        freshness_state=FreshnessState.CURRENT,
    )

    return APIEnvelope(
        data=response_data,
        correlation_id=getattr(request.state, "correlation_id", "system") or "system",
    )
