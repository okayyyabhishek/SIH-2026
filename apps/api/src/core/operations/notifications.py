"""
Sentinel NER — Stage 8 Truthful Multi-Channel Notification Adapter
Coordinates warning dispatch to external communication providers (AWS SNS, Webhook, Simulated).
Enforces absolute operational truthfulness: NEVER fakes delivery success when gateways only confirm acceptance.
"""

import logging
from datetime import datetime, timezone
from typing import Any, List, Optional
from uuid import uuid4

from src.core.config import settings
from src.core.errors import ValidationException
from src.schemas.warning import (
    DeliveryChannel,
    DeliveryStatus,
    Warning,
    WarningDelivery,
    WarningEscalation,
)

logger = logging.getLogger(__name__)


class NotificationAdapter:
    """
    Adapter responsible for dispatching human-authorized warnings across channels.
    Truthfully records delivery states:
    - SIMULATED: In test/development mode with simulated adapter.
    - ACCEPTED_BY_PROVIDER: Real provider (e.g. AWS SNS / Webhook) accepted the message for delivery.
    - DELIVERED: ONLY when an external SMS/Email gateway webhook confirms actual handset receipt.
    - FAILED: When external provider rejected message or credentials/config are missing.
    - NOT_CONFIGURED: Production environment without real gateway credentials.
    """

    _sns_client: Optional[Any] = None

    @classmethod
    def set_sns_client(cls, client: Optional[Any]) -> None:
        """Allows injecting custom/mock SNS client for testing."""
        cls._sns_client = client

    @classmethod
    def _get_sns_client(cls) -> Any:
        if cls._sns_client is not None:
            return cls._sns_client
        import boto3
        from botocore.config import Config

        region = getattr(settings, "AWS_SNS_REGION", None) or getattr(settings, "AWS_REGION", "eu-north-1")
        boto_config = Config(
            region_name=region,
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=5,
            read_timeout=15,
        )
        kwargs = {
            "service_name": "sns",
            "region_name": region,
            "config": boto_config,
        }
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        return boto3.client(**kwargs)

    @classmethod
    def dispatch_warning(
        cls,
        warning: Warning,
        channels: Optional[List[DeliveryChannel]] = None,
        idempotency_key: Optional[str] = None,
        sns_client: Optional[Any] = None,
    ) -> List[WarningDelivery]:
        """
        Generates truthful delivery records for each recipient of an authorized warning.
        Never fakes DELIVERED without live gateway callback verification.
        """
        now = datetime.now(timezone.utc)
        target_channels = channels or [
            DeliveryChannel.WEB_NOTIFICATION,
            DeliveryChannel.SMS,
            DeliveryChannel.EMAIL,
        ]

        deliveries: List[WarningDelivery] = []

        provider_name = (getattr(settings, "NOTIFICATION_PROVIDER", "auto") or "auto").lower()
        is_prod_env = settings.APP_ENV in ("production", "staging")

        if provider_name == "auto":
            provider_type = "aws_sns" if is_prod_env else "simulated"
        else:
            provider_type = provider_name

        # Production and Staging strictly reject simulated notifications
        if is_prod_env and provider_type == "simulated":
            raise ValidationException(
                message="NOTIFICATION_PROVIDER='simulated' is strictly forbidden in production and staging environments.",
                error_code="STG_NOTIFICATION_CONFIG_ERROR",
            )

        client = sns_client or cls._sns_client

        for recipient in warning.recipients:
            if recipient.contact_channel not in target_channels:
                continue

            del_id = f"del-{uuid4().hex[:8]}"

            if provider_type == "simulated":
                status = DeliveryStatus.SIMULATED
                provider_id = "simulated-adapter-v1"
                provider_msg_id = f"sim-{uuid4().hex[:10]}"
                details = (
                    f"SIMULATED: Advisory dispatched to simulated {recipient.contact_channel.value} gateway "
                    f"for recipient {recipient.recipient_name} ({recipient.contact_target}). "
                    f"No real carrier SMS/Email consumed."
                )
                dispatched_time = now

            elif provider_type == "aws_sns":
                provider_id = "aws_sns"
                has_creds = bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY) or (client is not None)
                if not has_creds and is_prod_env and not getattr(settings, "AWS_SNS_REGION", None):
                    status = DeliveryStatus.FAILED
                    provider_msg_id = None
                    details = "FAILED: Missing AWS SNS credentials/configuration in production. Failing closed."
                    dispatched_time = None
                else:
                    try:
                        active_client = client or cls._get_sns_client()
                        message_body = (
                            f"[{warning.issuing_authority_id or 'SENTINEL-NER'}] {warning.headline}\n\n"
                            f"{warning.body}"
                        )
                        if warning.mizo_translation:
                            message_body += f"\n\n(Mizo): {warning.mizo_translation}"

                        publish_kwargs = {
                            "Message": message_body,
                            "Subject": warning.headline[:100],
                        }
                        if getattr(settings, "AWS_SNS_TOPIC_ARN", None):
                            publish_kwargs["TopicArn"] = settings.AWS_SNS_TOPIC_ARN
                        elif recipient.contact_channel == DeliveryChannel.SMS and recipient.contact_target.startswith("+"):
                            publish_kwargs["PhoneNumber"] = recipient.contact_target

                        sns_res = active_client.publish(**publish_kwargs)
                        provider_msg_id = sns_res.get("MessageId", f"sns-{uuid4().hex[:8]}")
                        status = DeliveryStatus.ACCEPTED_BY_PROVIDER
                        details = (
                            f"ACCEPTED_BY_PROVIDER: AWS SNS accepted message for transmission "
                            f"(MessageId: {provider_msg_id}). Carrier delivery pending external verification."
                        )
                        dispatched_time = now
                    except Exception as exc:
                        logger.error("AWS SNS dispatch failed", extra={"error": str(exc), "recipient": recipient.recipient_id})
                        status = DeliveryStatus.FAILED
                        provider_msg_id = None
                        details = f"FAILED: AWS SNS dispatch failure: {str(exc)}"
                        dispatched_time = now

            elif provider_type == "webhook":
                provider_id = "webhook"
                webhook_url = getattr(settings, "NOTIFICATION_WEBHOOK_URL", None)
                if not webhook_url:
                    status = DeliveryStatus.FAILED
                    provider_msg_id = None
                    details = "FAILED: NOTIFICATION_WEBHOOK_URL unconfigured. Failing closed."
                    dispatched_time = None
                else:
                    try:
                        import httpx
                        payload = {
                            "warning_id": warning.id,
                            "recipient": recipient.model_dump(),
                            "headline": warning.headline,
                            "body": warning.body,
                            "idempotency_key": idempotency_key,
                        }
                        with httpx.Client(timeout=5.0) as http_client:
                            resp = http_client.post(webhook_url, json=payload)
                            if resp.status_code in (200, 201, 202):
                                status = DeliveryStatus.ACCEPTED_BY_PROVIDER
                                provider_msg_id = f"wh-{uuid4().hex[:8]}"
                                details = f"ACCEPTED_BY_PROVIDER: Webhook returned HTTP {resp.status_code}."
                                dispatched_time = now
                            else:
                                status = DeliveryStatus.FAILED
                                provider_msg_id = None
                                details = f"FAILED: Webhook returned HTTP {resp.status_code}."
                                dispatched_time = now
                    except Exception as exc:
                        status = DeliveryStatus.FAILED
                        provider_msg_id = None
                        details = f"FAILED: Webhook request error: {str(exc)}"
                        dispatched_time = now

            else:
                status = DeliveryStatus.FAILED
                provider_id = "unconfigured"
                provider_msg_id = None
                details = f"FAILED: Unsupported or unconfigured notification provider '{provider_type}'. Failing closed."
                dispatched_time = None

            delivery = WarningDelivery(
                delivery_id=del_id,
                recipient_id=recipient.recipient_id,
                channel=recipient.contact_channel,
                provider=provider_id,
                provider_message_id=provider_msg_id,
                status=status,
                status_details=details,
                dispatched_at=dispatched_time,
                delivered_at=None,  # NEVER automatically mark DELIVERED upon dispatch
                retry_count=0,
            )
            deliveries.append(delivery)

        return deliveries

    @classmethod
    def escalate_warning(
        cls,
        warning: Warning,
        reason: str,
        next_recipient_group: str,
    ) -> WarningEscalation:
        """
        Creates a bounded escalation record for unacknowledged critical warnings.
        Maximum allowed escalation level is strictly 3 to prevent infinite loops.
        """
        current_levels = [e.escalation_level for e in warning.escalations]
        next_level = (max(current_levels) + 1) if current_levels else 1

        if next_level > 3:
            raise ValidationException(
                message="Maximum escalation level (3) reached. Manual civil defense intervention required.",
                error_code="STG_ESCALATION_LIMIT_EXCEEDED",
            )

        return WarningEscalation(
            escalation_level=next_level,
            triggered_at=datetime.now(timezone.utc),
            next_recipient_group=next_recipient_group,
            reason=reason,
            policy_id="sentinel-escalation-standard-v1",
        )
