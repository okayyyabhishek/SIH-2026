"""
Sentinel NER — Domain Schemas & Lifecycle Models (Stage 3)
Defines authoritative schemas for District, SlopeUnit, Road, RoadChainage,
Village, Asset, and LandslideEvent entities.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union

from pydantic import BaseModel, ConfigDict, Field

from src.schemas.geojson import (
    GeoJSONLineString,
    GeoJSONMultiLineString,
    GeoJSONMultiPolygon,
    GeoJSONPoint,
    GeoJSONPolygon,
)

T = TypeVar("T")


# ==============================================================================
# ENUMS
# ==============================================================================

class EntityStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ARCHIVED = "ARCHIVED"


class SlopeUnitStatus(str, Enum):
    ACTIVE = "ACTIVE"
    MONITORED = "MONITORED"
    INACTIVE = "INACTIVE"


class RoadType(str, Enum):
    NATIONAL_HIGHWAY = "NATIONAL_HIGHWAY"
    STATE_HIGHWAY = "STATE_HIGHWAY"
    MAJOR_DISTRICT_ROAD = "MAJOR_DISTRICT_ROAD"
    RURAL_ROAD = "RURAL_ROAD"
    STRATEGIC_BORDER_ROAD = "STRATEGIC_BORDER_ROAD"


class RoadOperationalStatus(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    RESTRICTED = "RESTRICTED"
    CLOSED = "CLOSED"
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"


class VillageStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EVACUATED = "EVACUATED"
    INACCESSIBLE = "INACCESSIBLE"
    HISTORICAL = "HISTORICAL"


class AssetType(str, Enum):
    ROAD_INFRASTRUCTURE = "ROAD_INFRASTRUCTURE"
    BRIDGE = "BRIDGE"
    CULVERT = "CULVERT"
    RAILWAY = "RAILWAY"
    RAILWAY_STATION = "RAILWAY_STATION"
    POWER = "POWER"
    WATER = "WATER"
    TELECOM = "TELECOM"
    HEALTH = "HEALTH"
    SCHOOL = "SCHOOL"
    GOVERNMENT = "GOVERNMENT"
    OTHER = "OTHER"


class AssetOperationalStatus(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    DAMAGED = "DAMAGED"
    DESTROYED = "DESTROYED"
    UNDER_REPAIR = "UNDER_REPAIR"
    OFFLINE = "OFFLINE"


class LandslideSourceType(str, Enum):
    FIELD_OBSERVATION = "FIELD_OBSERVATION"
    OFFICIAL_RECORD = "OFFICIAL_RECORD"
    IMPORTED_DATA = "IMPORTED_DATA"
    REMOTE_SENSING = "REMOTE_SENSING"
    OTHER = "OTHER"


class LandslideEventStatus(str, Enum):
    REPORTED = "REPORTED"
    VERIFIED = "VERIFIED"
    HISTORICAL = "HISTORICAL"
    REJECTED = "REJECTED"
    ARCHIVED = "ARCHIVED"


# ==============================================================================
# PAGINATION & QUERY PRIMITIVES
# ==============================================================================

class PaginatedResult(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    limit: int
    pages: int
    has_next: bool
    has_prev: bool


# ==============================================================================
# 1. DISTRICT
# ==============================================================================

DistrictGeometry = Union[GeoJSONPolygon, GeoJSONMultiPolygon]


class DistrictCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=20, description="Unique code e.g. 'MZ-AIZ'")
    state_code: str = Field(..., min_length=2, max_length=10, description="State code e.g. 'MZ'")
    state_name: str = Field(..., min_length=2, max_length=100)
    geometry: DistrictGeometry
    status: EntityStatus = EntityStatus.ACTIVE
    metadata: Optional[Dict[str, Any]] = None


class DistrictUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    state_name: Optional[str] = Field(None, min_length=2, max_length=100)
    geometry: Optional[DistrictGeometry] = None
    status: Optional[EntityStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class DistrictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    code: str
    state_code: str
    state_name: str
    geometry: Dict[str, Any]
    status: EntityStatus
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# ==============================================================================
# 2. SLOPE UNIT
# ==============================================================================

SlopeUnitGeometry = Union[GeoJSONPolygon, GeoJSONMultiPolygon]


class SlopeUnitCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Unique terrain unit identifier")
    name: Optional[str] = Field(None, max_length=150)
    district_id: str = Field(..., description="ID of referencing district")
    state_code: str = Field(..., min_length=2, max_length=10)
    geometry: SlopeUnitGeometry
    area_sqkm: Optional[float] = Field(None, ge=0.0)
    status: SlopeUnitStatus = SlopeUnitStatus.ACTIVE
    metadata: Optional[Dict[str, Any]] = None


class SlopeUnitUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=150)
    geometry: Optional[SlopeUnitGeometry] = None
    area_sqkm: Optional[float] = Field(None, ge=0.0)
    status: Optional[SlopeUnitStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class SlopeUnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: Optional[str] = None
    district_id: str
    state_code: str
    geometry: Dict[str, Any]
    area_sqkm: Optional[float] = None
    status: SlopeUnitStatus
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# ==============================================================================
# 3. ROAD
# ==============================================================================

RoadGeometry = Union[GeoJSONLineString, GeoJSONMultiLineString]


class RoadCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    road_code: str = Field(..., min_length=2, max_length=50, description="Authoritative road code e.g. 'NH-54'")
    road_type: RoadType
    authority_organization_id: str = Field(..., description="Agency owning or managing road e.g. BRO or PWD")
    district_id: str = Field(...)
    state_code: str = Field(..., min_length=2, max_length=10)
    geometry: RoadGeometry
    operational_status: RoadOperationalStatus = RoadOperationalStatus.OPERATIONAL
    metadata: Optional[Dict[str, Any]] = None


class RoadUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    road_type: Optional[RoadType] = None
    operational_status: Optional[RoadOperationalStatus] = None
    geometry: Optional[RoadGeometry] = None
    metadata: Optional[Dict[str, Any]] = None


class RoadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    road_code: str
    road_type: RoadType
    authority_organization_id: str
    district_id: str
    state_code: str
    geometry: Dict[str, Any]
    operational_status: RoadOperationalStatus
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# ==============================================================================
# 4. ROAD CHAINAGE
# ==============================================================================

class RoadChainageCreate(BaseModel):
    road_id: str = Field(..., description="ID of referencing road")
    chainage_km: float = Field(..., ge=0.0, description="Kilometer mark along road")
    geometry: GeoJSONPoint = Field(..., description="Location of chainage marker")
    district_id: str = Field(...)
    state_code: str = Field(..., min_length=2, max_length=10)
    metadata: Optional[Dict[str, Any]] = None


class RoadChainageUpdate(BaseModel):
    chainage_km: Optional[float] = Field(None, ge=0.0)
    geometry: Optional[GeoJSONPoint] = None
    metadata: Optional[Dict[str, Any]] = None


class RoadChainageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    road_id: str
    chainage_km: float
    geometry: Dict[str, Any]
    district_id: str
    state_code: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# ==============================================================================
# 5. VILLAGE
# ==============================================================================

VillageGeometry = Union[GeoJSONPoint, GeoJSONPolygon]


class VillageCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    village_code: Optional[str] = Field(None, max_length=50)
    district_id: str = Field(...)
    state_code: str = Field(..., min_length=2, max_length=10)
    geometry: VillageGeometry
    population: Optional[int] = Field(None, ge=0, description="Official census/record population if known, else null")
    status: VillageStatus = VillageStatus.ACTIVE
    metadata: Optional[Dict[str, Any]] = None


class VillageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    village_code: Optional[str] = Field(None, max_length=50)
    geometry: Optional[VillageGeometry] = None
    population: Optional[int] = Field(None, ge=0)
    status: Optional[VillageStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class VillageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    village_code: Optional[str] = None
    district_id: str
    state_code: str
    geometry: Dict[str, Any]
    population: Optional[int] = None
    status: VillageStatus
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# ==============================================================================
# 6. ASSET
# ==============================================================================

AssetGeometry = Union[GeoJSONPoint, GeoJSONLineString, GeoJSONPolygon]


class AssetCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    asset_type: AssetType
    organization_id: str = Field(..., description="ID of managing agency/department")
    district_id: str = Field(...)
    state_code: str = Field(..., min_length=2, max_length=10)
    geometry: AssetGeometry
    operational_status: AssetOperationalStatus = AssetOperationalStatus.OPERATIONAL
    metadata: Optional[Dict[str, Any]] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    asset_type: Optional[AssetType] = None
    operational_status: Optional[AssetOperationalStatus] = None
    geometry: Optional[AssetGeometry] = None
    metadata: Optional[Dict[str, Any]] = None


class AssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    asset_type: AssetType
    organization_id: str
    district_id: str
    state_code: str
    geometry: Dict[str, Any]
    operational_status: AssetOperationalStatus
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# ==============================================================================
# 7. LANDSLIDE EVENT (Historical & Observational)
# ==============================================================================

LandslideGeometry = Union[GeoJSONPoint, GeoJSONPolygon]


class LandslideEventCreate(BaseModel):
    event_reference: str = Field(..., min_length=3, max_length=60, description="Unique event reference e.g. 'LS-2026-MZ-001'")
    event_time: datetime = Field(..., description="Time event occurred or was initiated")
    detected_time: Optional[datetime] = None
    reported_time: Optional[datetime] = None
    geometry: LandslideGeometry
    district_id: str = Field(...)
    state_code: str = Field(..., min_length=2, max_length=10)
    source: LandslideSourceType = LandslideSourceType.FIELD_OBSERVATION
    source_reference: Optional[str] = Field(None, max_length=150)
    status: LandslideEventStatus = LandslideEventStatus.REPORTED
    description: Optional[str] = Field(None, max_length=1000)
    evidence_references: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class LandslideEventUpdate(BaseModel):
    status: Optional[LandslideEventStatus] = None
    description: Optional[str] = Field(None, max_length=1000)
    detected_time: Optional[datetime] = None
    reported_time: Optional[datetime] = None
    source_reference: Optional[str] = Field(None, max_length=150)
    evidence_references: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class LandslideEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_reference: str
    event_time: datetime
    detected_time: Optional[datetime] = None
    reported_time: Optional[datetime] = None
    geometry: Dict[str, Any]
    district_id: str
    state_code: str
    source: LandslideSourceType
    source_reference: Optional[str] = None
    status: LandslideEventStatus
    description: Optional[str] = None
    evidence_references: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
