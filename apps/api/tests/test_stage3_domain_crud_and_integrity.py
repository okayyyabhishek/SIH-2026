"""
Stage 3 Domain Entities CRUD, Integrity, Bounded Pagination, and Lifecycle Tests
Validates all 7 domain models, foreign-key reference integrity, duplicate-code conflict (HTTP 409),
bounded pagination capping, and provenance tracking.
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


class TestStage3DomainCRUDAndIntegrity:
    @pytest.mark.asyncio
    async def test_district_crud_and_duplicate_conflict(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # 1. Create District
        resp = await client.post(
            "/api/v1/districts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "code": "MZ-LGL",
                "name": "Lunglei",
                "state_code": "MZ",
                "state_name": "Mizoram",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [92.70, 22.80],
                            [92.95, 22.80],
                            [92.95, 23.00],
                            [92.70, 23.00],
                            [92.70, 22.80],
                        ]
                    ],
                },
            },
        )
        assert resp.status_code == 201, resp.text
        created = resp.json()["data"]
        assert created["code"] == "MZ-LGL"
        assert created["name"] == "Lunglei"
        assert created["status"] == "ACTIVE"
        district_id = created["id"]

        # 2. Duplicate Conflict (409)
        conflict_resp = await client.post(
            "/api/v1/districts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "code": "MZ-LGL",  # duplicate code
                "name": "Lunglei Duplicate",
                "state_code": "MZ",
                "state_name": "Mizoram",
                "geometry": created["geometry"],
            },
        )
        assert conflict_resp.status_code == 409
        err = conflict_resp.json()
        assert err["error"]["code"] == "ERR_CONFLICT"

        # 3. Get District by ID
        get_resp = await client.get(
            f"/api/v1/districts/{district_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["data"]["id"] == district_id

        # 4. Update District
        patch_resp = await client.patch(
            f"/api/v1/districts/{district_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"name": "Lunglei Operational District"},
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["data"]["name"] == "Lunglei Operational District"

    @pytest.mark.asyncio
    async def test_slope_unit_foreign_reference_and_crud(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # 1. Invalid District Reference must fail with 422
        bad_resp = await client.post(
            "/api/v1/slope-units",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "code": "SU-INVALID",
                "name": "Orphan Slope Unit",
                "district_id": "DIST-NON-EXISTENT",
                "state_code": "MZ",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [92.70, 23.70],
                            [92.75, 23.70],
                            [92.75, 23.75],
                            [92.70, 23.75],
                            [92.70, 23.70],
                        ]
                    ],
                },
            },
        )
        assert bad_resp.status_code == 422
        assert "does not exist" in bad_resp.json()["error"]["message"]

        # 2. Valid Slope Unit creation referencing existing district dst-aizawl
        good_resp = await client.post(
            "/api/v1/slope-units",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "code": "SU-AIZ-TEST-01",
                "name": "Ramhlun North Terrain Unit",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "area_sqkm": 2.45,
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [92.71, 23.72],
                            [92.73, 23.72],
                            [92.73, 23.74],
                            [92.71, 23.74],
                            [92.71, 23.72],
                        ]
                    ],
                },
            },
        )
        assert good_resp.status_code == 201, good_resp.text
        assert "id" in good_resp.json()["data"]

        # 3. Duplicate Slope Unit code conflict (409)
        dup_resp = await client.post(
            "/api/v1/slope-units",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "code": "SU-AIZ-TEST-01",
                "name": "Duplicate",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": good_resp.json()["data"]["geometry"],
            },
        )
        assert dup_resp.status_code == 409

    @pytest.mark.asyncio
    async def test_road_and_chainage_foreign_key_and_conflict(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # 1. Road invalid authority organization must fail (422)
        bad_road = await client.post(
            "/api/v1/roads",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "road_code": "NH-FAKE",
                "name": "Fake Highway",
                "road_type": "NATIONAL_HIGHWAY",
                "authority_organization_id": "ORG-DOES-NOT-EXIST",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[92.71, 23.72], [92.72, 23.73]],
                },
            },
        )
        assert bad_road.status_code == 422
        assert "authority organization" in bad_road.json()["error"]["message"].lower()

        # 2. Valid Road creation
        good_road = await client.post(
            "/api/v1/roads",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "road_code": "NH-TEST-54",
                "name": "Aizawl North Corridor",
                "road_type": "NATIONAL_HIGHWAY",
                "authority_organization_id": "org-pwd-mz",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[92.710, 23.720], [92.715, 23.725], [92.720, 23.730]],
                },
            },
        )
        assert good_road.status_code == 201, good_road.text
        road_id = good_road.json()["data"]["id"]

        # 3. Road chainage with invalid road_id must fail (422)
        bad_chainage = await client.post(
            "/api/v1/road-chainages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "road_id": "ROAD-NON-EXISTENT",
                "chainage_km": 12.5,
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {"type": "Point", "coordinates": [92.715, 23.725]},
            },
        )
        assert bad_chainage.status_code == 422
        assert "Referenced road" in bad_chainage.json()["error"]["message"]

        # 4. Valid Road chainage creation
        good_chainage = await client.post(
            "/api/v1/road-chainages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "road_id": road_id,
                "chainage_km": 10.5,
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {"type": "Point", "coordinates": [92.715, 23.725]},
            },
        )
        assert good_chainage.status_code == 201, good_chainage.text
        assert "id" in good_chainage.json()["data"]

        # 5. Duplicate chainage for the same road (409)
        dup_chainage = await client.post(
            "/api/v1/road-chainages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "road_id": road_id,
                "chainage_km": 10.5,
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {"type": "Point", "coordinates": [92.715, 23.725]},
            },
        )
        assert dup_chainage.status_code == 409

    @pytest.mark.asyncio
    async def test_village_crud_and_population_handling(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # 1. Create village without population (should remain None/null, not fabricated)
        resp = await client.post(
            "/api/v1/villages",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Durtlang Leitan",
                "village_code": "VIL-MZ-002",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {"type": "Point", "coordinates": [92.7300, 23.7750]},
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()["data"]
        assert data["population"] is None
        assert data["name"] == "Durtlang Leitan"

    @pytest.mark.asyncio
    async def test_asset_crud_and_foreign_key_integrity(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # 1. Non-existent district reference must fail
        bad_resp = await client.post(
            "/api/v1/assets",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Zokhawsang Health Center",
                "asset_type": "HEALTH",
                "organization_id": "org-pwd-mz",
                "district_id": "DIST-UNKNOWN",
                "state_code": "MZ",
                "geometry": {"type": "Point", "coordinates": [92.72, 23.73]},
            },
        )
        assert bad_resp.status_code == 422

        # 2. Valid Asset creation
        good_resp = await client.post(
            "/api/v1/assets",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Bawngkawn Water Pump Station",
                "asset_type": "WATER",
                "organization_id": "org-pwd-mz",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "geometry": {"type": "Point", "coordinates": [92.725, 23.745]},
            },
        )
        assert good_resp.status_code == 201, good_resp.text
        assert good_resp.json()["data"]["asset_type"] == "WATER"

    @pytest.mark.asyncio
    async def test_landslide_event_crud_provenance_and_immutability(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # 1. Create Landslide Event
        resp = await client.post(
            "/api/v1/landslide-events",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "event_reference": "LS-2026-TEST-001",
                "event_time": "2026-06-15T04:30:00Z",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "source": "FIELD_OBSERVATION",
                "source_reference": "DDMA-AIZ-LOG-442",
                "geometry": {"type": "Point", "coordinates": [92.720, 23.730]},
                "description": "Slope failure observed along hillside road",
            },
        )
        assert resp.status_code == 201, resp.text
        ev = resp.json()["data"]
        assert ev["event_reference"] == "LS-2026-TEST-001"
        assert ev["source"] == "FIELD_OBSERVATION"
        assert ev["status"] == "REPORTED"
        event_id = ev["id"]

        # 2. Duplicate event_reference conflict (409)
        dup_resp = await client.post(
            "/api/v1/landslide-events",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "event_reference": "LS-2026-TEST-001",
                "event_time": "2026-06-15T04:30:00Z",
                "district_id": "dst-aizawl",
                "state_code": "MZ",
                "source": "OFFICIAL_RECORD",
                "geometry": {"type": "Point", "coordinates": [92.720, 23.730]},
            },
        )
        assert dup_resp.status_code == 409

        # 3. Soft-delete / lifecycle retirement (DELETE sets status=ARCHIVED rather than hard purge)
        del_resp = await client.delete(
            f"/api/v1/landslide-events/{event_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert del_resp.status_code == 200
        assert del_resp.json()["data"]["status"] == "ARCHIVED"

        # Verify historical provenance preserved
        get_resp = await client.get(
            f"/api/v1/landslide-events/{event_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["data"]["status"] == "ARCHIVED"
        assert get_resp.json()["data"]["event_reference"] == "LS-2026-TEST-001"

    @pytest.mark.asyncio
    async def test_bounded_pagination_and_capping(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # 1. Standard pagination
        resp = await client.get(
            "/api/v1/districts?page=1&limit=2",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        paged = resp.json()["data"]
        assert paged["page"] == 1
        assert paged["limit"] == 2
        assert len(paged["items"]) <= 2

        # 2. Excessive limit abuse attempt (limit=5000) must be rejected with 422
        resp_excess = await client.get(
            "/api/v1/districts?page=1&limit=5000",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_excess.status_code == 422
