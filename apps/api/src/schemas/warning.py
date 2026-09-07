"""
Sentinel NER — Stage 8 Warning Domain Schemas & Contracts
Defines controlled public & operational warning entities, multi-channel delivery tracking,
truthful notification states, recipient acknowledgements, and bounded escalation.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

NON_AUTONOMOUS_WARNING_DISCLAIMER = (
    "NON-AUTONOMOUS WARNING PRINCIPLE: Warnings are controlled official communications created under human authorization. "
    "Predictions and sensor anomalies do NOT automatically publish public warnings or emergency evacuation orders. "
    "Every warning requires statutory civil defense authorization before dispatch."
)


class WarningType(str, Enum):
    ROAD_HAZARD_ADVISORY = "ROAD_HAZARD_ADVISORY"
    DEFORMATION_WATCH = "DEFORMATION_WATCH"
    CIVIL_PROTECTION_ALERT = "CIVIL_PROTECTION_ALERT"
    INFRASTRUCTURE_PROXIMITY_NOTICE = "INFRASTRUCTURE_PROXIMITY_NOTICE"


class WarningStatus(str, Enum):
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    AUTHORIZED = "AUTHORIZED"
    DISPATCHING = "DISPATCHING"
    DISPATCHED = "DISPATCHED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    PARTIALLY_ACKNOWLEDGED = "PARTIALLY_ACKNOWLEDGED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    RESOLVED = "RESOLVED"


class DeliveryChannel(str, Enum):
    SMS = "SMS"
    EMAIL = "EMAIL"
    PUSH = "PUSH"
    WEB_NOTIFICATION = "WEB_NOTIFICATION"


class DeliveryStatus(str, Enum):
    NOT_CONFIGURED = "NOT_CONFIGURED"
    SIMULATED = "SIMULATED"
    REQUESTED = "REQUESTED"
    SENDING = "SENDING"
    ACCEPTED_BY_PROVIDER = "ACCEPTED_BY_PROVIDER"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    UNKNOWN = "UNKNOWN"


class AcknowledgementState(str, Enum):
    PENDING = "PENDING"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    ESCALATED = "ESCALATED"
    TIMEOUT = "TIMEOUT"


class WarningRecipient(BaseModel):
    recipient_id: str = Field(default_factory=lambda: f"rcp-{uuid4().hex[:8]}")
    recipient_name: str
    agency_or_community: str
    contact_channel: DeliveryChannel
    contact_target: str = Field(..., description="Masked phone, email, or webhook target")
    role: Optional[str] = None
    district_id: str


class WarningDelivery(BaseModel):
    delivery_id: str = Field(default_factory=lambda: f"del-{uuid4().hex[:8]}")
    recipient_id: str
    channel: DeliveryChannel
    provider: str = Field(default="sentinel-internal-adapter")
    provider_message_id: Optional[str] = None
    status: DeliveryStatus = Field(default=DeliveryStatus.NOT_CONFIGURED)
    status_details: str = Field(default="Gateway pending live credentials")
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    retry_count: int = 0


class WarningAcknowledgement(BaseModel):
    acknowledgement_id: str = Field(default_factory=lambda: f"ack-{uuid4().hex[:8]}")
    recipient_id: str
    recipient_name: str
    acknowledged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    channel: DeliveryChannel
    notes: Optional[str] = None


class WarningEscalation(BaseModel):
    escalation_level: int = Field(default=1, le=3, description="Escalation level (max 3)")
    triggered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    next_recipient_group: str
    reason: str
    policy_id: str = Field(default="sentinel-escalation-standard-v1")


class Warning(BaseModel):
    id: str = Field(default_factory=lambda: f"wrn-{uuid4().hex[:12]}", description="Immutable warning identifier")
    warning_type: WarningType
    status: WarningStatus = Field(default=WarningStatus.DRAFT)
    headline: str = Field(..., min_length=10, max_length=200)
    body: str = Field(..., min_length=20, max_length=2000)
    mizo_translation: Optional[str] = Field(None, description="Local language advisory content")
    hindi_translation: Optional[str] = Field(None, description="National language advisory content")
    district_id: str
    state_id: str = "IN-MZ"
    affected_entity_type: str = Field(..., description="ROAD, ASSET, VILLAGE, or SLOPE_UNIT")
    affected_entity_id: str
    affected_entity_name: Optional[str] = None
    evidence_ids: List[str] = Field(default_factory=list, description="Stage 3, 5, 6, 7 evidence IDs")
    risk_prediction_id: Optional[str] = None
    consequence_relationship_id: Optional[str] = None
    uncertainty_level: str = "MEDIUM"
    issuing_authority_id: str = Field(..., description="Responsible agency/authority")
    authorized_by: Optional[str] = None
    authorized_at: Optional[datetime] = None
    authorization_comment: Optional[str] = None
    recipients: List[WarningRecipient] = Field(default_factory=list)
    deliveries: List[WarningDelivery] = Field(default_factory=list)
    acknowledgements: List[WarningAcknowledgement] = Field(default_factory=list)
    escalations: List[WarningEscalation] = Field(default_factory=list)
    idempotency_key: Optional[str] = None
    created_by: str = Field(default="system")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    effective_from: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    disclaimer: str = Field(default=NON_AUTONOMOUS_WARNING_DISCLAIMER)

    @field_validator("expires_at")
    @classmethod
    def validate_expiry(cls, v: datetime, info: Any) -> datetime:
        data = info.data
        eff = data.get("effective_from")
        if eff and v <= eff:
            raise ValueError("expires_at must be strictly greater than effective_from")
        return v


class WarningCreateRequest(BaseModel):
    warning_type: WarningType
    headline: str = Field(..., min_length=10, max_length=200)
    body: str = Field(..., min_length=20, max_length=2000)
    mizo_translation: Optional[str] = None
    hindi_translation: Optional[str] = None
    district_id: str
    affected_entity_type: str
    affected_entity_id: str
    affected_entity_name: Optional[str] = None
    consequence_relationship_id: Optional[str] = None
    risk_prediction_id: Optional[str] = None
    issuing_authority_id: str
    recipients: List[WarningRecipient] = Field(default_factory=list)
    effective_from: Optional[datetime] = None
    expires_at: datetime
    idempotency_key: Optional[str] = None


class WarningReviewRequest(BaseModel):
    review_comment: str = Field(..., min_length=5)


class WarningAuthorizeRequest(BaseModel):
    decision: str = Field(..., pattern="^(APPROVE|REJECT)$")
    justification: str = Field(..., min_length=5)


class WarningDispatchRequest(BaseModel):
    idempotency_key: str = Field(..., min_length=10, description="Mandatory idempotency key preventing double dispatch")
    channels: Optional[List[DeliveryChannel]] = None


class WarningAcknowledgeRequest(BaseModel):
    recipient_id: str
    channel: DeliveryChannel = DeliveryChannel.WEB_NOTIFICATION
    notes: Optional[str] = None


class WarningCancelRequest(BaseModel):
    cancellation_reason: str = Field(..., min_length=5)


class WarningSummary(BaseModel):
    total_warnings: int = 0
    active_count: int = 0
    draft_count: int = 0
    review_count: int = 0
    dispatched_count: int = 0
    acknowledged_count: int = 0
    district_id: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
