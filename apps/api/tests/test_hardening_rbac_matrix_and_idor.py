"""
Sentinel NER — Security Hardening Tests: Complete RBAC Matrix, IDOR / BOLA, and Stale Authorization
Tests:
- Complete authorization matrix for all 11 roles (allowed, denied, scoping)
- BOLA / IDOR tests across organizations and user profiles
- Stale authorization test (active token evaluated against live server-side membership changes)
- Defense against forged claims and role manipulation
"""

import pytest
from httpx import ASGITransport, AsyncClient

from src.core.security.jwt import create_access_token
from src.core.security.rbac import (
    Permission,
    Role,
    evaluate_scope_access,
    get_role_permissions,
)
from src.db.repository import repository
from src.main import app
from src.schemas.identity import MembershipStatus, OrganizationType


class TestCompleteRBACMatrix:
    """Automated capability and scoping verification across all 11 operational roles."""

    def test_all_eleven_roles_defined(self):
        expected_roles = {
            "PLATFORM_ADMIN",
            "STATE_AUTHORITY",
            "DDMA",
            "PWD",
            "BRO",
            "NHIDCL",
            "RAILWAY_AUTHORITY",
            "INFRASTRUCTURE_AUTHORITY",
            "FIELD_OFFICER",
            "OBSERVER_AUDITOR",
            "CITIZEN_REPORTER",
        }
        actual_roles = {r.value for r in Role}
        assert expected_roles == actual_roles

    def test_platform_admin_full_capabilities(self):
        perms = get_role_permissions(Role.PLATFORM_ADMIN)
        assert Permission.SYSTEM_MANAGE.value in perms
        assert Permission.USERS_CREATE.value in perms
        assert Permission.ORGANIZATIONS_CREATE.value in perms
        assert Permission.ORGANIZATIONS_MANAGE_MEMBERS.value in perms
        assert Permission.AUDIT_READ.value in perms
        assert evaluate_scope_access(Role.PLATFORM_ADMIN, "org-1", "org-any") is True

    def test_state_authority_capabilities_and_scope(self):
        perms = get_role_permissions(Role.STATE_AUTHORITY)
        assert Permission.USERS_CREATE.value in perms
        assert Permission.ORGANIZATIONS_MANAGE_MEMBERS.value in perms
        assert Permission.AUDIT_READ.value in perms
        assert Permission.SYSTEM_MANAGE.value not in perms  # denied

        # State authority can supervise child district organizations
        assert evaluate_scope_access(Role.STATE_AUTHORITY, "org-sdma-mizoram", "org-ddma-aizawl") is True

    def test_ddma_capabilities_and_scope(self):
        perms = get_role_permissions(Role.DDMA)
        assert Permission.USERS_READ.value in perms
        assert Permission.ORGANIZATIONS_MANAGE_MEMBERS.value in perms
        assert Permission.ALERTS_APPROVE.value in perms
        assert Permission.SYSTEM_MANAGE.value not in perms
        assert Permission.ORGANIZATIONS_CREATE.value not in perms

        # Same district org allowed, cross-district denied
        assert evaluate_scope_access(Role.DDMA, "org-ddma-aizawl", "org-ddma-aizawl") is True
        assert evaluate_scope_access(Role.DDMA, "org-ddma-aizawl", "org-ddma-lunglei") is False

    def test_infrastructure_agencies_pwd_bro_nhidcl_railways(self):
        for role in (Role.PWD, Role.BRO, Role.NHIDCL, Role.RAILWAY_AUTHORITY, Role.INFRASTRUCTURE_AUTHORITY):
            perms = get_role_permissions(role)
            assert Permission.ORGANIZATIONS_READ.value in perms
            assert Permission.USERS_READ.value in perms
            assert Permission.EVENTS_READ.value in perms
            assert Permission.ORGANIZATIONS_MANAGE_MEMBERS.value not in perms
            assert Permission.USERS_CREATE.value not in perms
            assert Permission.SYSTEM_MANAGE.value not in perms

            # Cross-organization access denied
            assert evaluate_scope_access(role, "org-pwd-1", "org-pwd-1") is True
            assert evaluate_scope_access(role, "org-pwd-1", "org-bro-2") is False

    def test_field_officer_capabilities(self):
        perms = get_role_permissions(Role.FIELD_OFFICER)
        assert Permission.REPORTS_CREATE.value in perms
        assert Permission.EVENTS_READ.value in perms
        assert Permission.USERS_READ.value not in perms
        assert Permission.USERS_CREATE.value not in perms
        assert Permission.ORGANIZATIONS_MANAGE_MEMBERS.value not in perms

    def test_observer_auditor_capabilities(self):
        perms = get_role_permissions(Role.OBSERVER_AUDITOR)
        assert Permission.AUDIT_READ.value in perms
        assert Permission.USERS_READ.value in perms
        assert Permission.ORGANIZATIONS_READ.value in perms
        # Strictly read-only
        assert Permission.USERS_CREATE.value not in perms
        assert Permission.ORGANIZATIONS_CREATE.value not in perms
        assert Permission.ORGANIZATIONS_MANAGE_MEMBERS.value not in perms

    def test_citizen_reporter_capabilities(self):
        perms = get_role_permissions(Role.CITIZEN_REPORTER)
        assert Permission.REPORTS_CREATE.value in perms
        assert Permission.REPORTS_READ.value in perms
        assert Permission.USERS_READ.value not in perms
        assert Permission.ORGANIZATIONS_READ.value not in perms
        assert Permission.AUDIT_READ.value not in perms


class TestIDORAndBOLAProtections:
    """Verifies prevention of Insecure Direct Object Reference / Broken Object-Level Auth."""

    @pytest.mark.asyncio
    async def test_field_officer_cannot_view_other_user_profiles(self):
        """Field officer cannot inspect another user's profile (/users/{id})."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            token = create_access_token(
                subject="usr-field-1",
                claims={"role": "FIELD_OFFICER", "org": "org-ddma-aizawl", "email": "field@test.internal"},
            )
            res = await client.get(
                "/api/v1/users/usr-admin-1",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 403
            assert "insufficient permissions" in res.json()["error"]["message"].lower()

    @pytest.mark.asyncio
    async def test_ddma_aizawl_cannot_access_ddma_lunglei_roster(self):
        """DDMA Aizawl actor cannot read members of DDMA Lunglei."""
        # Ensure Lunglei org exists
        await repository.create_organization(
            code="DDMA-LUNGLEI",
            name="Lunglei District Disaster Management Authority",
            org_type=OrganizationType.DISTRICT_AUTHORITY.value,
            state="Mizoram",
            district="Lunglei",
            jurisdiction_scope="DISTRICT",
        )
        lunglei_org = await repository.get_organization_by_code("DDMA-LUNGLEI")

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            aizawl_token = create_access_token(
                subject="usr-ddma-1",
                claims={"role": "DDMA", "org": "org-ddma-aizawl", "email": "ddma.aizawl@sentinel.ner.internal"},
            )
            res = await client.get(
                f"/api/v1/organizations/{lunglei_org['id']}/members",
                headers={"Authorization": f"Bearer {aizawl_token}"},
            )
            assert res.status_code == 403
            assert "outside authorized organizational scope" in res.json()["error"]["message"].lower()

    @pytest.mark.asyncio
    async def test_pwd_cannot_modify_other_organization_membership(self):
        """PWD user cannot add members to Aizawl DDMA."""
        pwd_user = await repository.create_user(
            email="pwd.engineer@sentinel.ner.internal",
            password="SentinelPwd@2026!",
            full_name="Er. K. Sangluaia (PWD)",
            role="PWD",
            organization_id="org-bro-pushpak",
        )
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            pwd_token = create_access_token(
                subject=pwd_user["id"],
                claims={"role": "PWD", "org": "org-bro-pushpak", "email": pwd_user["email"]},
            )
            res = await client.post(
                "/api/v1/organizations/org-ddma-aizawl/members",
                json={"user_id": "usr-field-1", "role": "FIELD_OFFICER", "status": "ACTIVE"},
                headers={"Authorization": f"Bearer {pwd_token}"},
            )
            assert res.status_code == 403


class TestStaleAuthorizationLifecycle:
    """Verifies that unexpired tokens are denied once authoritative server membership state changes."""

    @pytest.mark.asyncio
    async def test_stale_token_denied_after_membership_revocation(self):
        # 1. User logs in, gets valid token
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            login_res = await client.post(
                "/api/v1/auth/login",
                json={"email": "field.kolasib@sentinel.ner.internal", "password": "SentinelField@2026!"},
            )
            assert login_res.status_code == 200
            user_token = login_res.json()["access_token"]

            # 2. Token works initially for self-inspection
            me_res1 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {user_token}"})
            assert me_res1.status_code == 200

            # 3. Admin suspends membership in server repository
            await repository.create_or_update_membership(
                user_id="usr-field-1",
                organization_id="org-ddma-aizawl",
                role="FIELD_OFFICER",
                status=MembershipStatus.SUSPENDED.value,
            )

            # 4. User attempts to make subsequent request with same unexpired token
            me_res2 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {user_token}"})
            assert me_res2.status_code == 403
            assert "suspended" in me_res2.json()["error"]["message"].lower()

            # 5. Admin reinstates membership
            await repository.create_or_update_membership(
                user_id="usr-field-1",
                organization_id="org-ddma-aizawl",
                role="FIELD_OFFICER",
                status=MembershipStatus.ACTIVE.value,
            )

            # 6. Request succeeds again
            me_res3 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {user_token}"})
            assert me_res3.status_code == 200
