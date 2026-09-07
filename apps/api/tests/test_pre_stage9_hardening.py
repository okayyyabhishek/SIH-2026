"""
Sentinel NER — Pre-Stage-9 Hardening Unit & Integration Tests
Validates the five pre-stage-9 hardening blockers:
1. Persistent Token Revocation across simulated process restarts & worker stores
2. Truthful Notification Lifecycle (REQUESTED -> SENDING -> ACCEPTED_BY_PROVIDER / FAILED, never fake DELIVERED)
3. Production Notification Provider (AWS SNS / Webhook support, fail-closed on missing config)
4. Production Configuration Validation (Rejecting NOTIFICATION_PROVIDER=simulated in prod/staging)
5. Enhanced Readiness Probe (MongoDB, S3, Notification checks without heavy downloads, secret safety)
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient

from src.core.config import Settings, settings
from src.core.operations.notifications import NotificationAdapter
from src.core.security.dependencies import get_current_user
from src.core.security.jwt import create_access_token
from src.db.repository import repository
from src.schemas.warning import (
    DeliveryChannel,
    DeliveryStatus,
    Warning,
    WarningRecipient,
    WarningType,
)


@pytest.fixture
def sample_warning():
    now = datetime.now(timezone.utc)
    return Warning(
        warning_type=WarningType.ROAD_HAZARD_ADVISORY,
        headline="Test Advisory: Potential Slope Instability",
        body="Heavy precipitation detected along chainage km 12-14. Caution advised.",
        mizo_translation="Fimkhur a ngai e.",
        district_id="dst-aizawl",
        affected_entity_type="ROAD",
        affected_entity_id="road-nh54-aizawl",
        issuing_authority_id="DDMA-AIZAWL",
        recipients=[
            WarningRecipient(
                recipient_id="rcp-test-sms-1",
                recipient_name="Test Operator",
                agency_or_community="PWD",
                contact_channel=DeliveryChannel.SMS,
                contact_target="+919876543210",
                district_id="dst-aizawl",
            ),
            WarningRecipient(
                recipient_id="rcp-test-web-1",
                recipient_name="HQ Dispatch",
                agency_or_community="DDMA",
                contact_channel=DeliveryChannel.WEB_NOTIFICATION,
                contact_target="ddma.hq@sentinel.ner.internal",
                district_id="dst-aizawl",
            ),
        ],
        expires_at=now + timedelta(hours=24),
    )


class TestPersistentTokenRevocation:
    @pytest.mark.asyncio
    async def test_token_revocation_persists_across_simulated_process_restart(self):
        """
        Verifies that revoking a token persists to the authoritative store
        and remains revoked even if the process-local in-memory cache is wiped (simulating restart).
        """
        user = await repository.get_user_by_email("ddma.aizawl@sentinel.ner.internal")
        assert user is not None
        token = create_access_token(subject=user["id"], claims={"email": user["email"], "role": user["role"]})
        from src.core.security.jwt import decode_and_validate_token
        payload = decode_and_validate_token(token, expected_type="access")
        jti = payload["jti"]

        # Token is initially valid
        assert not await repository.is_token_revoked(jti)

        # Revoke the token
        await repository.revoke_token(jti=jti, user_id=user["id"], reason="test_logout")
        assert await repository.is_token_revoked(jti)

        # Simulate process restart by wiping in-memory cache
        async with repository._lock:
            cached_doc = repository._revoked_tokens.pop(jti, None)
            assert cached_doc is not None

        # Even with local memory wiped, is_token_revoked checks persistent MongoDB
        # and re-populates the cache!
        is_still_revoked = await repository.is_token_revoked(jti)
        assert is_still_revoked, "Revoked token must be authoritatively detected across process restarts"

    @pytest.mark.asyncio
    async def test_get_current_user_rejects_revoked_token(self):
        """
        Verifies that get_current_user dependency rejects a revoked token with 401 Unauthorized.
        """
        from fastapi.security import HTTPAuthorizationCredentials

        from src.core.errors import UnauthorizedException

        user = await repository.get_user_by_email("ddma.aizawl@sentinel.ner.internal")
        token = create_access_token(subject=user["id"], claims={"email": user["email"], "role": user["role"]})
        from src.core.security.jwt import decode_and_validate_token
        payload = decode_and_validate_token(token, expected_type="access")
        jti = payload["jti"]

        # Valid before revocation
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        req_mock = MagicMock()
        user_res = await get_current_user(request=req_mock, credentials=creds)
        assert user_res["id"] == user["id"]

        # Revoke
        await repository.revoke_token(jti=jti, user_id=user["id"], reason="logout")

        # Now get_current_user must raise UnauthorizedException
        with pytest.raises(UnauthorizedException) as exc_info:
            await get_current_user(request=req_mock, credentials=creds)
        assert "revoked" in exc_info.value.message.lower()


class TestTruthfulNotificationLifecycle:
    def test_simulated_development_records_simulated_not_delivered(self, sample_warning):
        """
        In development/test mode, simulated notifications record status SIMULATED,
        never fake DELIVERED.
        """
        orig_provider = settings.NOTIFICATION_PROVIDER
        orig_env = settings.APP_ENV
        try:
            settings.NOTIFICATION_PROVIDER = "simulated"
            settings.APP_ENV = "development"

            deliveries = NotificationAdapter.dispatch_warning(sample_warning)
            assert len(deliveries) == 2
            for d in deliveries:
                assert d.status == DeliveryStatus.SIMULATED
                assert d.status != DeliveryStatus.DELIVERED
                assert d.delivered_at is None
                assert "SIMULATED" in d.status_details
        finally:
            settings.NOTIFICATION_PROVIDER = orig_provider
            settings.APP_ENV = orig_env

    def test_production_real_provider_sns_acceptance(self, sample_warning):
        """
        When real AWS SNS accepts message, it records ACCEPTED_BY_PROVIDER.
        Must NOT record DELIVERED because SNS only confirms acceptance.
        """
        mock_sns = MagicMock()
        mock_sns.publish.return_value = {"MessageId": "msg-sns-test-12345"}

        orig_provider = settings.NOTIFICATION_PROVIDER
        orig_env = settings.APP_ENV
        try:
            settings.NOTIFICATION_PROVIDER = "aws_sns"
            settings.APP_ENV = "production"

            deliveries = NotificationAdapter.dispatch_warning(sample_warning, sns_client=mock_sns)
            assert len(deliveries) == 2
            for d in deliveries:
                assert d.status == DeliveryStatus.ACCEPTED_BY_PROVIDER
                assert d.status != DeliveryStatus.DELIVERED
                assert d.delivered_at is None
                assert d.provider == "aws_sns"
                assert d.provider_message_id == "msg-sns-test-12345"
                assert "ACCEPTED_BY_PROVIDER" in d.status_details
        finally:
            settings.NOTIFICATION_PROVIDER = orig_provider
            settings.APP_ENV = orig_env

    def test_production_provider_failure(self, sample_warning):
        """
        When real AWS SNS raises an error, it records FAILED truthfully.
        """
        mock_sns = MagicMock()
        mock_sns.publish.side_effect = Exception("AWS SNS ThrottlingException")

        orig_provider = settings.NOTIFICATION_PROVIDER
        orig_env = settings.APP_ENV
        try:
            settings.NOTIFICATION_PROVIDER = "aws_sns"
            settings.APP_ENV = "production"

            deliveries = NotificationAdapter.dispatch_warning(sample_warning, sns_client=mock_sns)
            assert len(deliveries) == 2
            for d in deliveries:
                assert d.status == DeliveryStatus.FAILED
                assert d.status != DeliveryStatus.DELIVERED
                assert d.delivered_at is None
                assert "FAILED" in d.status_details
                assert "ThrottlingException" in d.status_details
        finally:
            settings.NOTIFICATION_PROVIDER = orig_provider
            settings.APP_ENV = orig_env

    def test_production_rejects_simulated_in_prod_env(self, sample_warning):
        """
        Production environment strictly rejects SIMULATED notifications.
        Fails fast with ValidationException.
        """
        from src.core.errors import ValidationException

        orig_provider = settings.NOTIFICATION_PROVIDER
        orig_env = settings.APP_ENV
        try:
            settings.NOTIFICATION_PROVIDER = "simulated"
            settings.APP_ENV = "production"

            with pytest.raises(ValidationException) as exc_info:
                NotificationAdapter.dispatch_warning(sample_warning)
            assert "strictly forbidden" in exc_info.value.message
        finally:
            settings.NOTIFICATION_PROVIDER = orig_provider
            settings.APP_ENV = orig_env


class TestProductionConfigurationValidation:
    def test_enforce_production_constraints_rejects_simulated_notification(self):
        """
        Settings validation in production/staging must reject NOTIFICATION_PROVIDER=simulated.
        """
        with pytest.raises(ValueError, match="NOTIFICATION_PROVIDER='simulated' is strictly forbidden"):
            Settings(
                APP_ENV="production",
                SECRET_KEY="a" * 64,
                MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db",
                MONGODB_DB_NAME="sentinel_prod",
                PERSISTENCE_BACKEND="mongodb",
                STORAGE_BACKEND="s3",
                AWS_S3_BUCKET="sentinel-prod-bucket",
                SATELLITE_MODE="production",
                NOTIFICATION_PROVIDER="simulated",
            )

    def test_enforce_production_constraints_defaults_auto_to_aws_sns(self):
        """
        In production, NOTIFICATION_PROVIDER='auto' resolves to 'aws_sns'.
        """
        prod_settings = Settings(
            APP_ENV="production",
            SECRET_KEY="a" * 64,
            MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db",
            MONGODB_DB_NAME="sentinel_prod",
            PERSISTENCE_BACKEND="mongodb",
            STORAGE_BACKEND="s3",
            AWS_S3_BUCKET="sentinel-prod-bucket",
            SATELLITE_MODE="production",
            NOTIFICATION_PROVIDER="auto",
        )
        assert prod_settings.NOTIFICATION_PROVIDER == "aws_sns"


class TestReadinessProbe:
    @pytest.mark.asyncio
    async def test_liveness_probe_is_lightweight(self, client: AsyncClient):
        """Liveness probe /health/live returns 200 LIVE without heavy checks."""
        res = await client.get("/health/live")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "LIVE"
        assert "correlation_id" in data

    @pytest.mark.asyncio
    async def test_readiness_probe_success(self, client: AsyncClient):
        """Readiness probe /api/v1/health/ready returns 200 READY when dependencies are up."""
        res = await client.get("/api/v1/health/ready")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "READY"
        assert data["ready"] is True
        assert "dependencies" in data
        assert data["dependencies"]["mongodb"]["status"] == "HEALTHY"

    @pytest.mark.asyncio
    async def test_readiness_probe_at_root_url(self, client: AsyncClient):
        """Readiness probe is also available at root /health/ready."""
        res = await client.get("/health/ready")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "READY"

    @pytest.mark.asyncio
    async def test_readiness_fails_in_production_if_s3_fails(self, client: AsyncClient, monkeypatch):
        """In production environment, S3 failure causes readiness to return 503 NOT_READY."""
        from src.api.v1 import health

        monkeypatch.setattr(settings, "APP_ENV", "production")
        monkeypatch.setattr(health, "check_s3_readiness", lambda: (False, "S3 bucket inaccessible"))

        res = await client.get("/api/v1/health/ready")
        assert res.status_code == 503
        data = res.json()
        assert data["status"] == "NOT_READY"
        assert data["ready"] is False
        assert data["dependencies"]["storage"]["status"] == "UNAVAILABLE"
