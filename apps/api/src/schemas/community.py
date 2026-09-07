"""
Sentinel NER — Stage 10 Community Intelligence Domain Models & Schemas
Implements:
1. CitizenReport with strict geospatial location, media validation, and lifecycle states.
2. CommunityEventCluster with explainable proximity metrics (clustering != verification).
3. CommunityModerationEvent with immutable historical audit trail.
4. Non-autonomous safety rule: reports are evidence inputs, not confirmed ground truth.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

from src.schemas.geojson import GeoJSONPoint


class ReportCategory(str, Enum):
    LANDSLIDE = "LANDSLIDE"
    CRACKING = "CRACKING"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    DEBRIS = "DEBRIS"
    ROCKFALL = "ROCKFALL"
    DRAINAGE_BLOCKAGE = "DRAINAGE_BLOCKAGE"
    WATER_SEEPAGE = "WATER_SEEPAGE"
    SLOPE_MOVEMENT = "SLOPE_MOVEMENT"
    OTHER = "OTHER"


class ReportStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    PROCESSING = "PROCESSING"
    UNVERIFIED = "UNVERIFIED"
    PROBABLE = "PROBABLE"
    VERIFIED = "VERIFIED"
    ACTIONED = "ACTIONED"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class ModerationState(str, Enum):
    UNMODERATED = "UNMODERATED"
    IN_REVIEW = "IN_REVIEW"
    MODERATED = "MODERATED"


class ReportSource(str, Enum):
    MOBILE_APP = "MOBILE_APP"
    WEB_PORTAL = "WEB_PORTAL"
    FIELD_TERMINAL = "FIELD_TERMINAL"
    HOTLINE = "HOTLINE"
    OFFLINE_SYNC = "OFFLINE_SYNC"


class LocationSource(str, Enum):
    DEVICE_GPS = "DEVICE_GPS"
    MANUAL_PIN = "MANUAL_PIN"
    MAP_SELECTION = "MAP_SELECTION"
    FIELD_SURVEY = "FIELD_SURVEY"


class MediaReference(BaseModel):
    """
    Validated object-storage reference for community images/media.
    Never stores large binary blobs directly in MongoDB.
    """
    object_key: str = Field(..., description="S3/Blob storage key")
    content_type: str = Field(..., description="MIME type, e.g. image/jpeg, image/png")
    size_bytes: int = Field(..., ge=1, le=25_000_000, description="Payload size limit 25MB")
    checksum_sha256: str = Field(..., min_length=64, max_length=64, description="SHA-256 integrity digest")
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    provenance: Dict[str, Any] = Field(default_factory=dict)
    is_verified_safe: bool = Field(default=True, description="Passed virus and polyglot scan")

    @field_validator("content_type")
    @classmethod
    def validate_mime(cls, v: str) -> str:
        allowed = {"image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4"}
        if v.lower() not in allowed:
            raise ValueError(f"Content type '{v}' not permitted. Must be one of {sorted(allowed)}")
        return v.lower()

    @field_validator("object_key")
    @classmethod
    def validate_key(cls, v: str) -> str:
        if ".." in v or v.startswith("/") or "\\" in v:
            raise ValueError("Path traversal sequences prohibited in media object key")
        return v


class CitizenReport(BaseModel):
    """
    Authoritative Citizen Observation Record.
    Evidence input into the intelligence system; does not constitute confirmed fact without review.
    """
    id: str = Field(default_factory=lambda: f"cr-{uuid4().hex[:12]}")
    reporter_id: str = Field(..., description="User ID or anonymous contributor hash")
    organization_id: Optional[str] = Field(None, description="Optional tenant or agency")
    district_id: str = Field(..., description="Authoritative district identifier (e.g. AIZAWL)")
    location: GeoJSONPoint = Field(..., description="Point location EPSG:4326")
    location_accuracy_m: Optional[float] = Field(None, ge=0.0, description="Accuracy radius in meters")
    location_source: LocationSource = Field(default=LocationSource.DEVICE_GPS)
    coordinate_reference: str = Field(default="EPSG:4326")
    reported_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    category: ReportCategory = Field(...)
    description: Optional[str] = Field(None, max_length=2000)
    media_references: List[MediaReference] = Field(default_factory=list, max_length=5)
    source: ReportSource = Field(default=ReportSource.WEB_PORTAL)
    status: ReportStatus = Field(default=ReportStatus.SUBMITTED)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    moderation_state: ModerationState = Field(default=ModerationState.UNMODERATED)
    reviewer_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    linked_entities: Dict[str, Any] = Field(
        default_factory=dict,
        description="Associated slope_unit_id, road_id, chainage_km, village_id, asset_id"
    )
    provenance: Dict[str, Any] = Field(default_factory=dict)
    correlation_id: str = Field(default_factory=lambda: f"corr-{uuid4().hex[:10]}")


class CitizenReportCreate(BaseModel):
    """Input payload for submitting a citizen hazard report."""
    district_id: str
    location: GeoJSONPoint
    location_accuracy_m: Optional[float] = None
    location_source: LocationSource = LocationSource.DEVICE_GPS
    category: ReportCategory
    description: Optional[str] = Field(None, max_length=2000)
    media_references: List[MediaReference] = Field(default_factory=list, max_length=5)
    source: ReportSource = ReportSource.WEB_PORTAL
    linked_entities: Optional[Dict[str, Any]] = None


class CommunityModerationEvent(BaseModel):
    """
    Immutable audit trail entry for citizen report moderation.
    Every status change (VERIFIED, PROBABLE, REJECTED) must be documented here.
    """
    id: str = Field(default_factory=lambda: f"mod-{uuid4().hex[:12]}")
    report_id: str
    moderator_id: str
    moderator_name: str
    old_status: ReportStatus
    new_status: ReportStatus
    reason: str = Field(..., min_length=5, max_length=1000)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    evidence_references: List[str] = Field(default_factory=list)
    correlation_id: str = Field(default_factory=lambda: f"corr-{uuid4().hex[:10]}")


class ReportModerationRequest(BaseModel):
    new_status: ReportStatus = Field(..., description="Target status: VERIFIED, PROBABLE, REJECTED, RESOLVED")
    reason: str = Field(..., min_length=5, max_length=1000)
    evidence_references: List[str] = Field(default_factory=list)


class CommunityEventCluster(BaseModel):
    """
    Explainable group of spatially and temporally correlated citizen reports.
    RULE: A cluster indicates elevated observation density requiring review, NEVER automatic confirmation.
    """
    id: str = Field(default_factory=lambda: f"cls-{uuid4().hex[:12]}")
    cluster_code: str
    district_id: str
    center_point: GeoJSONPoint
    radius_meters: float
    category: ReportCategory
    report_ids: List[str]
    report_count: int
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    explanation: str
    first_reported_at: datetime
    last_reported_at: datetime
    status: str = Field(default="REQUIRES_REVIEW", description="REQUIRES_REVIEW, REVIEWED, RESOLVED")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CommunitySummary(BaseModel):
    total_reports: int
    submitted_count: int
    unverified_count: int
    probable_count: int
    verified_count: int
    rejected_count: int
    resolved_count: int
    cluster_count: int
    district_id: Optional[str] = None
    generated_at: datetime
