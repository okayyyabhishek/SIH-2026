"""
Sentinel NER — Sliding-Window Rate Limiter
Defends authentication endpoints (/auth/login, /auth/refresh) against credential stuffing and brute-force.
"""

import time
from collections import defaultdict
from typing import Dict, List

from src.core.errors import RateLimitExceededException

# In-memory sliding window store: key -> list of timestamp floats
_ATTEMPTS: Dict[str, List[float]] = defaultdict(list)


def check_rate_limit(key: str, max_attempts: int = 5, window_seconds: int = 60) -> None:
    """
    Enforces a sliding window rate limit on a specific key (e.g. IP, email).
    Raises RateLimitExceededException if max_attempts exceeded within window_seconds.
    """
    now = time.time()
    cutoff = now - window_seconds

    # Filter out timestamps older than window
    timestamps = [t for t in _ATTEMPTS[key] if t > cutoff]
    _ATTEMPTS[key] = timestamps

    if len(timestamps) >= max_attempts:
        oldest = timestamps[0]
        retry_after = max(1, int(oldest + window_seconds - now))
        raise RateLimitExceededException(retry_after=retry_after)

    _ATTEMPTS[key].append(now)


def reset_rate_limit(key: str) -> None:
    """Resets attempts for a key (e.g. upon successful authentication)."""
    if key in _ATTEMPTS:
        del _ATTEMPTS[key]


def rate_limit(key: str, max_requests: int = 60, window_seconds: int = 60) -> None:
    """Enforces sliding window rate limit using check_rate_limit."""
    check_rate_limit(key=key, max_attempts=max_requests, window_seconds=window_seconds)


def check_auth_rate_limits(client_ip: str, identifier: str) -> None:
    """
    Enforces defense-in-depth sliding window rate limits:
    1. Account/Identity Limit: max 5 attempts / 60 seconds per account (brute-force defense)
    2. IP Limit: max 20 attempts / 60 seconds per IP (credential stuffing defense across accounts)
    """
    # 1. IP level check
    safe_ip = client_ip.strip() if client_ip else "unknown"
    check_rate_limit(f"ip:{safe_ip}", max_attempts=20, window_seconds=60)

    # 2. Account level check
    safe_id = identifier.strip().lower() if identifier else "unknown"
    check_rate_limit(f"account:{safe_id}", max_attempts=5, window_seconds=60)


def clear_all_rate_limits() -> None:
    """Clears all rate limit state (for test isolation)."""
    _ATTEMPTS.clear()

