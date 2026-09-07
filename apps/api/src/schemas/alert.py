"""
Sentinel NER — Stage 9 Alerting, Notification Delivery & Degraded Connectivity Schemas
Defines concrete alert instances, multi-channel delivery states, truthful provider capabilities,
bounded retries, asynchronous delivery jobs, field acknowledgements, and degraded connectivity contracts.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from src.schemas.warning import DeliveryChannel


class AlertStatus(str, Enum):
    QUEUED = "QUEUED"
    DISPATCHING = "DISPATCHING"
    DISPATCHED = "DISPATCHED"
    DELIVERED = "DELIVERED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    FAILED = "FAILED"
    DELIVERY_FAILED = "DELIVERY_FAILED"
    EXPIRED = "EXPIRED"


class AlertPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ProviderCapabilityStatus(str, Enum):
    CONFIGURED = "CONFIGURED"
    NOT_CONFIGURED = "NOT_CONFIGURED"
    DISABLED = "DISABLED"
    DEGRADED = "DEGRADED"
    FAILED = "FAILED"


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    EXPIRED = "EXPIRED"


class AcknowledgementMethod(str, Enum):
    WEB = "WEB"
    MOBILE = "MOBILE"
    FIELD_TERMINAL = "FIELD_TERMINAL"
    API = "API"
    OTHER = "OTHER"


class ConnectivityState(str, Enum):
    ONLINE = "ONLINE"
    DEGRADED = "DEGRADED"
    OFFLINE = "OFFLINE"
    RECOVERING = "RECOVERING"


class FreshnessState(str, Enum):
    CURRENT = "CURRENT"
    STALE = "STALE"
    UNKNOWN = "UNKNOWN"


class OperationType(str, Enum):
    ALERT_ACKNOWLEDGE = "ALERT_ACKNOWLEDGE"
    OFFLINE_PING = "OFFLINE_PING"


class OperationStatus(str, Enum):
    PENDING = "PENDING"
    SYNCING = "SYNCING"
    SYNCED = "SYNCED"
    FAILED = "FAILED"
    CONFLICT = "CONFLICT"
    EXPIRED = "EXPIRED"


def mask_contact_target(target: str, channel: DeliveryChannel) -> str:
    """Masks personal phone/email target to prevent privacy leakage in logs and UI."""
    if not target:
        return "***"
    if channel == DeliveryChannel.EMAIL and "@" in target:
        parts = target.split("@", 1)
        name, domain = parts[0], parts[1]
        masked_name = name[:2] + "***" if len(name) > 2 else "***"
        return f"{masked_name}@{domain}"
    if channel == DeliveryChannel.SMS:
        clean = target.strip()
        if len(clean) >= 8:
            return f"{clean[:3]}****{clean[-4:]}"
        return f"***{clean[-3:]}"
    if len(target) > 6:
        return f"{target[:2]}***{target[-2:]}"
    return "***"


class Alert(BaseModel):
    id: str = Field(default_factory=lambda: f"alt-{uuid4().hex[:12]}", description="Immutable alert identifier")
    warning_id: str = Field(..., description="Authorized source warning ID")
    action_id: Optional[str] = Field(None, description="Optional associated operational action ID")
    recipient_id: str = Field(..., description="Authoritative recipient ID")
    recipient_name: str = Field(..., description="Recipient or community group designation")
    channel: DeliveryChannel
    contact_target_masked: str = Field(..., description="Masked phone, email, or webhook destination")
    priority: AlertPriority = Field(default=AlertPriority.MEDIUM)
    payload_reference: Dict[str, Any] = Field(default_factory=dict, description="Advisory summary reference")
    status: AlertStatus = Field(default=AlertStatus.QUEUED)
    provider: str = Field(default="unconfigured", description="Gateway provider designation")
    provider_status: ProviderCapabilityStatus = Field(default=ProviderCapabilityStatus.NOT_CONFIGURED)
    provider_message_id: Optional[str] = None
    attempt_count: int = Field(default=0, ge=0)
    max_retries: int = Field(default=3, le=5)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    queued_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    expires_at: datetime
    correlation_id: str = Field(default_factory=lambda: f"corr-{uuid4().hex[:10]}")
    idempotency_key: Optional[str] = None
    district_id: str
    organization_id: str
    provenance: Dict[str, Any] = Field(default_factory=dict)


class AlertCreateRequest(BaseModel):
    warning_id: str
    action_id: Optional[str] = None
    recipient_id: str
    recipient_name: str
    channel: DeliveryChannel
    contact_target: str
    priority: AlertPriority = AlertPriority.MEDIUM
    expires_at: datetime
    district_id: str
    organization_id: str
    idempotency_key: Optional[str] = None


class AlertAcknowledgement(BaseModel):
    id: str = Field(default_factory=lambda: f"ack-{uuid4().hex[:12]}", description="Unique acknowledgement ID")
    alert_id: str
    recipient_id: str
    acknowledged_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledgement_method: AcknowledgementMethod = AcknowledgementMethod.WEB
    notes: Optional[str] = None
    correlation_id: str = Field(default_factory=lambda: f"corr-{uuid4().hex[:10]}")


class AlertAcknowledgeRequest(BaseModel):
    recipient_id: str
    method: AcknowledgementMethod = AcknowledgementMethod.WEB
    notes: Optional[str] = None


class AlertRetryRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=250)


class DeliveryJob(BaseModel):
    job_id: str = Field(default_factory=lambda: f"job-{uuid4().hex[:12]}")
    alert_id: str
    correlation_id: str
    status: JobStatus = Field(default=JobStatus.QUEUED)
    attempt_count: int = Field(default=0, ge=0)
    max_attempts: int = Field(default=3, le=5)
    backoff_seconds: float = Field(default=2.0)
    next_retry_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None


class ConnectivityStatus(BaseModel):
    connectivity_state: ConnectivityState
    server_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    authoritative_source: str = "MongoDB Atlas"
    freshness_state: FreshnessState = FreshnessState.CURRENT
    last_synced_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    database_healthy: bool = True
    database_latency_ms: Optional[float] = None
    details: str = "Authoritative persistence layer operational"


class OfflineSyncOperation(BaseModel):
    operation_id: str = Field(default_factory=lambda: f"op-{uuid4().hex[:10]}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    operation_type: OperationType
    payload: Dict[str, Any]
    client_timestamp: datetime
    status: OperationStatus = Field(default=OperationStatus.PENDING)
    attempt_count: int = 0
    last_error: Optional[str] = None
    idempotency_key: str = Field(..., min_length=8)


class OfflineSyncBatch(BaseModel):
    batch_id: str = Field(default_factory=lambda: f"sync-{uuid4().hex[:10]}")
    client_id: str
    operations: List[OfflineSyncOperation] = Field(..., max_length=100)


class OfflineSyncResult(BaseModel):
    operation_id: str
    status: OperationStatus
    reconciled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str
    conflict_details: Optional[Dict[str, Any]] = None


class OfflineSyncResponse(BaseModel):
    batch_id: str
    processed_count: int = 0
    synced_count: int = 0
    conflict_count: int = 0
    failed_count: int = 0
    results: List[OfflineSyncResult] = Field(default_factory=list)
    server_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    freshness_state: FreshnessState = FreshnessState.CURRENT


class AlertSummary(BaseModel):
    total_alerts: int = 0
    queued_count: int = 0
    dispatching_count: int = 0
    dispatched_count: int = 0
    delivered_count: int = 0
    acknowledged_count: int = 0
    failed_count: int = 0
    expired_count: int = 0
    district_id: Optional[str] = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
