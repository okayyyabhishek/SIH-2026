"""
Sentinel NER — Comprehensive Canonical RBAC Test Suite
Tests authoritative 4-role model, permission matrix, route/API protection,
token issuance, /me permission payloads, and 401/403 security enforcement.
"""

import pytest
from httpx import AsyncClient

from src.core.security.rbac import (
    Permission,
    Role,
    get_role_permissions,
    has_any_permission,
    has_permission,
    normalize_role,
)


@pytest.fixture
def auth_headers_factory(client: AsyncClient):
    async def _get_headers(email: str, password: str):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _get_headers


@pytest.mark.asyncio
class TestCanonicalRBACMatrix:
    """Unit tests for the canonical RBAC permission matrix in code."""

    def test_role_normalization(self):
        assert normalize_role("DDMA") == Role.DDMA_INCIDENT_COMMANDER
        assert normalize_role(Role.DDMA) == Role.DDMA_INCIDENT_COMMANDER
        assert normalize_role("DDMA_INCIDENT_COMMANDER") == Role.DDMA_INCIDENT_COMMANDER
        assert normalize_role("CITIZEN_REPORTER") == Role.USER
        assert normalize_role(Role.CITIZEN_REPORTER) == Role.USER
        assert normalize_role("USER") == Role.USER
        assert normalize_role("PLATFORM_ADMIN") == Role.PLATFORM_ADMIN
        assert normalize_role("FIELD_OFFICER") == Role.FIELD_OFFICER

    def test_platform_admin_has_all_permissions(self):
        admin_perms = get_role_permissions(Role.PLATFORM_ADMIN)
        assert Permission.VIEW_COMMAND_CENTER.value in admin_perms
        assert Permission.VIEW_SPATIAL_MAP.value in admin_perms
        assert Permission.VIEW_CREEP_WATCH.value in admin_perms
        assert Permission.VIEW_EARLY_WARNING.value in admin_perms
        assert Permission.VIEW_SATELLITE_HYDROLOGY.value in admin_perms
        assert Permission.VIEW_SUBSURFACE_GEOTECH.value in admin_perms
        assert Permission.VIEW_RISK_ENGINE.value in admin_perms
        assert Permission.VIEW_SENTINEL_AI.value in admin_perms
        assert Permission.VIEW_HIGHWAY_CORRIDORS.value in admin_perms
        assert Permission.MANAGE_USERS.value in admin_perms
        assert Permission.MANAGE_SYSTEM.value in admin_perms
        assert Permission.VIEW_AUDIT_LOGS.value in admin_perms

    def test_ddma_has_disaster_and_hazard_intel(self):
        ddma_perms = get_role_permissions(Role.DDMA_INCIDENT_COMMANDER)
        # Granted
        assert Permission.VIEW_COMMAND_CENTER.value in ddma_perms
        assert Permission.VIEW_SPATIAL_MAP.value in ddma_perms
        assert Permission.VIEW_CREEP_WATCH.value in ddma_perms
        assert Permission.VIEW_EARLY_WARNING.value in ddma_perms
        assert Permission.VIEW_SATELLITE_HYDROLOGY.value in ddma_perms
        assert Permission.VIEW_SUBSURFACE_GEOTECH.value in ddma_perms
        assert Permission.VIEW_RISK_ENGINE.value in ddma_perms
        assert Permission.VIEW_SENTINEL_AI.value in ddma_perms
        assert Permission.VIEW_CONSEQUENCE_INTEL.value in ddma_perms
        assert Permission.VIEW_OPERATIONS.value in ddma_perms
        assert Permission.VIEW_WARNING_LEDGER.value in ddma_perms
        assert Permission.VIEW_ALERTS.value in ddma_perms
        assert Permission.VIEW_FIELD_SENSORS.value in ddma_perms
        assert Permission.VIEW_FIELD_COMMUNITY.value in ddma_perms
        # Denied
        assert Permission.MANAGE_USERS.value not in ddma_perms
        assert Permission.MANAGE_ROLES.value not in ddma_perms
        assert Permission.MANAGE_SYSTEM.value not in ddma_perms
        assert Permission.SYSTEM_MANAGE.value not in ddma_perms

    def test_field_officer_has_operational_subset(self):
        field_perms = get_role_permissions(Role.FIELD_OFFICER)
        # Granted
        assert Permission.VIEW_SPATIAL_MAP.value in field_perms
        assert Permission.VIEW_LIVE_WEATHER.value in field_perms
        assert Permission.VIEW_RISK_ENGINE_OPERATIONAL.value in field_perms
        assert Permission.VIEW_SENTINEL_AI_OPERATIONAL.value in field_perms
        assert Permission.VIEW_HIGHWAY_CORRIDORS.value in field_perms
        assert Permission.VIEW_CONSEQUENCE_INTEL.value in field_perms
        assert Permission.VIEW_OPERATIONS.value in field_perms
        assert Permission.VIEW_WARNING_LEDGER.value in field_perms
        assert Permission.VIEW_ALERTS.value in field_perms
        assert Permission.VIEW_FIELD_SENSORS.value in field_perms
        assert Permission.VIEW_FIELD_COMMUNITY.value in field_perms
        # Denied
        assert Permission.VIEW_COMMAND_CENTER.value not in field_perms
        assert Permission.VIEW_CREEP_WATCH.value not in field_perms
        assert Permission.VIEW_EARLY_WARNING.value not in field_perms
        assert Permission.VIEW_SATELLITE_HYDROLOGY.value not in field_perms
        assert Permission.VIEW_SUBSURFACE_GEOTECH.value not in field_perms
        assert Permission.SATELLITE_READ.value not in field_perms
        assert Permission.MANAGE_USERS.value not in field_perms
        assert Permission.SYSTEM_MANAGE.value not in field_perms

    def test_user_has_public_safe_subset_only(self):
        user_perms = get_role_permissions(Role.USER)
        # Granted
        assert Permission.VIEW_SPATIAL_MAP.value in user_perms
        assert Permission.VIEW_ALERTS.value in user_perms
        assert Permission.VIEW_FIELD_COMMUNITY.value in user_perms
        assert Permission.VIEW_LIVE_WEATHER.value in user_perms
        # Strictly Denied
        assert Permission.VIEW_COMMAND_CENTER.value not in user_perms
        assert Permission.VIEW_CREEP_WATCH.value not in user_perms
        assert Permission.VIEW_EARLY_WARNING.value not in user_perms
        assert Permission.VIEW_SATELLITE_HYDROLOGY.value not in user_perms
        assert Permission.VIEW_SUBSURFACE_GEOTECH.value not in user_perms
        assert Permission.VIEW_RISK_ENGINE.value not in user_perms
        assert Permission.VIEW_SENTINEL_AI.value not in user_perms
        assert Permission.VIEW_HIGHWAY_CORRIDORS.value not in user_perms
        assert Permission.VIEW_CONSEQUENCE_INTEL.value not in user_perms
        assert Permission.VIEW_OPERATIONS.value not in user_perms
        assert Permission.VIEW_WARNING_LEDGER.value not in user_perms
        assert Permission.VIEW_FIELD_SENSORS.value not in user_perms
        assert Permission.SATELLITE_READ.value not in user_perms
        assert Permission.RISK_READ.value not in user_perms
        assert Permission.MANAGE_USERS.value not in user_perms


@pytest.mark.asyncio
class TestCanonicalAuthenticationAndMe:
    """Tests authentication flows and /auth/me for all four canonical roles."""

    async def test_admin_authentication_and_me(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("admin@sentinel.ner.internal", "SentinelAdmin@2026!")
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == "admin@sentinel.ner.internal"
        assert data["role"] == "PLATFORM_ADMIN"
        assert Permission.VIEW_COMMAND_CENTER.value in data["permissions"]
        assert Permission.MANAGE_SYSTEM.value in data["permissions"]

    async def test_ddma_authentication_and_me(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("ddma.aizawl@sentinel.ner.internal", "SentinelDdma@2026!")
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == "ddma.aizawl@sentinel.ner.internal"
        assert Permission.VIEW_COMMAND_CENTER.value in data["permissions"]
        assert Permission.VIEW_EARLY_WARNING.value in data["permissions"]
        assert Permission.MANAGE_USERS.value not in data["permissions"]

    async def test_field_officer_authentication_and_me(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("field.kolasib@sentinel.ner.internal", "SentinelField@2026!")
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == "field.kolasib@sentinel.ner.internal"
        assert data["role"] == "FIELD_OFFICER"
        assert Permission.VIEW_SPATIAL_MAP.value in data["permissions"]
        assert Permission.VIEW_HIGHWAY_CORRIDORS.value in data["permissions"]
        assert Permission.VIEW_COMMAND_CENTER.value not in data["permissions"]
        assert Permission.SATELLITE_READ.value not in data["permissions"]

    async def test_user_citizen_authentication_and_me(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("citizen@sentinel.ner.internal", "SentinelCitizen@2026!")
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        data = me_resp.json()
        assert data["email"] == "citizen@sentinel.ner.internal"
        assert Permission.VIEW_SPATIAL_MAP.value in data["permissions"]
        assert Permission.VIEW_ALERTS.value in data["permissions"]
        assert Permission.VIEW_COMMAND_CENTER.value not in data["permissions"]
        assert Permission.RISK_READ.value not in data["permissions"]

    async def test_invalid_password_returns_401(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@sentinel.ner.internal", "password": "WrongPassword123!"},
        )
        assert resp.status_code == 401


@pytest.mark.asyncio
class TestAPIEndpointAuthoritativeEnforcement:
    """Verifies that API endpoints enforce 401 (unauthenticated) and 403 (unauthorized)."""

    async def test_unauthenticated_requests_return_401(self, client: AsyncClient):
        resp = await client.get("/api/v1/satellite/observations")
        assert resp.status_code == 401

        resp2 = await client.get("/api/v1/risk/predictions")
        assert resp2.status_code == 401

    async def test_satellite_observations_field_officer_denied_403(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("field.kolasib@sentinel.ner.internal", "SentinelField@2026!")
        resp = await client.get("/api/v1/satellite/observations", headers=headers)
        assert resp.status_code == 403

    async def test_satellite_observations_user_denied_403(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("citizen@sentinel.ner.internal", "SentinelCitizen@2026!")
        resp = await client.get("/api/v1/satellite/observations", headers=headers)
        assert resp.status_code == 403

    async def test_satellite_observations_admin_permitted_200(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("admin@sentinel.ner.internal", "SentinelAdmin@2026!")
        resp = await client.get("/api/v1/satellite/observations", headers=headers)
        assert resp.status_code == 200

    async def test_satellite_observations_ddma_permitted_200(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("ddma.aizawl@sentinel.ner.internal", "SentinelDdma@2026!")
        resp = await client.get("/api/v1/satellite/observations", headers=headers)
        assert resp.status_code == 200

    async def test_risk_predictions_user_denied_403(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("citizen@sentinel.ner.internal", "SentinelCitizen@2026!")
        resp = await client.get("/api/v1/risk/predictions", headers=headers)
        assert resp.status_code == 403

    async def test_risk_predictions_field_officer_permitted_200(self, client: AsyncClient, auth_headers_factory):
        headers = await auth_headers_factory("field.kolasib@sentinel.ner.internal", "SentinelField@2026!")
        resp = await client.get("/api/v1/risk/predictions", headers=headers)
        assert resp.status_code == 200
