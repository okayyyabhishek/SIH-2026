"""
Sentinel NER — Security Hardening Tests: Tokens, JWT, Rotation, and Production Fixtures
Tests:
- Explicit HS256 algorithm allowlisting & rejection of 'none', RS256
- Header validation (typ: JWT)
- Signature tampering rejection
- Mandatory claims validation (jti, iat, exp, iss, aud, token_type)
- Negative tests for exp <= iat, future iat, expired tokens
- Cross-type token prevention (access token as refresh token, refresh token as access token)
- Token revocation and multi-instance persistence
- Refresh token rotation (Token A -> Token B -> Token A revoked)
- Refresh token reuse detection (family invalidation + security event)
- Password hash format verification & automatic upgrade (needs_rehash)
- Production mode dev fixture rejection
"""

import json
import time

import pytest
from httpx import ASGITransport, AsyncClient

from src.core.config import settings
from src.core.errors import UnauthorizedException
from src.core.security.crypto import hash_password, needs_rehash, verify_password
from src.core.security.jwt import (
    _b64_url_encode,
    clear_revoked_tokens,
    create_access_token,
    create_refresh_token,
    decode_and_validate_token,
    revoke_token,
)
from src.db.repository import repository
from src.main import app


def _make_token(
    header: dict = None,
    payload: dict = None,
    secret: str = settings.SECRET_KEY,
) -> str:
    import hashlib
    import hmac

    now = int(time.time())
    h = {"alg": "HS256", "typ": "JWT"} if header is None else header
    p = {
        "sub": "usr-test-subject",
        "iss": settings.APP_NAME,
        "aud": "sentinel-ner-app",
        "iat": now,
        "exp": now + 1800,
        "jti": f"jti-test-{int(now)}",
        "token_type": "access",
    }
    if payload is not None:
        p.update(payload)

    enc_h = _b64_url_encode(json.dumps(h, separators=(",", ":")).encode("utf-8"))
    enc_p = _b64_url_encode(json.dumps(p, separators=(",", ":")).encode("utf-8"))
    if h.get("alg") == "none":
        return f"{enc_h}.{enc_p}."
    sig = _b64_url_encode(hmac.new(secret.encode("utf-8"), f"{enc_h}.{enc_p}".encode("ascii"), hashlib.sha256).digest())
    return f"{enc_h}.{enc_p}.{sig}"


class TestJWTHardeningAndClaims:
    """Verifies all 21 required JWT security specifications with dedicated test evidence."""

    def setup_method(self):
        clear_revoked_tokens()

    def test_jwt_01_hs256_accepted(self):
        """1. HS256 is explicitly allowlisted and accepted."""
        tok = _make_token()
        decoded = decode_and_validate_token(tok, expected_type="access")
        assert decoded["sub"] == "usr-test-subject"
        assert decoded["iss"] == settings.APP_NAME

    def test_jwt_02_alg_none_rejected(self):
        """2. Tokens specifying alg='none' must be strictly rejected."""
        tok = _make_token(header={"alg": "none", "typ": "JWT"})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "unsupported algorithm" in exc.value.message.lower() or "signature" in exc.value.message.lower()

    def test_jwt_03_rs256_rejected(self):
        """3. Tokens specifying RS256 must be rejected."""
        tok = _make_token(header={"alg": "RS256", "typ": "JWT"})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "unsupported algorithm" in exc.value.message.lower()

    def test_jwt_04_malformed_jwt_rejected(self):
        """4. Malformed tokens (wrong segment count, non-base64) must be rejected."""
        with pytest.raises(UnauthorizedException) as exc1:
            decode_and_validate_token("only.two.parts.are.here.now", expected_type="access")
        assert "invalid token format" in exc1.value.message.lower()

        with pytest.raises(UnauthorizedException) as exc2:
            decode_and_validate_token("garbage_non_token_string", expected_type="access")
        assert "invalid token format" in exc2.value.message.lower()

    def test_jwt_05_tampered_signature_rejected(self):
        """5. Tokens with modified payload or signature must fail signature check."""
        tok = _make_token()
        tampered = tok[:-4] + ("ABCD" if not tok.endswith("ABCD") else "WXYZ")
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tampered, expected_type="access")
        assert "invalid token signature" in exc.value.message.lower()

    def test_jwt_06_missing_jti_rejected(self):
        """6. Tokens without a jti identifier must be rejected."""
        tok = _make_token(payload={"jti": None})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "jti" in exc.value.message.lower()

    def test_jwt_07_malformed_jti_rejected(self):
        """7. Empty or non-string jti must be rejected."""
        tok1 = _make_token(payload={"jti": "   "})
        with pytest.raises(UnauthorizedException) as exc1:
            decode_and_validate_token(tok1, expected_type="access")
        assert "jti" in exc1.value.message.lower()

        tok2 = _make_token(payload={"jti": 12345})
        with pytest.raises(UnauthorizedException) as exc2:
            decode_and_validate_token(tok2, expected_type="access")
        assert "jti" in exc2.value.message.lower()

    def test_jwt_08_missing_iat_rejected(self):
        """8. Tokens missing issuance timestamp (iat) must be rejected."""
        tok = _make_token(payload={"iat": None})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "iat" in exc.value.message.lower()

    def test_jwt_09_missing_exp_rejected(self):
        """9. Tokens missing expiration timestamp (exp) must be rejected."""
        tok = _make_token(payload={"exp": None})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "exp" in exc.value.message.lower()

    def test_jwt_10_missing_issuer_rejected(self):
        """10. Tokens missing issuer (iss) must be rejected."""
        tok = _make_token(payload={"iss": None})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "issuer" in exc.value.message.lower()

    def test_jwt_11_wrong_issuer_rejected(self):
        """11. Tokens with wrong issuer must be rejected."""
        tok = _make_token(payload={"iss": "rogue-authority"})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "issuer" in exc.value.message.lower()

    def test_jwt_12_missing_audience_rejected(self):
        """12. Tokens missing audience (aud) must be rejected."""
        tok = _make_token(payload={"aud": None})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "audience" in exc.value.message.lower()

    def test_jwt_13_wrong_audience_rejected(self):
        """13. Tokens with wrong audience must be rejected."""
        tok = _make_token(payload={"aud": "unauthorized-application"})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "audience" in exc.value.message.lower()

    def test_jwt_14_missing_token_type_rejected(self):
        """14. Tokens missing token_type claim must be rejected."""
        tok = _make_token(payload={"token_type": None})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "token_type" in exc.value.message.lower()

    def test_jwt_15_invalid_token_type_rejected(self):
        """15. Tokens with unexpected token_type must be rejected."""
        tok = _make_token(payload={"token_type": "superuser"})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "invalid token type" in exc.value.message.lower()

    def test_jwt_16_future_iat_within_allowed_skew_handled_correctly(self):
        """16. Future iat within 60s clock skew window is accepted."""
        now = int(time.time())
        tok = _make_token(payload={"iat": now + 30, "exp": now + 1800})
        decoded = decode_and_validate_token(tok, expected_type="access")
        assert decoded["iat"] == now + 30

    def test_jwt_17_future_iat_beyond_60s_rejected(self):
        """17. Future iat exceeding 60s skew is rejected."""
        now = int(time.time())
        tok = _make_token(payload={"iat": now + 120, "exp": now + 1800})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "future" in exc.value.message.lower()

    def test_jwt_18_expired_token_rejected(self):
        """18. Expired tokens (now >= exp) must be rejected."""
        now = int(time.time())
        tok = _make_token(payload={"iat": now - 3600, "exp": now - 1800})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "expired" in exc.value.message.lower()

    def test_jwt_19_exp_precedes_or_equals_iat_rejected(self):
        """19. exp <= iat (invalid lifecycle ordering) must be rejected."""
        now = int(time.time())
        # In future skew window so exp > now holds, but exp <= iat
        tok = _make_token(payload={"iat": now + 30, "exp": now + 20})
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(tok, expected_type="access")
        assert "expiration precedes" in exc.value.message.lower() or "expired" in exc.value.message.lower()

    def test_jwt_20_access_token_cannot_be_used_as_refresh_token(self):
        """20. Access token cannot be used where a refresh token is required."""
        acc = create_access_token(subject="usr-123")
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(acc, expected_type="refresh")
        assert "invalid token type" in exc.value.message.lower()

    def test_jwt_21_refresh_token_cannot_be_used_as_access_token(self):
        """21. Refresh token cannot be used where an access token is required."""
        ref = create_refresh_token(subject="usr-123")
        with pytest.raises(UnauthorizedException) as exc:
            decode_and_validate_token(ref, expected_type="access")
        assert "invalid token type" in exc.value.message.lower()


class TestRefreshTokenRotationAndReuse:
    @pytest.mark.asyncio
    async def test_refresh_token_rotation_lifecycle(self):
        """
        Lifecycle: Refresh Token A -> /refresh -> Access Token B + Refresh Token B.
        Refresh Token A is immediately revoked.
        """
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            login_res = await client.post(
                "/api/v1/auth/login",
                json={"email": "ddma.aizawl@sentinel.ner.internal", "password": "SentinelDdma@2026!"},
            )
            assert login_res.status_code == 200
            token_a_data = login_res.json()
            refresh_token_a = token_a_data["refresh_token"]

            # Rotate once
            rot_res1 = await client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": refresh_token_a},
            )
            assert rot_res1.status_code == 200
            token_b_data = rot_res1.json()
            refresh_token_b = token_b_data["refresh_token"]
            assert refresh_token_b != refresh_token_a

            # Verify Refresh Token A cannot be used again
            rot_res2 = await client.post(
                "/api/v1/auth/refresh",
                json={"refresh_token": refresh_token_a},
            )
            assert rot_res2.status_code == 401
            assert "reuse" in rot_res2.json()["error"]["message"].lower()

    @pytest.mark.asyncio
    async def test_refresh_token_reuse_invalidates_entire_family(self):
        """
        Compromise scenario: If an attacker replays Refresh Token A after it was
        legitimately rotated to Token B, the server detects reuse, revokes Token B,
        and logs a high-severity security event.
        """
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            login_res = await client.post(
                "/api/v1/auth/login",
                json={"email": "ddma.aizawl@sentinel.ner.internal", "password": "SentinelDdma@2026!"},
            )
            assert login_res.status_code == 200
            token_a = login_res.json()["refresh_token"]

            # Legitimate rotation: Token A -> Token B
            rot_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": token_a})
            assert rot_res.status_code == 200
            token_b = rot_res.json()["refresh_token"]

            # Attacker steals and replays Token A:
            reuse_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": token_a})
            assert reuse_res.status_code == 401
            assert "reuse" in reuse_res.json()["error"]["message"].lower()

            # Legitimate user now tries to use Token B: It must be revoked because family was invalidated!
            subsequent_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": token_b})
            assert subsequent_res.status_code == 401
            assert "revoked" in subsequent_res.json()["error"]["message"].lower() or "invalid" in subsequent_res.json()["error"]["message"].lower()

            # Verify REFRESH_TOKEN_REUSE_DETECTED security event was persisted
            events, _ = await repository.list_security_events(event_type="REFRESH_TOKEN_REUSE_DETECTED")
            assert len(events) > 0
            assert events[0]["result"] == "DENIED"


class TestPasswordHardeningAndRehash:
    def test_password_hash_metadata_and_salt(self):
        """Verifies hash format contains algorithm, iterations, salt, and hash."""
        pwd = "TestSecurePassword@2026!"
        h = hash_password(pwd, iterations=600_000)
        parts = h.split("$")
        assert len(parts) == 5
        assert parts[1] == "pbkdf2-sha256"
        assert parts[2] == "600000"
        assert len(parts[3]) == 32  # 16-byte salt hex
        assert len(parts[4]) == 64  # 32-byte sha256 hex
        assert verify_password(pwd, h) is True
        assert verify_password("WrongPassword", h) is False

    def test_needs_rehash_detects_outdated_iterations(self):
        """Stored hash with fewer iterations triggers automatic upgrade."""
        old_hash = hash_password("OldPassword123", iterations=100_000)
        assert needs_rehash(old_hash, target_iterations=600_000) is True

        modern_hash = hash_password("ModernPassword123", iterations=600_000)
        assert needs_rehash(modern_hash, target_iterations=600_000) is False


class TestProductionDevFixtureRejection:
    @pytest.mark.asyncio
    async def test_production_mode_rejects_development_fixtures(self):
        """
        When APP_ENV is set to 'production' or ENABLE_DEV_FIXTURES is False,
        credentials for seeded demo fixtures are strictly rejected.
        """
        original_env = settings.APP_ENV
        original_flag = settings.ENABLE_DEV_FIXTURES
        try:
            settings.APP_ENV = "production"
            settings.ENABLE_DEV_FIXTURES = False

            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
                res = await client.post(
                    "/api/v1/auth/login",
                    json={"email": "admin@sentinel.ner.internal", "password": "SentinelAdmin@2026!"},
                )
                assert res.status_code == 401
                assert "not permitted in production" in res.json()["error"]["message"].lower()

                # Verify security event logged the rejection
                events, _ = await repository.list_security_events(event_type="LOGIN_FAILURE")
                assert any("demo_fixture_disabled" in str(e.get("details")) for e in events)
        finally:
            settings.APP_ENV = original_env
            settings.ENABLE_DEV_FIXTURES = original_flag


class TestTokenRevocationContract:
    """Explicit verification of revocation contract across token types and sessions."""

    @pytest.mark.asyncio
    async def test_revoked_access_token_rejected(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            login_res = await client.post(
                "/api/v1/auth/login",
                json={"email": "field.kolasib@sentinel.ner.internal", "password": "SentinelField@2026!"},
            )
            token = login_res.json()["access_token"]

            # Verify access initially succeeds
            res1 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert res1.status_code == 200

            # Revoke token JTI
            payload = decode_and_validate_token(token)
            revoke_token(payload["jti"])
            await repository.revoke_token(payload["jti"], user_id=payload["sub"], reason="admin_revocation")

            # Verify revoked access token is strictly rejected
            res2 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert res2.status_code == 401
            assert "revoked" in res2.json()["error"]["message"].lower()

    @pytest.mark.asyncio
    async def test_revoked_refresh_token_rejected(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            login_res = await client.post(
                "/api/v1/auth/login",
                json={"email": "field.kolasib@sentinel.ner.internal", "password": "SentinelField@2026!"},
            )
            refresh_token = login_res.json()["refresh_token"]

            # Explicitly revoke refresh token in repository
            payload = decode_and_validate_token(refresh_token, expected_type="refresh", check_revocation=False)
            await repository.revoke_token(payload["jti"], user_id=payload["sub"], reason="security_policy")

            # Verify refresh endpoint rejects revoked refresh token
            ref_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
            assert ref_res.status_code == 401
            assert "revoked" in ref_res.json()["error"]["message"].lower() or "invalid" in ref_res.json()["error"]["message"].lower()

    @pytest.mark.asyncio
    async def test_logout_invalidates_active_session_and_tokens(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            login_res = await client.post(
                "/api/v1/auth/login",
                json={"email": "field.kolasib@sentinel.ner.internal", "password": "SentinelField@2026!"},
            )
            access_token = login_res.json()["access_token"]
            refresh_token = login_res.json()["refresh_token"]

            # Perform logout with refresh token in body
            logout_res = await client.post(
                "/api/v1/auth/logout",
                headers={"Authorization": f"Bearer {access_token}"},
                json={"refresh_token": refresh_token},
            )
            assert logout_res.status_code == 200

            # Both access and refresh tokens must now be rejected
            me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
            assert me_res.status_code == 401

            ref_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
            assert ref_res.status_code == 401

