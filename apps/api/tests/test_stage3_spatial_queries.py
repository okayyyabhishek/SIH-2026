"""
Stage 3 Geospatial Query Primitive Tests
Validates:
1. Point-in-geometry containment
2. Nearby radius search (within vs outside radius)
3. Bounding-box intersection
4. Backend-enforced combined spatial query + RBAC tenancy scoping (never leak across tenant boundaries)
5. Coordinate validation & maximum radius bounds
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


class TestStage3SpatialQueries:
    @pytest.mark.asyncio
    async def test_point_in_geometry_contains_and_misses(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # 1. Point inside Aizawl District polygon (92.72, 23.73)
        resp_inside = await client.get(
            "/api/v1/spatial/point-in-geometry?longitude=92.7200&latitude=23.7300&entity_type=district",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_inside.status_code == 200
        data = resp_inside.json()["data"]
        assert len(data["items"]) >= 1
        assert any(d["code"] == "MZ-AIZ" for d in data["items"])

        # 2. Point far outside Mizoram (e.g. 80.0, 20.0)
        resp_outside = await client.get(
            "/api/v1/spatial/point-in-geometry?longitude=80.0000&latitude=20.0000&entity_type=district",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_outside.status_code == 200
        assert len(resp_outside.json()["data"]["items"]) == 0

    @pytest.mark.asyncio
    async def test_nearby_search_radius_boundary(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # Seed asset asset-hosp-aizawl (Aizawl Civil Hospital) is at approx [92.7176, 23.7271]
        # Query 1000m radius around hospital
        resp_near = await client.get(
            "/api/v1/spatial/nearby?longitude=92.7176&latitude=23.7271&radius_meters=1000&entity_type=asset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_near.status_code == 200, resp_near.text
        items = resp_near.json()["data"]["items"]
        assert len(items) >= 1
        assert any(a["id"] == "asset-hosp-aizawl" for a in items)

        # Query small radius (100 meters) from a point 10km away -> zero matches
        resp_far = await client.get(
            "/api/v1/spatial/nearby?longitude=92.8000&latitude=23.8000&radius_meters=100&entity_type=asset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_far.status_code == 200
        assert len(resp_far.json()["data"]["items"]) == 0

    @pytest.mark.asyncio
    async def test_bbox_query(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # Query BBox enclosing central Aizawl
        resp = await client.get(
            "/api/v1/spatial/bbox?min_lng=92.65&min_lat=23.65&max_lng=92.80&max_lat=23.80&entity_type=village",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200, resp.text
        villages = resp.json()["data"]["items"]
        assert len(villages) >= 1
        assert any(v["id"] == "vil-durtlang" for v in villages)

    @pytest.mark.asyncio
    async def test_combined_spatial_and_rbac_scoping(self, client: AsyncClient):
        """
        CRITICAL SECURITY REQUIREMENT:
        Authorization filtering must happen on the backend combined with geospatial filtering.
        A Kolasib Field Officer querying coordinates in Aizawl must NEVER receive Aizawl records!
        """
        # Field officer in Kolasib district (dst-kolasib)
        kolasib_token = await get_token_for(
            client, "field.kolasib.district@sentinel.ner.internal", "SentinelField@2026!"
        )

        # Spatial search in central Aizawl (where asset-hosp-aizawl is located)
        resp = await client.get(
            "/api/v1/spatial/nearby?longitude=92.7176&latitude=23.7271&radius_meters=5000&entity_type=asset",
            headers={"Authorization": f"Bearer {kolasib_token}"},
        )
        assert resp.status_code == 200
        items = resp.json()["data"]["items"]
        # Must be 0 because asset-hosp-aizawl belongs to dst-aizawl, outside Kolasib officer's district scope!
        assert len(items) == 0, f"Security leak! Kolasib officer received out-of-scope assets: {items}"

        # Global Admin querying the exact same coordinates gets the asset
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")
        resp_admin = await client.get(
            "/api/v1/spatial/nearby?longitude=92.7176&latitude=23.7271&radius_meters=5000&entity_type=asset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_admin.status_code == 200
        admin_items = resp_admin.json()["data"]["items"]
        assert len(admin_items) >= 1
        assert any(a["id"] == "asset-hosp-aizawl" for a in admin_items)

    @pytest.mark.asyncio
    async def test_spatial_input_validation_and_max_radius(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # 1. Invalid latitude (> 90) must fail with 422
        resp_bad_lat = await client.get(
            "/api/v1/spatial/nearby?longitude=92.71&latitude=95.0&radius_meters=1000&entity_type=asset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_bad_lat.status_code == 422

        # 2. Invalid longitude (> 180) must fail with 422
        resp_bad_lng = await client.get(
            "/api/v1/spatial/nearby?longitude=185.0&latitude=23.7&radius_meters=1000&entity_type=asset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_bad_lng.status_code == 422

        # 3. Radius exceeding 50,000m max must fail with 422
        resp_excess_radius = await client.get(
            "/api/v1/spatial/nearby?longitude=92.71&latitude=23.7&radius_meters=100000&entity_type=asset",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp_excess_radius.status_code == 422
        assert "50000" in resp_excess_radius.json()["error"]["message"]
