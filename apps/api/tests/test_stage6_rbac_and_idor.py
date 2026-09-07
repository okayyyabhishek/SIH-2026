"""
Sentinel NER — Stage 6 RBAC, Tenancy Scoping & Cross-District IDOR Tests
Verifies:
1. CITIZEN_REPORTER has zero access to satellite and InSAR endpoints (403 Forbidden).
2. OBSERVER_AUDITOR has read-only capability and is blocked from submitting processing runs.
3. DDMA and Field Officers are scoped to their assigned district; cross-district IDOR is blocked.
4. Security audit events are recorded for processing dispatches.
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


class TestStage6RBACAndIDOR:
    @pytest.mark.asyncio
    async def test_citizen_reporter_denied_satellite_endpoints(self, client: AsyncClient):
        token = await get_token_for(client, "citizen@sentinel.ner.internal", "SentinelCitizen@2026!")
        headers = {"Authorization": f"Bearer {token}"}

        res_sat = await client.get("/api/v1/satellite/observations", headers=headers)
        assert res_sat.status_code == 403

        res_insar = await client.get("/api/v1/insar/observations", headers=headers)
        assert res_insar.status_code == 403

        res_conn = await client.get("/api/v1/satellite/connectors", headers=headers)
        assert res_conn.status_code == 403

        res_run = await client.post(
            "/api/v1/satellite/processing-runs",
            headers=headers,
            json={"pipeline_type": "INSAR_INTERFEROGRAM", "primary_input_id": "sat-obs-1"},
        )
        assert res_run.status_code == 403

    @pytest.mark.asyncio
    async def test_observer_auditor_read_only(self, client: AsyncClient):
        token = await get_token_for(client, "auditor.ne@sentinel.ner.internal", "SentinelAuditor@2026!")
        headers = {"Authorization": f"Bearer {token}"}

        # Read allowed
        res_sat = await client.get("/api/v1/satellite/observations", headers=headers)
        assert res_sat.status_code == 200

        res_insar = await client.get("/api/v1/insar/observations", headers=headers)
        assert res_insar.status_code == 200

        # Write / Processing rejected
        res_run = await client.post(
            "/api/v1/satellite/processing-runs",
            headers=headers,
            json={"pipeline_type": "INSAR_INTERFEROGRAM", "primary_input_id": "sat-obs-1"},
        )
        assert res_run.status_code == 403

    @pytest.mark.asyncio
    async def test_ddma_cross_district_idor_isolation(self, client: AsyncClient):
        # Aizawl DDMA officer (assigned district: dst-aizawl)
        token = await get_token_for(client, "ddma.aizawl@sentinel.ner.internal", "SentinelDdma@2026!")
        headers = {"Authorization": f"Bearer {token}"}

        # Requesting satellite evidence for a different district (Kolasib)
        res = await client.get("/api/v1/satellite/observations?district_id=dst-kolasib", headers=headers)
        assert res.status_code == 403
        assert "Actor is not authorized" in res.text

        # Requesting InSAR evidence for Kolasib
        res_insar = await client.get("/api/v1/insar/observations?district_id=dst-kolasib", headers=headers)
        assert res_insar.status_code == 403

    @pytest.mark.asyncio
    async def test_processing_run_dispatch_records_security_audit_event(self, client: AsyncClient):
        token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")
        headers = {"Authorization": f"Bearer {token}"}

        # Query existing observation from fixtures and sort chronologically
        obs_res = await client.get("/api/v1/satellite/observations", headers=headers)
        assert obs_res.status_code == 200
        items = obs_res.json()["data"]["items"]
        slc_items = [it for it in items if it.get("product_type") == "SLC"]
        assert len(slc_items) >= 2
        sorted_items = sorted(slc_items, key=lambda x: x["acquisition_time"])
        obs1 = sorted_items[0]["id"]
        obs2 = sorted_items[1]["id"]

        run_res = await client.post(
            "/api/v1/satellite/processing-runs",
            headers=headers,
            json={
                "pipeline_type": "INSAR_INTERFEROGRAM",
                "primary_input_id": obs1,
                "secondary_input_id": obs2,
                "parameters": {"perpendicular_baseline_meters": 45.0},
            },
        )
        assert run_res.status_code == 202
        run_data = run_res.json()["data"]
        assert run_data["status"] in ("QUEUED", "RUNNING", "COMPLETE")

        # Verify security audit event in repository
        audit_events = repository._security_events
        matching = [
            ev for ev in audit_events
            if ev.get("event_type") == "SATELLITE_PROCESSING_DISPATCHED"
        ]
        assert len(matching) > 0
        assert matching[-1]["actor_role"] == "PLATFORM_ADMIN"
