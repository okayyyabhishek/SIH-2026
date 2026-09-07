"""
Sentinel NER — Stage 8 Security, RBAC, Tenancy & BOLA/IDOR Integration Tests
Proves server-side enforcement of authentication, authorization, role capabilities,
district jurisdiction isolation, mass assignment defense, and citizen reporter restrictions.
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


class TestStage8RBACAndIDOR:
    @pytest.mark.asyncio
    async def test_unauthenticated_requests_blocked(self, client: AsyncClient):
        """Verify unauthenticated requests to Stage 8 operational endpoints return 401 Unauthorized."""
        res_actions = await client.get("/api/v1/actions")
        assert res_actions.status_code == 401

        res_warnings = await client.get("/api/v1/warnings")
        assert res_warnings.status_code == 401

        res_ledger = await client.get("/api/v1/warning-ledger")
        assert res_ledger.status_code == 401

        res_playbooks = await client.get("/api/v1/playbooks")
        assert res_playbooks.status_code == 401

    @pytest.mark.asyncio
    async def test_citizen_reporter_operational_controls_forbidden(self, client: AsyncClient):
        """Verify Citizen Reporter role has ZERO operational control privileges (403 Forbidden)."""
        token = await get_token_for("citizen@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        # Cannot list actions
        res_act = await client.get("/api/v1/actions", headers=headers)
        assert res_act.status_code == 403

        # Cannot create action recommendation
        res_create_act = await client.post(
            "/api/v1/actions",
            headers=headers,
            json={
                "title": "Citizen Action Attempt",
                "action_type": "FIELD_INSPECTION",
                "priority": "ROUTINE",
                "district_id": "dst-aizawl",
                "target_entity_type": "ROAD",
                "target_entity_id": "road-nh54",
                "recommended_agency_id": "PWD",
                "recommendation_rationale": "Testing unauthorized action creation.",
                "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
            },
        )
        assert res_create_act.status_code == 403

        # Cannot create or list warnings
        res_wrn = await client.get("/api/v1/warnings", headers=headers)
        assert res_wrn.status_code == 403

        # Cannot read warning ledger
        res_ledger = await client.get("/api/v1/warning-ledger", headers=headers)
        assert res_ledger.status_code == 403

    @pytest.mark.asyncio
    async def test_district_jurisdiction_isolation_bola_idor(self, client: AsyncClient):
        """
        Enforce BOLA/IDOR defense:
        DDMA Aizawl cannot inspect or operate on Kolasib resources.
        """
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Action summary for another district -> 403
        res_summary = await client.get("/api/v1/actions/summary/dst-kolasib", headers=headers)
        assert res_summary.status_code == 403
        assert "Jurisdiction violation" in res_summary.json()["error"]["message"]

        # 2. Creating action in another district -> 403
        now = datetime.now(timezone.utc)
        res_create_other = await client.post(
            "/api/v1/actions",
            headers=headers,
            json={
                "title": "Unauthorized Kolasib Action",
                "action_type": "FIELD_INSPECTION",
                "priority": "URGENT",
                "district_id": "dst-kolasib",
                "target_entity_type": "ROAD",
                "target_entity_id": "road-nh54-kolasib",
                "recommended_agency_id": "PWD",
                "recommendation_rationale": "Cross-district breach attempt.",
                "expires_at": (now + timedelta(hours=24)).isoformat(),
            },
        )
        assert res_create_other.status_code == 403
        assert "cannot inspect or operate on resources in district 'dst-kolasib'" in res_create_other.json()["error"]["message"]

        # 3. Warning summary for another district -> 403
        res_wrn_summary = await client.get("/api/v1/warnings/summary/dst-kolasib", headers=headers)
        assert res_wrn_summary.status_code == 403

        # 4. Creating warning in another district -> 403
        res_wrn_other = await client.post(
            "/api/v1/warnings",
            headers=headers,
            json={
                "warning_type": "ROAD_HAZARD_ADVISORY",
                "headline": "Road Hazard Advisory for Kolasib",
                "body": "Cross-district advisory watch test.",
                "district_id": "dst-kolasib",
                "affected_entity_type": "ROAD",
                "affected_entity_id": "road-nh54-kolasib",
                "issuing_authority_id": "DDMA-KOLASIB",
                "expires_at": (now + timedelta(hours=24)).isoformat(),
            },
        )
        assert res_wrn_other.status_code == 403

    @pytest.mark.asyncio
    async def test_mass_assignment_defense_privileged_fields_controlled_by_server(self, client: AsyncClient):
        """
        Verify Mass Assignment Defense:
        Client cannot forge authorizer_id, authorization_status, status, or ledger hashes.
        Server derives and owns all privileged state fields.
        """
        token = await get_token_for("ddma.aizawl@sentinel.ner.internal")
        headers = {"Authorization": f"Bearer {token}"}

        now = datetime.now(timezone.utc)
        malicious_payload = {
            "title": "Action with Forged Privileged Fields",
            "action_type": "ROAD_ASSESSMENT",
            "priority": "URGENT",
            "district_id": "dst-aizawl",
            "target_entity_type": "ROAD",
            "target_entity_id": "road-nh54-aizawl",
            "recommended_agency_id": "PWD",
            "recommendation_rationale": "Testing server-side state enforcement.",
            "expires_at": (now + timedelta(hours=24)).isoformat(),
            # Attempted mass-assignment attacks:
            "status": "APPROVED",
            "authorized_by": "usr-attacker",
            "authorization": {
                "decision": "APPROVE",
                "authorizer_user_id": "usr-attacker",
            },
            "created_by": "root",
        }

        res = await client.post("/api/v1/actions", headers=headers, json=malicious_payload)
        assert res.status_code == 201
        data = res.json()["data"]

        # Crucial assertions: privileged fields were NOT accepted from client payload
        assert data["status"] == "RECOMMENDED"  # NOT "APPROVED"
        assert data["authorization"] is None    # NOT forged sub-document
        assert data["created_by"] != "root"     # Derived from authenticated token
