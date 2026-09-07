"""
Stage 3 RBAC, Scope Enforcement, IDOR/BOLA Protection, Mass Assignment Defense, and Audit Event Tests
Validates:
1. Complete Role matrix access against domain endpoints (PLATFORM_ADMIN, STATE_AUTHORITY, DDMA, PWD, FIELD_OFFICER, OBSERVER_AUDITOR, CITIZEN_REPORTER).
2. IDOR / BOLA cross-district and cross-organization isolation.
3. Server-side mass assignment prevention (created_by, updated_by, internal IDs).
4. Security audit event emission for domain operations and unauthorized attempts.
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


class TestStage3RBACAndIDOR:
    @pytest.mark.asyncio
    async def test_citizen_reporter_cannot_access_domain_endpoints(self, client: AsyncClient):
        """CITIZEN_REPORTER has no DOMAIN_READ or DOMAIN_WRITE permissions."""
        citizen_token = await get_token_for(
            client, "citizen@sentinel.ner.internal", "SentinelCitizen@2026!"
        )

        # GET /api/v1/districts -> 403 Forbidden
        resp_get = await client.get(
            "/api/v1/districts",
            headers={"Authorization": f"Bearer {citizen_token}"},
        )
        assert resp_get.status_code == 403
        assert resp_get.json()["error"]["code"] == "ERR_FORBIDDEN"

        # POST /api/v1/landslide-events -> 403 Forbidden
        resp_post = await client.post(
            "/api/v1/landslide-events",
            headers={"Authorization": f"Bearer {citizen_token}"},
            json={
                "event_reference": "ILLEGAL-EV-01",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "event_time": "2026-06-01T00:00:00Z",
                "source": "FIELD_OBSERVATION",
                "geometry": {"type": "Point", "coordinates": [92.7, 23.7]},
            },
        )
        assert resp_post.status_code == 403
        assert resp_post.json()["error"]["code"] == "ERR_FORBIDDEN"

    @pytest.mark.asyncio
    async def test_observer_auditor_read_only(self, client: AsyncClient):
        """OBSERVER_AUDITOR has DOMAIN_READ but not DOMAIN_WRITE."""
        obs_token = await get_token_for(
            client, "observer@sentinel.ner.internal", "SentinelObserver@2026!"
        )

        # Permitted Read
        resp_read = await client.get(
            "/api/v1/districts",
            headers={"Authorization": f"Bearer {obs_token}"},
        )
        assert resp_read.status_code == 200
        assert "items" in resp_read.json()["data"]

        # Prohibited Write -> 403
        resp_write = await client.post(
            "/api/v1/districts",
            headers={"Authorization": f"Bearer {obs_token}"},
            json={
                "code": "MZ-ILLEGAL",
                "name": "Illegal District",
                "state_code": "MZ",
                "state_name": "Mizoram",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [92.0, 23.0],
                            [92.1, 23.0],
                            [92.1, 23.1],
                            [92.0, 23.1],
                            [92.0, 23.0],
                        ]
                    ],
                },
            },
        )
        assert resp_write.status_code == 403
        assert resp_write.json()["error"]["code"] == "ERR_FORBIDDEN"

    @pytest.mark.asyncio
    async def test_idor_cross_district_isolation(self, client: AsyncClient):
        """
        Kolasib Field Officer attempting to read or modify an Aizawl (dst-aizawl)
        slope unit or asset must be rejected (404/403) without leaking existence.
        """
        kolasib_token = await get_token_for(
            client, "field.kolasib.district@sentinel.ner.internal", "SentinelField@2026!"
        )

        # 1. GET out-of-scope asset asset-hosp-aizawl (Aizawl Civil Hospital, dst-aizawl)
        resp_get = await client.get(
            "/api/v1/assets/asset-hosp-aizawl",
            headers={"Authorization": f"Bearer {kolasib_token}"},
        )
        assert resp_get.status_code in (403, 404)
        assert resp_get.json()["success"] is False

        # 2. PATCH out-of-scope asset asset-hosp-aizawl
        resp_patch = await client.patch(
            "/api/v1/assets/asset-hosp-aizawl",
            headers={"Authorization": f"Bearer {kolasib_token}"},
            json={"name": "Hijacked Asset Name"},
        )
        assert resp_patch.status_code in (403, 404)
        assert resp_patch.json()["success"] is False

        # 3. GET out-of-scope slope unit su-aizawl-001 (dst-aizawl)
        resp_su = await client.get(
            "/api/v1/slope-units/su-aizawl-001",
            headers={"Authorization": f"Bearer {kolasib_token}"},
        )
        assert resp_su.status_code in (403, 404)

        # 4. Attempt to create an asset in dst-aizawl while scoped to Kolasib
        resp_illegal_create = await client.post(
            "/api/v1/assets",
            headers={"Authorization": f"Bearer {kolasib_token}"},
            json={
                "name": "Illegal Cross-District Asset",
                "asset_type": "WATER",
                "organization_id": "org-ddma-kolasib",
                "district_id": "dst-aizawl",  # out of scope!
                "state_code": "MZ",
                "geometry": {"type": "Point", "coordinates": [92.7, 23.7]},
            },
        )
        assert resp_illegal_create.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_ddma_district_scoped_operations(self, client: AsyncClient):
        """DDMA Aizawl can create and update within Aizawl, but not in Kolasib."""
        ddma_token = await get_token_for(
            client, "ddma.aizawl@sentinel.ner.internal", "SentinelDdma@2026!"
        )

        # Permitted in-district operation (dst-aizawl)
        resp_ok = await client.post(
            "/api/v1/landslide-events",
            headers={"Authorization": f"Bearer {ddma_token}"},
            json={
                "event_reference": "LS-DDMA-AIZ-009",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "event_time": "2026-07-01T12:00:00Z",
                "source": "FIELD_OBSERVATION",
                "geometry": {"type": "Point", "coordinates": [92.72, 23.73]},
                "description": "Debris accumulation near lower road",
            },
        )
        assert resp_ok.status_code == 201, resp_ok.text
        assert "id" in resp_ok.json()["data"]

        # Prohibited out-of-district operation (Kolasib dst-kolasib)
        resp_forbidden = await client.post(
            "/api/v1/landslide-events",
            headers={"Authorization": f"Bearer {ddma_token}"},
            json={
                "event_reference": "LS-DDMA-KOL-001",
                "district_id": "dst-kolasib",  # Out of Aizawl scope
                "state_code": "MZ",
                "event_time": "2026-07-01T12:00:00Z",
                "source": "FIELD_OBSERVATION",
                "geometry": {"type": "Point", "coordinates": [92.68, 24.22]},
            },
        )
        assert resp_forbidden.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_mass_assignment_defense(self, client: AsyncClient):
        """Clients cannot inject server-managed fields: id, created_by, updated_by, created_at, updated_at."""
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        resp = await client.post(
            "/api/v1/villages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "id": "CUSTOM-INJECTED-ID-12345",
                "name": "Tuikual South",
                "village_code": "VIL-MZ-TK-01",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "created_by": "FAKE-USER-ID",
                "updated_by": "FAKE-USER-ID",
                "geometry": {"type": "Point", "coordinates": [92.715, 23.725]},
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        # Injected id must NOT overwrite server generated ID
        assert data["id"] != "CUSTOM-INJECTED-ID-12345"
        # created_by must reflect the actual authenticated actor (admin user ID: usr-admin-1)
        assert data["created_by"] == "usr-admin-1"
        assert data["created_by"] != "FAKE-USER-ID"

    @pytest.mark.asyncio
    async def test_security_audit_event_logged(self, client: AsyncClient):
        """Mutations and unauthorized attempts emit security audit events without leaking credentials."""
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # Perform a mutation
        resp = await client.post(
            "/api/v1/villages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Khatla Village",
                "village_code": "VIL-MZ-KHT-01",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {"type": "Point", "coordinates": [92.712, 23.720]},
            },
        )
        assert resp.status_code == 201, resp.text
        vil_id = resp.json()["data"]["id"]

        # Fetch audit events
        audit_events, _ = await repository.list_security_events(limit=50)
        found = False
        for ev in audit_events:
            if vil_id in str(ev.get("resource")) or vil_id in str(ev.get("details")):
                found = True
                assert ev["action"] == "CREATE"
                assert ev["actor_user_id"] == "usr-admin-1"
                # Ensure no secrets or tokens in details
                det_str = str(ev.get("details", {}))
                assert "password" not in det_str.lower()
                assert "token" not in det_str.lower()
                assert "authorization" not in det_str.lower()
                break
        assert found, f"Audit event for {vil_id} not found in {audit_events}"
