"""
Sentinel NER — Standard API Schemas & Envelopes
Provides generic response envelopes, structured error definitions, and health models.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard success envelope for all Sentinel NER REST endpoints."""
    success: bool = True
    data: T
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: str = "system"


APIEnvelope = APIResponse


class ErrorDetail(BaseModel):
    """Structured error payload adhering to PRD specifications."""
    code: str = Field(..., description="Stable machine-readable error code")
    message: str = Field(..., description="Human-safe error explanation")
    correlation_id: str = Field(..., description="Unique request tracing identifier")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    details: Optional[Dict[str, Any]] = Field(default=None, description="Contextual error metadata")


class ErrorEnvelope(BaseModel):
    """Standard error envelope returned by exception handlers."""
    success: bool = False
    error: ErrorDetail


class SubsystemHealth(BaseModel):
    """Health and connectivity state for a specific subsystem or dependency."""
    name: str
    status: str = Field(..., description="'HEALTHY', 'DEGRADED', 'UNAVAILABLE', or 'STANDBY'")
    latency_ms: Optional[float] = None
    message: Optional[str] = None
    is_external: bool = False


class HealthResponse(BaseModel):
    """Comprehensive health check payload for Kubernetes/AWS monitoring."""
    status: str = Field(..., description="'HEALTHY', 'DEGRADED', or 'UNHEALTHY'")
    version: str
    environment: str
    uptime_seconds: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    subsystems: List[SubsystemHealth] = Field(default_factory=list)
