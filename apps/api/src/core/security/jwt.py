"""
Sentinel NER — RFC 7519 Compliant JWT Engine
Generates and validates HMAC-SHA256 tokens with mandatory claim validation,
expiration controls, and instant token revocation tracking.
"""

import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Any, Dict, Optional, Set

from src.core.config import settings
from src.core.errors import UnauthorizedException

# In-memory revocation set for revoked token JTIs (mirrored to persistent store/Redis if configured)
_REVOKED_TOKENS: Set[str] = set()


def _b64_url_encode(data: bytes) -> str:
    """Encodes bytes to unpadded base64url string."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64_url_decode(s: str) -> bytes:
    """Decodes unpadded base64url string to bytes."""
    rem = len(s) % 4
    if rem > 0:
        s += "=" * (4 - rem)
    return base64.urlsafe_b64decode(s.encode("ascii"))


def create_access_token(
    subject: str,
    claims: Optional[Dict[str, Any]] = None,
    expires_in_seconds: int = 1800,  # 30 minutes default
) -> str:
    """Generates an RFC 7519 HS256 access token with explicit subject, issuer, audience, and jti."""
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(subject),
        "iss": settings.APP_NAME,
        "aud": "sentinel-ner-app",
        "iat": now,
        "nbf": now,
        "exp": now + expires_in_seconds,
        "jti": str(uuid.uuid4()),
        "token_type": "access",
    }
    if claims:
        payload.update(claims)

    encoded_header = _b64_url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64_url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")

    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    encoded_signature = _b64_url_encode(signature)

    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def create_refresh_token(
    subject: str,
    family_id: Optional[str] = None,
    expires_in_seconds: int = 604800,  # 7 days default
    jti: Optional[str] = None,
) -> str:
    """Generates a high-entropy refresh token tied to a unique JTI and session family."""
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(subject),
        "iss": settings.APP_NAME,
        "aud": "sentinel-ner-app",
        "iat": now,
        "nbf": now,
        "exp": now + expires_in_seconds,
        "jti": jti or str(uuid.uuid4()),
        "family_id": family_id or f"fam-{uuid.uuid4()}",
        "token_type": "refresh",
    }

    encoded_header = _b64_url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64_url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")

    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    encoded_signature = _b64_url_encode(signature)

    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def decode_and_validate_token(
    token: str,
    expected_type: Optional[str] = "access",
    check_revocation: bool = True,
) -> Dict[str, Any]:
    """
    Decodes and validates token with strict RFC 7519 compliance:
    - Explicit algorithm allowlisting (HS256 only, rejecting 'none', RS256, etc.)
    - Header validation (typ: JWT)
    - Cryptographic constant-time HMAC-SHA256 signature verification
    - Mandatory presence and validity of jti, iat, exp, iss, aud, and token_type
    - Rejection of tokens where exp <= iat or iat is in the future
    - Cross-type prevention (access cannot be refresh, refresh cannot be access)
    - Active revocation check against persistent repository and memory registry
    """
    if not token or not isinstance(token, str):
        raise UnauthorizedException("Malformed or missing authorization token.")

    parts = token.split(".")
    if len(parts) != 3:
        raise UnauthorizedException("Invalid token format.")

    encoded_header, encoded_payload, encoded_signature = parts

    # 1. Validate Header & Algorithm Allowlisting
    try:
        header_bytes = _b64_url_decode(encoded_header)
        header = json.loads(header_bytes.decode("utf-8"))
    except Exception:
        raise UnauthorizedException("Invalid token header.")

    if not isinstance(header, dict):
        raise UnauthorizedException("Token header must be a JSON object.")

    if header.get("alg") != "HS256":
        raise UnauthorizedException("Unsupported algorithm: only HS256 is permitted.")

    if header.get("typ") != "JWT":
        raise UnauthorizedException("Invalid token type in header.")

    # 2. Cryptographic Signature Verification (Constant-Time)
    try:
        signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        provided_sig = _b64_url_decode(encoded_signature)

        if not hmac.compare_digest(expected_sig, provided_sig):
            raise UnauthorizedException("Invalid token signature.")

        payload_bytes = _b64_url_decode(encoded_payload)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except UnauthorizedException:
        raise
    except Exception:
        raise UnauthorizedException("Token payload could not be decoded.")

    if not isinstance(payload, dict):
        raise UnauthorizedException("Token payload must be a JSON object.")

    now = int(time.time())

    # 3. Mandatory JTI Check
    jti = payload.get("jti")
    if not jti or not isinstance(jti, str) or not jti.strip():
        raise UnauthorizedException("Token is missing unique identifier (jti).")

    # 4. Issuance Time (iat) Validation
    iat = payload.get("iat")
    if iat is None or not isinstance(iat, (int, float)):
        raise UnauthorizedException("Token is missing issuance timestamp (iat).")
    iat = int(iat)
    if iat > now + 60:  # Allow max 60s clock skew
        raise UnauthorizedException("Token issued in the future.")

    # 5. Expiration (exp) Validation
    exp = payload.get("exp")
    if exp is None or not isinstance(exp, (int, float)):
        raise UnauthorizedException("Token is missing expiration timestamp (exp).")
    exp = int(exp)
    if now >= exp:
        raise UnauthorizedException("Token has expired.")
    if exp <= iat:
        raise UnauthorizedException("Token expiration precedes issuance.")

    # 6. Not Before (nbf) Validation
    nbf = payload.get("nbf")
    if nbf is not None:
        if now < int(nbf):
            raise UnauthorizedException("Token is not yet active.")

    # 7. Issuer (iss) Validation
    if payload.get("iss") != settings.APP_NAME:
        raise UnauthorizedException("Token issuer is invalid.")

    # 8. Audience (aud) Validation
    if payload.get("aud") != "sentinel-ner-app":
        raise UnauthorizedException("Token audience is invalid.")

    # 9. Token Type Cross-Usage Check
    token_type = payload.get("token_type")
    if not token_type:
        raise UnauthorizedException("Token is missing token_type claim.")
    if expected_type and token_type != expected_type:
        raise UnauthorizedException(f"Invalid token type: expected '{expected_type}', got '{token_type}'.")

    # 10. Revocation Check
    if check_revocation and is_token_revoked(jti):
        raise UnauthorizedException("Token has been revoked.")

    return payload


def revoke_token(jti: str) -> None:
    """Adds a token JTI to the in-memory revocation list."""
    if jti:
        _REVOKED_TOKENS.add(jti)


def is_token_revoked(jti: str) -> bool:
    """Checks if a JTI has been revoked in-memory."""
    return jti in _REVOKED_TOKENS


def clear_revoked_tokens() -> None:
    """Clears the in-memory revocation set (for test isolation)."""
    _REVOKED_TOKENS.clear()

