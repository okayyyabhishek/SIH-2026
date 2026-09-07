"""
Sentinel NER — Automated Pre-Stage-9 Hardening Verification Script
Executes automated verification of the 5 blockers across 10 verification areas:
1. Persistent token revocation (process restart & multi-worker persistence)
2. 11-role frontend/backend parity
3. Notification provider configuration
4. Production rejection of SIMULATED notifications
5. Notification lifecycle truthfulness (ACCEPTED_BY_PROVIDER vs DELIVERED)
6. MongoDB readiness
7. S3 readiness (safe lightweight probe, no heavy satellite download)
8. Production configuration fail-fast
9. Synthetic infrastructure rejection
10. Regression integrity
"""

import asyncio
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple
from unittest.mock import MagicMock

# Add apps/api to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from src.api.v1.health import check_notification_readiness, check_s3_readiness
from src.core.config import Settings, settings
from src.core.errors import UnauthorizedException, ValidationException
from src.core.operations.notifications import NotificationAdapter
from src.core.security.dependencies import get_current_user
from src.core.security.jwt import create_access_token, decode_and_validate_token
from src.core.security.rbac import Role
from src.db.mongodb import check_mongo_health
from src.db.repository import repository
from src.schemas.warning import (
    DeliveryChannel,
    DeliveryStatus,
    Warning,
    WarningRecipient,
    WarningType,
)

RESULTS: Dict[str, Tuple[str, str, str]] = {}


def record_result(check_num: int, name: str, category: str, passed: bool, details: str):
    status_str = "PASS" if passed else "FAIL"
    RESULTS[f"Check {check_num}: {name}"] = (category, status_str, details)
    tag = f"[{category}]"
    print(f"{tag:<14} Check {check_num:02d}: {name:<45} -> {status_str} ({details})")


async def verify_1_persistent_token_revocation():
    """Check 1: Persistent token revocation across simulated process restart."""
    try:
        user = await repository.get_user_by_email("ddma.aizawl@sentinel.ner.internal")
        if not user:
            record_result(1, "Persistent Token Revocation", "INTEGRATION", False, "Seed user not found")
            return

        token = create_access_token(subject=user["id"], claims={"email": user["email"], "role": user["role"]})
        payload = decode_and_validate_token(token, expected_type="access")
        jti = payload["jti"]

        # 1. Initially valid
        assert not await repository.is_token_revoked(jti)

        # 2. Revoke token
        await repository.revoke_token(jti=jti, user_id=user["id"], reason="pre_stage9_verification")
        assert await repository.is_token_revoked(jti)

        # 3. Simulate process restart / new worker by clearing in-memory cache
        async with repository._lock:
            repository._revoked_tokens.pop(jti, None)

        # 4. Check persistent lookup
        is_revoked = await repository.is_token_revoked(jti)
        if not is_revoked:
            record_result(1, "Persistent Token Revocation", "INTEGRATION", False, "Failed to persist revocation")
            return

        # 5. Check get_current_user rejects token
        from fastapi.security import HTTPAuthorizationCredentials
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        req_mock = MagicMock()
        try:
            await get_current_user(request=req_mock, credentials=creds)
            record_result(1, "Persistent Token Revocation", "INTEGRATION", False, "get_current_user did not reject revoked token")
        except UnauthorizedException as exc:
            assert "revoked" in exc.message.lower()
            record_result(1, "Persistent Token Revocation", "INTEGRATION", True, "Persists across process restart & rejects auth")
    except Exception as exc:
        record_result(1, "Persistent Token Revocation", "INTEGRATION", False, f"Exception: {str(exc)}")


def verify_2_role_parity():
    """Check 2: 11-role frontend/backend parity."""
    try:
        backend_roles = {r.value for r in Role}
        assert len(backend_roles) == 11, f"Expected 11 backend roles, found {len(backend_roles)}"

        # Inspect frontend role union in RequireRolePlaceholder.tsx
        web_file = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                "..",
                "apps",
                "web",
                "src",
                "components",
                "auth",
                "RequireRolePlaceholder.tsx",
            )
        )
        if not os.path.exists(web_file):
            record_result(2, "11-Role Frontend/Backend Parity", "UNIT", False, "Frontend role file not found")
            return

        with open(web_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract SentinelRole union strings
        matches = re.findall(r'"([A-Z_]+)"', content)
        frontend_roles = set(matches)

        # Verify INFRASTRUCTURE_AUTHORITY is included
        assert "INFRASTRUCTURE_AUTHORITY" in frontend_roles, "INFRASTRUCTURE_AUTHORITY missing from frontend union"

        # Check full parity
        missing = backend_roles - frontend_roles
        extra = frontend_roles - backend_roles
        if missing or extra:
            record_result(2, "11-Role Frontend/Backend Parity", "UNIT", False, f"Discrepancy: missing={missing}, extra={extra}")
        else:
            record_result(2, "11-Role Frontend/Backend Parity", "UNIT", True, "All 11 roles match exactly with 0 discrepancy")
    except Exception as exc:
        record_result(2, "11-Role Frontend/Backend Parity", "UNIT", False, f"Exception: {str(exc)}")


def verify_3_notification_provider_config():
    """Check 3: Notification provider configuration options."""
    try:
        fields = Settings.model_fields
        assert "NOTIFICATION_PROVIDER" in fields, "NOTIFICATION_PROVIDER field missing from Settings"
        assert "AWS_SNS_REGION" in fields, "AWS_SNS_REGION field missing from Settings"
        assert "AWS_SNS_TOPIC_ARN" in fields, "AWS_SNS_TOPIC_ARN field missing from Settings"
        assert "NOTIFICATION_WEBHOOK_URL" in fields, "NOTIFICATION_WEBHOOK_URL field missing from Settings"
        record_result(3, "Notification Provider Configuration", "UNIT", True, "Provider, SNS region, SNS topic, Webhook URL defined")
    except Exception as exc:
        record_result(3, "Notification Provider Configuration", "UNIT", False, f"Exception: {str(exc)}")


def verify_4_production_rejection_of_simulated():
    """Check 4: Production rejection of SIMULATED notifications."""
    try:
        # Settings constraint rejection
        rejected_in_settings = False
        try:
            Settings(
                APP_ENV="production",
                SECRET_KEY="x" * 64,
                MONGODB_URI="mongodb+srv://admin:pass@cluster.mongodb.net/prod",
                MONGODB_DB_NAME="sentinel_prod",
                PERSISTENCE_BACKEND="mongodb",
                STORAGE_BACKEND="s3",
                AWS_S3_BUCKET="sentinel-prod-bucket",
                SATELLITE_MODE="production",
                NOTIFICATION_PROVIDER="simulated",
            )
        except ValueError as exc:
            if "strictly forbidden" in str(exc):
                rejected_in_settings = True

        # Adapter rejection
        rejected_in_adapter = False
        now = datetime.now(timezone.utc)
        warn = Warning(
            warning_type=WarningType.ROAD_HAZARD_ADVISORY,
            headline="Verification Warning for Hardening Check",
            body="Safety verification payload for notification validation.",
            district_id="dst-aizawl",
            affected_entity_type="ROAD",
            affected_entity_id="road-01",
            issuing_authority_id="DDMA",
            expires_at=now + timedelta(hours=1),
            recipients=[
                WarningRecipient(
                    recipient_id="r1",
                    recipient_name="Officer",
                    agency_or_community="DDMA",
                    contact_channel=DeliveryChannel.SMS,
                    contact_target="+919999999999",
                    district_id="dst-aizawl",
                )
            ],
        )

        orig_env = settings.APP_ENV
        orig_prov = settings.NOTIFICATION_PROVIDER
        try:
            settings.APP_ENV = "production"
            settings.NOTIFICATION_PROVIDER = "simulated"
            try:
                NotificationAdapter.dispatch_warning(warn)
            except ValidationException as exc:
                if "strictly forbidden" in str(exc):
                    rejected_in_adapter = True
        finally:
            settings.APP_ENV = orig_env
            settings.NOTIFICATION_PROVIDER = orig_prov

        passed = rejected_in_settings and rejected_in_adapter
        record_result(
            4,
            "Production Rejection of SIMULATED",
            "UNIT",
            passed,
            "Rejected in config model_validator and runtime NotificationAdapter",
        )
    except Exception as exc:
        record_result(4, "Production Rejection of SIMULATED", "UNIT", False, f"Exception: {str(exc)}")


def verify_5_lifecycle_truthfulness():
    """Check 5: Notification lifecycle truthfulness (ACCEPTED_BY_PROVIDER vs fake DELIVERED)."""
    try:
        now = datetime.now(timezone.utc)
        warn = Warning(
            warning_type=WarningType.ROAD_HAZARD_ADVISORY,
            headline="Truthful Lifecycle Verification Advisory",
            body="Checking that SNS acceptance never reports DELIVERED.",
            district_id="dst-aizawl",
            affected_entity_type="ROAD",
            affected_entity_id="road-01",
            issuing_authority_id="DDMA",
            expires_at=now + timedelta(hours=1),
            recipients=[
                WarningRecipient(
                    recipient_id="r1",
                    recipient_name="Officer",
                    agency_or_community="DDMA",
                    contact_channel=DeliveryChannel.SMS,
                    contact_target="+919999999999",
                    district_id="dst-aizawl",
                )
            ],
        )

        # Mock SNS returning success
        mock_sns = MagicMock()
        mock_sns.publish.return_value = {"MessageId": "msg-truth-check-888"}

        orig_env = settings.APP_ENV
        orig_prov = settings.NOTIFICATION_PROVIDER
        try:
            settings.APP_ENV = "production"
            settings.NOTIFICATION_PROVIDER = "aws_sns"
            deliveries = NotificationAdapter.dispatch_warning(warn, sns_client=mock_sns)
            assert len(deliveries) == 1
            d = deliveries[0]

            assert d.status == DeliveryStatus.ACCEPTED_BY_PROVIDER, f"Expected ACCEPTED_BY_PROVIDER, got {d.status}"
            assert d.status != DeliveryStatus.DELIVERED, "CRITICAL ERROR: Recorded fake DELIVERED state!"
            assert d.delivered_at is None, "delivered_at must remain None upon provider acceptance"
            assert d.provider_message_id == "msg-truth-check-888"

            # Check failure truthfulness
            mock_sns.publish.side_effect = Exception("AWS ServiceUnavailable")
            fail_deliveries = NotificationAdapter.dispatch_warning(warn, sns_client=mock_sns)
            assert fail_deliveries[0].status == DeliveryStatus.FAILED
            assert fail_deliveries[0].delivered_at is None

            record_result(5, "Notification Lifecycle Truthfulness", "UNIT", True, "Records ACCEPTED_BY_PROVIDER; 0 fake DELIVERED")
        finally:
            settings.APP_ENV = orig_env
            settings.NOTIFICATION_PROVIDER = orig_prov
    except Exception as exc:
        record_result(5, "Notification Lifecycle Truthfulness", "UNIT", False, f"Exception: {str(exc)}")


async def verify_6_mongodb_readiness():
    """Check 6: MongoDB readiness probe connectivity."""
    try:
        mongo_ok, latency, msg = await check_mongo_health()
        if mongo_ok:
            record_result(6, "MongoDB Readiness Probe", "LIVE", True, f"Connected to Atlas (latency: {latency:.2f}ms)")
        else:
            record_result(6, "MongoDB Readiness Probe", "LIVE", False, f"Failed: {msg}")
    except Exception as exc:
        record_result(6, "MongoDB Readiness Probe", "LIVE", False, f"Exception: {str(exc)}")


def verify_7_s3_readiness():
    """Check 7: S3 readiness probe (lightweight head_bucket, zero binary download)."""
    try:
        s3_ok, s3_msg = check_s3_readiness()
        # In current environment:
        if settings.STORAGE_BACKEND == "s3" or settings.AWS_S3_BUCKET:
            category = "LIVE" if s3_ok else "INTEGRATION"
        else:
            category = "UNIT"
        record_result(7, "S3 Readiness Probe", category, s3_ok, f"{s3_msg} (zero payload transfer)")
    except Exception as exc:
        record_result(7, "S3 Readiness Probe", "INTEGRATION", False, f"Exception: {str(exc)}")


def verify_8_production_fail_fast():
    """Check 8: Production configuration fail-fast validation."""
    try:
        # Test in-memory rejection
        try:
            Settings(
                APP_ENV="production",
                SECRET_KEY="x" * 64,
                MONGODB_URI="mongodb+srv://admin:pass@cluster.mongodb.net/prod",
                MONGODB_DB_NAME="prod",
                PERSISTENCE_BACKEND="in_memory",
                STORAGE_BACKEND="s3",
                AWS_S3_BUCKET="bucket",
                SATELLITE_MODE="production",
                NOTIFICATION_PROVIDER="aws_sns",
            )
            assert False, "Should have rejected in_memory in production"
        except ValueError:
            pass

        # Test local storage rejection
        try:
            Settings(
                APP_ENV="production",
                SECRET_KEY="x" * 64,
                MONGODB_URI="mongodb+srv://admin:pass@cluster.mongodb.net/prod",
                MONGODB_DB_NAME="prod",
                PERSISTENCE_BACKEND="mongodb",
                STORAGE_BACKEND="local",
                AWS_S3_BUCKET="bucket",
                SATELLITE_MODE="production",
                NOTIFICATION_PROVIDER="aws_sns",
            )
            assert False, "Should have rejected local storage in production"
        except ValueError:
            pass

        # Test simulated notification rejection
        try:
            Settings(
                APP_ENV="production",
                SECRET_KEY="x" * 64,
                MONGODB_URI="mongodb+srv://admin:pass@cluster.mongodb.net/prod",
                MONGODB_DB_NAME="prod",
                PERSISTENCE_BACKEND="mongodb",
                STORAGE_BACKEND="s3",
                AWS_S3_BUCKET="bucket",
                SATELLITE_MODE="production",
                NOTIFICATION_PROVIDER="simulated",
            )
            assert False, "Should have rejected simulated notification in production"
        except ValueError:
            pass

        record_result(8, "Production Configuration Fail-Fast", "UNIT", True, "Rejects in_memory, local storage, and simulated notification")
    except Exception as exc:
        record_result(8, "Production Configuration Fail-Fast", "UNIT", False, f"Exception: {str(exc)}")


def verify_9_synthetic_infrastructure_rejection():
    """Check 9: Synthetic infrastructure rejection in production."""
    try:
        from src.core.satellite.provider import SyntheticSatelliteProvider

        # In production mode (SATELLITE_MODE=production), SyntheticSatelliteProvider instantiation must raise ValidationException
        rejected_synthetic_provider = False
        try:
            SyntheticSatelliteProvider()
        except ValidationException as exc:
            if "strictly forbidden in production mode" in str(exc):
                rejected_synthetic_provider = True

        # NotificationAdapter rejects simulated in prod
        orig_env = settings.APP_ENV
        orig_prov = settings.NOTIFICATION_PROVIDER
        try:
            settings.APP_ENV = "production"
            settings.NOTIFICATION_PROVIDER = "simulated"
            rejected_simulated_notify = False
            try:
                NotificationAdapter.dispatch_warning(MagicMock(recipients=[]))
            except ValidationException:
                rejected_simulated_notify = True
        finally:
            settings.APP_ENV = orig_env
            settings.NOTIFICATION_PROVIDER = orig_prov

        passed = rejected_synthetic_provider and rejected_simulated_notify
        record_result(9, "Synthetic Infrastructure Rejection", "UNIT", passed, "Synthetic provider & simulated notifications forbidden in prod")
    except Exception as exc:
        record_result(9, "Synthetic Infrastructure Rejection", "UNIT", False, f"Exception: {str(exc)}")


async def verify_10_regression_integrity():
    """Check 10: Regression integrity of authentication and ledger."""
    try:
        from src.core.operations.ledger import WarningLedgerService
        from src.schemas.warning_ledger import LedgerEventType

        user = await repository.get_user_by_email("ddma.aizawl@sentinel.ner.internal")
        token = create_access_token(subject=user["id"], claims={"email": user["email"], "role": user["role"]})
        assert len(token) > 20

        # Ledger recording verification
        event = await WarningLedgerService.record_event(
            repo=repository,
            district_id="dst-aizawl",
            event_type=LedgerEventType.WARNING_DISPATCHED,
            actor_user_id=user["id"],
            actor_role=user["role"],
            payload={"test": "pre_stage9_regression_check"},
            warning_id="wrn-test-reg-01",
        )
        assert event.event_hash is not None
        assert len(event.event_hash) == 64

        record_result(10, "Regression Integrity", "INTEGRATION", True, "Auth token generation & cryptographic ledger intact")
    except Exception as exc:
        record_result(10, "Regression Integrity", "INTEGRATION", False, f"Exception: {str(exc)}")


async def main():
    print("=" * 80)
    print("SENTINEL NER — PRE-STAGE-9 HARDENING AUTOMATED VERIFICATION")
    print("=" * 80)

    await verify_1_persistent_token_revocation()
    verify_2_role_parity()
    verify_3_notification_provider_config()
    verify_4_production_rejection_of_simulated()
    verify_5_lifecycle_truthfulness()
    await verify_6_mongodb_readiness()
    verify_7_s3_readiness()
    verify_8_production_fail_fast()
    verify_9_synthetic_infrastructure_rejection()
    await verify_10_regression_integrity()

    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    total = len(RESULTS)
    passed = sum(1 for _, (_, status, _) in RESULTS.items() if status == "PASS")
    failed = total - passed

    for check, (cat, status, details) in RESULTS.items():
        print(f"{status:<6} | {cat:<12} | {check:<45} | {details}")

    print("=" * 80)
    print(f"Total: {total} | Passed: {passed} | Failed: {failed}")
    print("=" * 80)

    if failed > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
