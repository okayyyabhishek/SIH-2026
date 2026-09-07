"""
Sentinel NER — Stage 9 Alert Delivery Engine & Lifecycle State Machine
Coordinates alert queuing from authorized warnings, deterministic idempotency,
asynchronous provider dispatch jobs, bounded exponential retries, and truthful acknowledgement tracking.
Enforces the Non-Autonomous Warning Principle and cryptographically links all transitions to the Warning Ledger.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from src.core.errors import ConflictException, ValidationException
from src.core.notifications.providers import ProviderRegistry
from src.core.operations.ledger import WarningLedgerService
from src.schemas.alert import (
    Alert,
    AlertAcknowledgement,
    AlertPriority,
    AlertStatus,
    DeliveryJob,
    JobStatus,
    mask_contact_target,
)
from src.schemas.warning import (
    DeliveryChannel,
    DeliveryStatus,
    Warning,
    WarningStatus,
)
from src.schemas.warning_ledger import LedgerEventType

logger = logging.getLogger(__name__)


class AlertStateMachine:
    """
    Enforces the rigorous, server-side Alert lifecycle state machine.
    Prevents arbitrary leaps and ensures strict operational truthfulness.
    """

    ALLOWED_TRANSITIONS: Dict[AlertStatus, List[AlertStatus]] = {
        AlertStatus.QUEUED: [
            AlertStatus.DISPATCHING,
            AlertStatus.FAILED,
            AlertStatus.EXPIRED,
        ],
        AlertStatus.DISPATCHING: [
            AlertStatus.DISPATCHED,
            AlertStatus.FAILED,
            AlertStatus.EXPIRED,
        ],
        AlertStatus.DISPATCHED: [
            AlertStatus.DELIVERED,
            AlertStatus.DELIVERY_FAILED,
            AlertStatus.EXPIRED,
            AlertStatus.ACKNOWLEDGED,  # In field conditions when handset receives and acknowledges simultaneously
        ],
        AlertStatus.DELIVERED: [
            AlertStatus.ACKNOWLEDGED,
            AlertStatus.EXPIRED,
        ],
        AlertStatus.ACKNOWLEDGED: [],  # Terminal successful state
        AlertStatus.FAILED: [
            AlertStatus.QUEUED,  # Permitted only via bounded manual or automated retry
        ],
        AlertStatus.DELIVERY_FAILED: [
            AlertStatus.QUEUED,  # Permitted only via bounded manual or automated retry
        ],
        AlertStatus.EXPIRED: [],  # Terminal expired state
    }

    @classmethod
    def validate_transition(
        cls,
        current_status: AlertStatus,
        target_status: AlertStatus,
        is_expired: bool = False,
    ) -> None:
        if is_expired and target_status != AlertStatus.EXPIRED:
            raise ValidationException(
                message=f"Alert has expired. Cannot transition from {current_status.value} to {target_status.value}.",
                error_code="STG_ALERT_EXPIRED",
            )

        allowed = cls.ALLOWED_TRANSITIONS.get(current_status, [])
        if target_status not in allowed:
            raise ValidationException(
                message=f"Invalid alert status transition from {current_status.value} to {target_status.value}.",
                error_code="STG_ALERT_INVALID_STATE_TRANSITION",
            )


class DeliveryEngine:
    """
    Authoritative Alert Delivery Engine.
    Executes idempotency verification, background job coordination, and audit integration.
    """

    @staticmethod
    def generate_deterministic_idempotency_key(
        warning_id: str,
        recipient_id: str,
        channel: DeliveryChannel,
        attempt: int = 1,
    ) -> str:
        return f"idem-{warning_id}:{recipient_id}:{channel.value}:{attempt}"

    @classmethod
    async def queue_alerts_for_warning(
        cls,
        repo: Any,
        warning: Warning,
        channels: Optional[List[DeliveryChannel]] = None,
        base_idempotency_key: Optional[str] = None,
        actor_id: str = "system",
        actor_role: str = "SYSTEM",
    ) -> List[Alert]:
        """
        Generates queued alerts for all eligible recipients of an AUTHORIZED warning.
        Enforces human authorization dependency: raises if warning is not AUTHORIZED.
        """
        if warning.status != WarningStatus.AUTHORIZED:
            raise ValidationException(
                message=f"Cannot queue alerts for warning in status '{warning.status.value}'. Warning must be formally AUTHORIZED.",
                error_code="STG_UNAUTHORIZED_WARNING_DISPATCH",
            )

        now = datetime.now(timezone.utc)
        if now > warning.expires_at:
            raise ValidationException(
                message="Cannot dispatch expired warning.",
                error_code="STG_WARNING_EXPIRED",
            )

        target_channels = channels or [
            DeliveryChannel.WEB_NOTIFICATION,
            DeliveryChannel.SMS,
            DeliveryChannel.EMAIL,
        ]

        queued_alerts: List[Alert] = []

        for recipient in warning.recipients:
            if recipient.contact_channel not in target_channels:
                continue

            idempotency_key = (
                f"{base_idempotency_key}:{recipient.recipient_id}:{recipient.contact_channel.value}"
                if base_idempotency_key
                else cls.generate_deterministic_idempotency_key(
                    warning.id, recipient.recipient_id, recipient.contact_channel, attempt=1
                )
            )

            # Check if alert already exists with this idempotency key
            existing = await repo.get_alert_by_idempotency_key(idempotency_key)
            if existing:
                queued_alerts.append(Alert(**existing))
                continue

            provider_obj = ProviderRegistry.get_provider(recipient.contact_channel)
            provider_status = provider_obj.get_capability_status()

            masked_target = mask_contact_target(recipient.contact_target, recipient.contact_channel)

            alert = Alert(
                id=f"alt-{uuid4().hex[:12]}",
                warning_id=warning.id,
                action_id=None,
                recipient_id=recipient.recipient_id,
                recipient_name=recipient.recipient_name,
                channel=recipient.contact_channel,
                contact_target_masked=masked_target,
                priority=AlertPriority.HIGH,
                payload_reference={
                    "headline": warning.headline,
                    "body": warning.body,
                    "mizo_translation": warning.mizo_translation,
                    "hindi_translation": warning.hindi_translation,
                    "district_id": warning.district_id,
                    "state_id": warning.state_id,
                    "affected_entity_type": warning.affected_entity_type,
                    "affected_entity_id": warning.affected_entity_id,
                    # Real target stored in memory / internal payload for provider execution
                    "target_destination": recipient.contact_target,
                },
                status=AlertStatus.QUEUED,
                provider=provider_obj.name,
                provider_status=provider_status,
                attempt_count=0,
                max_retries=3,
                created_at=now,
                queued_at=now,
                expires_at=warning.expires_at,
                correlation_id=f"corr-{uuid4().hex[:10]}",
                idempotency_key=idempotency_key,
                district_id=warning.district_id,
                organization_id=warning.issuing_authority_id,
                provenance={
                    "source_warning_id": warning.id,
                    "authorized_by": warning.authorized_by,
                    "authorized_at": warning.authorized_at.isoformat() if warning.authorized_at else None,
                },
            )

            saved_alert = await repo.create_alert(alert.model_dump())
            alert_model = Alert(**saved_alert)

            # Create associated background delivery job
            job = DeliveryJob(
                job_id=f"job-{uuid4().hex[:12]}",
                alert_id=alert_model.id,
                correlation_id=alert_model.correlation_id,
                status=JobStatus.QUEUED,
                attempt_count=0,
                max_attempts=3,
                backoff_seconds=2.0,
                created_at=now,
            )
            await repo.create_delivery_job(job.model_dump())

            # Audit ledger recording
            await WarningLedgerService.record_event(
                repo=repo,
                district_id=warning.district_id,
                event_type=LedgerEventType.ALERT_QUEUED,
                actor_user_id=actor_id,
                actor_role=actor_role,
                payload={
                    "alert_id": alert_model.id,
                    "warning_id": warning.id,
                    "recipient_id": recipient.recipient_id,
                    "channel": recipient.contact_channel.value,
                    "provider": provider_obj.name,
                    "idempotency_key": idempotency_key,
                },
                warning_id=warning.id,
            )

            queued_alerts.append(alert_model)

        return queued_alerts

    @classmethod
    async def process_delivery_job(
        cls,
        repo: Any,
        job_id: str,
        actor_id: str = "worker",
        actor_role: str = "SYSTEM",
    ) -> Tuple[DeliveryJob, Alert]:
        """
        Executes an asynchronous delivery job against the configured notification provider.
        Truthfully records results and schedules bounded exponential retries on failure.
        """
        raw_job = await repo.get_delivery_job_by_id(job_id)
        if not raw_job:
            raise ValidationException(f"DeliveryJob '{job_id}' not found.", error_code="STG_JOB_NOT_FOUND")

        job = DeliveryJob(**raw_job)
        raw_alert = await repo.get_alert_by_id(job.alert_id)
        if not raw_alert:
            raise ValidationException(f"Alert '{job.alert_id}' for job not found.", error_code="STG_ALERT_NOT_FOUND")

        alert = Alert(**raw_alert)
        now = datetime.now(timezone.utc)

        # Check expiration
        if now > alert.expires_at:
            AlertStateMachine.validate_transition(alert.status, AlertStatus.EXPIRED)
            job.status = JobStatus.EXPIRED
            job.completed_at = now
            job.failure_reason = "Alert expired before dispatch completed."
            await repo.update_delivery_job(job.job_id, job.model_dump())

            alert.status = AlertStatus.EXPIRED
            alert.failed_at = now
            alert.failure_reason = "Alert expired"
            await repo.update_alert(alert.id, alert.model_dump())

            await WarningLedgerService.record_event(
                repo=repo,
                district_id=alert.district_id,
                event_type=LedgerEventType.ALERT_EXPIRED,
                actor_user_id=actor_id,
                actor_role=actor_role,
                payload={"alert_id": alert.id, "job_id": job.job_id, "reason": "Expired"},
                warning_id=alert.warning_id,
            )
            return job, alert

        # Transition alert to DISPATCHING
        AlertStateMachine.validate_transition(alert.status, AlertStatus.DISPATCHING)
        alert.status = AlertStatus.DISPATCHING
        await repo.update_alert(alert.id, {"status": AlertStatus.DISPATCHING.value})

        job.status = JobStatus.RUNNING
        job.started_at = now
        job.attempt_count += 1
        await repo.update_delivery_job(job.job_id, job.model_dump())

        # Select provider and dispatch
        provider = ProviderRegistry.get_provider(alert.channel)
        dispatch_res = await provider.dispatch(alert, alert.payload_reference)

        alert.attempt_count = job.attempt_count

        if dispatch_res.success:
            # Transition to DISPATCHED (acceptance by provider, NOT delivered)
            AlertStateMachine.validate_transition(alert.status, AlertStatus.DISPATCHED)
            alert.status = AlertStatus.DISPATCHED
            alert.provider = dispatch_res.provider_name
            alert.provider_message_id = dispatch_res.provider_message_id
            alert.dispatched_at = datetime.now(timezone.utc)
            alert.failure_reason = None
            await repo.update_alert(alert.id, alert.model_dump())

            job.status = JobStatus.SUCCESS
            job.completed_at = datetime.now(timezone.utc)
            await repo.update_delivery_job(job.job_id, job.model_dump())

            await WarningLedgerService.record_event(
                repo=repo,
                district_id=alert.district_id,
                event_type=LedgerEventType.ALERT_DISPATCHED,
                actor_user_id=actor_id,
                actor_role=actor_role,
                payload={
                    "alert_id": alert.id,
                    "job_id": job.job_id,
                    "provider": dispatch_res.provider_name,
                    "provider_message_id": dispatch_res.provider_message_id,
                    "details": dispatch_res.details,
                    "attempt_count": job.attempt_count,
                },
                warning_id=alert.warning_id,
            )
        else:
            # Handle failure and bounded retry
            if job.attempt_count < job.max_attempts:
                # Calculate exponential backoff: 2^attempt seconds
                backoff_seconds = min(30.0, 2.0 ** job.attempt_count)
                next_retry = datetime.fromtimestamp(now.timestamp() + backoff_seconds, tz=timezone.utc)

                job.status = JobStatus.RETRYING
                job.next_retry_at = next_retry
                job.failure_reason = dispatch_res.details
                await repo.update_delivery_job(job.job_id, job.model_dump())

                # Alert reverts to QUEUED for next attempt or stays DISPATCHING/FAILED
                AlertStateMachine.validate_transition(alert.status, AlertStatus.FAILED)
                alert.status = AlertStatus.FAILED
                alert.failure_reason = dispatch_res.details
                alert.failed_at = now
                await repo.update_alert(alert.id, alert.model_dump())

                await WarningLedgerService.record_event(
                    repo=repo,
                    district_id=alert.district_id,
                    event_type=LedgerEventType.ALERT_RETRY_SCHEDULED,
                    actor_user_id=actor_id,
                    actor_role=actor_role,
                    payload={
                        "alert_id": alert.id,
                        "job_id": job.job_id,
                        "attempt_count": job.attempt_count,
                        "next_retry_at": next_retry.isoformat(),
                        "reason": dispatch_res.details,
                    },
                    warning_id=alert.warning_id,
                )
            else:
                # Retries exhausted -> Terminal FAILED
                AlertStateMachine.validate_transition(alert.status, AlertStatus.FAILED)
                alert.status = AlertStatus.FAILED
                alert.failure_reason = f"Max retries ({job.max_attempts}) exhausted: {dispatch_res.details}"
                alert.failed_at = now
                await repo.update_alert(alert.id, alert.model_dump())

                job.status = JobStatus.FAILED
                job.completed_at = now
                job.failure_reason = alert.failure_reason
                await repo.update_delivery_job(job.job_id, job.model_dump())

                await WarningLedgerService.record_event(
                    repo=repo,
                    district_id=alert.district_id,
                    event_type=LedgerEventType.ALERT_DELIVERY_FAILED,
                    actor_user_id=actor_id,
                    actor_role=actor_role,
                    payload={
                        "alert_id": alert.id,
                        "job_id": job.job_id,
                        "reason": alert.failure_reason,
                        "attempt_count": job.attempt_count,
                    },
                    warning_id=alert.warning_id,
                )

        return job, alert

    @classmethod
    async def record_delivery_confirmation(
        cls,
        repo: Any,
        alert_id: str,
        provider_details: str = "Handset delivery receipt confirmed by carrier webhook",
        actor_id: str = "carrier-gateway",
    ) -> Alert:
        """
        Transitions alert to DELIVERED ONLY upon external carrier delivery receipt.
        Never automated on simple provider dispatch.
        """
        raw = await repo.get_alert_by_id(alert_id)
        if not raw:
            raise ValidationException(f"Alert '{alert_id}' not found.", error_code="STG_ALERT_NOT_FOUND")

        alert = Alert(**raw)
        AlertStateMachine.validate_transition(alert.status, AlertStatus.DELIVERED)

        now = datetime.now(timezone.utc)
        alert.status = AlertStatus.DELIVERED
        alert.delivered_at = now
        await repo.update_alert(alert.id, alert.model_dump())

        await WarningLedgerService.record_event(
            repo=repo,
            district_id=alert.district_id,
            event_type=LedgerEventType.ALERT_DELIVERED,
            actor_user_id=actor_id,
            actor_role="EXTERNAL_CARRIER",
            payload={
                "alert_id": alert.id,
                "delivered_at": now.isoformat(),
                "details": provider_details,
            },
            warning_id=alert.warning_id,
        )
        return alert

    @classmethod
    async def acknowledge_alert(
        cls,
        repo: Any,
        alert_id: str,
        recipient_id: str,
        method: str = "WEB",
        notes: Optional[str] = None,
        actor_id: str = "recipient",
        actor_role: str = "RECIPIENT",
    ) -> Tuple[Alert, AlertAcknowledgement]:
        """
        Records truthful field acknowledgement.
        Transitions alert to ACKNOWLEDGED and appends cryptographically chained ledger entry.
        """
        raw = await repo.get_alert_by_id(alert_id)
        if not raw:
            raise ValidationException(f"Alert '{alert_id}' not found.", error_code="STG_ALERT_NOT_FOUND")

        alert = Alert(**raw)
        if alert.recipient_id != recipient_id:
            raise ValidationException(
                message=f"Recipient mismatch: Alert '{alert_id}' was addressed to recipient '{alert.recipient_id}', not '{recipient_id}'.",
                error_code="STG_ALERT_RECIPIENT_MISMATCH",
            )

        # Enforce state machine transition
        AlertStateMachine.validate_transition(alert.status, AlertStatus.ACKNOWLEDGED)

        now = datetime.now(timezone.utc)
        ack = AlertAcknowledgement(
            id=f"ack-{uuid4().hex[:12]}",
            alert_id=alert.id,
            recipient_id=recipient_id,
            acknowledged_at=now,
            acknowledgement_method=method,  # type: ignore
            notes=notes,
            correlation_id=alert.correlation_id,
        )
        await repo.create_alert_acknowledgement(ack.model_dump())

        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = now
        await repo.update_alert(alert.id, alert.model_dump())

        # Also update parent warning acknowledgements list if present
        raw_warning = await repo.get_warning_by_id(alert.warning_id)
        if raw_warning:
            warning_acks = raw_warning.get("acknowledgements", [])
            warning_acks.append({
                "acknowledgement_id": ack.id,
                "recipient_id": recipient_id,
                "recipient_name": alert.recipient_name,
                "acknowledged_at": now,
                "channel": alert.channel.value,
                "notes": notes,
            })
            await repo.update_warning(alert.warning_id, {"acknowledgements": warning_acks})

        await WarningLedgerService.record_event(
            repo=repo,
            district_id=alert.district_id,
            event_type=LedgerEventType.ALERT_ACKNOWLEDGED,
            actor_user_id=actor_id,
            actor_role=actor_role,
            payload={
                "alert_id": alert.id,
                "acknowledgement_id": ack.id,
                "recipient_id": recipient_id,
                "method": method,
                "acknowledged_at": now.isoformat(),
            },
            warning_id=alert.warning_id,
        )

        return alert, ack
