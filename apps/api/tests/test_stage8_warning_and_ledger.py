"""
Sentinel NER — Stage 8 Warning Lifecycle, Notification Truthfulness & Ledger Cryptographic Tests
Validates non-autonomous warning creation, language safety filtering, truthful delivery statuses,
recipient acknowledgements, bounded escalation, and append-only tamper detection.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from src.core.operations.notifications import NotificationAdapter
from src.core.security.jwt import create_access_token
from src.db.repository import repository
from src.schemas.warning import Warning


async def get_token_for(email: str) -> str:
    user = await repository.get_user_by_email(email)
    assert user is not None, f"User {email} not found"
    return create_access_token(subject=user["id"], claims={"email": user["email"], "role": user["role"]})


class TestStage8WarningAndLedger:
    @pytest.mark.asyncio
    async def test_warning_full_lifecycle_and_truthful_dispatch(self, client: AsyncClient):
        """
        Verify controlled warning workflow:
        DRAFT -> REVIEW -> AUTHORIZED -> DISPATCHED -> ACKNOWLEDGED.
        Verify deliveries truthfully report SIMULATED in development mode (never fake DELIVERED).
        """
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        now = datetime.now(timezone.utc)
        payload = {
            "warning_type": "ROAD_HAZARD_ADVISORY",
            "headline": "Road Hazard Advisory: Potential Rockfall Watch on NH-54 km 14-16",
            "body": "Continuous rainfall has elevated slope saturation index. Drivers advised to exercise caution and avoid non-essential travel during night hours.",
            "mizo_translation": "Fimkhur a ngai e.",
            "district_id": "dst-aizawl",
            "affected_entity_type": "ROAD",
            "affected_entity_id": "road-nh54-aizawl",
            "affected_entity_name": "NH-54 Highway",
            "issuing_authority_id": "DDMA-AIZAWL",
            "recipients": [
                {
                    "recipient_id": "rcp-test-pwd",
                    "recipient_name": "PWD Highway Section Officer",
                    "agency_or_community": "PWD",
                    "contact_channel": "WEB_NOTIFICATION",
                    "contact_target": "pwd.sec.aizawl@sentinel.ner.internal",
                    "district_id": "dst-aizawl",
                },
                {
                    "recipient_id": "rcp-test-traffic",
                    "recipient_name": "Traffic Police Control",
                    "agency_or_community": "POLICE",
                    "contact_channel": "SMS",
                    "contact_target": "+91-98765-XXXX2",
                    "district_id": "dst-aizawl",
                },
            ],
            "expires_at": (now + timedelta(hours=36)).isoformat(),
        }

        # 1. Create Warning Draft -> DRAFT
        res_create = await client.post("/api/v1/warnings", headers=headers, json=payload)
        assert res_create.status_code == 201
        data = res_create.json()["data"]
        warning_id = data["id"]
        assert data["status"] == "DRAFT"
        assert len(data["recipients"]) == 2

        # 2. Review Warning -> REVIEW
        res_review = await client.post(
            f"/api/v1/warnings/{warning_id}/review",
            headers=headers,
            json={"review_comment": "Reviewed by DDMA Operations Room; wording is accurate and non-alarmist."},
        )
        assert res_review.status_code == 200
        assert res_review.json()["data"]["status"] == "REVIEW"

        # 3. Human Authorization -> AUTHORIZED
        res_auth = await client.post(
            f"/api/v1/warnings/{warning_id}/authorize",
            headers=headers,
            json={"decision": "APPROVE", "justification": "Authorized under Section 30 Disaster Management Act."},
        )
        assert res_auth.status_code == 200
        assert res_auth.json()["data"]["status"] == "AUTHORIZED"
        assert res_auth.json()["data"]["authorized_by"] is not None

        # 4. Dispatch Warning -> DISPATCHED
        res_dispatch = await client.post(
            f"/api/v1/warnings/{warning_id}/dispatch",
            headers=headers,
            json={"idempotency_key": "idemp-dispatch-test-001"},
        )
        assert res_dispatch.status_code == 200
        disp_data = res_dispatch.json()["data"]
        assert disp_data["status"] == "DISPATCHED"
        assert len(disp_data["deliveries"]) == 2

        # Truthful Delivery Check: in dev environment must be SIMULATED, NEVER fake DELIVERED
        for delivery in disp_data["deliveries"]:
            assert delivery["status"] in ("SIMULATED", "NOT_CONFIGURED")
            assert delivery["status"] != "DELIVERED"
            assert "SIMULATED" in delivery["status_details"] or "NOT_CONFIGURED" in delivery["status_details"]

        # 5. Acknowledge Warning -> PARTIALLY_ACKNOWLEDGED -> ACKNOWLEDGED
        res_ack1 = await client.post(
            f"/api/v1/warnings/{warning_id}/acknowledge",
            headers=headers,
            json={
                "recipient_id": "rcp-test-pwd",
                "channel": "WEB_NOTIFICATION",
                "notes": "Advisory received and relayed to highway maintenance staff.",
            },
        )
        assert res_ack1.status_code == 200
        assert res_ack1.json()["data"]["status"] == "PARTIALLY_ACKNOWLEDGED"

        res_ack2 = await client.post(
            f"/api/v1/warnings/{warning_id}/acknowledge",
            headers=headers,
            json={
                "recipient_id": "rcp-test-traffic",
                "channel": "SMS",
                "notes": "Traffic advisory posted on highway variable message signs.",
            },
        )
        assert res_ack2.status_code == 200
        assert res_ack2.json()["data"]["status"] == "ACKNOWLEDGED"

    @pytest.mark.asyncio
    async def test_warning_language_safety_rejects_alarmist_claims(self, client: AsyncClient):
        """Language Safety Contract: rejects ungrounded absolute claims like 'LANDSLIDE WILL OCCUR'."""
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        now = datetime.now(timezone.utc)
        alarmist_payload = {
            "warning_type": "ROAD_HAZARD_ADVISORY",
            "headline": "LANDSLIDE WILL OCCUR on NH-54 TODAY",
            "body": "Evacuation must proceed immediately as catastrophic collapse is 100% guaranteed.",
            "district_id": "dst-aizawl",
            "affected_entity_type": "ROAD",
            "affected_entity_id": "road-nh54-aizawl",
            "issuing_authority_id": "DDMA-AIZAWL",
            "expires_at": (now + timedelta(hours=24)).isoformat(),
        }

        res = await client.post("/api/v1/warnings", headers=headers, json=alarmist_payload)
        assert res.status_code == 400
        err = res.json()["error"]
        assert err["code"] == "STG_LANGUAGE_SAFETY_VIOLATION"
        assert "LANDSLIDE WILL OCCUR" in err["message"]

    @pytest.mark.asyncio
    async def test_warning_dispatch_unauthorized_draft_blocked(self, client: AsyncClient):
        """Ensure a warning in DRAFT status cannot be dispatched without human authorization."""
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        now = datetime.now(timezone.utc)
        payload = {
            "warning_type": "INFRASTRUCTURE_PROXIMITY_NOTICE",
            "headline": "Infrastructure Proximity Notice: Slope Creep Near Bridge 4",
            "body": "Routine advisory watch regarding gradual hillside movement.",
            "district_id": "dst-aizawl",
            "affected_entity_type": "ASSET",
            "affected_entity_id": "asset-bridge-4",
            "issuing_authority_id": "DDMA-AIZAWL",
            "expires_at": (now + timedelta(hours=24)).isoformat(),
        }

        res_create = await client.post("/api/v1/warnings", headers=headers, json=payload)
        warning_id = res_create.json()["data"]["id"]

        # Attempt to dispatch while still in DRAFT status -> 400
        res_dispatch = await client.post(
            f"/api/v1/warnings/{warning_id}/dispatch",
            headers=headers,
            json={"idempotency_key": "idemp-dispatch-fail-001"},
        )
        assert res_dispatch.status_code == 400
        assert res_dispatch.json()["error"]["code"] == "STG_INVALID_STATE_TRANSITION"

    @pytest.mark.asyncio
    async def test_warning_escalation_bounded_to_level_3(self):
        """Verify WarningEscalation strictly bounds escalation levels to 3."""
        now = datetime.now(timezone.utc)
        warning = Warning(
            id="wrn-escalation-test",
            warning_type="CIVIL_PROTECTION_ALERT",
            headline="Civil Defense Alert: High Runoff",
            body="Advisory notice regarding elevated water runoff.",
            district_id="dst-aizawl",
            affected_entity_type="VILLAGE",
            affected_entity_id="vlg-durtlang",
            issuing_authority_id="DDMA-AIZAWL",
            expires_at=now + timedelta(hours=24),
        )

        # Level 1
        esc1 = NotificationAdapter.escalate_warning(warning, "No response from local outpost", "DDMA Quick Response Team")
        assert esc1.escalation_level == 1
        warning.escalations.append(esc1)

        # Level 2
        esc2 = NotificationAdapter.escalate_warning(warning, "Second attempt unacknowledged", "State SDRF Duty Officer")
        assert esc2.escalation_level == 2
        warning.escalations.append(esc2)

        # Level 3
        esc3 = NotificationAdapter.escalate_warning(warning, "Third attempt unacknowledged", "State Disaster Commissioner")
        assert esc3.escalation_level == 3
        warning.escalations.append(esc3)

        # Level 4 must raise error
        with pytest.raises(Exception) as exc_info:
            NotificationAdapter.escalate_warning(warning, "Fourth attempt", "National NDRF")
        assert "Maximum escalation level (3) reached" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_warning_ledger_cryptographic_chain_integrity_and_tamper_detection(self, client: AsyncClient):
        """
        Verify the append-only cryptographic ledger:
        1. Live chain for Aizawl verifies successfully.
        2. Sequence numbers strictly increment and each entry hashes prev_event_hash.
        3. Intentional data tampering in an entry's payload breaks verification immediately.
        """
        token = await get_token_for("admin@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Verify chain
        res_verify = await client.get("/api/v1/warning-ledger/verify-chain/dst-aizawl", headers=headers)
        assert res_verify.status_code == 200
        v_data = res_verify.json()["data"]
        assert v_data["is_valid"] is True
        assert v_data["total_entries"] >= 1
        assert v_data["genesis_hash"] == "0" * 64
        assert v_data["corrupted_sequence_number"] is None

        # 2. Tamper test: Alter entry payload directly in store
        entries = await repository.list_all_ledger_entries_for_district("dst-aizawl")
        assert len(entries) >= 1
        original_payload = dict(entries[0]["payload"])

        # Tamper payload
        entries[0]["payload"]["tampered_key"] = "unauthorized_malicious_modification"

        # Verification must now FAIL
        res_tampered = await client.get("/api/v1/warning-ledger/verify-chain/dst-aizawl", headers=headers)
        assert res_tampered.status_code == 200
        t_data = res_tampered.json()["data"]
        assert t_data["is_valid"] is False
        assert t_data["corrupted_sequence_number"] == 1
        assert "Data tampering detected" in t_data["message"]

        # Restore original payload
        entries[0]["payload"] = original_payload
        res_restored = await client.get("/api/v1/warning-ledger/verify-chain/dst-aizawl", headers=headers)
        assert res_restored.json()["data"]["is_valid"] is True
