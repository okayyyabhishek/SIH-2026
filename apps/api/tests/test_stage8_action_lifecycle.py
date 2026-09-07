"""
Sentinel NER — Stage 8 Action Lifecycle & State Machine Integration Tests
Validates the complete non-autonomous action lifecycle: recommendation, review,
human authorization, execution tracking, ground outcome recording, and transition restrictions.
"""

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from src.core.security.jwt import create_access_token
from src.db.repository import repository


async def get_token_for(email: str) -> str:
    user = await repository.get_user_by_email(email)
    assert user is not None, f"User {email} not found"
    return create_access_token(subject=user["id"], claims={"email": user["email"], "role": user["role"]})


class TestStage8ActionLifecycle:
    @pytest.mark.asyncio
    async def test_action_full_lifecycle_success(self, client: AsyncClient):
        """
        Verify the complete operational action lifecycle:
        RECOMMENDED -> PENDING_REVIEW -> APPROVED -> IN_PROGRESS -> COMPLETED.
        """
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        now = datetime.now(timezone.utc)
        payload = {
            "title": "Road Assessment: NH-54 km 18.2 Culvert",
            "action_type": "ROAD_ASSESSMENT",
            "priority": "URGENT",
            "district_id": "dst-aizawl",
            "target_entity_type": "ROAD",
            "target_entity_id": "road-nh54-aizawl",
            "target_entity_name": "NH-54 (Aizawl-Silchar Highway)",
            "recommended_agency_id": "PWD",
            "recommendation_rationale": "High hazard index with continuous rainfall indicates culvert scour risk.",
            "expires_at": (now + timedelta(hours=48)).isoformat(),
            "idempotency_key": "idemp-lifecycle-act-001",
        }

        # 1. Create Action Recommendation -> RECOMMENDED
        res_create = await client.post("/api/v1/actions", headers=headers, json=payload)
        assert res_create.status_code == 201
        data = res_create.json()["data"]
        action_id = data["id"]
        assert data["status"] == "RECOMMENDED"
        assert data["priority"] == "URGENT"
        assert "NON-AUTONOMOUS CONTROL PRINCIPLE" in data["disclaimer"]

        # 2. Review Action -> PENDING_REVIEW
        res_review = await client.post(
            f"/api/v1/actions/{action_id}/review",
            headers=headers,
            json={"review_notes": "Reviewed slope angle and soil moisture. Recommend highway team visit."},
        )
        assert res_review.status_code == 200
        rev_data = res_review.json()["data"]
        assert rev_data["status"] == "PENDING_REVIEW"
        assert rev_data["reviewed_by"] is not None

        # 3. Human Authorization -> APPROVED
        res_auth = await client.post(
            f"/api/v1/actions/{action_id}/authorize",
            headers=headers,
            json={
                "decision": "APPROVE",
                "justification": "Approved under DDMA Incident Command for immediate structural verification.",
            },
        )
        assert res_auth.status_code == 200
        auth_data = res_auth.json()["data"]
        assert auth_data["status"] == "APPROVED"
        assert auth_data["authorization"]["decision"] == "APPROVE"
        assert auth_data["authorization"]["role"] == "DDMA"

        # 4. Field Execution -> IN_PROGRESS
        res_exec = await client.post(
            f"/api/v1/actions/{action_id}/execute",
            headers=headers,
            json={
                "assigned_agency_id": "PWD",
                "assigned_personnel": ["usr-field-1"],
                "execution_notes": "Highway patrol unit arrived at chainage km 18.2.",
            },
        )
        assert res_exec.status_code == 200
        exec_data = res_exec.json()["data"]
        assert exec_data["status"] == "IN_PROGRESS"
        assert exec_data["execution"]["assigned_agency_id"] == "PWD"

        # 5. Record Ground Outcome -> COMPLETED
        res_outcome = await client.post(
            f"/api/v1/actions/{action_id}/outcome",
            headers=headers,
            json={
                "outcome_type": "HAZARD_CONFIRMED_MITIGATED",
                "ground_observations": "Minor soil displacement on upper embankment; culvert intake cleared of mud.",
                "mitigation_applied": "Installed warning markers and cleared intake basin.",
                "follow_up_recommended": False,
            },
        )
        assert res_outcome.status_code == 200
        comp_data = res_outcome.json()["data"]
        assert comp_data["status"] == "COMPLETED"
        assert comp_data["outcome"]["outcome_type"] == "HAZARD_CONFIRMED_MITIGATED"

    @pytest.mark.asyncio
    async def test_action_rejection_prevents_execution(self, client: AsyncClient):
        """Verify that a rejected action cannot transition into execution."""
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        now = datetime.now(timezone.utc)
        payload = {
            "title": "Assessment for Unaffected Section",
            "action_type": "ROAD_ASSESSMENT",
            "priority": "ROUTINE",
            "district_id": "dst-aizawl",
            "target_entity_type": "ROAD",
            "target_entity_id": "road-nh54-aizawl",
            "recommended_agency_id": "PWD",
            "recommendation_rationale": "Automated trigger on low confidence anomaly.",
            "expires_at": (now + timedelta(hours=24)).isoformat(),
        }

        res_create = await client.post("/api/v1/actions", headers=headers, json=payload)
        action_id = res_create.json()["data"]["id"]

        # Move to review
        await client.post(
            f"/api/v1/actions/{action_id}/review",
            headers=headers,
            json={"review_notes": "Inspected satellite imagery; anomaly is seasonal vegetation change."},
        )

        # Authorize REJECT
        res_auth = await client.post(
            f"/api/v1/actions/{action_id}/authorize",
            headers=headers,
            json={"decision": "REJECT", "justification": "False positive; no physical field inspection required."},
        )
        assert res_auth.status_code == 200
        assert res_auth.json()["data"]["status"] == "REJECTED"

        # Attempt to execute rejected action -> 400 Bad Request
        res_exec = await client.post(
            f"/api/v1/actions/{action_id}/execute",
            headers=headers,
            json={"assigned_agency_id": "PWD"},
        )
        assert res_exec.status_code == 400
        assert res_exec.json()["error"]["code"] == "STG_INVALID_STATE_TRANSITION"

    @pytest.mark.asyncio
    async def test_action_illegal_direct_execution_blocked(self, client: AsyncClient):
        """Ensure an action in RECOMMENDED status cannot jump directly to execution or completion."""
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        now = datetime.now(timezone.utc)
        payload = {
            "title": "Illegal Jump Test Action",
            "action_type": "FIELD_INSPECTION",
            "priority": "ELEVATED",
            "district_id": "dst-aizawl",
            "target_entity_type": "ASSET",
            "target_entity_id": "asset-power-substation",
            "recommended_agency_id": "DDMA",
            "recommendation_rationale": "Testing state machine compliance.",
            "expires_at": (now + timedelta(hours=24)).isoformat(),
        }

        res_create = await client.post("/api/v1/actions", headers=headers, json=payload)
        action_id = res_create.json()["data"]["id"]

        # Attempt direct execution while in RECOMMENDED status -> 400
        res_exec = await client.post(
            f"/api/v1/actions/{action_id}/execute",
            headers=headers,
            json={"assigned_agency_id": "DDMA"},
        )
        assert res_exec.status_code == 400
        assert res_exec.json()["error"]["code"] == "STG_INVALID_STATE_TRANSITION"

    @pytest.mark.asyncio
    async def test_action_idempotency_prevents_duplicate(self, client: AsyncClient):
        """Verify client idempotency key prevents duplicate action creation."""
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        now = datetime.now(timezone.utc)
        payload = {
            "title": "Idempotent Action Test",
            "action_type": "ROAD_ASSESSMENT",
            "priority": "URGENT",
            "district_id": "dst-aizawl",
            "target_entity_type": "ROAD",
            "target_entity_id": "road-nh54-aizawl",
            "recommended_agency_id": "PWD",
            "recommendation_rationale": "Testing idempotency deduplication.",
            "expires_at": (now + timedelta(hours=24)).isoformat(),
            "idempotency_key": "idemp-key-unique-test-999",
        }

        res1 = await client.post("/api/v1/actions", headers=headers, json=payload)
        assert res1.status_code == 201
        id1 = res1.json()["data"]["id"]

        # Submit same payload with same idempotency key
        res2 = await client.post("/api/v1/actions", headers=headers, json=payload)
        assert res2.status_code == 201 or res2.status_code == 200
        id2 = res2.json()["data"]["id"]
        assert id1 == id2
