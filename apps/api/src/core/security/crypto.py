"""
Sentinel NER — Cryptographic Utilities
NIST SP 800-132 & OWASP compliant password hashing and token generation.
Uses PBKDF2-HMAC-SHA256 with 600,000 rounds and cryptographically secure random salts.
"""

import hashlib
import hmac
import secrets


def hash_password(password: str, iterations: int = 600_000) -> str:
    """
    Hashes a plaintext password using PBKDF2-HMAC-SHA256 with a random 16-byte salt.
    Returns format: $pbkdf2-sha256$<iterations>$<salt_hex>$<hash_hex>
    """
    if not password:
        raise ValueError("Password cannot be empty")
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"$pbkdf2-sha256${iterations}${salt.hex()}${derived.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a stored PBKDF2-HMAC-SHA256 hash.
    Executes in constant time to prevent timing attacks.
    """
    if not plain_password or not hashed_password:
        return False

    try:
        parts = hashed_password.split("$")
        # Format: ["", "pbkdf2-sha256", "<iterations>", "<salt_hex>", "<hash_hex>"]
        if len(parts) != 5 or parts[1] != "pbkdf2-sha256":
            return False

        iterations = int(parts[2])
        salt = bytes.fromhex(parts[3])
        expected_hash = bytes.fromhex(parts[4])

        computed_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(computed_hash, expected_hash)
    except Exception:
        return False


def generate_secure_token(nbytes: int = 32) -> str:
    """Generates a cryptographically secure random URL-safe token."""
    return secrets.token_urlsafe(nbytes)


def needs_rehash(hashed_password: str, target_iterations: int = 600_000) -> bool:
    """
    Evaluates whether a stored password hash requires rehashing due to
    outdated algorithm or lower iteration count.
    """
    if not hashed_password:
        return True
    try:
        parts = hashed_password.split("$")
        # Format: ["", "pbkdf2-sha256", "<iterations>", "<salt_hex>", "<hash_hex>"]
        if len(parts) != 5 or parts[1] != "pbkdf2-sha256":
            return True
        iterations = int(parts[2])
        return iterations < target_iterations
    except Exception:
        return True

