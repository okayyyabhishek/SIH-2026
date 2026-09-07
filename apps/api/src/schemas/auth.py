"""
Sentinel NER — Authentication Schemas
Defines request and response contracts for login, token refresh, and user context.
"""

import re
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)+$")


class LoginRequest(BaseModel):
    """Payload for user login."""
    email: str = Field(..., description="Operational user email address")
    password: str = Field(..., min_length=8, description="User password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        norm = v.strip().lower()
        if not EMAIL_REGEX.match(norm):
            raise ValueError("Invalid email address format.")
        return norm


class RefreshTokenRequest(BaseModel):
    """Payload for refreshing an expired access token."""
    refresh_token: str = Field(..., description="Valid high-entropy refresh token")


class TokenResponse(BaseModel):
    """Token envelope returned upon successful authentication or refresh."""
    access_token: str = Field(..., description="RFC 7519 HMAC-SHA256 bearer access token")
    refresh_token: str = Field(..., description="High-entropy refresh token")
    token_type: str = "Bearer"
    expires_in: int = Field(1800, description="Token lifetime in seconds")
    user_id: str
    role: str
    organization_id: Optional[str] = None


class UserContextResponse(BaseModel):
    """Authoritative user context returned by /api/v1/auth/me."""
    id: str
    email: str
    full_name: str
    status: str
    role: str
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    jurisdiction_scope: str
    permissions: List[str]
