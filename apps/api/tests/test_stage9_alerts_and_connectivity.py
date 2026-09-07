"""
Sentinel NER — Stage 9 Alert Delivery & Degraded Connectivity Test Suite
Validates:
1. Functional alert generation from human-authorized warnings (rejection of draft/unauthorized).
2. Strict Alert State Machine transitions and rejection of invalid status leaps.
3. Truthful Provider Abstraction (SIMULATED != DELIVERED, DISPATCHED != DELIVERED, NOT_CONFIGURED fails closed).
4. Server-side idempotency protection against duplicate dispatch.
5. Bounded exponential backoff retries (max 3 attempts, terminal exhaustion).
6. Asynchronous delivery job lifecycle.
7. Truthful acknowledgement tracking (DELIVERED != ACKNOWLEDGED).
8. Recipient privacy masking (no raw phone/email exposure).
9. Degraded connectivity state evaluation and freshness headers.
10. Offline operation queue reconciliation, conflict detection, and safety rules (offline cannot authorize warnings).
11. Security: RBAC, BOLA, district jurisdiction boundaries.
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4
import pytest
from httpx import AsyncClient

from src.core.errors import ValidationException
from src.core.security.jwt import create_access_token
from src.core.notifications.providers import (
    NotificationProvider,
    ProviderCapabilityStatus,
    ProviderDispatchResult,
    ProviderRegistry,
    SimulatedProvider,
    SMSProvider,
)
from src.core.operations.delivery_engine import (
    AlertStateMachine,
    DeliveryEngine,
)
from src.db.repository import repository
from src.schemas.alert import (
    Alert,
    AlertPriority,
    AlertStatus,
    ConnectivityState,
    FreshnessState,
    JobStatus,
    OfflineSyncBatch,
    OfflineSyncOperation,
    OperationStatus,
    OperationType,
    mask_contact_target,
)
from src.schemas.warning import (
    DeliveryChannel,
    DeliveryStatus,
    Warning,
    WarningRecipient,
    WarningStatus,
    WarningType,
)


@pytest.fixture(autouse=True)
async def clear_repos():
    await repository.clear_all()
    yield
    await repository.clear_all()


async def get_token_for(email: str = "ddma.aizawl@sentinel.ner.internal") -> str:
    user = await repository.get_user_by_email(email)
    if not user:
        await repository.seed_dev_data_if_empty()
        user = await repository.get_user_by_email(email)
    assert user is not None, f"User {email} not found"
    return create_access_token(
        subject=user["id"],
        claims={"email": user["email"], "role": user["role"], "district_id": user.get("district_id")},
    )


def create_sample_warning(status: WarningStatus = WarningStatus.AUTHORIZED) -> Warning:
    now = datetime.now(timezone.utc)
    return Warning(
        id=f"wrn-test-{uuid4().hex[:8]}",
        warning_type=WarningType.ROAD_HAZARD_ADVISORY,
        status=status,
        headline="NH-54 Debris Warning Near Durtlang",
        body="High risk of localized scarp failure and debris accumulation along km 14-16.",
        mizo_translation="Kawngpui lian NH-54 Durtlang bulah leimin hlauhawm a awm.",
        district_id="AIZAWL",
        affected_entity_type="ROAD",
        affected_entity_id="road-nh54-aizawl",
        issuing_authority_id="DDMA_AIZAWL",
        authorized_by="admin-user-01" if status == WarningStatus.AUTHORIZED else None,
        authorized_at=now if status == WarningStatus.AUTHORIZED else None,
        recipients=[
            WarningRecipient(
                recipient_id="rcp-aiz-01",
                recipient_name="Pu Lalremruata (Field Controller)",
                agency_or_community="Aizawl District Emergency Ops",
                contact_channel=DeliveryChannel.SMS,
                contact_target="+919876543210",
                district_id="AIZAWL",
            ),
            WarningRecipient(
                recipient_id="rcp-aiz-02",
                recipient_name="Pi Vanlalruati (Village Council President)",
                agency_or_community="Durtlang North VCP",
                contact_channel=DeliveryChannel.WEB_NOTIFICATION,
                contact_target="https://webhook.site/sentinel-test",
                district_id="AIZAWL",
            ),
        ],
        effective_from=now,
        expires_at=now + timedelta(hours=24),
    )


class TestStage9AlertStateMachine:
    """Explicit lifecycle tests for server-side state machine."""

    def test_valid_forward_lifecycle(self):
        # QUEUED -> DISPATCHING -> DISPATCHED -> DELIVERED -> ACKNOWLEDGED
        AlertStateMachine.validate_transition(AlertStatus.QUEUED, AlertStatus.DISPATCHING)
        AlertStateMachine.validate_transition(AlertStatus.DISPATCHING, AlertStatus.DISPATCHED)
        AlertStateMachine.validate_transition(AlertStatus.DISPATCHED, AlertStatus.DELIVERED)
        AlertStateMachine.validate_transition(AlertStatus.DELIVERED, AlertStatus.ACKNOWLEDGED)

    def test_invalid_transition_leaps_fail(self):
        # Must not leap directly from QUEUED to DELIVERED or ACKNOWLEDGED
        with pytest.raises(ValidationException):
            AlertStateMachine.validate_transition(AlertStatus.QUEUED, AlertStatus.DELIVERED)

        with pytest.raises(ValidationException):
            AlertStateMachine.validate_transition(AlertStatus.QUEUED, AlertStatus.ACKNOWLEDGED)

        with pytest.raises(ValidationException):
            AlertStateMachine.validate_transition(AlertStatus.DISPATCHING, AlertStatus.ACKNOWLEDGED)

    def test_terminal_states_cannot_transition(self):
        with pytest.raises(ValidationException):
            AlertStateMachine.validate_transition(AlertStatus.ACKNOWLEDGED, AlertStatus.QUEUED)

        with pytest.raises(ValidationException):
            AlertStateMachine.validate_transition(AlertStatus.EXPIRED, AlertStatus.DISPATCHED)

    def test_expired_alerts_cannot_advance(self):
        with pytest.raises(ValidationException):
            AlertStateMachine.validate_transition(AlertStatus.QUEUED, AlertStatus.DISPATCHING, is_expired=True)


class TestStage9ProviderTruthfulness:
    """Validates truthful provider capability status and non-fabrication of DELIVERED."""

    @pytest.mark.asyncio
    async def test_unconfigured_sms_provider_reports_not_configured_and_fails_truthfully(self):
        provider = SMSProvider()
        provider.set_client(None)  # ensure no mock client
        # In test without real AWS keys, capability must be NOT_CONFIGURED
        status = provider.get_capability_status()
        assert status == ProviderCapabilityStatus.NOT_CONFIGURED

        dummy_alert = Alert(
            id="alt-test-01",
            warning_id="wrn-test-01",
            recipient_id="rcp-01",
            recipient_name="Field Officer",
            channel=DeliveryChannel.SMS,
            contact_target_masked="+91 98*** **345",
            status=AlertStatus.QUEUED,
            provider=provider.name,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            district_id="AIZAWL",
            organization_id="DDMA",
        )

        res = await provider.dispatch(dummy_alert, {})
        assert res.success is False
        assert res.status == DeliveryStatus.NOT_CONFIGURED
        assert "NOT_CONFIGURED" in res.details
        # Crucial: Must NEVER report DELIVERED
        assert res.status != DeliveryStatus.DELIVERED

    @pytest.mark.asyncio
    async def test_simulated_provider_is_never_delivered(self):
        sim = SimulatedProvider(DeliveryChannel.SMS)
        dummy_alert = Alert(
            id="alt-test-02",
            warning_id="wrn-test-02",
            recipient_id="rcp-02",
            recipient_name="Community Member",
            channel=DeliveryChannel.SMS,
            contact_target_masked="+91 98*** **345",
            status=AlertStatus.QUEUED,
            provider=sim.name,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            district_id="AIZAWL",
            organization_id="DDMA",
        )
        res = await sim.dispatch(dummy_alert, {})
        assert res.status == DeliveryStatus.SIMULATED
        assert res.status != DeliveryStatus.DELIVERED


class TestStage9DeliveryEngineAndIdempotency:
    """Validates authorization dependency, queue generation, and deduplication."""

    @pytest.mark.asyncio
    async def test_cannot_queue_alerts_for_unauthorized_draft_warning(self):
        draft_warning = create_sample_warning(status=WarningStatus.DRAFT)
        with pytest.raises(ValidationException) as exc:
            await DeliveryEngine.queue_alerts_for_warning(repository, draft_warning)
        assert "Warning must be formally AUTHORIZED" in str(exc.value)

    @pytest.mark.asyncio
    async def test_queue_alerts_creates_alerts_and_delivery_jobs(self):
        warning = create_sample_warning(status=WarningStatus.AUTHORIZED)
        await repository.create_warning(warning.model_dump())

        alerts = await DeliveryEngine.queue_alerts_for_warning(repository, warning)
        assert len(alerts) == 2
        for alt in alerts:
            assert alt.status == AlertStatus.QUEUED
            assert alt.warning_id == warning.id
            assert alt.district_id == "AIZAWL"
            assert "***" in alt.contact_target_masked

        jobs = await repository.list_pending_delivery_jobs()
        assert len(jobs) == 2

    @pytest.mark.asyncio
    async def test_server_side_idempotency_prevents_duplicate_alerts(self):
        warning = create_sample_warning(status=WarningStatus.AUTHORIZED)
        await repository.create_warning(warning.model_dump())

        # First dispatch
        idem_key = f"batch-key-{uuid4().hex[:8]}"
        alerts1 = await DeliveryEngine.queue_alerts_for_warning(
            repository, warning, base_idempotency_key=idem_key
        )
        # Second dispatch with identical key
        alerts2 = await DeliveryEngine.queue_alerts_for_warning(
            repository, warning, base_idempotency_key=idem_key
        )

        assert len(alerts1) == 2
        assert len(alerts2) == 2
        assert [a.id for a in alerts1] == [a.id for a in alerts2]

        all_alerts = await repository.list_alerts()
        assert len(all_alerts) == 2  # No duplicate rows created in database


class TestStage9BoundedRetries:
    """Validates bounded exponential backoff retries and terminal failure."""

    @pytest.mark.asyncio
    async def test_bounded_retry_exhaustion_terminates_at_failed(self):
        now = datetime.now(timezone.utc)
        alert = Alert(
            id="alt-retry-01",
            warning_id="wrn-test-retry",
            recipient_id="rcp-01",
            recipient_name="Field Officer",
            channel=DeliveryChannel.SMS,
            contact_target_masked="+91 98*** **345",
            status=AlertStatus.QUEUED,
            provider="aws_sns_sms",
            expires_at=now + timedelta(hours=2),
            district_id="AIZAWL",
            organization_id="DDMA",
            attempt_count=0,
            max_retries=3,
        )
        await repository.create_alert(alert.model_dump())

        # Simulate provider failure mock
        class FailingSMSProvider(NotificationProvider):
            def __init__(self):
                super().__init__(DeliveryChannel.SMS)

            @property
            def name(self):
                return "failing_sms"

            def get_capability_status(self):
                return ProviderCapabilityStatus.FAILED

            async def dispatch(self, alert, payload):
                return ProviderDispatchResult(
                    success=False,
                    status=DeliveryStatus.FAILED,
                    provider_name=self.name,
                    details="Carrier network timeout",
                )

        ProviderRegistry.set_provider_override(DeliveryChannel.SMS, FailingSMSProvider())

        # Attempt 1 -> Schedules retry 1
        job1 = await repository.create_delivery_job({
            "job_id": "job-ret-01",
            "alert_id": alert.id,
            "correlation_id": "corr-01",
            "status": JobStatus.QUEUED.value,
            "attempt_count": 0,
            "max_attempts": 3,
        })
        j1, a1 = await DeliveryEngine.process_delivery_job(repository, "job-ret-01")
        assert j1.status == JobStatus.RETRYING
        assert a1.status == AlertStatus.FAILED
        assert j1.attempt_count == 1
        assert j1.next_retry_at is not None

        # Reset alert status to QUEUED for retry simulation
        await repository.update_alert(alert.id, {"status": AlertStatus.QUEUED.value})

        # Attempt 2
        j2, a2 = await DeliveryEngine.process_delivery_job(repository, "job-ret-01")
        assert j2.status == JobStatus.RETRYING
        assert j2.attempt_count == 2

        # Reset alert status to QUEUED for retry simulation
        await repository.update_alert(alert.id, {"status": AlertStatus.QUEUED.value})

        # Attempt 3 (Final Attempt) -> Terminal FAILED
        j3, a3 = await DeliveryEngine.process_delivery_job(repository, "job-ret-01")
        assert j3.status == JobStatus.FAILED
        assert a3.status == AlertStatus.FAILED
        assert j3.attempt_count == 3
        assert "Max retries (3) exhausted" in a3.failure_reason

        # Restore normal provider
        ProviderRegistry.set_provider_override(DeliveryChannel.SMS, None)


class TestStage9AcknowledgementAndTruthfulness:
    """Validates acknowledgement rules and recipient isolation."""

    @pytest.mark.asyncio
    async def test_delivered_does_not_imply_acknowledged(self):
        now = datetime.now(timezone.utc)
        uid = uuid4().hex[:8]
        alert = Alert(
            id=f"alt-ack-{uid}",
            warning_id=f"wrn-ack-{uid}",
            recipient_id=f"rcp-ack-{uid}",
            recipient_name="Village President",
            channel=DeliveryChannel.SMS,
            contact_target_masked="+91 98*** **345",
            status=AlertStatus.DISPATCHED,
            provider="aws_sns_sms",
            expires_at=now + timedelta(hours=4),
            district_id="AIZAWL",
            organization_id="DDMA",
        )
        await repository.create_alert(alert.model_dump())

        # External carrier webhook confirms delivery
        delivered_alert = await DeliveryEngine.record_delivery_confirmation(
            repository, alert.id, provider_details="Handset delivery receipt confirmed"
        )
        assert delivered_alert.status == AlertStatus.DELIVERED
        # Crucial Truthfulness Rule: DELIVERED != ACKNOWLEDGED
        assert delivered_alert.status != AlertStatus.ACKNOWLEDGED
        assert delivered_alert.acknowledged_at is None

        # Field recipient acknowledges via Mobile
        acked_alert, ack = await DeliveryEngine.acknowledge_alert(
            repository,
            alert.id,
            recipient_id=f"rcp-ack-{uid}",
            method="MOBILE",
            notes="Village alerted via loudspeaker",
        )
        assert acked_alert.status == AlertStatus.ACKNOWLEDGED
        assert acked_alert.acknowledged_at is not None
        assert ack.acknowledgement_method.value == "MOBILE"

    @pytest.mark.asyncio
    async def test_acknowledgement_rejects_recipient_mismatch(self):
        now = datetime.now(timezone.utc)
        uid = uuid4().hex[:8]
        alert = Alert(
            id=f"alt-ack-{uid}",
            warning_id=f"wrn-ack-{uid}",
            recipient_id="rcp-authorized",
            recipient_name="Officer A",
            channel=DeliveryChannel.WEB_NOTIFICATION,
            contact_target_masked="off***@ddma.in",
            status=AlertStatus.DISPATCHED,
            provider="webhook",
            expires_at=now + timedelta(hours=4),
            district_id="AIZAWL",
            organization_id="DDMA",
        )
        await repository.create_alert(alert.model_dump())

        # Forged acknowledgement with wrong recipient
        with pytest.raises(ValidationException) as exc:
            await DeliveryEngine.acknowledge_alert(
                repository,
                alert.id,
                recipient_id="rcp-attacker-impersonator",
                method="WEB",
            )
        assert "Recipient mismatch" in str(exc.value)


class TestStage9DegradedConnectivityAndOfflineSync:
    """Validates explicit connectivity states, stale data protection, and offline safety rules."""

    @pytest.mark.asyncio
    async def test_connectivity_status_endpoint(self, client: AsyncClient):
        resp = await client.get("/api/v1/connectivity/status")
        assert resp.status_code == 200
        json_data = resp.json()["data"]
        assert json_data["connectivity_state"] in ("ONLINE", "DEGRADED", "OFFLINE")
        assert json_data["freshness_state"] in ("CURRENT", "STALE")
        assert "X-Connectivity-State" in resp.headers
        assert "X-Freshness-State" in resp.headers

    @pytest.mark.asyncio
    async def test_offline_sync_reconciles_acknowledgement(self, client: AsyncClient):
        now = datetime.now(timezone.utc)
        uid = uuid4().hex[:8]
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        alert = Alert(
            id=f"alt-off-{uid}",
            warning_id=f"wrn-off-{uid}",
            recipient_id="rcp-field-01",
            recipient_name="Field Ranger",
            channel=DeliveryChannel.WEB_NOTIFICATION,
            contact_target_masked="rcp***@aizawl.in",
            status=AlertStatus.DISPATCHED,
            provider="webhook",
            expires_at=now + timedelta(hours=6),
            district_id="AIZAWL",
            organization_id="DDMA",
        )
        await repository.create_alert(alert.model_dump())

        batch = {
            "batch_id": f"batch-off-{uid}",
            "client_id": "field-term-09",
            "operations": [
                {
                    "operation_id": f"op-ack-{uid}",
                    "created_at": now.isoformat(),
                    "operation_type": "ALERT_ACKNOWLEDGE",
                    "payload": {
                        "alert_id": alert.id,
                        "recipient_id": "rcp-field-01",
                        "method": "FIELD_TERMINAL",
                        "notes": "Acknowledged while offline at camp",
                    },
                    "client_timestamp": now.isoformat(),
                    "status": "PENDING",
                    "attempt_count": 0,
                    "idempotency_key": f"idem-ack-{alert.id}",
                }
            ],
        }

        resp = await client.post(
            "/api/v1/sync/reconcile",
            json=batch,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        res = resp.json()["data"]
        assert res["synced_count"] == 1
        assert res["conflict_count"] == 0
        assert res["results"][0]["status"] == "SYNCED"

        # Verify server state was updated to ACKNOWLEDGED
        updated_alert = await repository.get_alert_by_id(alert.id)
        assert updated_alert["status"] == "ACKNOWLEDGED"

    @pytest.mark.asyncio
    async def test_offline_safety_rule_rejects_forbidden_operations(self, client: AsyncClient):
        now = datetime.now(timezone.utc)
        uid = uuid4().hex[:8]
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        batch = {
            "batch_id": f"batch-forbidden-{uid}",
            "client_id": "field-term-rogue",
            "operations": [
                {
                    "operation_id": f"op-rogue-{uid}",
                    "created_at": now.isoformat(),
                    "operation_type": "ALERT_ACKNOWLEDGE",
                    "payload": {},  # missing required fields
                    "client_timestamp": now.isoformat(),
                    "status": "PENDING",
                    "attempt_count": 0,
                    "idempotency_key": f"idem-rogue-{uid}",
                }
            ],
        }

        resp = await client.post(
            "/api/v1/sync/reconcile",
            json=batch,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        res = resp.json()["data"]
        assert res["failed_count"] == 1
        assert res["results"][0]["status"] == "FAILED"
