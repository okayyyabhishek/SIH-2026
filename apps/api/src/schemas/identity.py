"""
Sentinel NER — Identity, Tenancy & Security Schemas
Pydantic v2 schemas for User, Organization, Membership, and Security Audit models.
"""

import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)+$")


class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"
    PENDING = "PENDING"
    SUSPENDED = "SUSPENDED"


class MembershipStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    SUSPENDED = "SUSPENDED"
    REVOKED = "REVOKED"


class OrganizationType(str, Enum):
    STATE_AUTHORITY = "STATE_AUTHORITY"
    DISTRICT_AUTHORITY = "DISTRICT_AUTHORITY"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    FIELD_STATION = "FIELD_STATION"
    COMMUNITY = "COMMUNITY"


# ----------------- User Schemas -----------------

class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    role: str = Field(default="FIELD_OFFICER")
    organization_id: Optional[str] = None
    status: UserStatus = Field(default=UserStatus.ACTIVE)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        norm = v.strip().lower()
        if not EMAIL_REGEX.match(norm):
            raise ValueError("Invalid email address format.")
        return norm


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    organization_id: Optional[str] = None
    status: Optional[UserStatus] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    organization_id: Optional[str] = None
    status: UserStatus
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    skip: int
    limit: int


# ----------------- Organization Schemas -----------------

class OrganizationCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Unique org code (e.g. DDMA-AIZAWL)")
    name: str = Field(..., min_length=2)
    type: OrganizationType
    state: str = Field(default="Mizoram")
    district: Optional[str] = None
    jurisdiction_scope: str = Field(default="DISTRICT")


class OrganizationResponse(BaseModel):
    id: str
    code: str
    name: str
    type: OrganizationType
    state: str
    district: Optional[str] = None
    jurisdiction_scope: str
    created_at: datetime
    updated_at: datetime


class OrganizationListResponse(BaseModel):
    items: List[OrganizationResponse]
    total: int
    skip: int
    limit: int


# ----------------- Membership Schemas -----------------

class MembershipCreate(BaseModel):
    user_id: str
    organization_id: str
    role: str
    status: MembershipStatus = Field(default=MembershipStatus.ACTIVE)


class MembershipUpdate(BaseModel):
    role: Optional[str] = None
    status: Optional[MembershipStatus] = None


class MembershipResponse(BaseModel):
    id: str
    user_id: str
    organization_id: str
    role: str
    status: MembershipStatus
    created_at: datetime
    updated_at: datetime


class MembershipListResponse(BaseModel):
    items: List[MembershipResponse]
    total: int
    skip: int
    limit: int


# ----------------- Security Audit Schemas -----------------

class SecurityEventResponse(BaseModel):
    id: str
    timestamp: datetime
    event_type: str
    actor_user_id: Optional[str] = None
    actor_role: Optional[str] = None
    organization_id: Optional[str] = None
    resource: str
    action: str
    result: str  # SUCCESS / DENIED
    correlation_id: str
    client_ip: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class SecurityEventListResponse(BaseModel):
    items: List[SecurityEventResponse]
    total: int
    skip: int
    limit: int
