"""
Sentinel NER — Stage 8 Warning Ledger Schemas & Contracts
Defines append-only, cryptographically chained audit ledger entries
for complete forecast-to-intervention accountability.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class LedgerEventType(str, Enum):
    # Action events
    ACTION_CREATED = "ACTION_CREATED"
    ACTION_REVIEWED = "ACTION_REVIEWED"
    ACTION_APPROVED = "ACTION_APPROVED"
    ACTION_REJECTED = "ACTION_REJECTED"
    ACTION_CANCELLED = "ACTION_CANCELLED"
    ACTION_STARTED = "ACTION_STARTED"
    ACTION_COMPLETED = "ACTION_COMPLETED"
    ACTION_FAILED = "ACTION_FAILED"

    # Warning events
    WARNING_CREATED = "WARNING_CREATED"
    WARNING_REVIEWED = "WARNING_REVIEWED"
    WARNING_AUTHORIZED = "WARNING_AUTHORIZED"
    WARNING_REJECTED = "WARNING_REJECTED"
    WARNING_DISPATCH_REQUESTED = "WARNING_DISPATCH_REQUESTED"
    WARNING_DISPATCHED = "WARNING_DISPATCHED"
    WARNING_DELIVERY_FAILED = "WARNING_DELIVERY_FAILED"
    WARNING_ACKNOWLEDGED = "WARNING_ACKNOWLEDGED"
    WARNING_ESCALATED = "WARNING_ESCALATED"
    WARNING_CANCELLED = "WARNING_CANCELLED"
    WARNING_EXPIRED = "WARNING_EXPIRED"

    # Stage 9: Alert & Delivery events
    ALERT_QUEUED = "ALERT_QUEUED"
    ALERT_DISPATCHING = "ALERT_DISPATCHING"
    ALERT_DISPATCHED = "ALERT_DISPATCHED"
    ALERT_DELIVERED = "ALERT_DELIVERED"
    ALERT_DELIVERY_FAILED = "ALERT_DELIVERY_FAILED"
    ALERT_ACKNOWLEDGED = "ALERT_ACKNOWLEDGED"
    ALERT_EXPIRED = "ALERT_EXPIRED"
    ALERT_RETRY_SCHEDULED = "ALERT_RETRY_SCHEDULED"
    OFFLINE_SYNC_RECONCILED = "OFFLINE_SYNC_RECONCILED"


class WarningLedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: f"ledg-{uuid4().hex[:12]}", description="Unique ledger entry ID")
    sequence_number: int = Field(..., ge=1, description="Strictly incrementing chain sequence integer")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_type: LedgerEventType
    district_id: str
    warning_id: Optional[str] = None
    action_id: Optional[str] = None
    actor_user_id: str
    actor_role: str
    payload: Dict[str, Any] = Field(default_factory=dict, description="Immutable event payload")
    prev_event_hash: str = Field(..., description="SHA-256 hash of previous block in the chain")
    event_hash: str = Field(..., description="Cryptographic SHA-256 digest of this entry")


class LedgerVerificationResult(BaseModel):
    district_id: str
    total_entries: int
    is_valid: bool
    corrupted_sequence_number: Optional[int] = None
    corrupted_entry_id: Optional[str] = None
    genesis_hash: str
    latest_hash: str
    verified_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str
