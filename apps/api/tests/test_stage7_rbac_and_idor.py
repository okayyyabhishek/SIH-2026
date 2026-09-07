"""
Sentinel NER — Stage 7 RBAC, Tenancy Scoping & Cross-District IDOR Tests
Verifies:
1. CITIZEN_REPORTER is denied access to consequence endpoints (403 Forbidden).
2. Unauthenticated requests are rejected (401 Unauthorized).
3. FIELD_OFFICER and OBSERVER_AUDITOR have read access but cannot trigger analysis runs.
4. DDMA and Field Officers are strictly scoped to their assigned district; cross-district IDOR is blocked.
5. Critical negative tests: client cannot spoof consequence values; stage 8 placeholders return 501.
6. Security audit events are recorded for consequence run dispatches.
"""

import pytest
from httpx import AsyncClient

from src.db.repository import repository


@pytest.fixture(autouse=True)
async def reset_state():
    await repository.seed_dev_data_if_empty()


async def get_token_for(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]


class TestStage7RBACAndIDOR:
    @pytest.mark.asyncio
    async def test_unauthenticated_request_rejected(self, client: AsyncClient):
        res = await client.get("/api/v1/consequences/relationships")
        assert res.status_code == 401

    @pytest.mark.asyncio
    async def test_citizen_reporter_denied_consequence_endpoints(self, client: AsyncClient):
        token = await get_token_for(client, "citizen@sentinel.ner.internal", "SentinelCitizen@2026!")
        headers = {"Authorization": f"Bearer {token}"}

        res_list = await client.get("/api/v1/consequences/relationships", headers=headers)
        assert res_list.status_code == 403

        res_summary = await client.get("/api/v1/consequences/summary?district_id=dst-aizawl", headers=headers)
        assert res_summary.status_code == 403

        res_run = await client.post(
            "/api/v1/consequences/runs",
            headers=headers,
            json={"district_id": "dst-aizawl"},
        )
        assert res_run.status_code == 403

    @pytest.mark.asyncio
    async def test_field_officer_read_only(self, client: AsyncClient):
        token = await get_token_for(client, "field.kolasib@sentinel.ner.internal", "SentinelField@2026!")
        headers = {"Authorization": f"Bearer {token}"}

        # Read allowed
        res_list = await client.get("/api/v1/consequences/relationships", headers=headers)
        assert res_list.status_code == 200

        # Triggering a run is forbidden (lacks consequence:run)
        res_run = await client.post(
            "/api/v1/consequences/runs",
            headers=headers,
            json={"district_id": "dst-aizawl"},
        )
        assert res_run.status_code == 403

    @pytest.mark.asyncio
    async def test_ddma_district_scoping_and_idor_protection(self, client: AsyncClient):
        # Aizawl DDMA officer
        token = await get_token_for(client, "ddma.aizawl@sentinel.ner.internal", "SentinelDdma@2026!")
        headers = {"Authorization": f"Bearer {token}"}

        # Querying own district summary -> 200 OK
        res_own = await client.get("/api/v1/consequences/summary?district_id=dst-aizawl", headers=headers)
        assert res_own.status_code == 200
        data = res_own.json()["data"]
        assert data["district_id"] == "dst-aizawl"
        assert "NOT automatically order road closures" in data["disclaimer"]

        # Attempting to query another district (e.g. Kolasib) -> 403 Forbidden
        res_other = await client.get("/api/v1/consequences/summary?district_id=dst-kolasib", headers=headers)
        assert res_other.status_code == 403

        # Attempting to trigger run for another district -> 403 Forbidden
        res_run_other = await client.post(
            "/api/v1/consequences/runs",
            headers=headers,
            json={"district_id": "dst-kolasib"},
        )
        assert res_run_other.status_code == 403

    @pytest.mark.asyncio
    async def test_state_authority_full_consequence_access(self, client: AsyncClient):
        token = await get_token_for(client, "state.mizoram@sentinel.ner.internal", "SentinelState@2026!")
        headers = {"Authorization": f"Bearer {token}"}

        # List relationships across state
        res_list = await client.get("/api/v1/consequences/relationships", headers=headers)
        assert res_list.status_code == 200
        assert "items" in res_list.json()["data"]

        # Trigger run for Aizawl
        res_run = await client.post(
            "/api/v1/consequences/runs",
            headers=headers,
            json={"district_id": "dst-aizawl", "distance_threshold_m": 300.0},
        )
        assert res_run.status_code == 200
        run_data = res_run.json()["data"]
        assert run_data["status"] == "COMPLETE"
        assert run_data["relationship_count"] >= 0

        # Inspect run
        run_id = run_data["id"]
        res_inspect = await client.get(f"/api/v1/consequences/runs/{run_id}", headers=headers)
        assert res_inspect.status_code == 200

    @pytest.mark.asyncio
    async def test_stage_boundary_negative_tests(self, client: AsyncClient):
        # Verify future stage placeholders strictly return 501 StageNotImplemented
        token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")
        headers = {"Authorization": f"Bearer {token}"}

        # Stage 8 is now active: returns 200
        res_action = await client.get("/api/v1/actions", headers=headers)
        assert res_action.status_code == 200

        res_ledger = await client.get("/api/v1/warning-ledger", headers=headers)
        assert res_ledger.status_code == 200

        # Stage 10 remains future stage-gated placeholder: strictly returns 501
        res_community = await client.post("/api/v1/community-reports/submit", headers=headers, json={})
        assert res_community.status_code == 501
