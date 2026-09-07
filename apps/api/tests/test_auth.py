"""
Sentinel NER — Stage 2 Authentication Tests
Validates cryptographic password hashing, JWT RFC 7519 compliance,
login, token refresh, token revocation, and user context.
"""

import pytest
from httpx import AsyncClient

from src.core.errors import UnauthorizedException
from src.core.security.crypto import hash_password, verify_password
from src.core.security.jwt import (
    create_access_token,
    decode_and_validate_token,
    is_token_revoked,
    revoke_token,
)
from src.db.repository import repository


@pytest.fixture(autouse=True)
async def seed_data():
    """Ensure repository has baseline seed fixtures for testing."""
    await repository.seed_dev_data_if_empty()


class TestCryptoAndJWT:
    def test_password_hashing_and_verification(self):
        pwd = "SecureOperationalPassword@2026"
        hashed = hash_password(pwd, iterations=10_000)  # low iterations for fast test
        assert hashed.startswith("$pbkdf2-sha256$10000$")
        assert verify_password(pwd, hashed) is True
        assert verify_password("WrongPassword@123", hashed) is False
        assert verify_password("", hashed) is False

    def test_jwt_rfc7519_creation_and_validation(self):
        token = create_access_token(
            subject="usr-test-123",
            claims={"role": "DDMA", "org": "org-test-1"},
            expires_in_seconds=60,
        )
        assert isinstance(token, str)
        assert len(token.split(".")) == 3

        payload = decode_and_validate_token(token, expected_type="access")
        assert payload["sub"] == "usr-test-123"
        assert payload["role"] == "DDMA"
        assert payload["org"] == "org-test-1"
        assert payload["iss"] == "sentinel-ner"
        assert payload["aud"] == "sentinel-ner-app"

    def test_jwt_tampered_signature_rejection(self):
        token = create_access_token(subject="usr-test-123")
        parts = token.split(".")
        tampered_token = f"{parts[0]}.{parts[1]}.bad_signature_here"

        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tampered_token, expected_type="access")
        assert "signature" in exc.value.message.lower()

    def test_jwt_expired_token_rejection(self):
        token = create_access_token(subject="usr-test-123", expires_in_seconds=-10)
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(token, expected_type="access")
        assert "expired" in exc.value.message.lower()

    def test_jwt_revocation(self):
        token = create_access_token(subject="usr-test-123")
        payload = decode_and_validate_token(token)
        jti = payload["jti"]

        assert is_token_revoked(jti) is False
        revoke_token(jti)
        assert is_token_revoked(jti) is True

        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(token)
        assert "revoked" in exc.value.message.lower()


class TestAuthAPI:
    @pytest.mark.asyncio
    async def test_successful_login(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@sentinel.ner.internal", "password": "SentinelAdmin@2026!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "Bearer"
        assert data["role"] == "PLATFORM_ADMIN"

    @pytest.mark.asyncio
    async def test_login_invalid_password(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@sentinel.ner.internal", "password": "InvalidPassword@123"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "ERR_UNAUTHORIZED"

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@sentinel.ner.internal", "password": "AnyPassword@123"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == "ERR_UNAUTHORIZED"

    @pytest.mark.asyncio
    async def test_token_refresh(self, client: AsyncClient):
        # 1. Login to get refresh token
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "ddma.aizawl@sentinel.ner.internal", "password": "SentinelDdma@2026!"},
        )
        refresh_token = login_resp.json()["refresh_token"]

        # 2. Refresh token
        refresh_resp = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_resp.status_code == 200
        new_data = refresh_resp.json()
        assert "access_token" in new_data
        assert "refresh_token" in new_data
        assert new_data["refresh_token"] != refresh_token

    @pytest.mark.asyncio
    async def test_get_current_user_context(self, client: AsyncClient):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "ddma.aizawl@sentinel.ner.internal", "password": "SentinelDdma@2026!"},
        )
        token = login_resp.json()["access_token"]

        me_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_resp.status_code == 200
        me = me_resp.json()
        assert me["email"] == "ddma.aizawl@sentinel.ner.internal"
        assert me["role"] == "DDMA"
        assert me["organization_name"] == "Aizawl District Disaster Management Authority"
        assert "users:read" in me["permissions"]
        assert "organizations:manage_members" in me["permissions"]

    @pytest.mark.asyncio
    async def test_logout_revokes_token(self, client: AsyncClient):
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "field.kolasib@sentinel.ner.internal", "password": "SentinelField@2026!"},
        )
        token = login_resp.json()["access_token"]

        # Logout
        logout_resp = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert logout_resp.status_code == 200

        # Attempting /me with revoked token must fail with 401
        retry_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert retry_resp.status_code == 401
        assert retry_resp.json()["error"]["code"] == "ERR_UNAUTHORIZED"
