"""
Sentinel NER — Stage 2 RBAC, Scoping & Security Attack Matrix Tests
Validates privilege escalation defense, cross-tenant isolation, disabled accounts,
membership state enforcement, rate limiting, and security audit event logging.
"""

import pytest
from httpx import AsyncClient

from src.core.security.jwt import create_access_token
from src.core.security.rate_limiter import reset_rate_limit
from src.db.repository import repository
from src.schemas.identity import MembershipStatus, UserStatus


@pytest.fixture(autouse=True)
async def reset_state():
    """Ensure baseline test fixtures and clear rate limiter keys."""
    await repository.seed_dev_data_if_empty()
    reset_rate_limit("127.0.0.1:field.kolasib@sentinel.ner.internal")
    reset_rate_limit("testclient:brute.force@sentinel.ner.internal")


async def get_token_for(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


class TestRBACAndPrivilegeEscalation:
    @pytest.mark.asyncio
    async def test_field_officer_cannot_create_organization(self, client: AsyncClient):
        token = await get_token_for(client, "field.kolasib@sentinel.ner.internal", "SentinelField@2026!")

        response = await client.post(
            "/api/v1/organizations",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "code": "ILLEGAL-ORG",
                "name": "Illegal Organization",
                "type": "FIELD_STATION",
                "state": "Mizoram",
                "jurisdiction_scope": "DISTRICT",
            },
        )
        assert response.status_code == 403
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "ERR_FORBIDDEN"
        assert "organizations:create" in data["error"]["message"]

    @pytest.mark.asyncio
    async def test_field_officer_cannot_provision_users(self, client: AsyncClient):
        token = await get_token_for(client, "field.kolasib@sentinel.ner.internal", "SentinelField@2026!")

        response = await client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "hacked@sentinel.ner.internal",
                "password": "Password123!",
                "full_name": "Injected Account",
                "role": "PLATFORM_ADMIN",
            },
        )
        assert response.status_code == 403
        data = response.json()
        assert data["error"]["code"] == "ERR_FORBIDDEN"
        assert "users:create" in data["error"]["message"]

    @pytest.mark.asyncio
    async def test_platform_admin_can_provision_users(self, client: AsyncClient):
        token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        response = await client.post(
            "/api/v1/users",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "legit.pwd@sentinel.ner.internal",
                "password": "Password123!",
                "full_name": "Executive Engineer (PWD)",
                "role": "PWD",
                "organization_id": "org-sdma-mizoram",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "legit.pwd@sentinel.ner.internal"
        assert data["role"] == "PWD"

    @pytest.mark.asyncio
    async def test_forged_role_in_token_is_rejected_against_server_state(self, client: AsyncClient):
        # Generate token with forged PLATFORM_ADMIN claim for a field officer user ID
        forged_token = create_access_token(
            subject="usr-field-1",
            claims={"role": "PLATFORM_ADMIN"},
        )
        # Server verifies real user state from DB, where usr-field-1 is FIELD_OFFICER
        response = await client.post(
            "/api/v1/organizations",
            headers={"Authorization": f"Bearer {forged_token}"},
            json={
                "code": "FORGED-ORG",
                "name": "Forged Organization",
                "type": "FIELD_STATION",
                "state": "Mizoram",
            },
        )
        assert response.status_code == 403


class TestTenantScopeAndMembership:
    @pytest.mark.asyncio
    async def test_ddma_user_blocked_from_cross_tenant_organization_members(self, client: AsyncClient):
        # DDMA user belongs to org-ddma-aizawl
        token = await get_token_for(client, "ddma.aizawl@sentinel.ner.internal", "SentinelDdma@2026!")

        # Attempt to access members of org-bro-pushpak (different org)
        response = await client.get(
            "/api/v1/organizations/org-bro-pushpak/members",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        data = response.json()
        assert data["error"]["code"] == "ERR_FORBIDDEN"
        assert "outside authorized organizational scope" in data["error"]["message"]

    @pytest.mark.asyncio
    async def test_state_authority_can_access_child_district_organization(self, client: AsyncClient):
        # State authority has STATE scope, which can supervise child district organizations
        token = await get_token_for(client, "state.mizoram@sentinel.ner.internal", "SentinelState@2026!")

        response = await client.get(
            "/api/v1/organizations/org-ddma-aizawl/members",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_disabled_user_login_denied(self, client: AsyncClient):
        # Create a disabled user
        await repository.create_user(
            email="disabled.user@sentinel.ner.internal",
            password="Password123!",
            full_name="Disabled Officer",
            role="FIELD_OFFICER",
            status=UserStatus.DISABLED.value,
        )

        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "disabled.user@sentinel.ner.internal", "password": "Password123!"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["error"]["code"] == "ERR_ACCOUNT_DISABLED"

    @pytest.mark.asyncio
    async def test_suspended_membership_denied_operation(self, client: AsyncClient):
        # Create an active user with a suspended membership in an organization
        user = await repository.create_user(
            email="suspended.member@sentinel.ner.internal",
            password="Password123!",
            full_name="Suspended Member",
            role="FIELD_OFFICER",
            organization_id="org-ddma-aizawl",
        )
        # Update membership status to SUSPENDED
        await repository.create_or_update_membership(
            user_id=user["id"],
            organization_id="org-ddma-aizawl",
            role="FIELD_OFFICER",
            status=MembershipStatus.SUSPENDED.value,
        )

        token = await get_token_for(client, "suspended.member@sentinel.ner.internal", "Password123!")

        # Protected operation must reject with 403 ERR_MEMBERSHIP_SUSPENDED
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
        data = response.json()
        assert data["error"]["code"] == "ERR_MEMBERSHIP_SUSPENDED"


class TestRateLimitingAndAuditTrail:
    @pytest.mark.asyncio
    async def test_brute_force_login_rate_limiting(self, client: AsyncClient):
        # Submit 5 failed attempts rapidly
        for i in range(5):
            await client.post(
                "/api/v1/auth/login",
                json={"email": "brute.force@sentinel.ner.internal", "password": "WrongPassword!"},
            )

        # 6th attempt must return 429 Too Many Requests
        blocked = await client.post(
            "/api/v1/auth/login",
            json={"email": "brute.force@sentinel.ner.internal", "password": "WrongPassword!"},
        )
        assert blocked.status_code == 429
        data = blocked.json()
        assert data["error"]["code"] == "ERR_RATE_LIMITED"
        assert "retry_after" in data["error"]["details"]

    @pytest.mark.asyncio
    async def test_security_events_are_traceable(self, client: AsyncClient):
        admin_token = await get_token_for(client, "admin@sentinel.ner.internal", "SentinelAdmin@2026!")

        # Query audit events
        response = await client.get(
            "/api/v1/audit/events",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        events = response.json()
        assert events["total"] > 0
        event_types = [e["event_type"] for e in events["items"]]
        assert "LOGIN_SUCCESS" in event_types or "PERMISSION_DENIED" in event_types
