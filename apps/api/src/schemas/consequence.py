"""
Sentinel NER — Consequence Intelligence Domain Schemas (Stage 7)
Defines authoritative models for Consequence Relationships, Spatial Relations,
Asset Criticality, Consequence Categories, Evidence Linkages, and Analysis Runs.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ConsequenceSourceType(str, Enum):
    SLOPE_UNIT = "SLOPE_UNIT"
    LANDSLIDE_EVENT = "LANDSLIDE_EVENT"
    RISK_PREDICTION = "RISK_PREDICTION"
    INSAR_OBSERVATION = "INSAR_OBSERVATION"


class ConsequenceTargetType(str, Enum):
    ROAD = "ROAD"
    ROAD_CHAINAGE = "ROAD_CHAINAGE"
    ASSET = "ASSET"
    VILLAGE = "VILLAGE"


class SpatialRelationType(str, Enum):
    INTERSECTS = "INTERSECTS"
    WITHIN = "WITHIN"
    NEARBY = "NEARBY"
    CONTAINS = "CONTAINS"
    OVERLAPS = "OVERLAPS"


class ConsequenceCategory(str, Enum):
    ROAD_EXPOSURE = "ROAD_EXPOSURE"
    ASSET_EXPOSURE = "ASSET_EXPOSURE"
    VILLAGE_PROXIMITY = "VILLAGE_PROXIMITY"
    TRANSPORT_CORRIDOR_EXPOSURE = "TRANSPORT_CORRIDOR_EXPOSURE"
    CRITICAL_INFRASTRUCTURE_EXPOSURE = "CRITICAL_INFRASTRUCTURE_EXPOSURE"


class AssetCriticality(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class ConsequenceConfidence(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class UncertaintyLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    UNKNOWN = "UNKNOWN"


class RelationshipStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUPERSEDED = "SUPERSEDED"
    ARCHIVED = "ARCHIVED"


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    ANALYZING = "ANALYZING"
    QC = "QC"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"


# Authoritative Non-Autonomous Operational Guard Disclaimers & Terminology
NON_AUTONOMOUS_DISCLAIMER = (
    "Stage 7 Consequence Intelligence denotes potential spatial exposure and infrastructure proximity only. "
    "It does NOT automatically order road closures, evacuations, dispatch personnel, or broadcast public alerts. "
    "All operational interventions require authoritative human decision-maker review."
)

ROAD_EXPOSURE_TERMINOLOGY = (
    "Road corridor is POTENTIALLY AFFECTED / SPATIALLY EXPOSED based on geometric proximity to modeled hazard or "
    "measured deformation. It is NOT designated as CLOSED without authoritative administrative or police order."
)

ASSET_EXPOSURE_TERMINOLOGY = (
    "Asset is POTENTIALLY EXPOSED based on spatial proximity. It is NOT designated as DAMAGED without "
    "authoritative physical field structural assessment."
)

VILLAGE_EXPOSURE_TERMINOLOGY = (
    "Village settlement is SPATIALLY EXPOSED / PROXIMITY IDENTIFIED. It is NOT designated as UNSAFE or "
    "requiring evacuation without formal administrative disaster declaration."
)

CHAINAGE_DATA_UNAVAILABLE_CODE = "CHAINAGE_DATA_UNAVAILABLE"
RISK_DATA_UNAVAILABLE_CODE = "RISK_DATA_UNAVAILABLE"
SATELLITE_EVIDENCE_UNAVAILABLE_CODE = "SATELLITE_EVIDENCE_UNAVAILABLE"
CRITICALITY_UNKNOWN_CODE = "CRITICALITY_UNKNOWN"


class ConsequenceRelationship(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique deterministic or generated consequence relationship ID")
    source_type: ConsequenceSourceType
    source_id: str
    source_name: Optional[str] = None
    target_type: ConsequenceTargetType
    target_id: str
    target_name: Optional[str] = None
    target_code: Optional[str] = None
    relationship_type: ConsequenceCategory
    spatial_relation: SpatialRelationType
    distance_meters: float = Field(..., ge=0.0, description="Calculated geometric minimum distance in meters")
    intersection_ratio: Optional[float] = Field(None, ge=0.0, le=1.0, description="Spatial overlap proportion if intersecting")
    exposure_basis: str = Field(..., description="Deterministic explainable description of the spatial exposure relationship")
    evidence_ids: List[str] = Field(default_factory=list, description="IDs of supporting records (slope unit, risk, InSAR, etc.)")
    risk_prediction_id: Optional[str] = None
    risk_level: Optional[str] = None
    satellite_observation_id: Optional[str] = None
    insar_deformation_mm_yr: Optional[float] = None
    criticality: AssetCriticality = AssetCriticality.UNKNOWN
    confidence: ConsequenceConfidence = ConsequenceConfidence.MEDIUM
    uncertainty: UncertaintyLevel = UncertaintyLevel.MEDIUM
    assumptions: List[str] = Field(default_factory=list)
    organization_id: Optional[str] = None
    authority_name: Optional[str] = None
    chainage_km: Optional[float] = None
    chainage_status: Optional[str] = None
    district_id: str
    state_code: str
    generated_at: datetime
    valid_from: datetime
    valid_until: Optional[datetime] = None
    algorithm_version: str = "sentinel-consequence-v1.0.0"
    status: RelationshipStatus = RelationshipStatus.ACTIVE
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConsequenceRun(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    district_id: str
    algorithm_version: str = "sentinel-consequence-v1.0.0"
    status: JobStatus = JobStatus.QUEUED
    candidate_count: int = 0
    relationship_count: int = 0
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    failure_reason: Optional[str] = None
    retry_count: int = 0
    correlation_id: Optional[str] = None
    created_by: str
    created_at: datetime


class ConsequenceRunRequest(BaseModel):
    district_id: str = Field(..., description="Target district ID for consequence analysis")
    distance_threshold_m: Optional[float] = Field(default=300.0, ge=10.0, le=5000.0, description="Maximum proximity buffer in meters")
    include_satellite_evidence: bool = Field(default=True, description="Whether to correlate Stage 6 InSAR telemetry")
    include_risk_predictions: bool = Field(default=True, description="Whether to correlate Stage 5 ML risk predictions")


class ConsequenceSummary(BaseModel):
    district_id: str
    total_relationships: int
    potentially_affected_roads_count: int
    linked_chainages_count: int
    exposed_assets_count: int
    critical_assets_count: int
    nearby_villages_count: int
    generated_at: datetime
    disclaimer: str = NON_AUTONOMOUS_DISCLAIMER
